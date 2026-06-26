import type { ReactNode } from "react";
import type { RiskBand, Severity } from "@/lib/types";

export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  sub,
  icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  icon?: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneClasses: Record<string, string> = {
    neutral: "text-slate-900",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-rose-600",
  };
  return (
    <Card className="flex items-start justify-between">
      <div>
        <div className="text-sm font-medium text-slate-500">{label}</div>
        <div className={`mt-2 text-2xl font-semibold ${toneClasses[tone]}`}>
          {value}
        </div>
        {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
      </div>
      {icon && <div className="text-slate-300">{icon}</div>}
    </Card>
  );
}

const RISK_STYLES: Record<RiskBand, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  high: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function RiskBadge({ band }: { band: RiskBand }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${RISK_STYLES[band]}`}
    >
      {band} risk
    </span>
  );
}

const SEVERITY_STYLES: Record<Severity, string> = {
  low: "bg-slate-100 text-slate-600 ring-slate-500/20",
  medium: "bg-amber-50 text-amber-700 ring-amber-600/20",
  high: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${SEVERITY_STYLES[severity]}`}
    >
      {severity}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const styles: Record<string, string> = {
    neutral: "bg-slate-100 text-slate-600 ring-slate-500/20",
    good: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    warn: "bg-amber-50 text-amber-700 ring-amber-600/20",
    bad: "bg-rose-50 text-rose-700 ring-rose-600/20",
    info: "bg-brand-50 text-brand-700 ring-brand-600/20",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
