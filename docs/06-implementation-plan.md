# Implementation Plan

## Phase 0 — Foundations ✅ (this build)
- Next.js + TS + Tailwind scaffold, configs, env template.
- Six planning docs.

## Phase 1 — Domain & data ✅
- `types.ts`, seed `data.ts` (8 suppliers, ~24 POs, ~24 invoices, deliveries).
- `format.ts` helpers.

## Phase 2 — Analytics ✅
- Spend summary, supplier risk scoring, invoice anomaly detection, delivery metrics.
- `buildCopilotSnapshot()` for grounding.

## Phase 3 — UI ✅
- Sidebar + shared components (Card, KpiCard, PageHeader, Badge/RiskBadge).
- Dashboard, Spend, Purchase Orders, Invoices, Suppliers, Deliveries pages.
- Recharts visualizations.

## Phase 4 — Copilot ✅
- `POST /api/copilot` grounded + streamed Claude call.
- Chat UI with suggested prompts and streaming render.

## Phase 5 — Hardening (next)
- Unit tests for analytics functions.
- Tool-use copilot (Claude queries data directly).
- Auth + workspace scoping; DB-backed data layer.
- CSV/ERP import; multi-currency.

## Running locally
```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```
The dashboards work without a key; only the Copilot tab needs `ANTHROPIC_API_KEY`.
