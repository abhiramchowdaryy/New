import { describe, expect, it } from "vitest";
import { computeThreeWayMatch, summarizeThreeWayMatch } from "./three-way-match";
import { SEED_AS_OF_DATE } from "./clock";
import { demoSeed } from "./data/seed";
import type { ProcurementDataset } from "./types";

const data: ProcurementDataset = { ...demoSeed, asOfDate: SEED_AS_OF_DATE };

describe("three-way match (seed data)", () => {
  const rows = computeThreeWayMatch(data);
  const byId = new Map(rows.map((r) => [r.invoiceId, r]));

  it("matches a clean invoice (PO + full receipt, in tolerance)", () => {
    expect(byId.get("INV-5001")?.status).toBe("matched");
  });

  it("flags an over-billed invoice as a price mismatch", () => {
    // INV-5004 bills 41,600 on PO-1004 (32,000).
    expect(byId.get("INV-5004")?.status).toBe("price_mismatch");
  });

  it("summary reconciles matched + exceptions to the total", () => {
    const s = summarizeThreeWayMatch(rows);
    expect(s.matched + s.exceptions).toBe(s.total);
    expect(s.blockedValue).toBeGreaterThan(0);
  });
});

describe("three-way match (synthetic edge cases)", () => {
  const base: ProcurementDataset = {
    suppliers: [],
    purchaseOrders: [
      { id: "PO1", supplierId: "S1", category: "Logistics", amount: 1000, status: "received", orderDate: "2025-01-01", expectedDate: "2025-01-10" },
    ],
    invoices: [
      { id: "INV-NOPO", supplierId: "S1", poId: "PO-MISSING", amount: 100, issueDate: "2025-01-05", dueDate: "2025-02-05", status: "unpaid" },
      { id: "INV-NOGR", supplierId: "S1", poId: "PO1", amount: 1000, issueDate: "2025-01-11", dueDate: "2025-02-11", status: "unpaid" },
    ],
    deliveries: [],
    budgets: [],
    contracts: [],
    goodsReceipts: [], // no receipts at all
    asOfDate: SEED_AS_OF_DATE,
  };

  it("reports no_po when the PO is missing and no_receipt when goods aren't received", () => {
    const rows = computeThreeWayMatch(base);
    const byId = new Map(rows.map((r) => [r.invoiceId, r]));
    expect(byId.get("INV-NOPO")?.status).toBe("no_po");
    expect(byId.get("INV-NOGR")?.status).toBe("no_receipt");
  });

  it("reports quantity_mismatch when invoice exceeds accepted goods", () => {
    const rows = computeThreeWayMatch({
      ...base,
      goodsReceipts: [
        { id: "GR1", poId: "PO1", receivedDate: "2025-01-10", acceptedAmount: 500, status: "partial" },
      ],
    });
    expect(rows.find((r) => r.invoiceId === "INV-NOGR")?.status).toBe("quantity_mismatch");
  });
});
