import { afterEach, describe, expect, it } from "vitest";
import { SEED_AS_OF_DATE, getAsOfDate } from "./clock";

const original = process.env.PROCUREMENT_AS_OF_DATE;
afterEach(() => {
  if (original === undefined) delete process.env.PROCUREMENT_AS_OF_DATE;
  else process.env.PROCUREMENT_AS_OF_DATE = original;
});

describe("getAsOfDate", () => {
  it("defaults to the seed anchor", () => {
    delete process.env.PROCUREMENT_AS_OF_DATE;
    expect(getAsOfDate()).toBe(SEED_AS_OF_DATE);
  });

  it("honors a valid ISO override", () => {
    process.env.PROCUREMENT_AS_OF_DATE = "2025-12-31";
    expect(getAsOfDate()).toBe("2025-12-31");
  });

  it("ignores a malformed override", () => {
    process.env.PROCUREMENT_AS_OF_DATE = "not-a-date";
    expect(getAsOfDate()).toBe(SEED_AS_OF_DATE);
  });
});
