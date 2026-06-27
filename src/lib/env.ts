// Environment validation (Phase 13).
//
// Validates and documents the environment the app reads. All vars are optional
// (the demo runs with none), so this reports problems rather than crashing —
// call validateEnv() at startup to surface misconfiguration early. Returns the
// parsed values and a list of human-readable warnings.

import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be ISO yyyy-mm-dd")
  .optional();

const positiveInt = z.coerce.number().int().positive().optional();

export const EnvSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  ANTHROPIC_MODEL: z.string().min(1).optional(),
  PROCUREMENT_AS_OF_DATE: isoDate,
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  RATE_LIMIT_MAX: positiveInt,
  RATE_LIMIT_WINDOW_SEC: positiveInt,
  ERP_REST_BASE_URL: z.string().url().optional(),
});

export type Env = z.infer<typeof EnvSchema>;

export interface EnvValidation {
  ok: boolean;
  env: Env;
  warnings: string[];
}

export function validateEnv(
  source: Record<string, string | undefined> = process.env,
): EnvValidation {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    return {
      ok: false,
      env: {},
      warnings: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    };
  }

  const warnings: string[] = [];
  if (!parsed.data.ANTHROPIC_API_KEY) {
    warnings.push("ANTHROPIC_API_KEY not set — the copilot will return 503 until configured.");
  }
  return { ok: true, env: parsed.data, warnings };
}
