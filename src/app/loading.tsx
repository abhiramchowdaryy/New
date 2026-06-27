// Route-level loading skeleton (Phase 14).

export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-48 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-4 w-80 rounded bg-slate-100 dark:bg-slate-800/60" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
    </div>
  );
}
