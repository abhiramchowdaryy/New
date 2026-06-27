import { NextRequest } from "next/server";
import { z } from "zod";
import { buildCopilotSnapshot } from "@/lib/analytics";
import { loadProcurementDataset } from "@/lib/data";
import { can } from "@/lib/auth/roles";
import { getAnthropic, resolveModel } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;

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

function systemPrompt(snapshot: unknown): string {
  return [
    "You are the AI Procurement Copilot, an analyst for a B2B procurement team.",
    "You help with spend analysis, supplier risk, invoice anomalies, and delivery delays.",
    "",
    "GROUNDING RULES:",
    "- Answer ONLY from the PROCUREMENT DATA snapshot below. It is the source of truth.",
    "- Never invent suppliers, numbers, invoices, or dates that are not in the snapshot.",
    "- If the data does not contain the answer, say so plainly and suggest what to look at.",
    "- All amounts are in USD. The snapshot's asOfDate is the current date.",
    "- Be concise and decision-oriented. Lead with the answer, then the supporting figures.",
    "- When useful, format comparisons as short markdown tables or bullet lists.",
    "",
    "PROCUREMENT DATA (JSON):",
    JSON.stringify(snapshot),
  ].join("\n");
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

  // Resolve tenant + role, then authorize. The snapshot is built only from this
  // tenant's dataset, so the copilot can never reason over another org's data.
  const { ctx, data } = await loadProcurementDataset();
  if (!can(ctx.role, "use:copilot")) {
    return Response.json(
      { error: "Your role does not have access to the copilot." },
      { status: 403 },
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

  const snapshot = buildCopilotSnapshot(data);

  try {
    const stream = client.messages.stream({
      model: resolveModel(),
      max_tokens: 2048,
      thinking: { type: "adaptive" },
      system: systemPrompt(snapshot),
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.enqueue(
            encoder.encode("\n\n[The copilot hit an error while responding.]"),
          );
          console.error("Copilot stream error:", err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("Copilot request error:", err);
    return Response.json(
      { error: "Failed to reach the model. Check your API key and try again." },
      { status: 502 },
    );
  }
}
