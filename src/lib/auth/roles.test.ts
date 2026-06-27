import { describe, expect, it } from "vitest";
import { ROLES, can, isRole, assertCan, ForbiddenError } from "./roles";

describe("RBAC permission matrix", () => {
  it("grants admins org/user management", () => {
    expect(can("super_admin", "manage:users")).toBe(true);
    expect(can("org_admin", "manage:org")).toBe(true);
  });

  it("denies management to non-admin roles", () => {
    for (const role of ["procurement_manager", "finance", "viewer", "supplier"] as const) {
      expect(can(role, "manage:users")).toBe(false);
      expect(can(role, "manage:org")).toBe(false);
    }
  });

  it("lets internal roles use the copilot but not the external supplier role", () => {
    for (const role of ["org_admin", "procurement_manager", "finance", "viewer"] as const) {
      expect(can(role, "use:copilot")).toBe(true);
    }
    expect(can("supplier", "use:copilot")).toBe(false);
  });

  it("restricts the supplier role to its own documents, not spend/supplier analytics", () => {
    expect(can("supplier", "view:purchase_orders")).toBe(true);
    expect(can("supplier", "view:invoices")).toBe(true);
    expect(can("supplier", "view:spend")).toBe(false);
    expect(can("supplier", "view:suppliers")).toBe(false);
    expect(can("supplier", "view:dashboard")).toBe(false);
  });

  it("validates role strings", () => {
    expect(isRole("org_admin")).toBe(true);
    expect(isRole("root")).toBe(false);
    expect(isRole(42)).toBe(false);
  });

  it("assertCan throws ForbiddenError on denial", () => {
    expect(() => assertCan("viewer", "manage:users")).toThrow(ForbiddenError);
    expect(() => assertCan("org_admin", "manage:users")).not.toThrow();
  });

  it("every role has at least one permission", () => {
    for (const role of ROLES) {
      const anyAllowed = (
        ["view:dashboard", "view:purchase_orders", "manage:org"] as const
      ).some((p) => can(role, p));
      expect(anyAllowed).toBe(true);
    }
  });
});
