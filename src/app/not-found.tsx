import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-5xl font-bold text-slate-300 dark:text-slate-700">404</div>
      <h2 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Page not found
      </h2>
      <p className="mt-1 text-sm text-slate-500">That route doesn&apos;t exist in this workspace.</p>
      <Link
        href="/"
        className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
