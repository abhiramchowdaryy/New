// Procurement risk & anomaly tuning parameters.
//
// These were previously inline magic numbers in analytics.ts. They are
// extracted here so a procurement domain expert can tune scoring and anomaly
// sensitivity without editing computation code. Values are unchanged from the
// original implementation — this is a pure refactor.

import type { RiskBand } from "../types";

/**
 * Weights for the composite supplier-risk score (must sum to 1).
 * Financial and delivery deliberately dominate.
 */
export const RISK_WEIGHTS = {
  financial: 0.3,
  delivery: 0.2,
  quality: 0.15,
  compliance: 0.15,
  onTime: 0.2,
} as const;

/** Score thresholds (0-100, higher = riskier) for banding suppliers. */
export const RISK_BANDS = {
  high: 60, // score >= 60
  medium: 35, // score >= 35
} as const;

export function bandForScore(score: number): RiskBand {
  if (score >= RISK_BANDS.high) return "high";
  if (score >= RISK_BANDS.medium) return "medium";
  return "low";
}

/**
 * Minimum sub-risk levels (0-100) at which a human-readable driver is surfaced
 * on a supplier card / in the copilot snapshot.
 */
export const RISK_DRIVER_THRESHOLDS = {
  financial: 45,
  onTime: 40,
  quality: 35,
  compliance: 40,
} as const;

/** Invoice anomaly-detection sensitivity. */
export const ANOMALY_CONFIG = {
  /** Same supplier + amount within this window (days) is flagged as a duplicate. */
  duplicateWindowDays: 10,
  /** Invoice billed > this fraction over its PO amount is a price variance. */
  priceVarianceThreshold: 0.05,
  /** Price variance at or above this percentage is "high" severity. */
  priceVarianceHighPct: 20,
  /** Overdue by this many days or more is "high" severity. */
  overdueHighDays: 30,
} as const;
