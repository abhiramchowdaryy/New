// In-memory fixed-window rate limiter (Phase 10).
//
// Guards expensive/abusable endpoints (notably the paid LLM route) from
// cost-exhaustion and DoS. This instance-local store is correct for a single
// process; for multi-instance deployments back it with Redis/Upstash behind the
// same interface. Window and limit are configurable via env.

interface Window {
  count: number;
  resetAt: number; // epoch ms
}

const buckets = new Map<string, Window>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

function windowMs(): number {
  const sec = Number(process.env.RATE_LIMIT_WINDOW_SEC);
  return Number.isFinite(sec) && sec > 0 ? sec * 1000 : 60_000;
}

function maxRequests(): number {
  const n = Number(process.env.RATE_LIMIT_MAX);
  return Number.isFinite(n) && n > 0 ? n : 20;
}

/** Record a hit for `key` and report whether it is within the limit. */
export function rateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const limit = maxRequests();
  const existing = buckets.get(key);

  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs();
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, remaining: limit - existing.count, retryAfterSec: 0 };
}

/** Test helper: clear all windows. */
export function __resetRateLimits() {
  buckets.clear();
}
