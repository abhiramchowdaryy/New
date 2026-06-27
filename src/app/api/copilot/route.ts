import { NextRequest } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { loadProcurementDataset } from "@/lib/data";
import { can } from "@/lib/auth/roles";
import { getAnthropic, resolveModel } from "@/lib/anthropic";
import { anthropicToolDefs, runTool } from "@/lib/copilot/tools";
import { logger } from "@/lib/observability/logger";
import { rateLimit } from "@/lib/security/rate-limit";
import type { ProcurementDataset } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;
const MAX_TOOL_TURNS = 6;

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const RequestSchema = z.object({
  messages: z
    .array(ChatMessageSchema)
    .min(1)
    // Keep only the most recent turns and clamp content length, rather than
    // rejecting long histories (the client resends the full conversation).
    .transform((msgs) =>
      msgs.slice(-MAX_MESSAGES).map((m) => ({
        role: m.role,
        content: m.content.slice(0, MAX_CHARS),
      })),
    )
    // The conversation must end with a user turn for the model to respond to.
    .refine((msgs) => msgs[msgs.length - 1]?.role === "user", {
      message: "The last message must be from the user.",
    }),
});

type ChatMessage = z.infer<typeof ChatMessageSchema>;

function systemPrompt(asOfDate: string): string {
  return [
    "You are the AI Procurement Copilot, an analyst for a B2B procurement team.",
    "You help with spend, supplier risk, invoice anomalies, deliveries, contracts, and budgets.",
    "",
    "GROUNDING RULES:",
    "- Use the provided tools to retrieve data. Tools are the ONLY source of truth.",
    "- Never invent suppliers, numbers, invoices, contracts, or dates. If a tool returns nothing, say so.",
    "- Call tools as needed before answering; prefer the most specific tool for the question.",
    `- All amounts are USD. Today's date is ${asOfDate}.`,
    "- Be concise and decision-oriented: lead with the answer, then supporting figures.",
    "- Cite the specific record IDs (invoice, supplier, delivery, contract, PO) your answer relies on.",
    "- Use short markdown tables or bullet lists for comparisons.",
  ].join("\n");
}

/** One assistant→tool→assistant cycle, returning the final text + citations. */
async function runAgent(
  client: NonNullable<ReturnType<typeof getAnthropic>>,
  data: ProcurementDataset,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<{ text: string; citations: string[] }> {
  const convo: Anthropic.MessageParam[] = history.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const citations = new Set<string>();
  let finalText = "";
  let toolCalls = 0;

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const resp = await client.messages.create({
      model: resolveModel(),
      max_tokens: 2048,
      system: systemPrompt(data.asOfDate),
      tools: anthropicToolDefs(),
      messages: convo,
    });

    const textBlocks = resp.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text",
    );
    if (textBlocks.length > 0) {
      finalText = textBlocks.map((b) => b.text).join("\n").trim();
    }

    const toolUses = resp.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (resp.stop_reason !== "tool_use" || toolUses.length === 0) break;

    convo.push({ role: "assistant", content: resp.content });
    const results: Anthropic.ToolResultBlockParam[] = toolUses.map((tu) => {
      toolCalls += 1;
      const r = runTool(data, tu.name, tu.input);
      r.citations.forEach((c) => citations.add(c));
      return {
        type: "tool_result",
        tool_use_id: tu.id,
        content: JSON.stringify(r.data),
        is_error: !r.ok,
      };
    });
    convo.push({ role: "user", content: results });
  }

  logger.info("copilot.answered", { toolCalls, citations: citations.size });
  return { text: finalText, citations: [...citations] };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Body must include a non-empty `messages` array ending with a user turn.",
        details: parsed.error.issues.map((i) => i.message),
      },
      { status: 400 },
    );
  }
  const messages: ChatMessage[] = parsed.data.messages;

  // Resolve tenant + role, then authorize. Tools read only this tenant's
  // dataset, so the copilot can never reason over another org's data.
  const { ctx, data } = await loadProcurementDataset();
  if (!can(ctx.role, "use:copilot")) {
    return Response.json(
      { error: "Your role does not have access to the copilot." },
      { status: 403 },
    );
  }

  // Per-tenant rate limit on the paid LLM endpoint (cost-exhaustion guard).
  const limit = rateLimit(`copilot:${ctx.tenantId}`);
  if (!limit.allowed) {
    return Response.json(
      { error: "Rate limit exceeded. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const client = getAnthropic();
  if (!client) {
    return Response.json(
      {
        error:
          "ANTHROPIC_API_KEY is not configured. Add it to .env.local to enable the copilot.",
      },
      { status: 503 },
    );
  }

  let answer: { text: string; citations: string[] };
  try {
    answer = await runAgent(client, data, messages);
  } catch (err) {
    logger.error("copilot.failed", { tenantId: ctx.tenantId, err: String(err) });
    return Response.json(
      { error: "Failed to reach the model. Check your API key and try again." },
      { status: 502 },
    );
  }

  // Stream the grounded answer, then a deterministic Sources line so every
  // response is traceable to real records even if the model omits inline cites.
  const encoder = new TextEncoder();
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      const text = answer.text || "I couldn't find supporting data for that. Try rephrasing.";
      for (let i = 0; i < text.length; i += 80) {
        controller.enqueue(encoder.encode(text.slice(i, i + 80)));
      }
      if (answer.citations.length > 0) {
        controller.enqueue(
          encoder.encode(`\n\n**Sources:** ${answer.citations.join(", ")}`),
        );
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
