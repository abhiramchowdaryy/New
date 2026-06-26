// Pure, deterministic analytics over the data layer.
// These power both the UI and the copilot's grounding snapshot.

import {
  TODAY,
  getDeliveries,
  getInvoices,
  getPurchaseOrders,
  getSupplier,
  getSuppliers,
  supplierName,
} from "./data";
import { daysBetween } from "./format";
import type {
  DeliveryMetrics,
  InvoiceAnomaly,
  RiskBand,
  SpendCategory,
  SpendSummary,
  SupplierRisk,
} from "./types";

// Spend counts received/closed POs as realized spend; open POs are "committed".
const REALIZED_STATUSES = new Set(["received", "closed"]);

export function computeSpendSummary(): SpendSummary {
  const pos = getPurchaseOrders();
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

export function computeDeliveryMetrics(): DeliveryMetrics {
  const deliveries = getDeliveries();
  const pos = new Map(getPurchaseOrders().map((p) => [p.id, p]));

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
      const po = pos.get(d.poId);
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
function supplierOnTimeRate(supplierId: string): number | null {
  const poIds = new Set(
    getPurchaseOrders()
      .filter((p) => p.supplierId === supplierId)
      .map((p) => p.id),
  );
  const supplierDeliveries = getDeliveries().filter(
    (d) => poIds.has(d.poId) && d.actualDate !== null,
  );
  if (supplierDeliveries.length === 0) return null;
  const onTime = supplierDeliveries.filter(
    (d) => daysBetween(d.expectedDate, d.actualDate!) <= 0,
  ).length;
  return onTime / supplierDeliveries.length;
}

function bandFor(score: number): RiskBand {
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

/**
 * Composite supplier risk, 0-100 (higher = riskier).
 * Weighted inverse of sub-scores, blended with live on-time performance.
 */
export function computeSupplierRisks(): SupplierRisk[] {
  const spend = computeSpendSummary();
  const spendBySupplier = new Map(spend.bySupplier.map((s) => [s.supplierId, s.amount]));
  const openPoBySupplier = new Map<string, number>();
  for (const p of getPurchaseOrders()) {
    if (p.status === "open") {
      openPoBySupplier.set(p.supplierId, (openPoBySupplier.get(p.supplierId) ?? 0) + 1);
    }
  }

  const risks = getSuppliers().map<SupplierRisk>((s) => {
    const liveOnTime = supplierOnTimeRate(s.id);
    const onTimeRate = liveOnTime ?? (s.onTimeRateOverride ?? s.deliveryScore / 100);

    // Sub-score weights (sum = 1). Financial + delivery dominate.
    const deliveryRisk = 100 - s.deliveryScore;
    const qualityRisk = 100 - s.qualityScore;
    const financialRisk = 100 - s.financialScore;
    const complianceRisk = 100 - s.complianceScore;
    const onTimeRisk = (1 - onTimeRate) * 100;

    const score = Math.round(
      0.3 * financialRisk +
        0.2 * deliveryRisk +
        0.15 * qualityRisk +
        0.15 * complianceRisk +
        0.2 * onTimeRisk,
    );

    const drivers: string[] = [];
    if (financialRisk >= 45) drivers.push("Weak financial-health signal");
    if (onTimeRisk >= 40) drivers.push(`Low on-time delivery (${Math.round(onTimeRate * 100)}%)`);
    if (qualityRisk >= 35) drivers.push("Below-target quality/acceptance");
    if (complianceRisk >= 40) drivers.push("Compliance/certification gaps");
    if (drivers.length === 0) drivers.push("Healthy across all signals");

    return {
      supplierId: s.id,
      name: s.name,
      category: s.category,
      score,
      band: bandFor(score),
      drivers,
      onTimeRate,
      totalSpend: spendBySupplier.get(s.id) ?? 0,
      openPoCount: openPoBySupplier.get(s.id) ?? 0,
    };
  });

  return risks.sort((a, b) => b.score - a.score);
}

const DUP_WINDOW_DAYS = 10;
const PRICE_VARIANCE_THRESHOLD = 0.05; // >5% over PO amount

export function detectInvoiceAnomalies(): InvoiceAnomaly[] {
  const invoices = getInvoices();
  const pos = new Map(getPurchaseOrders().map((p) => [p.id, p]));
  const anomalies: InvoiceAnomaly[] = [];

  // Duplicate detection: same supplier + amount within a short window.
  for (let i = 0; i < invoices.length; i++) {
    for (let j = i + 1; j < invoices.length; j++) {
      const a = invoices[i];
      const b = invoices[j];
      if (
        a.supplierId === b.supplierId &&
        a.amount === b.amount &&
        Math.abs(daysBetween(a.issueDate, b.issueDate)) <= DUP_WINDOW_DAYS
      ) {
        anomalies.push({
          invoiceId: b.id,
          supplierId: b.supplierId,
          type: "duplicate",
          severity: "high",
          message: `Possible duplicate of ${a.id} — same supplier and amount within ${DUP_WINDOW_DAYS} days.`,
          amount: b.amount,
        });
      }
    }
  }

  for (const inv of invoices) {
    // Price variance vs linked PO.
    const po = pos.get(inv.poId);
    if (po && inv.amount > po.amount * (1 + PRICE_VARIANCE_THRESHOLD)) {
      const over = inv.amount - po.amount;
      const pct = Math.round((over / po.amount) * 100);
      anomalies.push({
        invoiceId: inv.id,
        supplierId: inv.supplierId,
        type: "price_variance",
        severity: pct >= 20 ? "high" : "medium",
        message: `Billed ${pct}% over ${po.id} (${over.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })} above PO).`,
        amount: inv.amount,
      });
    }

    // Overdue: past due date and unpaid.
    if (inv.status === "unpaid" && daysBetween(inv.dueDate, TODAY) > 0) {
      const daysOverdue = daysBetween(inv.dueDate, TODAY);
      anomalies.push({
        invoiceId: inv.id,
        supplierId: inv.supplierId,
        type: "overdue",
        severity: daysOverdue >= 30 ? "high" : "medium",
        message: `Unpaid and ${daysOverdue} days past due (due ${inv.dueDate}).`,
        amount: inv.amount,
      });
    }
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return anomalies.sort((a, b) => order[a.severity] - order[b.severity]);
}

/** Compact, accurate snapshot used to ground the copilot. */
export function buildCopilotSnapshot() {
  const spend = computeSpendSummary();
  const delivery = computeDeliveryMetrics();
  const risks = computeSupplierRisks();
  const anomalies = detectInvoiceAnomalies();

  return {
    asOfDate: TODAY,
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
      supplier: getSupplier(a.supplierId)?.name ?? a.supplierId,
      type: a.type,
      severity: a.severity,
      amount: a.amount,
      detail: a.message,
    })),
  };
}

// Convenience headline numbers for KPI cards.
export function computeHeadline() {
  const spend = computeSpendSummary();
  const delivery = computeDeliveryMetrics();
  const risks = computeSupplierRisks();
  const anomalies = detectInvoiceAnomalies();
  return {
    totalSpend: spend.total,
    committedOpen: spend.committedOpen,
    onTimeRate: delivery.onTimeRate,
    highRiskSuppliers: risks.filter((r) => r.band === "high").length,
    flaggedInvoices: anomalies.length,
    flaggedInvoiceValue: anomalies.reduce((s, a) => s + a.amount, 0),
  };
}
