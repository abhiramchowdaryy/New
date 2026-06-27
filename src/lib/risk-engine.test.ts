import { describe, expect, it } from "vitest";
import {
  RISK_DIMENSION_WEIGHTS,
  computeSupplierRiskProfiles,
} from "./risk-engine";
import { bandForScore } from "./config/risk";
import { SEED_AS_OF_DATE } from "./clock";
import { demoSeed } from "./data/seed";
import type { ProcurementDataset } from "./types";

const data: ProcurementDataset = { ...demoSeed, asOfDate: SEED_AS_OF_DATE };

describe("risk engine", () => {
  it("dimension weights sum to 1", () => {
    const sum = Object.values(RISK_DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  const profiles = computeSupplierRiskProfiles(data);

  it("profiles every supplier with all eight dimensions, sorted by composite", () => {
    expect(profiles).toHaveLength(data.suppliers.length);
    const scores = profiles.map((p) => p.compositeScore);
    expect([...scores].sort((a, b) => b - a)).toEqual(scores);
    for (const p of profiles) {
      expect(p.dimensions).toHaveLength(8);
      expect(p.compositeScore).toBeGreaterThanOrEqual(0);
      expect(p.compositeScore).toBeLessThanOrEqual(100);
      expect(p.band).toBe(bandForScore(p.compositeScore));
    }
  });

  it("explains every dimension score", () => {
    for (const p of profiles) {
      for (const d of p.dimensions) {
        expect(d.explanation.length).toBeGreaterThan(0);
        expect(d.score).toBeGreaterThanOrEqual(0);
        expect(d.score).toBeLessThanOrEqual(100);
      }
    }
  });

  it("flags a sole-source supplier's single-source dimension as elevated", () => {
    // S08 (Marketing) and S06 (Facilities) are the only active suppliers in
    // their categories in the seed — single-source risk should be high.
    const marketing = profiles.find((p) => p.supplierId === "S08")!;
    const ss = marketing.dimensions.find((d) => d.dimension === "singleSource")!;
    expect(ss.score).toBeGreaterThanOrEqual(80);
  });
});
