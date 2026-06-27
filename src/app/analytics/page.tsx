import {
  computeAbcAnalysis,
  computeBudgetVariance,
  computeCashFlowForecast,
  computeCycleTime,
  computeSpendForecast,
} from "@/lib/advanced-analytics";
import { loadProcurementDataset } from "@/lib/data";
import { money, moneyCompact, percent } from "@/lib/format";
import { Badge, Card, KpiCard, PageHeader } from "@/components/ui";
import { SpendTrendChart } from "@/components/charts";
import { ExportButton } from "@/components/ExportButton";

export default async function AnalyticsPage() {
  const { data } = await loadProcurementDataset();
  const abc = computeAbcAnalysis(data);
  const budget = computeBudgetVariance(data);
  const cycle = computeCycleTime(data);
  const forecast = computeSpendForecast(data, 3);
  const cashflow = computeCashFlowForecast(data);

  const overBudget = budget.filter((b) => b.variance < 0).length;
  const classA = abc.filter((e) => e.abcClass === "A");

  return (
    <div>
      <PageHeader
        title="Advanced Analytics"
        subtitle="Spend concentration, budget vs actual, cycle time, and forecasts."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <KpiCard label="Class-A suppliers" value={String(classA.length)} sub="drive ~80% of spend" />
        <KpiCard label="Categories over budget" value={String(overBudget)} tone={overBudget > 0 ? "bad" : "good"} />
        <KpiCard label="Avg cycle time" value={`${cycle.avgCycleTimeDays}d`} sub={`lead ${cycle.avgLeadTimeDays}d`} />
        <KpiCard label="Avg delivery delay" value={`${cycle.avgDelayDays}d`} tone={cycle.avgDelayDays > 5 ? "warn" : "good"} />
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Spend forecast (next 3 months projected)
          </h2>
          <SpendTrendChart data={forecast.map((f) => ({ month: f.month, amount: f.amount }))} />
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Budget vs actual</h2>
            <ExportButton rows={budget} filename="budget-vs-actual" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                <th className="py-2 font-medium">Category</th>
                <th className="py-2 text-right font-medium">Budget</th>
                <th className="py-2 text-right font-medium">Actual+Committed</th>
                <th className="py-2 text-right font-medium">Utilization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {budget.map((b) => (
                <tr key={b.category}>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">{b.category}</td>
                  <td className="py-2.5 text-right text-slate-500">{moneyCompact(b.budget)}</td>
                  <td className="py-2.5 text-right text-slate-700 dark:text-slate-300">{moneyCompact(b.actual + b.committed)}</td>
                  <td className="py-2.5 text-right">
                    <Badge tone={b.utilizationPct > 1 ? "bad" : b.utilizationPct >= 0.9 ? "warn" : "good"}>
                      {percent(b.utilizationPct)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">ABC / Pareto classification</h2>
            <ExportButton rows={abc} filename="abc-analysis" />
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400 dark:border-slate-700">
                <th className="py-2 font-medium">Supplier</th>
                <th className="py-2 text-right font-medium">Spend</th>
                <th className="py-2 text-right font-medium">Cumulative</th>
                <th className="py-2 text-center font-medium">Class</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {abc.map((e) => (
                <tr key={e.supplierId}>
                  <td className="py-2.5 text-slate-700 dark:text-slate-300">{e.name}</td>
                  <td className="py-2.5 text-right text-slate-700 dark:text-slate-300">{money(e.spend)}</td>
                  <td className="py-2.5 text-right text-slate-500">{percent(e.cumulativePct, 1)}</td>
                  <td className="py-2.5 text-center">
                    <Badge tone={e.abcClass === "A" ? "info" : e.abcClass === "B" ? "warn" : "neutral"}>
                      {e.abcClass}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-100">
            Cash-flow outlook (unpaid invoices by due month)
          </h2>
          {cashflow.length === 0 ? (
            <p className="text-sm text-slate-500">No unpaid invoices.</p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {cashflow.map((c) => (
                <li key={c.month} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                  <div className="text-xs text-slate-500">{c.month}</div>
                  <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{moneyCompact(c.outflow)}</div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
