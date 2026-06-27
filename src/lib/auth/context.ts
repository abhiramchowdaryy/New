// Per-request identity + tenant context.
//
// This is the single seam every authenticated/tenant-scoped operation reads.
// Today it resolves from request headers (set by middleware) and falls back to
// a demo organization so the app runs with no auth provider configured. To wire
// a real provider (Clerk / Auth.js / Entra), populate these headers in
// middleware from the verified session — nothing downstream changes.

import { headers } from "next/headers";
import { isRole, type Role } from "./roles";

export interface RequestContext {
  tenantId: string; // organization the request operates within
  userId: string;
  role: Role;
}

/** Default org used when no auth provider is configured (keyless demo). */
export const DEMO_TENANT_ID = "org_demo";

const DEFAULT_CONTEXT: RequestContext = {
  tenantId: DEMO_TENANT_ID,
  userId: "user_demo",
  role: "org_admin",
};

/**
 * Resolve the current request's tenant + user.
 * Reads `x-tenant-id`, `x-user-id`, `x-user-role` (injected by middleware from
 * the verified session); falls back to the demo context when absent.
 */
export function getRequestContext(): RequestContext {
  // `headers()` is read-only and safe in Server Components / route handlers.
  const h = headers();
  const tenantId = h.get("x-tenant-id")?.trim() || DEFAULT_CONTEXT.tenantId;
  const userId = h.get("x-user-id")?.trim() || DEFAULT_CONTEXT.userId;
  const roleHeader = h.get("x-user-role")?.trim();
  const role: Role = isRole(roleHeader) ? roleHeader : DEFAULT_CONTEXT.role;
  return { tenantId, userId, role };
}
