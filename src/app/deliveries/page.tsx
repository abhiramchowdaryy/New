import { computeDeliveryMetrics } from "@/lib/analytics";
import { getDeliveries, getPurchaseOrder, supplierName } from "@/lib/data";
import { shortDate, percent } from "@/lib/format";
import { Badge, Card, KpiCard, PageHeader } from "@/components/ui";

export default function DeliveriesPage() {
  const metrics = computeDeliveryMetrics();
  const deliveries = [...getDeliveries()].sort((a, b) =>
    b.expectedDate.localeCompare(a.expectedDate),
  );

  function daysLate(expected: string, actual: string | null): number | null {
    if (!actual) return null;
    const ms = new Date(actual).getTime() - new Date(expected).getTime();
    return Math.round(ms / (1000 * 60 * 60 * 24));
  }

  return (
    <div>
      <PageHeader title="Deliveries" subtitle="Expected vs actual delivery dates, lateness, and SLA breaches." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <KpiCard
          label="On-time rate"
          value={percent(metrics.onTimeRate)}
          tone={metrics.onTimeRate >= 0.8 ? "good" : metrics.onTimeRate >= 0.6 ? "warn" : "bad"}
          sub={`${metrics.onTime}/${metrics.delivered} delivered`}
        />
        <KpiCard label="Late deliveries" value={String(metrics.late)} tone="bad" />
        <KpiCard label="Avg days late" value={metrics.avgDaysLate.toFixed(1)} tone="warn" sub="across late POs" />
        <KpiCard label="Pending" value={String(metrics.pending)} sub="not yet delivered" />
      </div>

      <div className="mt-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="py-2 font-medium">Delivery</th>
                  <th scope="col" className="py-2 font-medium">PO</th>
                  <th scope="col" className="py-2 font-medium">Supplier</th>
                  <th scope="col" className="py-2 font-medium">Expected</th>
                  <th scope="col" className="py-2 font-medium">Actual</th>
                  <th scope="col" className="py-2 text-right font-medium">Days late</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.map((d) => {
                  const po = getPurchaseOrder(d.poId);
                  const dl = daysLate(d.expectedDate, d.actualDate);
                  let status: { label: string; tone: "good" | "bad" | "neutral" };
                  if (d.actualDate === null) status = { label: "pending", tone: "neutral" };
                  else if (dl !== null && dl > 0) status = { label: "breached", tone: "bad" };
                  else status = { label: "on time", tone: "good" };
                  return (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-medium text-slate-900">{d.id}</td>
                      <td className="py-2.5 text-slate-500">{d.poId}</td>
                      <td className="py-2.5 text-slate-700">{po ? supplierName(po.supplierId) : "—"}</td>
                      <td className="py-2.5 text-slate-500">{shortDate(d.expectedDate)}</td>
                      <td className="py-2.5 text-slate-500">{shortDate(d.actualDate)}</td>
                      <td className={`py-2.5 text-right font-medium ${dl && dl > 0 ? "text-rose-600" : "text-slate-400"}`}>
                        {dl === null ? "—" : dl > 0 ? `+${dl}` : dl}
                      </td>
                      <td className="py-2.5"><Badge tone={status.tone}>{status.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
