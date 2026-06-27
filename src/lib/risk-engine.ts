// Enterprise risk engine (Phase 8).
//
// Scores every supplier across eight risk dimensions (0-100, higher = riskier),
// each with a plain-language explanation, then blends them into a weighted
// composite. Pure over a ProcurementDataset; every score is traceable to data.

import { computeSupplierRisks } from "./analytics";
import { bandForScore } from "./config/risk";
import type {
  ProcurementDataset,
  RiskDimension,
  RiskDimensionScore,
  SpendCategory,
  SupplierRiskProfile,
} from "./types";

/** Dimension weights (sum = 1). Financial + delivery still dominate. */
export const RISK_DIMENSION_WEIGHTS: Record<RiskDimension, number> = {
  financial: 0.22,
  delivery: 0.18,
  quality: 0.12,
  compliance: 0.12,
  esg: 0.08,
  geographic: 0.1,
  singleSource: 0.1,
  priceVolatility: 0.08,
};

// Coarse country-risk lookup (0-100). Extend with a real index later.
const COUNTRY_RISK: Record<string, number> = {
  USA: 15,
  Canada: 18,
  Germany: 20,
  UK: 22,
  Mexico: 45,
  India: 50,
};
const DEFAULT_COUNTRY_RISK = 40;

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function computeSupplierRiskProfiles(
  data: ProcurementDataset,
): SupplierRiskProfile[] {
  const baseRisks = new Map(
    computeSupplierRisks(data).map((r) => [r.supplierId, r]),
  );

  // Supplier count per category among suppliers the org actually transacts with.
  const suppliersWithPos = new Set(data.purchaseOrders.map((p) => p.supplierId));
  const supplierCountByCategory = new Map<SpendCategory, number>();
  for (const s of data.suppliers) {
    if (!suppliersWithPos.has(s.id)) continue;
    supplierCountByCategory.set(
      s.category,
      (supplierCountByCategory.get(s.category) ?? 0) + 1,
    );
  }

  const poById = new Map(data.purchaseOrders.map((p) => [p.id, p]));

  const profiles = data.suppliers.map<SupplierRiskProfile>((s) => {
    const base = baseRisks.get(s.id);
    const onTimeRate = base?.onTimeRate ?? s.deliveryScore / 100;

    // Price volatility: avg absolute % deviation of invoice vs its PO.
    const ratios: number[] = [];
    for (const inv of data.invoices) {
      if (inv.supplierId !== s.id) continue;
      const po = poById.get(inv.poId);
      if (po && po.amount > 0) ratios.push(Math.abs(inv.amount / po.amount - 1));
    }
    const avgDeviation =
      ratios.length === 0 ? 0 : ratios.reduce((a, b) => a + b, 0) / ratios.length;

    const categoryCount = supplierCountByCategory.get(s.category) ?? 0;
    const singleSourceRisk =
      categoryCount <= 1 ? 85 : categoryCount === 2 ? 55 : categoryCount === 3 ? 35 : 20;

    const esg = s.esgScore ?? s.complianceScore;
    const geoRisk = COUNTRY_RISK[s.country] ?? DEFAULT_COUNTRY_RISK;

    const dims: RiskDimensionScore[] = [
      {
        dimension: "financial",
        score: clamp(100 - s.financialScore),
        weight: RISK_DIMENSION_WEIGHTS.financial,
        explanation: `Financial-health signal ${s.financialScore}/100.`,
      },
      {
        dimension: "delivery",
        score: clamp((1 - onTimeRate) * 100),
        weight: RISK_DIMENSION_WEIGHTS.delivery,
        explanation: `On-time delivery ${Math.round(onTimeRate * 100)}% across delivered POs.`,
      },
      {
        dimension: "quality",
        score: clamp(100 - s.qualityScore),
        weight: RISK_DIMENSION_WEIGHTS.quality,
        explanation: `Quality/acceptance score ${s.qualityScore}/100.`,
      },
      {
        dimension: "compliance",
        score: clamp(100 - s.complianceScore),
        weight: RISK_DIMENSION_WEIGHTS.compliance,
        explanation: `Compliance/certification score ${s.complianceScore}/100.`,
      },
      {
        dimension: "esg",
        score: clamp(100 - esg),
        weight: RISK_DIMENSION_WEIGHTS.esg,
        explanation: `ESG signal ${esg}/100${s.esgScore == null ? " (proxied from compliance)" : ""}.`,
      },
      {
        dimension: "geographic",
        score: clamp(geoRisk),
        weight: RISK_DIMENSION_WEIGHTS.geographic,
        explanation: `Country risk for ${s.country}.`,
      },
      {
        dimension: "singleSource",
        score: clamp(singleSourceRisk),
        weight: RISK_DIMENSION_WEIGHTS.singleSource,
        explanation:
          categoryCount <= 1
            ? `Sole active supplier in ${s.category} — no fallback.`
            : `${categoryCount} active suppliers in ${s.category}.`,
      },
      {
        dimension: "priceVolatility",
        score: clamp(avgDeviation * 200),
        weight: RISK_DIMENSION_WEIGHTS.priceVolatility,
        explanation:
          ratios.length === 0
            ? "No invoice-vs-PO history yet."
            : `Avg invoice deviates ${Math.round(avgDeviation * 100)}% from PO across ${ratios.length} invoice(s).`,
      },
    ];

    const compositeScore = clamp(
      dims.reduce((sum, d) => sum + d.score * d.weight, 0),
    );

    return {
      supplierId: s.id,
      name: s.name,
      category: s.category,
      compositeScore,
      band: bandForScore(compositeScore),
      dimensions: dims,
    };
  });

  return profiles.sort((a, b) => b.compositeScore - a.compositeScore);
}
