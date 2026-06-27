// Pure, deterministic analytics over a tenant-scoped dataset.
//
// Every function takes an explicit ProcurementDataset (supplied by the
// repository) and returns derived shapes. Keeping these pure and dataset-driven
// is what lets the dashboards and the copilot share one source of truth while
// the data itself stays tenant-isolated.

import { daysBetween } from "./format";
import { indexDataset } from "./data/dataset";
import {
  ANOMALY_CONFIG,
  RISK_DRIVER_THRESHOLDS,
  RISK_WEIGHTS,
  bandForScore,
} from "./config/risk";
import type {
  DeliveryMetrics,
  InvoiceAnomaly,
  ProcurementDataset,
  SpendCategory,
  SpendSummary,
  SupplierRisk,
} from "./types";

// Spend counts received/closed POs as realized spend; open POs are "committed".
const REALIZED_STATUSES = new Set(["received", "closed"]);

export function computeSpendSummary(data: ProcurementDataset): SpendSummary {
  const { supplierName } = indexDataset(data);
  const pos = data.purchaseOrders;
  const realized = pos.filter((p) => REALIZED_STATUSES.has(p.status));

  const total = realized.reduce((sum, p) => sum + p.amount, 0);
  const committedOpen = pos
    .filter((p) => p.status === "open")
    .reduce((sum, p) => sum + p.amount, 0);

  const byCategoryMap = new Map<SpendCategory, number>();
  const bySupplierMap = new Map<string, number>();
  const byMonthMap = new Map<string, number>();

  for (const p of realized) {
    byCategoryMap.set(p.category, (byCategoryMap.get(p.category) ?? 0) + p.amount);
    bySupplierMap.set(p.supplierId, (bySupplierMap.get(p.supplierId) ?? 0) + p.amount);
    const month = p.orderDate.slice(0, 7); // YYYY-MM
    byMonthMap.set(month, (byMonthMap.get(month) ?? 0) + p.amount);
  }

  const byCategory = [...byCategoryMap.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount);

  const bySupplier = [...bySupplierMap.entries()]
    .map(([supplierId, amount]) => ({
      supplierId,
      name: supplierName(supplierId),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const monthlyTrend = [...byMonthMap.entries()]
    .map(([month, amount]) => ({ month, amount }))
    .sort((a, b) => a.month.localeCompare(b.month));

  return { total, committedOpen, byCategory, bySupplier, monthlyTrend };
}

export function computeDeliveryMetrics(data: ProcurementDataset): DeliveryMetrics {
  const { supplierName, purchaseOrder } = indexDataset(data);
  const deliveries = data.deliveries;

  let onTime = 0;
  let late = 0;
  let pending = 0;
  let totalDaysLate = 0;

  const lateDeliveries: DeliveryMetrics["lateDeliveries"] = [];

  for (const d of deliveries) {
    if (d.actualDate === null) {
      pending += 1;
      continue;
    }
    const daysLate = daysBetween(d.expectedDate, d.actualDate);
    if (daysLate > 0) {
      late += 1;
      totalDaysLate += daysLate;
      const po = purchaseOrder(d.poId);
      lateDeliveries.push({
        deliveryId: d.id,
        poId: d.poId,
        supplierName: po ? supplierName(po.supplierId) : d.poId,
        expectedDate: d.expectedDate,
        actualDate: d.actualDate,
        daysLate,
      });
    } else {
      onTime += 1;
    }
  }

  lateDeliveries.sort((a, b) => b.daysLate - a.daysLate);

  const delivered = onTime + late;
  const onTimeRate = delivered === 0 ? 1 : onTime / delivered;
  const avgDaysLate = late === 0 ? 0 : totalDaysLate / late;

  return {
    total: deliveries.length,
    delivered,
    pending,
    onTime,
    late,
    onTimeRate,
    avgDaysLate,
    lateDeliveries,
  };
}

/** On-time delivery rate for one supplier, from their delivered POs. */
function supplierOnTimeRate(
  data: ProcurementDataset,
  supplierId: string,
): number | null {
  const poIds = new Set(
    data.purchaseOrders
      .filter((p) => p.supplierId === supplierId)
      .map((p) => p.id),
  );
  const supplierDeliveries = data.deliveries.filter(
    (d) => poIds.has(d.poId) && d.actualDate !== null,
  );
  if (supplierDeliveries.length === 0) return null;
  const onTime = supplierDeliveries.filter(
    (d) => daysBetween(d.expectedDate, d.actualDate!) <= 0,
  ).length;
  return onTime / supplierDeliveries.length;
}

/**
 * Composite supplier risk, 0-100 (higher = riskier).
 * Weighted inverse of sub-scores, blended with live on-time performance.
 */
export function computeSupplierRisks(data: ProcurementDataset): SupplierRisk[] {
  const spend = computeSpendSummary(data);
  const spendBySupplier = new Map(spend.bySupplier.map((s) => [s.supplierId, s.amount]));
  const openPoBySupplier = new Map<string, number>();
  for (const p of data.purchaseOrders) {
    if (p.status === "open") {
      openPoBySupplier.set(p.supplierId, (openPoBySupplier.get(p.supplierId) ?? 0) + 1);
    }
  }

  const risks = data.suppliers.map<SupplierRisk>((s) => {
    const liveOnTime = supplierOnTimeRate(data, s.id);
    const onTimeRate = liveOnTime ?? (s.onTimeRateOverride ?? s.deliveryScore / 100);

    // Sub-score weights (sum = 1). Financial + delivery dominate.
    const deliveryRisk = 100 - s.deliveryScore;
    const qualityRisk = 100 - s.qualityScore;
    const financialRisk = 100 - s.financialScore;
    const complianceRisk = 100 - s.complianceScore;
    const onTimeRisk = (1 - onTimeRate) * 100;

    const score = Math.round(
      RISK_WEIGHTS.financial * financialRisk +
        RISK_WEIGHTS.delivery * deliveryRisk +
        RISK_WEIGHTS.quality * qualityRisk +
        RISK_WEIGHTS.compliance * complianceRisk +
        RISK_WEIGHTS.onTime * onTimeRisk,
    );

    const drivers: string[] = [];
    if (financialRisk >= RISK_DRIVER_THRESHOLDS.financial) drivers.push("Weak financial-health signal");
    if (onTimeRisk >= RISK_DRIVER_THRESHOLDS.onTime) drivers.push(`Low on-time delivery (${Math.round(onTimeRate * 100)}%)`);
    if (qualityRisk >= RISK_DRIVER_THRESHOLDS.quality) drivers.push("Below-target quality/acceptance");
    if (complianceRisk >= RISK_DRIVER_THRESHOLDS.compliance) drivers.push("Compliance/certification gaps");
    if (drivers.length === 0) drivers.push("Healthy across all signals");

    return {
      supplierId: s.id,
      name: s.name,
      category: s.category,
      score,
      band: bandForScore(score),
      drivers,
      onTimeRate,
      totalSpend: spendBySupplier.get(s.id) ?? 0,
      openPoCount: openPoBySupplier.get(s.id) ?? 0,
    };
  });

  return risks.sort((a, b) => b.score - a.score);
}

export function detectInvoiceAnomalies(data: ProcurementDataset): InvoiceAnomaly[] {
  const invoices = data.invoices;
  const { purchaseOrder } = indexDataset(data);
  const anomalies: InvoiceAnomaly[] = [];

  // Duplicate detection in O(n): bucket by supplier+amount, then compare within
  // each (typically tiny) bucket in issue-date order. Scales to large invoice
  // volumes where the previous pairwise O(n²) scan would not.
  const buckets = new Map<string, typeof invoices>();
  for (const inv of invoices) {
    const key = `${inv.supplierId}|${inv.amount}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(inv);
    else buckets.set(key, [inv]);
  }
  for (const bucket of buckets.values()) {
    if (bucket.length < 2) continue;
    const sorted = [...bucket].sort((a, b) => a.issueDate.localeCompare(b.issueDate));
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (daysBetween(prev.issueDate, cur.issueDate) <= ANOMALY_CONFIG.duplicateWindowDays) {
        anomalies.push({
          invoiceId: cur.id,
          supplierId: cur.supplierId,
          type: "duplicate",
          severity: "high",
          message: `Possible duplicate of ${prev.id} — same supplier and amount within ${ANOMALY_CONFIG.duplicateWindowDays} days.`,
          amount: cur.amount,
        });
      }
    }
  }

  for (const inv of invoices) {
    // Price variance vs linked PO.
    const po = purchaseOrder(inv.poId);
    if (po && inv.amount > po.amount * (1 + ANOMALY_CONFIG.priceVarianceThreshold)) {
      const over = inv.amount - po.amount;
      const pct = Math.round((over / po.amount) * 100);
      anomalies.push({
        invoiceId: inv.id,
        supplierId: inv.supplierId,
        type: "price_variance",
        severity: pct >= ANOMALY_CONFIG.priceVarianceHighPct ? "high" : "medium",
        message: `Billed ${pct}% over ${po.id} (${over.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} above PO).`,
        amount: inv.amount,
      });
    }

    // Overdue: past due date and unpaid (relative to the dataset's as-of date).
    if (inv.status === "unpaid" && daysBetween(inv.dueDate, data.asOfDate) > 0) {
      const daysOverdue = daysBetween(inv.dueDate, data.asOfDate);
      anomalies.push({
        invoiceId: inv.id,
        supplierId: inv.supplierId,
        type: "overdue",
        severity: daysOverdue >= ANOMALY_CONFIG.overdueHighDays ? "high" : "medium",
        message: `Unpaid and ${daysOverdue} days past due (due ${inv.dueDate}).`,
        amount: inv.amount,
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return anomalies.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Compact, accurate snapshot used to ground the copilot. */
export function buildCopilotSnapshot(data: ProcurementDataset) {
  const { supplierName } = indexDataset(data);
  const spend = computeSpendSummary(data);
  const delivery = computeDeliveryMetrics(data);
  const risks = computeSupplierRisks(data);
  const anomalies = detectInvoiceAnomalies(data);

  return {
    asOfDate: data.asOfDate,
    currency: "USD",
    spend: {
      totalRealized: spend.total,
      committedOpen: spend.committedOpen,
      byCategory: spend.byCategory,
      topSuppliers: spend.bySupplier.slice(0, 8),
      monthlyTrend: spend.monthlyTrend,
    },
    delivery: {
      onTimeRatePct: Math.round(delivery.onTimeRate * 100),
      onTime: delivery.onTime,
      late: delivery.late,
      pending: delivery.pending,
      avgDaysLate: Math.round(delivery.avgDaysLate * 10) / 10,
      worstLate: delivery.lateDeliveries.slice(0, 5),
    },
    supplierRisk: risks.map((r) => ({
      supplier: r.name,
      category: r.category,
      riskScore: r.score,
      band: r.band,
      onTimeRatePct: Math.round(r.onTimeRate * 100),
      totalSpend: r.totalSpend,
      drivers: r.drivers,
    })),
    invoiceAnomalies: anomalies.map((a) => ({
      invoice: a.invoiceId,
      supplier: supplierName(a.supplierId),
      type: a.type,
      severity: a.severity,
      amount: a.amount,
      detail: a.message,
    })),
  };
}

// Convenience headline numbers for KPI cards.
export function computeHeadline(data: ProcurementDataset) {
  const spend = computeSpendSummary(data);
  const delivery = computeDeliveryMetrics(data);
  const risks = computeSupplierRisks(data);
  const anomalies = detectInvoiceAnomalies(data);
  return {
    totalSpend: spend.total,
    committedOpen: spend.committedOpen,
    onTimeRate: delivery.onTimeRate,
    highRiskSuppliers: risks.filter((r) => r.band === "high").length,
    flaggedInvoices: anomalies.length,
    flaggedInvoiceValue: anomalies.reduce((s, a) => s + a.amount, 0),
  };
}
