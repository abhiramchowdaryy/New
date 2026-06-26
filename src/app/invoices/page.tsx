import { detectInvoiceAnomalies } from "@/lib/analytics";
import { getInvoices, supplierName } from "@/lib/data";
import { moneyExact, moneyCompact, shortDate } from "@/lib/format";
import { Badge, Card, KpiCard, PageHeader, SeverityBadge } from "@/components/ui";
import type { AnomalyType } from "@/lib/types";

const TYPE_LABEL: Record<AnomalyType, string> = {
  duplicate: "Duplicate",
  price_variance: "Price variance",
  overdue: "Overdue",
};

export default function InvoicesPage() {
  const invoices = [...getInvoices()].sort((a, b) =>
    b.issueDate.localeCompare(a.issueDate),
  );
  const anomalies = detectInvoiceAnomalies();
  const byInvoice = new Map<string, typeof anomalies>();
  for (const a of anomalies) {
    const list = byInvoice.get(a.invoiceId) ?? [];
    list.push(a);
    byInvoice.set(a.invoiceId, list);
  }

  const flaggedValue = anomalies.reduce((s, a) => s + a.amount, 0);
  const unpaid = invoices.filter((i) => i.status === "unpaid");

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle="Anomaly detection flags duplicates, price variances vs PO, and overdue invoices."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total invoices" value={String(invoices.length)} />
        <KpiCard label="Flagged anomalies" value={String(anomalies.length)} sub={`${moneyCompact(flaggedValue)} at risk`} tone="bad" />
        <KpiCard label="Unpaid" value={String(unpaid.length)} sub={`${moneyCompact(unpaid.reduce((s, i) => s + i.amount, 0))} outstanding`} tone="warn" />
      </div>

      <div className="mt-6">
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th scope="col" className="py-2 font-medium">Invoice</th>
                  <th scope="col" className="py-2 font-medium">Supplier</th>
                  <th scope="col" className="py-2 font-medium">PO</th>
                  <th scope="col" className="py-2 text-right font-medium">Amount</th>
                  <th scope="col" className="py-2 font-medium">Due</th>
                  <th scope="col" className="py-2 font-medium">Status</th>
                  <th scope="col" className="py-2 font-medium">Anomalies</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const flags = byInvoice.get(inv.id) ?? [];
                  return (
                    <tr key={inv.id} className={flags.length ? "bg-rose-50/40 hover:bg-rose-50" : "hover:bg-slate-50"}>
                      <td className="py-2.5 font-medium text-slate-900">{inv.id}</td>
                      <td className="py-2.5 text-slate-700">{supplierName(inv.supplierId)}</td>
                      <td className="py-2.5 text-slate-500">{inv.poId}</td>
                      <td className="py-2.5 text-right font-medium text-slate-900">{moneyExact(inv.amount)}</td>
                      <td className="py-2.5 text-slate-500">{shortDate(inv.dueDate)}</td>
                      <td className="py-2.5">
                        <Badge tone={inv.status === "paid" ? "good" : "warn"}>{inv.status}</Badge>
                      </td>
                      <td className="py-2.5">
                        {flags.length === 0 ? (
                          <span className="text-xs text-slate-300">—</span>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {flags.map((f, i) => (
                              <div key={i} className="flex items-center gap-2" title={f.message}>
                                <SeverityBadge severity={f.severity} />
                                <span className="text-xs text-slate-600">{TYPE_LABEL[f.type]}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {anomalies.length > 0 && (
        <div className="mt-6">
          <Card>
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Anomaly detail</h2>
            <ul className="divide-y divide-slate-100">
              {anomalies.map((a, i) => (
                <li key={i} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-800">
                      {a.invoiceId} · {supplierName(a.supplierId)} · {TYPE_LABEL[a.type]}
                    </div>
                    <div className="text-xs text-slate-500">{a.message}</div>
                  </div>
                  <SeverityBadge severity={a.severity} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
