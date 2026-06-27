import { describe, expect, it } from "vitest";
import { validateEnv } from "./env";

describe("validateEnv", () => {
  it("accepts a valid environment and warns about a missing API key", () => {
    const r = validateEnv({ PROCUREMENT_AS_OF_DATE: "2025-06-26" });
    expect(r.ok).toBe(true);
    expect(r.warnings.some((w) => w.includes("ANTHROPIC_API_KEY"))).toBe(true);
  });

  it("coerces numeric limits and accepts a valid URL", () => {
    const r = validateEnv({
      ANTHROPIC_API_KEY: "sk-test",
      RATE_LIMIT_MAX: "50",
      ERP_REST_BASE_URL: "https://erp.example.com",
    });
    expect(r.ok).toBe(true);
    expect(r.env.RATE_LIMIT_MAX).toBe(50);
    expect(r.warnings).toHaveLength(0);
  });

  it("rejects invalid values", () => {
    expect(validateEnv({ PROCUREMENT_AS_OF_DATE: "06/26/2025" }).ok).toBe(false);
    expect(validateEnv({ ERP_REST_BASE_URL: "not-a-url" }).ok).toBe(false);
  });
});
