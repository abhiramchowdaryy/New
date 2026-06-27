// Seed dataset for the demo organization.
//
// These arrays are the data the in-memory repository loads for the demo tenant.
// A production adapter (Postgres/Prisma, SAP, CSV) replaces the repository, not
// this file. Analytics never imports these directly — it receives a
// tenant-scoped ProcurementDataset from the repository.

import type {
  Budget,
  Contract,
  Delivery,
  Invoice,
  PurchaseOrder,
  Supplier,
} from "../types";

export const suppliers: Supplier[] = [
  {
    id: "S01",
    name: "Apex Steel Works",
    category: "Raw Materials",
    country: "USA",
    deliveryScore: 82,
    qualityScore: 88,
    financialScore: 74,
    complianceScore: 80,
  },
  {
    id: "S02",
    name: "Meridian Logistics",
    category: "Logistics",
    country: "Germany",
    deliveryScore: 58,
    qualityScore: 70,
    financialScore: 61,
    complianceScore: 66,
  },
  {
    id: "S03",
    name: "NovaCloud Systems",
    category: "IT & Software",
    country: "USA",
    deliveryScore: 95,
    qualityScore: 92,
    financialScore: 90,
    complianceScore: 94,
  },
  {
    id: "S04",
    name: "Harbor Packaging Co",
    category: "Packaging",
    country: "Mexico",
    deliveryScore: 47,
    qualityScore: 55,
    financialScore: 42,
    complianceScore: 50,
  },
  {
    id: "S05",
    name: "BrightPath Consulting",
    category: "Professional Services",
    country: "UK",
    deliveryScore: 88,
    qualityScore: 85,
    financialScore: 79,
    complianceScore: 83,
  },
  {
    id: "S06",
    name: "Vanguard Facilities",
    category: "Facilities",
    country: "USA",
    deliveryScore: 76,
    qualityScore: 72,
    financialScore: 68,
    complianceScore: 70,
  },
  {
    id: "S07",
    name: "Crimson Materials Ltd",
    category: "Raw Materials",
    country: "India",
    deliveryScore: 51,
    qualityScore: 60,
    financialScore: 38,
    complianceScore: 44,
  },
  {
    id: "S08",
    name: "Lumen Marketing Group",
    category: "Marketing",
    country: "Canada",
    deliveryScore: 84,
    qualityScore: 80,
    financialScore: 77,
    complianceScore: 81,
  },
];

export const purchaseOrders: PurchaseOrder[] = [
  { id: "PO-1001", supplierId: "S01", category: "Raw Materials", amount: 184000, status: "received", orderDate: "2025-01-08", expectedDate: "2025-02-05" },
  { id: "PO-1002", supplierId: "S02", category: "Logistics", amount: 47500, status: "received", orderDate: "2025-01-15", expectedDate: "2025-02-01" },
  { id: "PO-1003", supplierId: "S03", category: "IT & Software", amount: 96000, status: "closed", orderDate: "2025-01-20", expectedDate: "2025-02-10" },
  { id: "PO-1004", supplierId: "S04", category: "Packaging", amount: 32000, status: "received", orderDate: "2025-02-02", expectedDate: "2025-02-20" },
  { id: "PO-1005", supplierId: "S07", category: "Raw Materials", amount: 121000, status: "received", orderDate: "2025-02-06", expectedDate: "2025-03-01" },
  { id: "PO-1006", supplierId: "S05", category: "Professional Services", amount: 58000, status: "closed", orderDate: "2025-02-12", expectedDate: "2025-03-05" },
  { id: "PO-1007", supplierId: "S06", category: "Facilities", amount: 27500, status: "received", orderDate: "2025-02-18", expectedDate: "2025-03-10" },
  { id: "PO-1008", supplierId: "S02", category: "Logistics", amount: 51200, status: "received", orderDate: "2025-03-01", expectedDate: "2025-03-18" },
  { id: "PO-1009", supplierId: "S08", category: "Marketing", amount: 44000, status: "closed", orderDate: "2025-03-04", expectedDate: "2025-03-25" },
  { id: "PO-1010", supplierId: "S01", category: "Raw Materials", amount: 203000, status: "received", orderDate: "2025-03-10", expectedDate: "2025-04-02" },
  { id: "PO-1011", supplierId: "S03", category: "IT & Software", amount: 132000, status: "open", orderDate: "2025-03-15", expectedDate: "2025-04-12" },
  { id: "PO-1012", supplierId: "S04", category: "Packaging", amount: 38500, status: "received", orderDate: "2025-03-22", expectedDate: "2025-04-08" },
  { id: "PO-1013", supplierId: "S07", category: "Raw Materials", amount: 99000, status: "received", orderDate: "2025-04-01", expectedDate: "2025-04-24" },
  { id: "PO-1014", supplierId: "S05", category: "Professional Services", amount: 64000, status: "received", orderDate: "2025-04-05", expectedDate: "2025-04-28" },
  { id: "PO-1015", supplierId: "S06", category: "Facilities", amount: 31000, status: "open", orderDate: "2025-04-11", expectedDate: "2025-05-02" },
  { id: "PO-1016", supplierId: "S02", category: "Logistics", amount: 56800, status: "received", orderDate: "2025-04-16", expectedDate: "2025-05-04" },
  { id: "PO-1017", supplierId: "S08", category: "Marketing", amount: 49500, status: "received", orderDate: "2025-04-22", expectedDate: "2025-05-12" },
  { id: "PO-1018", supplierId: "S01", category: "Raw Materials", amount: 176500, status: "open", orderDate: "2025-05-02", expectedDate: "2025-05-28" },
  { id: "PO-1019", supplierId: "S03", category: "IT & Software", amount: 88000, status: "received", orderDate: "2025-05-08", expectedDate: "2025-05-30" },
  { id: "PO-1020", supplierId: "S04", category: "Packaging", amount: 41000, status: "received", orderDate: "2025-05-13", expectedDate: "2025-06-02" },
  { id: "PO-1021", supplierId: "S07", category: "Raw Materials", amount: 113500, status: "open", orderDate: "2025-05-19", expectedDate: "2025-06-14" },
  { id: "PO-1022", supplierId: "S05", category: "Professional Services", amount: 52000, status: "received", orderDate: "2025-05-23", expectedDate: "2025-06-13" },
  { id: "PO-1023", supplierId: "S06", category: "Facilities", amount: 29800, status: "cancelled", orderDate: "2025-05-27", expectedDate: "2025-06-17" },
  { id: "PO-1024", supplierId: "S02", category: "Logistics", amount: 60400, status: "open", orderDate: "2025-06-02", expectedDate: "2025-06-23" },
];

export const invoices: Invoice[] = [
  { id: "INV-5001", supplierId: "S01", poId: "PO-1001", amount: 184000, issueDate: "2025-02-06", dueDate: "2025-03-08", status: "paid" },
  { id: "INV-5002", supplierId: "S02", poId: "PO-1002", amount: 47500, issueDate: "2025-02-03", dueDate: "2025-03-05", status: "paid" },
  { id: "INV-5003", supplierId: "S03", poId: "PO-1003", amount: 96000, issueDate: "2025-02-11", dueDate: "2025-03-13", status: "paid" },
  // Price variance: billed materially over the PO amount.
  { id: "INV-5004", supplierId: "S04", poId: "PO-1004", amount: 41600, issueDate: "2025-02-22", dueDate: "2025-03-24", status: "paid" },
  { id: "INV-5005", supplierId: "S07", poId: "PO-1005", amount: 121000, issueDate: "2025-03-02", dueDate: "2025-04-01", status: "paid" },
  { id: "INV-5006", supplierId: "S05", poId: "PO-1006", amount: 58000, issueDate: "2025-03-06", dueDate: "2025-04-05", status: "paid" },
  { id: "INV-5007", supplierId: "S06", poId: "PO-1007", amount: 27500, issueDate: "2025-03-11", dueDate: "2025-04-10", status: "paid" },
  { id: "INV-5008", supplierId: "S02", poId: "PO-1008", amount: 51200, issueDate: "2025-03-19", dueDate: "2025-04-18", status: "paid" },
  { id: "INV-5009", supplierId: "S08", poId: "PO-1009", amount: 44000, issueDate: "2025-03-26", dueDate: "2025-04-25", status: "paid" },
  { id: "INV-5010", supplierId: "S01", poId: "PO-1010", amount: 203000, issueDate: "2025-04-03", dueDate: "2025-05-03", status: "paid" },
  { id: "INV-5011", supplierId: "S04", poId: "PO-1012", amount: 38500, issueDate: "2025-04-09", dueDate: "2025-05-09", status: "paid" },
  { id: "INV-5012", supplierId: "S07", poId: "PO-1013", amount: 99000, issueDate: "2025-04-25", dueDate: "2025-05-25", status: "paid" },
  { id: "INV-5013", supplierId: "S05", poId: "PO-1014", amount: 64000, issueDate: "2025-04-29", dueDate: "2025-05-29", status: "paid" },
  { id: "INV-5014", supplierId: "S02", poId: "PO-1016", amount: 56800, issueDate: "2025-05-05", dueDate: "2025-06-04", status: "paid" },
  // Duplicate: same supplier + amount as INV-5014, near date.
  { id: "INV-5015", supplierId: "S02", poId: "PO-1016", amount: 56800, issueDate: "2025-05-07", dueDate: "2025-06-06", status: "unpaid" },
  { id: "INV-5016", supplierId: "S08", poId: "PO-1017", amount: 49500, issueDate: "2025-05-13", dueDate: "2025-06-12", status: "paid" },
  { id: "INV-5017", supplierId: "S03", poId: "PO-1019", amount: 88000, issueDate: "2025-05-31", dueDate: "2025-06-30", status: "unpaid" },
  // Price variance: well above its PO.
  { id: "INV-5018", supplierId: "S04", poId: "PO-1020", amount: 52000, issueDate: "2025-06-03", dueDate: "2025-07-03", status: "unpaid" },
  // Overdue: past due, still unpaid (relative to seed "today" = 2025-06-26).
  { id: "INV-5019", supplierId: "S07", poId: "PO-1013", amount: 14200, issueDate: "2025-04-25", dueDate: "2025-05-25", status: "unpaid" },
  { id: "INV-5020", supplierId: "S05", poId: "PO-1022", amount: 52000, issueDate: "2025-06-14", dueDate: "2025-07-14", status: "unpaid" },
];

export const deliveries: Delivery[] = [
  { id: "DEL-9001", poId: "PO-1001", expectedDate: "2025-02-05", actualDate: "2025-02-04" },
  { id: "DEL-9002", poId: "PO-1002", expectedDate: "2025-02-01", actualDate: "2025-02-09" }, // late
  { id: "DEL-9003", poId: "PO-1003", expectedDate: "2025-02-10", actualDate: "2025-02-10" },
  { id: "DEL-9004", poId: "PO-1004", expectedDate: "2025-02-20", actualDate: "2025-03-01" }, // late
  { id: "DEL-9005", poId: "PO-1005", expectedDate: "2025-03-01", actualDate: "2025-03-12" }, // late
  { id: "DEL-9006", poId: "PO-1006", expectedDate: "2025-03-05", actualDate: "2025-03-04" },
  { id: "DEL-9007", poId: "PO-1007", expectedDate: "2025-03-10", actualDate: "2025-03-13" }, // late
  { id: "DEL-9008", poId: "PO-1008", expectedDate: "2025-03-18", actualDate: "2025-03-27" }, // late
  { id: "DEL-9009", poId: "PO-1010", expectedDate: "2025-04-02", actualDate: "2025-04-01" },
  { id: "DEL-9010", poId: "PO-1012", expectedDate: "2025-04-08", actualDate: "2025-04-19" }, // late
  { id: "DEL-9011", poId: "PO-1013", expectedDate: "2025-04-24", actualDate: "2025-05-06" }, // late
  { id: "DEL-9012", poId: "PO-1014", expectedDate: "2025-04-28", actualDate: "2025-04-27" },
  { id: "DEL-9013", poId: "PO-1016", expectedDate: "2025-05-04", actualDate: "2025-05-15" }, // late
  { id: "DEL-9014", poId: "PO-1017", expectedDate: "2025-05-12", actualDate: "2025-05-12" },
  { id: "DEL-9015", poId: "PO-1019", expectedDate: "2025-05-30", actualDate: "2025-05-29" },
  { id: "DEL-9016", poId: "PO-1020", expectedDate: "2025-06-02", actualDate: "2025-06-10" }, // late
  { id: "DEL-9017", poId: "PO-1011", expectedDate: "2025-04-12", actualDate: null }, // pending
  { id: "DEL-9018", poId: "PO-1018", expectedDate: "2025-05-28", actualDate: null }, // pending
  { id: "DEL-9019", poId: "PO-1021", expectedDate: "2025-06-14", actualDate: null }, // pending
  { id: "DEL-9020", poId: "PO-1024", expectedDate: "2025-06-23", actualDate: null }, // pending
];

// Annual category budgets (FY2025) for budget-vs-actual analysis.
export const budgets: Budget[] = [
  { category: "Raw Materials", fiscalYear: 2025, amount: 850000 },
  { category: "Logistics", fiscalYear: 2025, amount: 240000 },
  { category: "IT & Software", fiscalYear: 2025, amount: 300000 },
  { category: "Facilities", fiscalYear: 2025, amount: 120000 },
  { category: "Professional Services", fiscalYear: 2025, amount: 200000 },
  { category: "Packaging", fiscalYear: 2025, amount: 130000 },
  { category: "Marketing", fiscalYear: 2025, amount: 110000 },
];

// Supplier contracts with value ceilings and terms.
export const contracts: Contract[] = [
  { id: "CON-3001", supplierId: "S01", category: "Raw Materials", startDate: "2025-01-01", endDate: "2025-12-31", ceiling: 600000, autoRenew: true },
  { id: "CON-3002", supplierId: "S02", category: "Logistics", startDate: "2025-01-01", endDate: "2025-09-30", ceiling: 180000, autoRenew: false },
  { id: "CON-3003", supplierId: "S03", category: "IT & Software", startDate: "2025-01-01", endDate: "2026-06-30", ceiling: 400000, autoRenew: true },
  { id: "CON-3004", supplierId: "S07", category: "Raw Materials", startDate: "2025-02-01", endDate: "2025-07-15", ceiling: 250000, autoRenew: false },
  { id: "CON-3005", supplierId: "S05", category: "Professional Services", startDate: "2025-01-15", endDate: "2025-12-31", ceiling: 200000, autoRenew: false },
];

/** The demo organization's seed bundle, in one place for the repository. */
export const demoSeed = {
  suppliers,
  purchaseOrders,
  invoices,
  deliveries,
  budgets,
  contracts,
};
