// Audit logging (Phase 10).
//
// Records security-relevant actions (who, which tenant, what, when) for an
// audit timeline. This in-memory ring buffer is the reference implementation
// and interface; in production, persist to an append-only store (DB table /
// WORM bucket). Reads are tenant-scoped so one org can't see another's trail.

import { logger } from "../observability/logger";

export interface AuditEvent {
  id: string;
  ts: string; // ISO timestamp
  tenantId: string;
  userId: string;
  action: string; // e.g. "copilot.query", "erp.import", "auth.login"
  metadata?: Record<string, unknown>;
}

const MAX_EVENTS = 5000;
const events: AuditEvent[] = [];

export function recordAudit(
  input: Omit<AuditEvent, "id" | "ts">,
): AuditEvent {
  const event: AuditEvent = {
    id: globalThis.crypto?.randomUUID?.() ?? `aud_${Date.now()}_${events.length}`,
    ts: new Date().toISOString(),
    ...input,
  };
  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();
  logger.info("audit", {
    action: event.action,
    tenantId: event.tenantId,
    userId: event.userId,
  });
  return event;
}

/** Tenant-scoped audit trail, newest first. */
export function getAuditLog(tenantId: string, limit = 100): AuditEvent[] {
  return events
    .filter((e) => e.tenantId === tenantId)
    .slice(-limit)
    .reverse();
}

/** Test helper. */
export function __resetAudit() {
  events.length = 0;
}
