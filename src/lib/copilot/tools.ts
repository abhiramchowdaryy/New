// Copilot tool layer (Phase 5/6).
//
// Each tool is a pure function over the tenant's ProcurementDataset that returns
// structured data plus the record IDs that support it ("citations"). The route
// exposes these to Claude as tools; the model retrieves only what it needs and
// every answer can be traced back to real records — no whole-snapshot stuffing,
// no hallucinated values.

import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import {
  computeDeliveryMetrics,
  computeHeadline,
  computeSpendSummary,
  detectInvoiceAnomalies,
} from "../analytics";
import {
  computeBudgetVariance,
  computeSupplierScorecards,
} from "../advanced-analytics";
import { computeSupplierRiskProfiles } from "../risk-engine";
import { daysBetween } from "../format";
import type { AnomalyType, ProcurementDataset, SpendCategory } from "../types";

export interface ToolResult {
  data: unknown;
  citations: string[]; // record IDs / keys that support the result
}

export interface CopilotTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>; // JSON schema for the Anthropic API
  schema: z.ZodTypeAny; // validates the model's tool input
  execute(data: ProcurementDataset, input: unknown): ToolResult;
}

const EMPTY_OBJECT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const CATEGORIES: SpendCategory[] = [
  "Raw Materials",
  "Logistics",
  "IT & Software",
  "Facilities",
  "Professional Services",
  "Packaging",
  "Marketing",
];

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}

const spendOverview: CopilotTool = {
  name: "get_spend_overview",
  description:
    "Total realized spend, committed (open) spend, breakdown by category, top suppliers, and the monthly trend.",
  inputSchema: EMPTY_OBJECT_SCHEMA,
  schema: z.object({}).strip(),
  execute(data) {
    const spend = computeSpendSummary(data);
    const top = spend.bySupplier.slice(0, 8);
    return {
      data: {
        totalRealized: spend.total,
        committedOpen: spend.committedOpen,
        byCategory: spend.byCategory,
        topSuppliers: top,
        monthlyTrend: spend.monthlyTrend,
      },
      citations: top.map((s) => s.supplierId),
    };
  },
};

const supplierRisk: CopilotTool = {
  name: "get_supplier_risk",
  description:
    "Risk profile(s) across eight dimensions with explanations. Optionally filter by supplier name or id; omit to get all suppliers ranked by composite risk.",
  inputSchema: {
    type: "object",
    properties: {
      supplier: {
        type: "string",
        description: "Supplier name (partial, case-insensitive) or id.",
      },
    },
    additionalProperties: false,
  },
  schema: z.object({ supplier: z.string().optional() }).strip(),
  execute(data, input) {
    const { supplier } = input as { supplier?: string };
    let profiles = computeSupplierRiskProfiles(data);
    if (supplier) {
      const q = supplier.toLowerCase();
      profiles = profiles.filter(
        (p) => p.supplierId.toLowerCase() === q || p.name.toLowerCase().includes(q),
      );
    }
    return { data: profiles, citations: profiles.map((p) => p.supplierId) };
  },
};

const invoiceAnomalies: CopilotTool = {
  name: "find_invoice_anomalies",
  description:
    "Flagged invoices: duplicates, price variances vs PO, and overdue. Optionally filter by type.",
  inputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["duplicate", "price_variance", "overdue"],
        description: "Optional anomaly type filter.",
      },
    },
    additionalProperties: false,
  },
  schema: z
    .object({ type: z.enum(["duplicate", "price_variance", "overdue"]).optional() })
    .strip(),
  execute(data, input) {
    const { type } = input as { type?: AnomalyType };
    let anomalies = detectInvoiceAnomalies(data);
    if (type) anomalies = anomalies.filter((a) => a.type === type);
    const atRisk = anomalies.reduce((s, a) => s + a.amount, 0);
    return {
      data: { count: anomalies.length, dollarsAtRisk: atRisk, anomalies },
      citations: unique(anomalies.map((a) => a.invoiceId)),
    };
  },
};

const lateDeliveries: CopilotTool = {
  name: "get_late_deliveries",
  description:
    "Delivery performance: on-time rate, late count, average days late, and the worst late deliveries with their suppliers.",
  inputSchema: EMPTY_OBJECT_SCHEMA,
  schema: z.object({}).strip(),
  execute(data) {
    const m = computeDeliveryMetrics(data);
    return {
      data: {
        onTimeRatePct: Math.round(m.onTimeRate * 100),
        late: m.late,
        pending: m.pending,
        avgDaysLate: Math.round(m.avgDaysLate * 10) / 10,
        worstLate: m.lateDeliveries.slice(0, 10),
      },
      citations: m.lateDeliveries.slice(0, 10).map((d) => d.deliveryId),
    };
  },
};

const recommendSupplier: CopilotTool = {
  name: "recommend_supplier",
  description:
    "Recommend the best supplier in a category, ranked by composite risk (lower is better), on-time rate, and existing spend relationship.",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string", enum: CATEGORIES, description: "Spend category." },
    },
    required: ["category"],
    additionalProperties: false,
  },
  schema: z.object({ category: z.enum(CATEGORIES as [string, ...string[]]) }).strip(),
  execute(data, input) {
    const { category } = input as { category: SpendCategory };
    const scorecards = computeSupplierScorecards(data).filter(
      (c) => c.category === category,
    );
    const ranked = [...scorecards].sort(
      (a, b) =>
        a.riskScore - b.riskScore ||
        b.onTimeRate - a.onTimeRate ||
        b.totalSpend - a.totalSpend,
    );
    return {
      data: { category, ranked, recommended: ranked[0] ?? null },
      citations: ranked.map((c) => c.supplierId),
    };
  },
};

const contractRisk: CopilotTool = {
  name: "get_contract_risk",
  description:
    "Contracts with risk flags: expiring within 90 days, auto-renewing, or with realized+committed spend near/over their ceiling.",
  inputSchema: EMPTY_OBJECT_SCHEMA,
  schema: z.object({}).strip(),
  execute(data) {
    const spendBySupplierCat = new Map<string, number>();
    for (const p of data.purchaseOrders) {
      if (p.status === "cancelled") continue;
      const key = `${p.supplierId}|${p.category}`;
      spendBySupplierCat.set(key, (spendBySupplierCat.get(key) ?? 0) + p.amount);
    }
    const flagged = data.contracts.map((c) => {
      const used = spendBySupplierCat.get(`${c.supplierId}|${c.category}`) ?? 0;
      const daysToEnd = daysBetween(data.asOfDate, c.endDate);
      const utilization = c.ceiling > 0 ? used / c.ceiling : 0;
      const flags: string[] = [];
      if (daysToEnd <= 90 && daysToEnd >= 0) flags.push(`Expires in ${daysToEnd} days`);
      if (daysToEnd < 0) flags.push("Expired");
      if (c.autoRenew) flags.push("Auto-renews");
      if (utilization >= 0.9) flags.push(`At ${Math.round(utilization * 100)}% of ceiling`);
      return { ...c, used, utilizationPct: utilization, daysToEnd, flags };
    });
    const atRisk = flagged.filter((c) => c.flags.length > 0);
    return { data: { contracts: flagged, atRisk }, citations: atRisk.map((c) => c.id) };
  },
};

const budgetStatus: CopilotTool = {
  name: "get_budget_status",
  description:
    "Budget vs actual + committed by category, with utilization and over/under variance.",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string", enum: CATEGORIES, description: "Optional category filter." },
    },
    additionalProperties: false,
  },
  schema: z.object({ category: z.enum(CATEGORIES as [string, ...string[]]).optional() }).strip(),
  execute(data, input) {
    const { category } = input as { category?: SpendCategory };
    let rows = computeBudgetVariance(data);
    if (category) rows = rows.filter((r) => r.category === category);
    return { data: rows, citations: rows.map((r) => r.category) };
  },
};

const executiveReport: CopilotTool = {
  name: "generate_executive_report",
  description:
    "A structured executive summary: headline KPIs, top supplier risks, budget alerts, and estimated savings opportunities (recoverable duplicates + price-variance overages).",
  inputSchema: EMPTY_OBJECT_SCHEMA,
  schema: z.object({}).strip(),
  execute(data) {
    const headline = computeHeadline(data);
    const topRisks = computeSupplierRiskProfiles(data)
      .slice(0, 5)
      .map((p) => ({ supplier: p.name, score: p.compositeScore, band: p.band }));
    const anomalies = detectInvoiceAnomalies(data);
    const duplicateSavings = anomalies
      .filter((a) => a.type === "duplicate")
      .reduce((s, a) => s + a.amount, 0);
    const overbilling = anomalies
      .filter((a) => a.type === "price_variance")
      .reduce((s, a) => s + a.amount, 0);
    const budgetAlerts = computeBudgetVariance(data)
      .filter((r) => r.utilizationPct >= 0.9)
      .map((r) => ({ category: r.category, utilizationPct: Math.round(r.utilizationPct * 100) }));

    const citations = unique([
      ...anomalies.map((a) => a.invoiceId),
      ...budgetAlerts.map((b) => b.category),
    ]);

    return {
      data: {
        headline,
        topRisks,
        budgetAlerts,
        savingsOpportunities: {
          recoverableDuplicates: duplicateSavings,
          priceVarianceExposure: overbilling,
          estimatedTotal: duplicateSavings + overbilling,
        },
      },
      citations,
    };
  },
};

export const COPILOT_TOOLS: CopilotTool[] = [
  spendOverview,
  supplierRisk,
  invoiceAnomalies,
  lateDeliveries,
  recommendSupplier,
  contractRisk,
  budgetStatus,
  executiveReport,
];

const TOOLS_BY_NAME = new Map(COPILOT_TOOLS.map((t) => [t.name, t]));

export function getTool(name: string): CopilotTool | undefined {
  return TOOLS_BY_NAME.get(name);
}

/** Tool definitions in the shape the Anthropic Messages API expects. */
export function anthropicToolDefs(): Anthropic.Tool[] {
  return COPILOT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema as Anthropic.Tool.InputSchema,
  }));
}

/**
 * Validate + execute a tool by name. Returns a JSON-serializable result and the
 * citations it produced; validation errors are returned as structured errors so
 * the model can recover rather than crash the request.
 */
export function runTool(
  data: ProcurementDataset,
  name: string,
  rawInput: unknown,
): ToolResult & { ok: boolean } {
  const tool = getTool(name);
  if (!tool) return { ok: false, data: { error: `Unknown tool: ${name}` }, citations: [] };
  const parsed = tool.schema.safeParse(rawInput ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      data: { error: "Invalid tool input", issues: parsed.error.issues.map((i) => i.message) },
      citations: [],
    };
  }
  const result = tool.execute(data, parsed.data);
  return { ok: true, ...result };
}
