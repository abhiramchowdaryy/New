import { indexDataset, loadProcurementDataset } from "@/lib/data";
import { moneyExact, moneyCompact, shortDate } from "@/lib/format";
import { Badge, Card, KpiCard, PageHeader } from "@/components/ui";
import type { PurchaseOrderStatus } from "@/lib/types";

const STATUS_TONE: Record<PurchaseOrderStatus, "good" | "info" | "warn" | "bad"> = {
  closed: "good",
  received: "info",
  open: "warn",
  cancelled: "bad",
};

export default async function PurchaseOrdersPage() {
  const { data } = await loadProcurementDataset();
  const { supplierName } = indexDataset(data);
  const pos = [...data.purchaseOrders].sort((a, b) =>
    b.orderDate.localeCompare(a.orderDate),
  );
  const open = pos.filter((p) => p.status === "open");
  const totalValue = pos
    .filter((p) => p.status !== "cancelled")
    .reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <PageHeader title="Purchase Orders" subtitle="Every PO with supplier, value, status, and dates." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total POs" value={String(pos.length)} />
        <KpiCard label="Open POs" value={String(open.length)} sub={`${moneyCompact(open.reduce((s, p) => s + p.amount, 0))} committed`} tone="warn" />
        <KpiCard label="Total PO value" value={moneyCompact(totalValue)} sub="excludes cancelled" />
      </div>

      <div className="mt-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="py-2 font-medium">PO #</th>
                  <th scope="col" className="py-2 font-medium">Supplier</th>
                  <th scope="col" className="py-2 font-medium">Category</th>
                  <th scope="col" className="py-2 text-right font-medium">Amount</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                  <th scope="col" className="py-2 font-medium">Ordered</th>
                  <th scope="col" className="py-2 font-medium">Expected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900">{p.id}</td>
                    <td className="py-2.5 text-slate-700">{supplierName(p.supplierId)}</td>
                    <td className="py-2.5 text-slate-500">{p.category}</td>
                    <td className="py-2.5 text-right font-medium text-slate-900">{moneyExact(p.amount)}</td>
                    <td className="py-2.5"><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></td>
                    <td className="py-2.5 text-slate-500">{shortDate(p.orderDate)}</td>
                    <td className="py-2.5 text-slate-500">{shortDate(p.expectedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
