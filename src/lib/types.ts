// Domain types for the AI Procurement Copilot.

export type SpendCategory =
  | "Raw Materials"
  | "Logistics"
  | "IT & Software"
  | "Facilities"
  | "Professional Services"
  | "Packaging"
  | "Marketing";

export type PurchaseOrderStatus = "open" | "received" | "closed" | "cancelled";
export type InvoiceStatus = "paid" | "unpaid";
export type RiskBand = "low" | "medium" | "high";

export interface Supplier {
  id: string;
  name: string;
  category: SpendCategory;
  country: string;
  // Sub-scores 0-100, where higher = healthier/better.
  deliveryScore: number; // historical reliability
  qualityScore: number; // defect / acceptance performance
  financialScore: number; // financial-health signal
  complianceScore: number; // certifications, audits, ESG
  esgScore?: number; // optional ESG signal; falls back to complianceScore
  onTimeRateOverride?: number; // optional, otherwise derived from deliveries
}

export interface PurchaseOrder {
  id: string; // e.g. PO-1001
  supplierId: string;
  category: SpendCategory;
  amount: number; // USD
  status: PurchaseOrderStatus;
  orderDate: string; // ISO date
  expectedDate: string; // ISO date
}

export interface Invoice {
  id: string; // e.g. INV-5001
  supplierId: string;
  poId: string;
  amount: number; // USD billed
  issueDate: string; // ISO date
  dueDate: string; // ISO date
  status: InvoiceStatus;
}

export interface Delivery {
  id: string; // e.g. DEL-9001
  poId: string;
  expectedDate: string; // ISO date
  actualDate: string | null; // null = not yet delivered
}

/** Annual budget allocated to a spend category (Phase 4 / budget-vs-actual). */
export interface Budget {
  category: SpendCategory;
  fiscalYear: number;
  amount: number; // USD planned spend for the year
}

/** A supplier contract with a value ceiling and term (Phase 4 / contract risk). */
export interface Contract {
  id: string; // e.g. CON-3001
  supplierId: string;
  category: SpendCategory;
  startDate: string; // ISO date
  endDate: string; // ISO date
  ceiling: number; // max committed value over the term
  autoRenew: boolean;
}

export type GoodsReceiptStatus = "accepted" | "partial" | "rejected";

/** Goods receipt against a PO — the GR leg of the 3-way match. */
export interface GoodsReceipt {
  id: string; // e.g. GR-7001
  poId: string;
  receivedDate: string; // ISO date
  acceptedAmount: number; // value of goods accepted into inventory
  status: GoodsReceiptStatus;
}

export type RequisitionStatus = "draft" | "approved" | "rejected" | "converted";

/** Pre-PO demand signal (Phase 4 / requisition-to-PO traceability). */
export interface PurchaseRequisition {
  id: string; // e.g. PR-2001
  costCenter: string;
  category: SpendCategory;
  estimatedAmount: number;
  status: RequisitionStatus;
  neededBy: string; // ISO date
  poId?: string; // set once converted to a PO
}

// --- 3-way match (PO <-> GR <-> Invoice) ---

export type ThreeWayMatchStatus =
  | "matched"
  | "no_po"
  | "no_receipt"
  | "price_mismatch"
  | "quantity_mismatch";

export interface ThreeWayMatchRow {
  invoiceId: string;
  poId: string;
  supplierId: string;
  invoiceAmount: number;
  poAmount: number | null;
  receivedAmount: number; // total accepted GR value for the PO
  status: ThreeWayMatchStatus;
  detail: string;
}

/**
 * A tenant-scoped bundle of every procurement entity plus the date analytics
 * should treat as "today". This is the single input to the analytics layer —
 * the repository produces it per organization, so analytics stays pure and
 * tenant-agnostic while data access stays tenant-isolated.
 */
export interface ProcurementDataset {
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  deliveries: Delivery[];
  budgets: Budget[];
  contracts: Contract[];
  // Optional legs of the procure-to-pay chain. Sources that don't provide them
  // (e.g. a minimal CSV) omit them; 3-way match degrades gracefully.
  goodsReceipts?: GoodsReceipt[];
  purchaseRequisitions?: PurchaseRequisition[];
  asOfDate: string; // ISO date used for overdue / lateness calculations
}

// --- Advanced analytics shapes (Phase 7) ---

export interface SpendCubeCell {
  category: SpendCategory;
  supplierId: string;
  supplierName: string;
  month: string; // YYYY-MM
  amount: number;
}

export type AbcClass = "A" | "B" | "C";

export interface AbcEntry {
  supplierId: string;
  name: string;
  spend: number;
  spendPct: number; // share of total spend
  cumulativePct: number; // running cumulative share (Pareto)
  abcClass: AbcClass;
}

export interface SupplierScorecard {
  supplierId: string;
  name: string;
  category: SpendCategory;
  totalSpend: number;
  onTimeRate: number; // 0-1
  avgDaysLate: number;
  qualityScore: number; // 0-100
  riskScore: number; // 0-100 (higher = riskier)
  openPoCount: number;
  flaggedInvoiceCount: number;
}

export interface CycleTimeMetrics {
  avgLeadTimeDays: number; // order -> expected
  avgCycleTimeDays: number; // order -> actual delivery
  avgDelayDays: number; // actual - expected, delivered only
  byCategory: {
    category: SpendCategory;
    avgLeadTimeDays: number;
    avgCycleTimeDays: number;
  }[];
}

export interface BudgetVarianceRow {
  category: SpendCategory;
  budget: number;
  actual: number;
  committed: number;
  variance: number; // budget - (actual + committed); negative = over budget
  utilizationPct: number; // (actual + committed) / budget
}

export interface ForecastPoint {
  month: string; // YYYY-MM
  amount: number;
  projected: boolean;
}

export interface CashFlowPoint {
  month: string; // YYYY-MM
  outflow: number; // unpaid invoices due that month
}

// --- Risk engine shapes (Phase 8) ---

export type RiskDimension =
  | "financial"
  | "delivery"
  | "quality"
  | "compliance"
  | "esg"
  | "geographic"
  | "singleSource"
  | "priceVolatility";

export interface RiskDimensionScore {
  dimension: RiskDimension;
  score: number; // 0-100 (higher = riskier)
  weight: number; // contribution weight
  explanation: string;
}

export interface SupplierRiskProfile {
  supplierId: string;
  name: string;
  category: SpendCategory;
  compositeScore: number; // 0-100 weighted composite
  band: RiskBand;
  dimensions: RiskDimensionScore[];
}

// --- Derived / analytics shapes ---

export type AnomalyType = "duplicate" | "price_variance" | "overdue";
export type Severity = "low" | "medium" | "high";

export interface InvoiceAnomaly {
  invoiceId: string;
  supplierId: string;
  type: AnomalyType;
  severity: Severity;
  message: string;
  amount: number;
}

export interface SupplierRisk {
  supplierId: string;
  name: string;
  category: SpendCategory;
  score: number; // 0-100, higher = riskier
  band: RiskBand;
  drivers: string[];
  onTimeRate: number; // 0-1
  totalSpend: number;
  openPoCount: number;
}

export interface SpendSummary {
  total: number;
  committedOpen: number;
  byCategory: { category: SpendCategory; amount: number }[];
  bySupplier: { supplierId: string; name: string; amount: number }[];
  monthlyTrend: { month: string; amount: number }[];
}

export interface DeliveryMetrics {
  total: number;
  delivered: number;
  pending: number;
  onTime: number;
  late: number;
  onTimeRate: number; // 0-1
  avgDaysLate: number;
  lateDeliveries: {
    deliveryId: string;
    poId: string;
    supplierName: string;
    expectedDate: string;
    actualDate: string | null;
    daysLate: number;
  }[];
}
