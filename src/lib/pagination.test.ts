import { describe, expect, it } from "vitest";
import { paginate } from "./pagination";

const items = Array.from({ length: 125 }, (_, i) => i);

describe("paginate", () => {
  it("returns the requested slice and metadata", () => {
    const p = paginate(items, 2, 50);
    expect(p.items[0]).toBe(50);
    expect(p.items).toHaveLength(50);
    expect(p.total).toBe(125);
    expect(p.totalPages).toBe(3);
    expect(p.hasNext).toBe(true);
    expect(p.hasPrev).toBe(true);
  });

  it("clamps out-of-range pages", () => {
    expect(paginate(items, 99, 50).page).toBe(3);
    expect(paginate(items, -1, 50).page).toBe(1);
  });

  it("handles the last partial page", () => {
    const p = paginate(items, 3, 50);
    expect(p.items).toHaveLength(25);
    expect(p.hasNext).toBe(false);
  });

  it("is safe on empty input", () => {
    const p = paginate([], 1, 50);
    expect(p.items).toHaveLength(0);
    expect(p.totalPages).toBe(1);
  });
});
