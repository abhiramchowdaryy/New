// Role-based access control (RBAC) — the authorization core for Phase 1.
//
// Roles and the permission matrix live here as pure data + a single `can()`
// check, so authorization is testable in isolation and independent of whichever
// identity provider (Clerk / Auth.js / Entra) resolves the user's role.

export const ROLES = [
  "super_admin",
  "org_admin",
  "procurement_manager",
  "finance",
  "supplier",
  "viewer",
] as const;

export type Role = (typeof ROLES)[number];

/** Every action the app gates. Extend as write/admin features land. */
export type Permission =
  | "view:dashboard"
  | "view:spend"
  | "view:suppliers"
  | "view:purchase_orders"
  | "view:invoices"
  | "view:deliveries"
  | "use:copilot"
  | "manage:org"
  | "manage:users";

const ALL_VIEWS: Permission[] = [
  "view:dashboard",
  "view:spend",
  "view:suppliers",
  "view:purchase_orders",
  "view:invoices",
  "view:deliveries",
];

/**
 * Permission matrix. Internal roles see the full workspace; `supplier` is a
 * restricted external role (their own POs/invoices/deliveries, no analytics or
 * copilot); `viewer` is read-only across dashboards.
 */
const MATRIX: Record<Role, ReadonlySet<Permission>> = {
  super_admin: new Set<Permission>([
    ...ALL_VIEWS,
    "use:copilot",
    "manage:org",
    "manage:users",
  ]),
  org_admin: new Set<Permission>([
    ...ALL_VIEWS,
    "use:copilot",
    "manage:org",
    "manage:users",
  ]),
  procurement_manager: new Set<Permission>([...ALL_VIEWS, "use:copilot"]),
  finance: new Set<Permission>([...ALL_VIEWS, "use:copilot"]),
  viewer: new Set<Permission>([...ALL_VIEWS, "use:copilot"]),
  supplier: new Set<Permission>([
    "view:purchase_orders",
    "view:invoices",
    "view:deliveries",
  ]),
};

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.has(permission) ?? false;
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Thrown when an authenticated user lacks the required permission. */
export class ForbiddenError extends Error {
  constructor(public readonly permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "ForbiddenError";
  }
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) throw new ForbiddenError(permission);
}
