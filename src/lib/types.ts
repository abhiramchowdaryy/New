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
