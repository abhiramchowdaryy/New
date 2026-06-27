import { afterEach, describe, expect, it } from "vitest";
import { rateLimit, __resetRateLimits } from "./rate-limit";

afterEach(() => __resetRateLimits());

describe("rate limiter", () => {
  it("allows up to the limit, then blocks within the window", () => {
    const key = "tenant:test";
    const t0 = 1_000_000;
    // Default limit is 20 per 60s window.
    for (let i = 0; i < 20; i++) {
      expect(rateLimit(key, t0).allowed).toBe(true);
    }
    const blocked = rateLimit(key, t0);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const key = "tenant:reset";
    const t0 = 2_000_000;
    for (let i = 0; i < 20; i++) rateLimit(key, t0);
    expect(rateLimit(key, t0).allowed).toBe(false);
    // 61s later the window has rolled over.
    expect(rateLimit(key, t0 + 61_000).allowed).toBe(true);
  });

  it("tracks tenants independently", () => {
    const t0 = 3_000_000;
    for (let i = 0; i < 20; i++) rateLimit("tenant:a", t0);
    expect(rateLimit("tenant:a", t0).allowed).toBe(false);
    expect(rateLimit("tenant:b", t0).allowed).toBe(true);
  });
});
