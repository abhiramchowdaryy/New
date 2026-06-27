import { describe, expect, it } from "vitest";
import { InMemoryProcurementRepository } from "./in-memory-repository";
import { DEMO_TENANT_ID, type RequestContext } from "../auth/context";

const repo = new InMemoryProcurementRepository();

function ctx(tenantId: string): RequestContext {
  return { tenantId, userId: "u", role: "org_admin" };
}

describe("tenant isolation", () => {
  it("returns the demo tenant's full dataset", async () => {
    const data = await repo.getDataset(ctx(DEMO_TENANT_ID));
    expect(data.suppliers.length).toBeGreaterThan(0);
    expect(data.purchaseOrders.some((p) => p.id === "PO-1001")).toBe(true);
  });

  it("returns a different tenant's own dataset, never the demo tenant's", async () => {
    const acme = await repo.getDataset(ctx("org_acme"));
    expect(acme.suppliers.map((s) => s.id)).toEqual(["A01"]);
    // None of the demo tenant's records may appear for another tenant.
    expect(acme.purchaseOrders.some((p) => p.id === "PO-1001")).toBe(false);
    expect(acme.suppliers.some((s) => s.id === "S01")).toBe(false);
  });

  it("returns an empty dataset for an unknown tenant (no leakage by default)", async () => {
    const unknown = await repo.getDataset(ctx("org_does_not_exist"));
    expect(unknown.suppliers).toHaveLength(0);
    expect(unknown.purchaseOrders).toHaveLength(0);
    expect(unknown.invoices).toHaveLength(0);
    expect(unknown.deliveries).toHaveLength(0);
  });

  it("stamps every dataset with an as-of date", async () => {
    const data = await repo.getDataset(ctx(DEMO_TENANT_ID));
    expect(data.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
