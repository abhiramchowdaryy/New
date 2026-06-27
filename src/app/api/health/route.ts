// Health check (Phase 11).
//
// Liveness + a lightweight readiness probe (can we resolve a dataset?). Returns
// 200 when healthy, 503 otherwise, with per-check detail for dashboards/k8s.

import { getRepository } from "@/lib/data";
import { DEMO_TENANT_ID } from "@/lib/auth/context";
import { logger } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  try {
    const data = await getRepository().getDataset({
      tenantId: DEMO_TENANT_ID,
      userId: "healthcheck",
      role: "viewer",
    });
    checks.repository = Array.isArray(data.suppliers) ? "ok" : "error";
  } catch (err) {
    logger.error("health.repository_failed", { err: String(err) });
    checks.repository = "error";
  }

  checks.anthropicKey = process.env.ANTHROPIC_API_KEY ? "ok" : "error";

  // The Anthropic key is optional (dashboards work without it), so it doesn't
  // gate readiness; the data layer does.
  const healthy = checks.repository === "ok";

  return Response.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      uptimeSec: Math.round(process.uptime()),
      checks,
      ts: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
