import { NextRequest } from "next/server";
import { buildCopilotSnapshot } from "@/lib/analytics";
import { getAnthropic, resolveModel } from "@/lib/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGES = 20;
const MAX_CHARS = 4000;

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

function validate(messages: unknown): ChatMessage[] | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const trimmed = messages.slice(-MAX_MESSAGES);
  const out: ChatMessage[] = [];
  for (const m of trimmed) {
    if (
      !m ||
      typeof m !== "object" ||
      ((m as ChatMessage).role !== "user" && (m as ChatMessage).role !== "assistant") ||
      typeof (m as ChatMessage).content !== "string"
    ) {
      return null;
    }
    const msg = m as ChatMessage;
    out.push({ role: msg.role, content: msg.content.slice(0, MAX_CHARS) });
  }
  if (out[out.length - 1].role !== "user") return null;
  return out;
}

export async function POST(req: NextRequest) {
  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = validate(body.messages);
  if (!messages) {
    return Response.json(
      { error: "Body must include a non-empty `messages` array ending with a user turn." },
      { status: 400 },
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

  const snapshot = buildCopilotSnapshot();

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
