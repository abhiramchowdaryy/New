# Frontend Guidelines

## Design language
- Clean B2B SaaS: white surfaces, slate text, a single brand-blue accent.
- Dense but legible data tables; generous numeric whitespace.
- Money formatted as compact USD (`$1.2M`, `$840K`) in summaries; full precision in tables.

## Layout
- Fixed left sidebar (240px) + scrollable main content with a page header.
- Cards: `rounded-xl border border-slate-200 bg-white p-5 shadow-sm`.
- Grid KPIs at top of analytical pages.

## Components
- `Sidebar` — nav with active-state highlight.
- `PageHeader` — title + subtitle.
- `KpiCard` — label, value, optional delta/sub-text, icon.
- `Card` — generic surface wrapper.
- `RiskBadge` / `Badge` — colored status pills (low=green, medium=amber, high=red).
- Charts are **client components** (`"use client"`); pages stay server components
  and pass already-computed data down as props.

## Color semantics
- Positive / low risk / on-time → emerald.
- Caution / medium risk / due-soon → amber.
- Negative / high risk / breached / flagged → rose.
- Neutral accent → brand blue.

## Accessibility & UX
- Every interactive element keyboard-reachable; visible focus.
- Tables get header `<th scope>`; numbers right-aligned.
- Empty states explain what to do next (esp. copilot).
- Never block the UI on the LLM — stream tokens.

## Code conventions
- TypeScript strict; shared types in `src/lib/types.ts`.
- No data fetching in client components — receive props.
- Currency/number/date formatting centralized in `src/lib/format.ts`.
