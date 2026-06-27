import { describe, expect, it } from "vitest";
import {
  computeAbcAnalysis,
  computeBudgetVariance,
  computeCashFlowForecast,
  computeCycleTime,
  computeSpendForecast,
  computeSpendCube,
  computeSupplierScorecards,
} from "./advanced-analytics";
import { computeSpendSummary } from "./analytics";
import { SEED_AS_OF_DATE } from "./clock";
import { demoSeed } from "./data/seed";
import type { ProcurementDataset } from "./types";

const data: ProcurementDataset = { ...demoSeed, asOfDate: SEED_AS_OF_DATE };

describe("spend cube", () => {
  it("reconciles to the realized spend total", () => {
    const cube = computeSpendCube(data);
    const sum = cube.reduce((s, c) => s + c.amount, 0);
    expect(sum).toBe(computeSpendSummary(data).total);
  });
});

describe("ABC / Pareto", () => {
  const abc = computeAbcAnalysis(data);

  it("has a monotonically increasing cumulative share ending at ~100%", () => {
    const cum = abc.map((e) => e.cumulativePct);
    expect([...cum].sort((a, b) => a - b)).toEqual(cum);
    expect(abc[abc.length - 1].cumulativePct).toBeCloseTo(1, 6);
  });

  it("classes the largest suppliers as A", () => {
    expect(abc[0].abcClass).toBe("A");
    expect(["A", "B", "C"]).toContain(abc[abc.length - 1].abcClass);
  });
});

describe("supplier scorecards", () => {
  it("scores every supplier and sorts by spend desc", () => {
    const cards = computeSupplierScorecards(data);
    expect(cards).toHaveLength(data.suppliers.length);
    const spends = cards.map((c) => c.totalSpend);
    expect([...spends].sort((a, b) => b - a)).toEqual(spends);
  });
});

describe("cycle time", () => {
  it("produces non-negative lead and cycle times", () => {
    const ct = computeCycleTime(data);
    expect(ct.avgLeadTimeDays).toBeGreaterThan(0);
    expect(ct.avgCycleTimeDays).toBeGreaterThan(0);
    expect(ct.byCategory.length).toBeGreaterThan(0);
  });
});

describe("budget variance", () => {
  it("computes utilization = (actual + committed) / budget per category", () => {
    const rows = computeBudgetVariance(data);
    expect(rows.length).toBe(data.budgets.length);
    for (const r of rows) {
      expect(r.variance).toBe(r.budget - (r.actual + r.committed));
      if (r.budget > 0) {
        expect(r.utilizationPct).toBeCloseTo((r.actual + r.committed) / r.budget, 6);
      }
    }
  });
});

describe("forecasts", () => {
  it("appends projected months after the history", () => {
    const f = computeSpendForecast(data, 3);
    const projected = f.filter((p) => p.projected);
    expect(projected).toHaveLength(3);
    // History precedes projections chronologically.
    const months = f.map((p) => p.month);
    expect([...months].sort()).toEqual(months);
  });

  it("buckets unpaid invoices into cash-flow outflows", () => {
    const cf = computeCashFlowForecast(data);
    const totalUnpaid = data.invoices
      .filter((i) => i.status === "unpaid")
      .reduce((s, i) => s + i.amount, 0);
    const sum = cf.reduce((s, p) => s + p.outflow, 0);
    expect(sum).toBe(totalUnpaid);
  });
});
