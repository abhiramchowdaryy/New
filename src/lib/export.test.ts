import { describe, expect, it } from "vitest";
import { toCsv } from "./export";

describe("toCsv", () => {
  it("emits a header and rows", () => {
    const csv = toCsv([
      { id: "S1", spend: 100 },
      { id: "S2", spend: 200 },
    ]);
    expect(csv).toBe("id,spend\nS1,100\nS2,200");
  });

  it("escapes commas, quotes, and newlines", () => {
    const csv = toCsv([{ name: 'Acme, "Inc"', note: "a\nb" }]);
    expect(csv).toBe('name,note\n"Acme, ""Inc""","a\nb"');
  });

  it("respects an explicit column subset and order", () => {
    const csv = toCsv([{ a: 1, b: 2, c: 3 }], ["c", "a"]);
    expect(csv).toBe("c,a\n3,1");
  });

  it("returns empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});
