import { computeSupplierRisks } from "@/lib/analytics";
import { getSupplier } from "@/lib/data";
import { moneyCompact, percent } from "@/lib/format";
import { Card, KpiCard, PageHeader, RiskBadge } from "@/components/ui";

function SubScore({ label, value }: { label: string; value: number }) {
  const tone = value >= 75 ? "bg-emerald-500" : value >= 55 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        <span className="font-medium text-slate-700">{value}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
        <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  const risks = computeSupplierRisks();
  const high = risks.filter((r) => r.band === "high").length;
  const medium = risks.filter((r) => r.band === "medium").length;

  return (
    <div>
      <PageHeader
        title="Suppliers"
        subtitle="Composite risk score (0–100, higher = riskier) from financial, delivery, quality, and compliance signals."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Suppliers" value={String(risks.length)} />
        <KpiCard label="High risk" value={String(high)} tone="bad" sub="prioritize for review" />
        <KpiCard label="Medium risk" value={String(medium)} tone="warn" sub="monitor" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {risks.map((r) => {
          const s = getSupplier(r.supplierId)!;
          return (
            <Card key={r.supplierId}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-base font-semibold text-slate-900">{r.name}</div>
                  <div className="text-xs text-slate-500">
                    {r.category} · {s.country}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-2xl font-semibold text-slate-900">{r.score}</div>
                  <RiskBadge band={r.band} />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                <SubScore label="Financial" value={s.financialScore} />
                <SubScore label="Delivery" value={s.deliveryScore} />
                <SubScore label="Quality" value={s.qualityScore} />
                <SubScore label="Compliance" value={s.complianceScore} />
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>On-time: <span className="font-medium text-slate-700">{percent(r.onTimeRate)}</span></span>
                <span>Spend: <span className="font-medium text-slate-700">{moneyCompact(r.totalSpend)}</span></span>
                <span>Open POs: <span className="font-medium text-slate-700">{r.openPoCount}</span></span>
              </div>

              <ul className="mt-3 space-y-1">
                {r.drivers.map((d, i) => (
                  <li key={i} className="text-xs text-slate-600">• {d}</li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
