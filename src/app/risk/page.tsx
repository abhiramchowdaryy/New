import { computeSupplierRiskProfiles } from "@/lib/risk-engine";
import { loadProcurementDataset } from "@/lib/data";
import { Card, KpiCard, PageHeader, RiskBadge } from "@/components/ui";
import { ExportButton } from "@/components/ExportButton";
import type { RiskDimension } from "@/lib/types";

const DIM_LABEL: Record<RiskDimension, string> = {
  financial: "Financial",
  delivery: "Delivery",
  quality: "Quality",
  compliance: "Compliance",
  esg: "ESG",
  geographic: "Geographic",
  singleSource: "Single-source",
  priceVolatility: "Price volatility",
};

function DimBar({ score }: { score: number }) {
  const tone = score >= 60 ? "bg-rose-500" : score >= 35 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={`h-1.5 rounded-full ${tone}`} style={{ width: `${score}%` }} />
    </div>
  );
}

export default async function RiskPage() {
  const { data } = await loadProcurementDataset();
  const profiles = computeSupplierRiskProfiles(data);
  const high = profiles.filter((p) => p.band === "high").length;
  const medium = profiles.filter((p) => p.band === "medium").length;

  const exportRows = profiles.map((p) => ({
    supplier: p.name,
    category: p.category,
    compositeScore: p.compositeScore,
    band: p.band,
    ...Object.fromEntries(p.dimensions.map((d) => [d.dimension, d.score])),
  }));

  return (
    <div>
      <PageHeader
        title="Risk Engine"
        subtitle="Composite supplier risk across eight dimensions, each scored and explained from your data."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Suppliers scored" value={String(profiles.length)} />
        <KpiCard label="High risk" value={String(high)} tone="bad" sub="prioritize mitigation" />
        <KpiCard label="Medium risk" value={String(medium)} tone="warn" sub="monitor" />
      </div>

      <div className="mt-6 flex justify-end">
        <ExportButton rows={exportRows} filename="supplier-risk-profiles" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {profiles.map((p) => (
          <Card key={p.supplierId}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-base font-semibold text-slate-900 dark:text-slate-100">{p.name}</div>
                <div className="text-xs text-slate-500">{p.category}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{p.compositeScore}</div>
                <RiskBadge band={p.band} />
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {p.dimensions.map((d) => (
                <div key={d.dimension} title={d.explanation}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{DIM_LABEL[d.dimension]}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-300">{d.score}</span>
                  </div>
                  <div className="mt-1">
                    <DimBar score={d.score} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
