// In-memory implementation of ProcurementRepository.
//
// Holds an isolated dataset per tenant in a Map keyed by tenantId. This is the
// reference adapter for local/demo use and the contract a real adapter must
// honor: a request for tenant A can never observe tenant B's records.

import { demoSeed } from "./seed";
import { getAsOfDate } from "../clock";
import { DEMO_TENANT_ID } from "../auth/context";
import type { ProcurementDataset } from "../types";
import type { RequestContext } from "../auth/context";
import type { ProcurementRepository } from "./repository";

type Seed = Omit<ProcurementDataset, "asOfDate">;

// A second, deliberately small tenant. Its only purpose is to make tenant
// isolation observable and testable — no demo tenant data appears here.
const ACME_TENANT_ID = "org_acme";
const acmeSeed: Seed = {
  suppliers: [
    {
      id: "A01",
      name: "Acme Industrial Supply",
      category: "Raw Materials",
      country: "USA",
      deliveryScore: 70,
      qualityScore: 75,
      financialScore: 65,
      complianceScore: 72,
    },
  ],
  purchaseOrders: [
    {
      id: "PO-ACME-1",
      supplierId: "A01",
      category: "Raw Materials",
      amount: 50000,
      status: "open",
      orderDate: "2025-06-01",
      expectedDate: "2025-06-30",
    },
  ],
  invoices: [],
  deliveries: [],
  budgets: [{ category: "Raw Materials", fiscalYear: 2025, amount: 100000 }],
  contracts: [],
};

const SEEDS: Record<string, Seed> = {
  [DEMO_TENANT_ID]: demoSeed,
  [ACME_TENANT_ID]: acmeSeed,
};

const EMPTY_SEED: Seed = {
  suppliers: [],
  purchaseOrders: [],
  invoices: [],
  deliveries: [],
  budgets: [],
  contracts: [],
};

export class InMemoryProcurementRepository implements ProcurementRepository {
  async getDataset(ctx: RequestContext): Promise<ProcurementDataset> {
    // Unknown tenants get an empty dataset, never another tenant's data.
    const seed = SEEDS[ctx.tenantId] ?? EMPTY_SEED;
    return {
      suppliers: seed.suppliers,
      purchaseOrders: seed.purchaseOrders,
      invoices: seed.invoices,
      deliveries: seed.deliveries,
      budgets: seed.budgets,
      contracts: seed.contracts,
      asOfDate: getAsOfDate(),
    };
  }
}
