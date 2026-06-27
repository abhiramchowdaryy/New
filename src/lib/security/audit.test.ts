import { afterEach, describe, expect, it } from "vitest";
import { getAuditLog, recordAudit, __resetAudit } from "./audit";

afterEach(() => __resetAudit());

describe("audit log", () => {
  it("records events with id + timestamp", () => {
    const e = recordAudit({ tenantId: "t1", userId: "u1", action: "copilot.query" });
    expect(e.id).toBeTruthy();
    expect(e.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns a tenant-scoped trail, newest first, and never leaks across tenants", () => {
    recordAudit({ tenantId: "t1", userId: "u1", action: "a1" });
    recordAudit({ tenantId: "t2", userId: "u2", action: "a2" });
    recordAudit({ tenantId: "t1", userId: "u1", action: "a3" });

    const t1 = getAuditLog("t1");
    expect(t1.map((e) => e.action)).toEqual(["a3", "a1"]);
    expect(t1.some((e) => e.tenantId === "t2")).toBe(false);
  });
});
