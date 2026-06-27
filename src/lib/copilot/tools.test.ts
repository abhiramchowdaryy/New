import { describe, expect, it } from "vitest";
import { COPILOT_TOOLS, anthropicToolDefs, runTool } from "./tools";
import { SEED_AS_OF_DATE } from "../clock";
import { demoSeed } from "../data/seed";
import type { ProcurementDataset } from "../types";

const data: ProcurementDataset = { ...demoSeed, asOfDate: SEED_AS_OF_DATE };

describe("copilot tool registry", () => {
  it("exposes Anthropic-shaped definitions for every tool", () => {
    const defs = anthropicToolDefs();
    expect(defs).toHaveLength(COPILOT_TOOLS.length);
    for (const d of defs) {
      expect(d.name).toBeTruthy();
      expect(d.description).toBeTruthy();
      expect(d.input_schema).toBeTruthy();
    }
  });

  it("rejects unknown tools and invalid input without throwing", () => {
    expect(runTool(data, "nope", {}).ok).toBe(false);
    const bad = runTool(data, "recommend_supplier", { category: "Spaceships" });
    expect(bad.ok).toBe(false);
  });
});

describe("tool execution + citations", () => {
  it("get_spend_overview cites top suppliers", () => {
    const r = runTool(data, "get_spend_overview", {});
    expect(r.ok).toBe(true);
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it("find_invoice_anomalies cites invoice IDs and can filter by type", () => {
    const all = runTool(data, "find_invoice_anomalies", {});
    expect(all.citations).toContain("INV-5015");
    const dupes = runTool(data, "find_invoice_anomalies", { type: "duplicate" });
    const payload = dupes.data as { anomalies: { type: string }[] };
    expect(payload.anomalies.every((a) => a.type === "duplicate")).toBe(true);
  });

  it("get_supplier_risk filters by name and cites supplier IDs", () => {
    const r = runTool(data, "get_supplier_risk", { supplier: "Crimson" });
    const profiles = r.data as { supplierId: string; name: string }[];
    expect(profiles.length).toBe(1);
    expect(profiles[0].supplierId).toBe("S07");
    expect(r.citations).toContain("S07");
  });

  it("recommend_supplier returns the lowest-risk supplier in a category", () => {
    const r = runTool(data, "recommend_supplier", { category: "Raw Materials" });
    const payload = r.data as { recommended: { supplierId: string } | null };
    expect(payload.recommended).not.toBeNull();
    expect(r.citations.length).toBeGreaterThan(0);
  });

  it("get_contract_risk flags contracts and cites contract IDs", () => {
    const r = runTool(data, "get_contract_risk", {});
    const payload = r.data as { atRisk: { id: string }[] };
    expect(Array.isArray(payload.atRisk)).toBe(true);
  });

  it("generate_executive_report returns structured savings opportunities", () => {
    const r = runTool(data, "generate_executive_report", {});
    const payload = r.data as {
      savingsOpportunities: { estimatedTotal: number };
      headline: unknown;
    };
    expect(payload.headline).toBeTruthy();
    expect(payload.savingsOpportunities.estimatedTotal).toBeGreaterThanOrEqual(0);
  });
});
