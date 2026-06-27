import Link from "next/link";
import { DollarSign, Truck, ShieldAlert, ReceiptText } from "lucide-react";
import {
  computeHeadline,
  computeSpendSummary,
  computeSupplierRisks,
  detectInvoiceAnomalies,
} from "@/lib/analytics";
import { loadProcurementDataset } from "@/lib/data";
import { moneyCompact, money, percent } from "@/lib/format";
import { Card, KpiCard, PageHeader, RiskBadge, SeverityBadge } from "@/components/ui";
import { SpendTrendChart } from "@/components/charts";

export default async function DashboardPage() {
  const { data } = await loadProcurementDataset();
  const headline = computeHeadline(data);
  const spend = computeSpendSummary(data);
  const risks = computeSupplierRisks(data);
  const anomalies = detectInvoiceAnomalies(data);

  const topSuppliers = spend.bySupplier.slice(0, 5);
  const topRisks = risks.slice(0, 4);
  const recentAnomalies = anomalies.slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Spend, supplier risk, invoice anomalies, and delivery performance at a glance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Realized spend"
          value={moneyCompact(headline.totalSpend)}
          sub={`${moneyCompact(headline.committedOpen)} committed on open POs`}
          icon={<DollarSign size={22} />}
        />
        <KpiCard
          label="On-time delivery"
          value={percent(headline.onTimeRate)}
          sub="of delivered purchase orders"
          tone={headline.onTimeRate >= 0.8 ? "good" : headline.onTimeRate >= 0.6 ? "warn" : "bad"}
          icon={<Truck size={22} />}
        />
        <KpiCard
          label="High-risk suppliers"
          value={String(headline.highRiskSuppliers)}
          sub="need review this cycle"
          tone={headline.highRiskSuppliers > 0 ? "bad" : "good"}
          icon={<ShieldAlert size={22} />}
        />
        <KpiCard
          label="Flagged invoices"
          value={String(headline.flaggedInvoices)}
          sub={`${moneyCompact(headline.flaggedInvoiceValue)} at risk`}
          tone={headline.flaggedInvoices > 0 ? "warn" : "good"}
          icon={<ReceiptText size={22} />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Monthly spend trend</h2>
            <Link href="/spend" className="text-xs font-medium text-brand-600 hover:underline">
              View spend →
            </Link>
          </div>
          <SpendTrendChart data={spend.monthlyTrend} />
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Top suppliers by spend</h2>
            <Link href="/suppliers" className="text-xs font-medium text-brand-600 hover:underline">
              All →
            </Link>
          </div>
          <ul className="space-y-3">
            {topSuppliers.map((s) => (
              <li key={s.supplierId} className="flex items-center justify-between text-sm">
                <span className="text-slate-700">{s.name}</span>
                <span className="font-medium text-slate-900">{moneyCompact(s.amount)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Highest-risk suppliers</h2>
            <Link href="/suppliers" className="text-xs font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {topRisks.map((r) => (
              <li key={r.supplierId} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">{r.name}</div>
                  <div className="text-xs text-slate-500">{r.drivers[0]}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-900">{r.score}</span>
                  <RiskBadge band={r.band} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent invoice alerts</h2>
            <Link href="/invoices" className="text-xs font-medium text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <ul className="divide-y divide-slate-100">
            {recentAnomalies.map((a) => (
              <li key={`${a.invoiceId}-${a.type}`} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-800">
                    {a.invoiceId} · <span className="capitalize">{a.type.replace("_", " ")}</span>
                  </div>
                  <div className="text-xs text-slate-500">{a.message}</div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <SeverityBadge severity={a.severity} />
                  <span className="text-xs text-slate-400">{money(a.amount)}</span>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
