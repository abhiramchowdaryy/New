import Anthropic from "@anthropic-ai/sdk";

export const DEFAULT_MODEL = "claude-opus-4-8";

export function resolveModel(): string {
  return process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * Returns an Anthropic client, or null if no key is configured.
 * Callers should surface a friendly message when null.
 */
export function getAnthropic(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}
