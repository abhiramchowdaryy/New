import { describe, expect, it } from "vitest";
import {
  money,
  moneyExact,
  moneyCompact,
  percent,
  shortDate,
  monthLabel,
  daysBetween,
} from "./format";

describe("currency formatting", () => {
  it("formats whole and exact currency", () => {
    expect(money(12400)).toBe("$12,400");
    expect(moneyExact(12.5)).toBe("$12.50");
  });

  it("compacts millions, thousands, and small values", () => {
    expect(moneyCompact(1_200_000)).toBe("$1.2M");
    expect(moneyCompact(840_000)).toBe("$840K");
    expect(moneyCompact(500)).toBe("$500");
    expect(moneyCompact(-2_000_000)).toBe("$-2.0M");
  });
});

describe("percent + dates", () => {
  it("formats percentages with digits", () => {
    expect(percent(0.5)).toBe("50%");
    expect(percent(0.1234, 1)).toBe("12.3%");
  });

  it("formats short dates and handles null", () => {
    expect(shortDate(null)).toBe("—");
    expect(shortDate("2025-06-26")).toMatch(/2025/);
  });

  it("labels a month", () => {
    expect(monthLabel("2025-01")).toMatch(/Jan/);
  });

  it("computes day deltas", () => {
    expect(daysBetween("2025-01-01", "2025-01-11")).toBe(10);
    expect(daysBetween("2025-01-11", "2025-01-01")).toBe(-10);
    expect(daysBetween("2025-01-01", "2025-01-01")).toBe(0);
  });
});
