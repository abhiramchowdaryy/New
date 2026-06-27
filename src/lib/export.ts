// CSV export (Phase 14).
//
// Turns an array of records into RFC-4180 CSV text. Pure so it's testable and
// reusable on server or client (the client wraps it in a Blob download).

export function toCsv<T extends object>(
  rows: T[],
  columns?: (keyof T)[],
): string {
  if (rows.length === 0) return "";
  const cols = (columns ?? (Object.keys(rows[0]) as (keyof T)[]));
  const header = cols.map((c) => escapeCell(String(c))).join(",");
  const body = rows
    .map((row) => cols.map((c) => escapeCell(formatCell(row[c]))).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

function formatCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCell(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
