// Repository port — the stable, async, tenant-scoped data boundary.
//
// Every data read goes through this interface, scoped to a RequestContext's
// tenant. The in-memory adapter implements it today; a Postgres/Prisma or ERP
// adapter (Phase 3/4) drops in behind the same interface with no change to
// analytics or the UI. Async by design so DB/ERP I/O fits without a re-refactor.

import type { ProcurementDataset } from "../types";
import type { RequestContext } from "../auth/context";

export interface ProcurementRepository {
  /**
   * The full procurement dataset for the context's tenant. Implementations MUST
   * return only that tenant's records — this is the tenant-isolation boundary.
   */
  getDataset(ctx: RequestContext): Promise<ProcurementDataset>;
}
