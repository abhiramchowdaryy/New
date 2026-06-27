// Advanced procurement analytics (Phase 7) — all pure over a ProcurementDataset.
//
// Spend cube, ABC/Pareto, supplier scorecards, cycle/lead time, budget vs
// actual, spend forecast, and cash-flow forecast. These compose the base
// analytics so figures stay consistent with the dashboards and the copilot.

import {
  computeDeliveryMetrics,
  computeSpendSummary,
  computeSupplierRisks,
  detectInvoiceAnomalies,
} from "./analytics";
import { indexDataset } from "./data/dataset";
import { daysBetween } from "./format";
import type {
  AbcEntry,
  BudgetVarianceRow,
  CashFlowPoint,
  CycleTimeMetrics,
  ForecastPoint,
  ProcurementDataset,
  SpendCategory,
  SpendCubeCell,
  SupplierScorecard,
} from "./types";

const REALIZED = new Set(["received", "closed"]);

/** Multidimensional spend facts: category × supplier × month. */
export function computeSpendCube(data: ProcurementDataset): SpendCubeCell[] {
  const { supplierName } = indexDataset(data);
  const cells = new Map<string, SpendCubeCell>();
  for (const p of data.purchaseOrders) {
    if (!REALIZED.has(p.status)) continue;
    const month = p.orderDate.slice(0, 7);
    const key = `${p.category}|${p.supplierId}|${month}`;
    const existing = cells.get(key);
    if (existing) {
      existing.amount += p.amount;
    } else {
      cells.set(key, {
        category: p.category,
        supplierId: p.supplierId,
        supplierName: supplierName(p.supplierId),
        month,
        amount: p.amount,
      });
    }
  }
  return [...cells.values()].sort((a, b) => b.amount - a.amount);
}

/**
 * ABC classification (Pareto): suppliers ranked by spend with running
 * cumulative share. A ≤ 80%, B ≤ 95%, C the long tail.
 */
export function computeAbcAnalysis(data: ProcurementDataset): AbcEntry[] {
  const spend = computeSpendSummary(data);
  const total = spend.total || 1;
  let cumulative = 0;
  return spend.bySupplier.map((s) => {
    const spendPct = s.amount / total;
    cumulative += s.amount;
    const cumulativePct = cumulative / total;
    const abcClass = cumulativePct <= 0.8 ? "A" : cumulativePct <= 0.95 ? "B" : "C";
    return {
      supplierId: s.supplierId,
      name: s.name,
      spend: s.amount,
      spendPct,
      cumulativePct,
      abcClass,
    };
  });
}

/** Per-supplier scorecard blending spend, delivery, quality, risk, anomalies. */
export function computeSupplierScorecards(
  data: ProcurementDataset,
): SupplierScorecard[] {
  const risks = computeSupplierRisks(data);
  const riskById = new Map(risks.map((r) => [r.supplierId, r]));
  const anomalies = detectInvoiceAnomalies(data);
  const anomaliesBySupplier = new Map<string, number>();
  for (const a of anomalies) {
    anomaliesBySupplier.set(a.supplierId, (anomaliesBySupplier.get(a.supplierId) ?? 0) + 1);
  }

  // Per-supplier avg days late from delivered POs.
  const posBySupplier = new Map<string, Set<string>>();
  for (const p of data.purchaseOrders) {
    const set = posBySupplier.get(p.supplierId) ?? new Set<string>();
    set.add(p.id);
    posBySupplier.set(p.supplierId, set);
  }

  return data.suppliers
    .map<SupplierScorecard>((s) => {
      const poIds = posBySupplier.get(s.id) ?? new Set<string>();
      const delivered = data.deliveries.filter(
        (d) => poIds.has(d.poId) && d.actualDate !== null,
      );
      const lateDays = delivered
        .map((d) => daysBetween(d.expectedDate, d.actualDate!))
        .filter((n) => n > 0);
      const avgDaysLate =
        lateDays.length === 0
          ? 0
          : lateDays.reduce((sum, n) => sum + n, 0) / lateDays.length;
      const risk = riskById.get(s.id);
      return {
        supplierId: s.id,
        name: s.name,
        category: s.category,
        totalSpend: risk?.totalSpend ?? 0,
        onTimeRate: risk?.onTimeRate ?? 1,
        avgDaysLate,
        qualityScore: s.qualityScore,
        riskScore: risk?.score ?? 0,
        openPoCount: risk?.openPoCount ?? 0,
        flaggedInvoiceCount: anomaliesBySupplier.get(s.id) ?? 0,
      };
    })
    .sort((a, b) => b.totalSpend - a.totalSpend);
}

/** Lead time (order→expected) and cycle time (order→actual delivery). */
export function computeCycleTime(data: ProcurementDataset): CycleTimeMetrics {
  const poById = new Map(data.purchaseOrders.map((p) => [p.id, p]));

  const leadAll: number[] = [];
  const cycleAll: number[] = [];
  const delayAll: number[] = [];
  const byCat = new Map<SpendCategory, { lead: number[]; cycle: number[] }>();

  for (const d of data.deliveries) {
    const po = poById.get(d.poId);
    if (!po) continue;
    const lead = daysBetween(po.orderDate, d.expectedDate);
    leadAll.push(lead);
    const bucket = byCat.get(po.category) ?? { lead: [], cycle: [] };
    bucket.lead.push(lead);
    if (d.actualDate) {
      const cycle = daysBetween(po.orderDate, d.actualDate);
      cycleAll.push(cycle);
      delayAll.push(daysBetween(d.expectedDate, d.actualDate));
      bucket.cycle.push(cycle);
    }
    byCat.set(po.category, bucket);
  }

  const avg = (xs: number[]) => (xs.length === 0 ? 0 : xs.reduce((s, n) => s + n, 0) / xs.length);

  return {
    avgLeadTimeDays: Math.round(avg(leadAll) * 10) / 10,
    avgCycleTimeDays: Math.round(avg(cycleAll) * 10) / 10,
    avgDelayDays: Math.round(avg(delayAll) * 10) / 10,
    byCategory: [...byCat.entries()]
      .map(([category, v]) => ({
        category,
        avgLeadTimeDays: Math.round(avg(v.lead) * 10) / 10,
        avgCycleTimeDays: Math.round(avg(v.cycle) * 10) / 10,
      }))
      .sort((a, b) => a.category.localeCompare(b.category)),
  };
}

/** Budget vs actual (realized) + committed (open) by category. */
export function computeBudgetVariance(data: ProcurementDataset): BudgetVarianceRow[] {
  const actualByCat = new Map<SpendCategory, number>();
  const committedByCat = new Map<SpendCategory, number>();
  for (const p of data.purchaseOrders) {
    if (REALIZED.has(p.status)) {
      actualByCat.set(p.category, (actualByCat.get(p.category) ?? 0) + p.amount);
    } else if (p.status === "open") {
      committedByCat.set(p.category, (committedByCat.get(p.category) ?? 0) + p.amount);
    }
  }

  return data.budgets
    .map<BudgetVarianceRow>((b) => {
      const actual = actualByCat.get(b.category) ?? 0;
      const committed = committedByCat.get(b.category) ?? 0;
      const variance = b.amount - (actual + committed);
      const utilizationPct = b.amount === 0 ? 0 : (actual + committed) / b.amount;
      return {
        category: b.category,
        budget: b.amount,
        actual,
        committed,
        variance,
        utilizationPct,
      };
    })
    .sort((a, b) => b.utilizationPct - a.utilizationPct);
}

function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Spend forecast: historical monthly trend + a trailing-average projection for
 * the next `monthsAhead` months. Deterministic and explainable (no black box).
 */
export function computeSpendForecast(
  data: ProcurementDataset,
  monthsAhead = 3,
): ForecastPoint[] {
  const trend = computeSpendSummary(data).monthlyTrend;
  const history: ForecastPoint[] = trend.map((t) => ({
    month: t.month,
    amount: t.amount,
    projected: false,
  }));
  if (trend.length === 0) return history;

  const window = trend.slice(-3);
  const avg = window.reduce((s, t) => s + t.amount, 0) / window.length;

  const out = [...history];
  let last = trend[trend.length - 1].month;
  for (let i = 0; i < monthsAhead; i++) {
    last = addMonths(last, 1);
    out.push({ month: last, amount: Math.round(avg), projected: true });
  }
  return out;
}

/** Cash-flow outlook: unpaid invoice value bucketed by due month. */
export function computeCashFlowForecast(data: ProcurementDataset): CashFlowPoint[] {
  const byMonth = new Map<string, number>();
  for (const inv of data.invoices) {
    if (inv.status !== "unpaid") continue;
    const month = inv.dueDate.slice(0, 7);
    byMonth.set(month, (byMonth.get(month) ?? 0) + inv.amount);
  }
  return [...byMonth.entries()]
    .map(([month, outflow]) => ({ month, outflow }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/** Convenience: deliver every Phase 7 view in one call (used by the copilot). */
export function computeAdvancedAnalytics(data: ProcurementDataset) {
  return {
    spendCube: computeSpendCube(data),
    abc: computeAbcAnalysis(data),
    scorecards: computeSupplierScorecards(data),
    cycleTime: computeCycleTime(data),
    budgetVariance: computeBudgetVariance(data),
    forecast: computeSpendForecast(data),
    cashFlow: computeCashFlowForecast(data),
  };
}
