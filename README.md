# AI Procurement Copilot (B2B)

An AI copilot for procurement and finance teams. It analyzes **purchase orders,
invoices, supplier risk, delivery delays, and spend**, and answers
natural-language questions grounded in your workspace data — powered by Claude.

> Monthly SaaS product ($100–$2,000+). This repo is a working MVP on seed data.

## Features

- **Dashboard** — realized spend, on-time delivery %, high-risk suppliers, flagged invoices.
- **Spend analysis** — by category, by supplier, and monthly trend (Recharts).
- **Purchase Orders** — full register with status, value, and dates.
- **Invoices + anomaly detection** — duplicates, price variance vs PO, and overdue invoices.
- **Supplier risk scoring** — composite 0–100 from financial, delivery, quality, and compliance signals.
- **Delivery delays** — expected vs actual, days late, SLA breaches.
- **AI Copilot** — streamed, grounded Q&A over a server-computed analytics snapshot.

## Tech stack

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Recharts ·
`@anthropic-ai/sdk` (model `claude-opus-4-8`).

See [`docs/`](./docs) for the six planning documents (PRD, tech stack, app flow,
frontend guidelines, backend structure, implementation plan).

## Getting started

```bash
npm install
cp .env.example .env.local      # add your ANTHROPIC_API_KEY
npm run dev                      # http://localhost:3000
```

All dashboards work **without** an API key. Only the **Copilot** tab needs
`ANTHROPIC_API_KEY` (get one at https://console.anthropic.com/).

### Quality gates

```bash
npm run typecheck    # tsc --noEmit (strict)
npm run lint         # next lint (ESLint)
npm test             # vitest run — analytics unit tests
npm run build        # production build
```

## Project structure

```
src/
  app/                  # routes (dashboard, spend, POs, invoices, suppliers, deliveries, copilot)
    api/copilot/route.ts  # grounded + streamed Claude endpoint
  components/           # Sidebar, charts, UI primitives
  lib/
    types.ts            # domain types
    data.ts             # seed dataset + accessors (swap for a DB/ERP later)
    analytics.ts        # spend, risk, anomaly, delivery computations
    analytics.test.ts   # vitest unit tests for the analytics layer
    clock.ts            # injectable "as of" date anchor
    config/risk.ts      # tunable risk weights + anomaly thresholds
    format.ts           # currency/date/number formatting
    anthropic.ts        # Claude client factory
docs/                   # planning documents + architecture review
```

## How the copilot stays accurate

The `/api/copilot` route computes an analytics **snapshot** server-side
(`buildCopilotSnapshot()`), passes it to Claude as system context, and instructs
the model to answer **only** from that data. Figures the model cites come from
the same functions that render the dashboards — so the chat and the charts always
agree. The Anthropic key and raw data never reach the browser.

## Next steps

See [`docs/07-architecture-review.md`](./docs/07-architecture-review.md) for the
full readiness review and a dependency-ordered roadmap. Near-term:
tool-use copilot (Claude queries live data) · auth + workspace scoping ·
Postgres/Prisma data layer · CSV/ERP import.
