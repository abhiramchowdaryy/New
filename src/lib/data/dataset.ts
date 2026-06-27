// Lightweight lookups over a loaded ProcurementDataset.
//
// Replaces the old global `getSupplier` / `supplierName` / `getPurchaseOrder`
// accessors, which read process-wide arrays. Indexing the (tenant-scoped)
// dataset keeps lookups O(1) and tenant-safe — there is no global to leak.

import type { ProcurementDataset, PurchaseOrder, Supplier } from "../types";

export interface DatasetView {
  supplier(id: string): Supplier | undefined;
  supplierName(id: string): string;
  purchaseOrder(id: string): PurchaseOrder | undefined;
}

export function indexDataset(data: ProcurementDataset): DatasetView {
  const supplierById = new Map(data.suppliers.map((s) => [s.id, s]));
  const poById = new Map(data.purchaseOrders.map((p) => [p.id, p]));
  return {
    supplier: (id) => supplierById.get(id),
    supplierName: (id) => supplierById.get(id)?.name ?? id,
    purchaseOrder: (id) => poById.get(id),
  };
}
