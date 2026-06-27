// Injectable "current date" anchor.
//
// The seed dataset is deterministic, so analytics anchor "overdue / late"
// calculations to a fixed as-of date rather than the wall clock. Production
// data layers can override this via PROCUREMENT_AS_OF_DATE (e.g. to pin a
// reporting period) without touching the analytics code.

/** Anchor date for the bundled seed dataset (ISO yyyy-mm-dd). */
export const SEED_AS_OF_DATE = "2025-06-26";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The date analytics should treat as "today".
 * Defaults to the seed anchor; override with PROCUREMENT_AS_OF_DATE.
 */
export function getAsOfDate(): string {
  const override = process.env.PROCUREMENT_AS_OF_DATE?.trim();
  if (override && ISO_DATE.test(override)) return override;
  return SEED_AS_OF_DATE;
}
