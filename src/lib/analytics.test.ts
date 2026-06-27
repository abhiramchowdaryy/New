import { describe, expect, it } from "vitest";
import {
  buildCopilotSnapshot,
  computeDeliveryMetrics,
  computeHeadline,
  computeSpendSummary,
  computeSupplierRisks,
  detectInvoiceAnomalies,
} from "./analytics";
import { RISK_WEIGHTS, bandForScore } from "./config/risk";
import { SEED_AS_OF_DATE } from "./clock";
import { demoSeed } from "./data/seed";
import type { ProcurementDataset } from "./types";

// Pin the as-of date so anomaly/overdue tests are deterministic regardless of
// the PROCUREMENT_AS_OF_DATE env var.
const data: ProcurementDataset = { ...demoSeed, asOfDate: SEED_AS_OF_DATE };

describe("config invariants", () => {
  it("risk weights sum to 1", () => {
    const sum =
      RISK_WEIGHTS.financial +
      RISK_WEIGHTS.delivery +
      RISK_WEIGHTS.quality +
      RISK_WEIGHTS.compliance +
      RISK_WEIGHTS.onTime;
    expect(sum).toBeCloseTo(1, 10);
  });

  it("bands by score threshold", () => {
    expect(bandForScore(60)).toBe("high");
    expect(bandForScore(35)).toBe("medium");
    expect(bandForScore(34)).toBe("low");
  });
});

describe("computeSpendSummary", () => {
  const spend = computeSpendSummary(data);

  it("realized total equals the sum of its category breakdown", () => {
    const catSum = spend.byCategory.reduce((s, c) => s + c.amount, 0);
    expect(catSum).toBe(spend.total);
  });

  it("realized total equals the sum of its supplier breakdown", () => {
    const supSum = spend.bySupplier.reduce((s, c) => s + c.amount, 0);
    expect(supSum).toBe(spend.total);
  });

  it("committed open equals the sum of open POs", () => {
    const expected = data.purchaseOrders
      .filter((p) => p.status === "open")
      .reduce((s, p) => s + p.amount, 0);
    expect(spend.committedOpen).toBe(expected);
  });

  it("excludes cancelled POs from realized spend", () => {
    // PO-1023 is cancelled; its supplier (S06) realized spend must not include it.
    const cancelled = data.purchaseOrders.find((p) => p.status === "cancelled")!;
    expect(cancelled.id).toBe("PO-1023");
    const s06 = spend.bySupplier.find((s) => s.supplierId === "S06");
    // S06 has one received PO (PO-1007, 27500) and the cancelled one.
    expect(s06?.amount).toBe(27500);
  });

  it("sorts categories and suppliers by descending amount", () => {
    const cats = spend.byCategory.map((c) => c.amount);
    expect([...cats].sort((a, b) => b - a)).toEqual(cats);
    const sups = spend.bySupplier.map((s) => s.amount);
    expect([...sups].sort((a, b) => b - a)).toEqual(sups);
  });

  it("sorts the monthly trend chronologically", () => {
    const months = spend.monthlyTrend.map((m) => m.month);
    expect([...months].sort()).toEqual(months);
  });
});

describe("computeDeliveryMetrics", () => {
  const m = computeDeliveryMetrics(data);

  it("partitions deliveries into delivered + pending", () => {
    expect(m.onTime + m.late).toBe(m.delivered);
    expect(m.delivered + m.pending).toBe(m.total);
  });

  it("counts the four pending (undelivered) seed rows", () => {
    expect(m.pending).toBe(4);
  });

  it("derives on-time rate from delivered POs only", () => {
    expect(m.onTimeRate).toBeCloseTo(m.onTime / m.delivered, 10);
    expect(m.onTimeRate).toBeGreaterThanOrEqual(0);
    expect(m.onTimeRate).toBeLessThanOrEqual(1);
  });

  it("sorts late deliveries by descending days late", () => {
    const days = m.lateDeliveries.map((d) => d.daysLate);
    expect([...days].sort((a, b) => b - a)).toEqual(days);
    expect(days.every((d) => d > 0)).toBe(true);
  });
});

describe("computeSupplierRisks", () => {
  const risks = computeSupplierRisks(data);

  it("scores every supplier", () => {
    expect(risks).toHaveLength(8);
  });

  it("sorts by descending risk score", () => {
    const scores = risks.map((r) => r.score);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
  });

  it("keeps band consistent with score and always explains drivers", () => {
    for (const r of risks) {
      expect(r.band).toBe(bandForScore(r.score));
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
      expect(r.drivers.length).toBeGreaterThan(0);
      expect(r.onTimeRate).toBeGreaterThanOrEqual(0);
      expect(r.onTimeRate).toBeLessThanOrEqual(1);
    }
  });
});

describe("detectInvoiceAnomalies", () => {
  const anomalies = detectInvoiceAnomalies(data);

  it("flags the seeded duplicate invoice (INV-5015)", () => {
    const dup = anomalies.find((a) => a.type === "duplicate");
    expect(dup?.invoiceId).toBe("INV-5015");
    expect(dup?.severity).toBe("high");
  });

  it("flags seeded price variances over the PO amount", () => {
    const variances = anomalies.filter((a) => a.type === "price_variance");
    const ids = variances.map((v) => v.invoiceId);
    expect(ids).toContain("INV-5004");
    expect(ids).toContain("INV-5018");
  });

  it("flags an overdue unpaid invoice past 30 days as high severity", () => {
    // INV-5019: unpaid, due 2025-05-25, as-of 2025-06-26 => 32 days overdue.
    const overdue = anomalies.find(
      (a) => a.type === "overdue" && a.invoiceId === "INV-5019",
    );
    expect(overdue?.severity).toBe("high");
  });

  it("orders anomalies by descending severity", () => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    const seq = anomalies.map((a) => rank[a.severity]);
    expect([...seq].sort((a, b) => a - b)).toEqual(seq);
  });
});

describe("grounding snapshot", () => {
  it("anchors to the seed as-of date and is internally consistent with the UI math", () => {
    const snap = buildCopilotSnapshot(data);
    const spend = computeSpendSummary(data);
    const headline = computeHeadline(data);

    expect(snap.asOfDate).toBe(SEED_AS_OF_DATE);
    expect(snap.currency).toBe("USD");
    expect(snap.spend.totalRealized).toBe(spend.total);
    expect(headline.totalSpend).toBe(spend.total);
    // Top suppliers in the snapshot are capped at 8 and come from the same math.
    expect(snap.spend.topSuppliers.length).toBeLessThanOrEqual(8);
  });
});
