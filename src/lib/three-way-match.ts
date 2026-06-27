// Three-way match (Phase 4 domain depth): PO ↔ Goods Receipt ↔ Invoice.
//
// The core P2P control: an invoice should only pay when it matches an authorized
// PO (price) and confirmed receipt of goods (quantity/value). Pure over the
// dataset; degrades gracefully when GR data is absent (reports `no_receipt`).

import { ANOMALY_CONFIG } from "./config/risk";
import { money } from "./format";
import type {
  ProcurementDataset,
  ThreeWayMatchRow,
  ThreeWayMatchStatus,
} from "./types";

export function computeThreeWayMatch(data: ProcurementDataset): ThreeWayMatchRow[] {
  const poById = new Map(data.purchaseOrders.map((p) => [p.id, p]));
  const tolerance = ANOMALY_CONFIG.priceVarianceThreshold;

  // Accepted GR value per PO (rejected receipts don't count toward goods in).
  const receivedByPo = new Map<string, number>();
  for (const gr of data.goodsReceipts ?? []) {
    if (gr.status === "rejected") continue;
    receivedByPo.set(gr.poId, (receivedByPo.get(gr.poId) ?? 0) + gr.acceptedAmount);
  }

  return data.invoices.map<ThreeWayMatchRow>((inv) => {
    const po = poById.get(inv.poId);
    const receivedAmount = receivedByPo.get(inv.poId) ?? 0;
    const hasReceipt = receivedByPo.has(inv.poId);

    let status: ThreeWayMatchStatus;
    let detail: string;

    if (!po) {
      status = "no_po";
      detail = `No purchase order ${inv.poId} found for this invoice.`;
    } else if (!hasReceipt) {
      status = "no_receipt";
      detail = `No goods receipt recorded against ${po.id}; cannot confirm delivery.`;
    } else if (inv.amount > po.amount * (1 + tolerance)) {
      status = "price_mismatch";
      detail = `Invoice ${money(inv.amount)} exceeds PO ${money(po.amount)} beyond tolerance.`;
    } else if (inv.amount > receivedAmount * (1 + tolerance)) {
      status = "quantity_mismatch";
      detail = `Invoice ${money(inv.amount)} exceeds goods accepted ${money(receivedAmount)}.`;
    } else {
      status = "matched";
      detail = "PO, receipt, and invoice agree within tolerance.";
    }

    return {
      invoiceId: inv.id,
      poId: inv.poId,
      supplierId: inv.supplierId,
      invoiceAmount: inv.amount,
      poAmount: po ? po.amount : null,
      receivedAmount,
      status,
      detail,
    };
  });
}

export interface ThreeWayMatchSummary {
  total: number;
  matched: number;
  exceptions: number;
  byStatus: Record<ThreeWayMatchStatus, number>;
  blockedValue: number; // invoice value that failed to match
}

export function summarizeThreeWayMatch(
  rows: ThreeWayMatchRow[],
): ThreeWayMatchSummary {
  const byStatus: Record<ThreeWayMatchStatus, number> = {
    matched: 0,
    no_po: 0,
    no_receipt: 0,
    price_mismatch: 0,
    quantity_mismatch: 0,
  };
  let blockedValue = 0;
  for (const r of rows) {
    byStatus[r.status] += 1;
    if (r.status !== "matched") blockedValue += r.invoiceAmount;
  }
  return {
    total: rows.length,
    matched: byStatus.matched,
    exceptions: rows.length - byStatus.matched,
    byStatus,
    blockedValue,
  };
}
