"use client";

import { Download } from "lucide-react";
import { toCsv } from "@/lib/export";

/** Client-side "Export CSV" button for any array of flat records. */
export function ExportButton<T extends object>({
  rows,
  filename,
  columns,
  label = "Export CSV",
}: {
  rows: T[];
  filename: string;
  columns?: (keyof T)[];
  label?: string;
}) {
  function download() {
    const csv = toCsv(rows, columns);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={download}
      disabled={rows.length === 0}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
    >
      <Download size={14} />
      {label}
    </button>
  );
}
