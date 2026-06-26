import { computeSpendSummary } from "@/lib/analytics";
import { moneyCompact, money, percent } from "@/lib/format";
import { Card, KpiCard, PageHeader } from "@/components/ui";
import { CategoryBarChart, CategoryPieChart, SpendTrendChart } from "@/components/charts";

export default function SpendPage() {
  const spend = computeSpendSummary();
  const grandTotal = spend.total || 1;

  return (
    <div>
      <PageHeader title="Spend Analysis" subtitle="Where the money goes — by category, supplier, and month." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Realized spend" value={moneyCompact(spend.total)} sub="received & closed POs" />
        <KpiCard label="Committed (open)" value={moneyCompact(spend.committedOpen)} sub="open purchase orders" />
        <KpiCard label="Categories" value={String(spend.byCategory.length)} sub="active spend categories" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Spend by category</h2>
          <CategoryBarChart data={spend.byCategory} />
        </Card>
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Category mix</h2>
          <CategoryPieChart data={spend.byCategory} />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Monthly trend</h2>
          <SpendTrendChart data={spend.monthlyTrend} />
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900">Spend by supplier</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
                <th scope="col" className="py-2 font-medium">Supplier</th>
                <th scope="col" className="py-2 text-right font-medium">Spend</th>
                <th scope="col" className="py-2 text-right font-medium">% of total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {spend.bySupplier.map((s) => (
                <tr key={s.supplierId}>
                  <td className="py-2.5 text-slate-700">{s.name}</td>
                  <td className="py-2.5 text-right font-medium text-slate-900">{money(s.amount)}</td>
                  <td className="py-2.5 text-right text-slate-500">{percent(s.amount / grandTotal, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}
