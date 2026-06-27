// Data-access entry point.
//
// `getRepository()` is the single place that chooses an adapter — swap the
// in-memory implementation for a Postgres/Prisma or ERP adapter here and the
// rest of the app is unaffected. `loadProcurementDataset()` is the one-liner
// Server Components use to get the current tenant's data.

import { getRequestContext, type RequestContext } from "../auth/context";
import type { ProcurementDataset } from "../types";
import type { ProcurementRepository } from "./repository";
import { InMemoryProcurementRepository } from "./in-memory-repository";

let repository: ProcurementRepository | null = null;

export function getRepository(): ProcurementRepository {
  if (!repository) {
    // Future: switch on process.env.DATA_ADAPTER (postgres | sap | csv | …).
    repository = new InMemoryProcurementRepository();
  }
  return repository;
}

/** Resolve the request's tenant context and load its dataset in one call. */
export async function loadProcurementDataset(): Promise<{
  ctx: RequestContext;
  data: ProcurementDataset;
}> {
  const ctx = getRequestContext();
  const data = await getRepository().getDataset(ctx);
  return { ctx, data };
}

export type { ProcurementRepository } from "./repository";
export { indexDataset } from "./dataset";
export type { DatasetView } from "./dataset";
