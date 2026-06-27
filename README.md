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
    types.ts            # domain types (incl. ProcurementDataset)
    auth/
      roles.ts          # RBAC: roles + permission matrix + can()
      context.ts        # per-request tenant/user context (auth seam)
    data/
      repository.ts     # ProcurementRepository port (async, tenant-scoped)
      in-memory-repository.ts  # reference adapter, isolated per tenant
      dataset.ts        # O(1) lookups over a loaded dataset
      seed.ts           # demo-org seed data
      index.ts          # getRepository() + loadProcurementDataset()
    analytics.ts        # pure spend/risk/anomaly/delivery math over a dataset
    analytics.test.ts   # vitest unit tests for the analytics layer
    clock.ts            # injectable "as of" date anchor
    config/risk.ts      # tunable risk weights + anomaly thresholds
    format.ts           # currency/date/number formatting
    anthropic.ts        # Claude client factory
docs/                   # planning documents + architecture review
```

## Multi-tenancy, auth & RBAC

Data access goes through a tenant-scoped **repository port**
(`lib/data/repository.ts`). Server Components call `loadProcurementDataset()`,
which resolves the request's tenant + role (`lib/auth/context.ts`) and returns
**only that organization's** records — analytics stays pure and tenant-agnostic,
so there is no path for one tenant to read another's data (covered by an
isolation regression test).

Authorization is a pure permission matrix over six roles
(`super_admin`, `org_admin`, `procurement_manager`, `finance`, `supplier`,
`viewer`) in `lib/auth/roles.ts`; the copilot route enforces `use:copilot`.

With no auth provider configured the app resolves a **demo organization** so it
runs out of the box. To wire a real provider (Clerk / Auth.js / Entra), set the
`x-tenant-id` / `x-user-id` / `x-user-role` request headers from the verified
session in middleware — nothing downstream changes. Swapping the in-memory
adapter for Postgres/Prisma or an ERP connector is a one-line change in
`lib/data/index.ts`.

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
