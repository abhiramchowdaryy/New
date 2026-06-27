# Architecture & Readiness Review — AI Procurement Copilot

> Status as reviewed: working Next.js 14 MVP on an in-memory seed dataset.
> `npm run build` ✅ · `npm run typecheck` ✅ · `npm run lint` ❌ (not configured).
> This document is the **First Task** deliverable: a complete review of the
> existing codebase before any production work begins. No application code was
> changed to produce it.

---

## 0. What exists today (ground truth)

| Area | Current state |
|---|---|
| Framework | Next.js 14 App Router, React 18, TypeScript (`strict: true`) |
| Routes | `/`, `/spend`, `/purchase-orders`, `/invoices`, `/suppliers`, `/deliveries`, `/copilot`, `api/copilot` |
| Data | `src/lib/data.ts` — hardcoded arrays of 8 suppliers, 24 POs, 20 invoices, 20 deliveries; `TODAY` is a frozen string `2025-06-26` |
| Analytics | `src/lib/analytics.ts` — pure functions for spend, delivery, supplier risk, invoice anomalies; single source of truth, reused by UI and copilot |
| AI | `api/copilot/route.ts` streams Claude with a JSON snapshot injected into the system prompt; `lib/anthropic.ts` is the client factory |
| Styling | Tailwind, custom UI primitives in `components/ui.tsx`, Recharts |
| Auth | **None** |
| Persistence | **None** (process memory only) |
| Multi-tenancy | **None** |
| Tests | **None** |
| CI/CD | **None** |
| Observability | `console.error` only |

**The single most important architectural strength to preserve:** analytics is
already factored as pure functions over a stable accessor surface
(`getPurchaseOrders()`, `getInvoices()`, …) and the copilot is grounded by the
*same* `buildCopilotSnapshot()` the dashboards compute from. The data layer is
explicitly designed to be swapped ("Swap the internals for a DB/ERP connector
later; signatures stay stable"). This is the seam every later phase hangs off.

---

## 1. Architecture Review

**Verdict: clean MVP architecture, correctly layered, but built on synchronous
in-memory assumptions that block every production phase.**

What's right:
- **Layering is correct.** UI → analytics → data accessors. Business logic
  (`analytics.ts`) has zero UI imports. UI components import analytics, never
  raw data math. This is the SOLID/clean-architecture seam the prompt demands;
  it must be *preserved*, not rebuilt.
- **Single source of truth.** Both the dashboards and the copilot read from the
  same `compute*` functions. There is no duplicated spend/risk math. Keep this
  invariant — it is the one rule the prompt calls out twice.
- **Server/client boundary is sane.** Pages are Server Components by default;
  only `charts.tsx`, `Sidebar.tsx`, and `copilot/page.tsx` are `"use client"`.
  The Anthropic key never crosses to the browser.

What blocks production:
- **The accessors are synchronous and parameterless.** `getPurchaseOrders(): PurchaseOrder[]`
  cannot become a tenant-scoped async DB/ERP read without changing every
  call site. The seam exists but its *signature* is wrong for the future. The
  first real refactor must make accessors `async` and accept a tenant/context
  argument — ideally via a repository interface, before any DB work.
- **No request context.** There is no notion of "who is asking" anywhere in the
  stack. Multi-tenancy and RBAC cannot be retrofitted onto functions that take
  no context.
- **`TODAY` is a module constant.** Every "overdue/late" calculation is anchored
  to a hardcoded string. Correct for a deterministic demo; wrong for production
  (and a correctness bug the moment real dates flow in).

**Recommended target architecture (incremental, non-breaking):**
```
app/ (routes, server components)         ← unchanged surface where possible
  api/                                    ← validated, auth’d route handlers
core/        (domain types + pure analytics) ← today’s lib/analytics, untouched math
ports/       (Repository, ErpConnector, AuthProvider interfaces)
adapters/    (Postgres repo, SAP/Dynamics/CSV connectors, Auth.js/Clerk)
context/     (per-request tenant + user, dependency injection)
```
The pure math in `core` never changes; everything new plugs in behind `ports`.

---

## 2. Technical Debt Report

| # | Debt | Severity | Notes |
|---|---|---|---|
| D1 | Synchronous, context-free data accessors | **High** | Blocks DB, tenancy, RBAC. Refactor to async repository first. |
| D2 | `npm run lint` not configured | **High** | Lint prompts interactively → unusable in CI. No ESLint config in repo. "Verify lint passes" is currently impossible. |
| D3 | `TODAY` hardcoded constant | Medium | Inject a clock; replace with `now()` provider. |
| D4 | Zero tests | **High** | Analytics is pure and trivially testable — highest ROI place to start. |
| D5 | Duplicated date math | Low | `daysLate` reimplemented in `deliveries/page.tsx` instead of `daysBetween`. Minor SOLID violation. |
| D6 | Anomaly detection is O(n²) | Medium | Nested invoice loop — fine at 20 rows, quadratic at scale. Needs hashing/windowing for the "1M records" target. |
| D7 | No input validation library | Medium | `validate()` in the copilot route is hand-rolled. Adopt Zod across all API boundaries. |
| D8 | No error boundaries / loading states | Low | No `error.tsx`, `loading.tsx`, or skeletons. |
| D9 | Magic numbers in risk weights | Low | Risk weights/thresholds inline in `analytics.ts`; extract to a documented config so domain experts can tune them. |
| D10 | No persistence of chat history | Low | Copilot is stateless per request; fine for now, needed for audit/observability later. |

---

## 3. Security Audit

**Verdict: acceptable for a keyless demo, unacceptable for B2B SaaS. The gap is the product, not a bug list.**

- **No authentication or authorization** anywhere. Every route is world-readable.
  `api/copilot` will call Claude (and bill) for any anonymous caller. (Phase 1/10)
- **No tenant isolation** — there is only one global dataset. The prompt's
  "prevent tenant data leakage" requirement has no foundation yet. (Phase 2)
- **No rate limiting** on `api/copilot`. An open, unauthenticated, paid LLM
  endpoint is a direct cost-exhaustion / DoS vector. **Highest-priority single
  fix** once auth lands. (Phase 10)
- **No security headers / CSP / CSRF.** `next.config.js` sets no headers. No CSP,
  HSTS, X-Frame-Options, or CSRF protection on the mutating route. (Phase 10)
- **Prompt-injection surface.** User chat text is passed to Claude alongside the
  data snapshot. With only read-only grounding today the blast radius is low, but
  the moment the copilot gets tool-use / write actions (Phase 6), injected
  instructions could trigger unintended actions. Plan tool authorization now.
- **Secret handling is adequate but minimal.** `ANTHROPIC_API_KEY` read from env,
  never shipped to client, `.env*.local` gitignored. No secret manager,
  rotation, or per-tenant keying. (Phase 10/13)
- **Error leakage is controlled.** Routes return friendly messages and log
  details server-side — good. Keep this discipline.
- **OWASP Top 10:** A01 (Broken Access Control) and A07 (Auth failures) are
  wide open by design; A04 (Insecure Design — no rate limit/tenancy) applies.
  Injection/XSS risk is currently low (React escaping, no SQL yet).

---

## 4. Performance Audit

**Verdict: fast because the dataset is tiny; nothing here scales.**

- All analytics run **synchronously on every request** with no caching/memoization.
  At 20 rows that's microseconds; the prompt's target is **1M+ records**, where
  this design recomputes the spend cube per page view.
- **O(n²) invoice anomaly scan** (D6) is the first thing to break at scale.
- **No pagination or virtualization.** Invoice/PO/delivery tables render every
  row. At 100k+ rows the DOM and payload explode. (Phase 9/14)
- **No `React.memo`, no `Suspense` streaming, no DB indexing** (no DB at all).
- Bundle is healthy today (~87.5 kB shared, dashboard 204 kB first load — Recharts
  dominates). Lazy-load charts to trim. Good baseline to protect.
- Positive: Server Components already keep most data math off the client.

Scale path: push aggregation into SQL (materialized views / pre-computed
rollups), paginate/virtualize tables, cache snapshots per tenant with
invalidation, stream large lists.

---

## 5. Scalability Audit

- **Stateless app tier** (good) but **no shared state store** — in-memory data
  means horizontal scaling is meaningless today.
- **No database** → no connection pooling, migrations, or read replicas to reason
  about yet. This is the foundational gap (Phase 4).
- **Multi-tenancy model undecided.** Must choose shared-schema-with-`tenant_id`
  (cheaper, needs rigorous row-level scoping) vs schema/db-per-tenant (stronger
  isolation, heavier ops). Recommendation below.
- **AI throughput:** single synchronous streaming call per request, no queue, no
  per-tenant concurrency limits or token budgeting. Will need backpressure.
- **Analytics recomputation** doesn't scale per-request; needs caching + a
  background recompute strategy on data change.

---

## 6. AI Architecture Review

**Verdict: the grounding pattern is genuinely good and ahead of typical MVPs — extend it, don't replace it.**

Strengths:
- **Server-side grounding with a single snapshot** built from the same analytics
  as the UI → chat and charts can't disagree. This is exactly the
  "single source of truth" the prompt mandates.
- Strong system-prompt guardrails ("answer ONLY from the snapshot", "never
  invent numbers").
- Streaming via `ReadableStream`, key isolation, message length caps.

Gaps vs. the Phase 5/6 vision:
- **Whole snapshot stuffed into the prompt.** Works at 20 rows; impossible at
  enterprise scale. Needs **retrieval** (RAG / structured tool-use) that fetches
  only relevant records per question. (Phase 5)
- **No citations / traceable evidence.** The prompt requires every answer to
  cite supporting records (invoice IDs, PO IDs). Today the model is *asked* to be
  faithful but returns no structured evidence links. Add tool-use that returns
  record IDs the UI can render as drill-downs.
- **No structured JSON outputs.** Phase 6 wants RFQs, scorecards, risk
  explanations as typed JSON — currently free-text only.
- **No eval/regression harness.** No way to catch hallucination or accuracy
  regressions. (Phase 12)
- **Guardrails are prompt-only.** Should be backed by tool authorization +
  output validation once write actions exist.
- Model id `claude-opus-4-8` is current and correct; keep `resolveModel()`.

Target: replace "snapshot-in-prompt" with **typed tool-use over the repository**
(`getSupplierRisk(id)`, `findInvoiceAnomalies(filter)`, …). The model queries
live, tenant-scoped data and returns answers + the record IDs it used.

---

## 7. Procurement Domain Review

**Verdict: domain model is credible but thin — about 6 of ~14 core P2P entities exist.**

Present: Supplier, PurchaseOrder, Invoice, Delivery, plus derived SupplierRisk /
SpendSummary / anomalies. The analytics encode real procurement logic
(realized vs. committed spend, on-time rate, price variance vs. PO, duplicate
detection, composite risk) — domain-sound.

Missing vs. Phase 4 normalized model:
- **Purchase Requisition** (the pre-PO demand signal) — absent.
- **Goods Receipt (GR)** as a first-class entity — currently conflated with
  Delivery. SAP separates GR from delivery; the 3-way match (PO ↔ GR ↔ Invoice)
  is the heart of P2P and isn't modeled.
- **Contract** (and contract compliance / off-contract spend) — absent.
- **Material / Category master**, **Cost Center**, **Budget**, **Approval
  Workflow / chain** — absent. Category is a string union, not a master entity.
- **No line items.** POs and invoices are header-only (single `amount`). Real
  price-variance and 3-way match need line-level data. This is the most
  important domain gap for AI accuracy.

Domain correctness notes:
- Duplicate detection (same supplier+amount within 10 days) is a reasonable
  heuristic but will false-positive on legitimate recurring charges; should also
  consider PO/line and invoice number.
- Risk weighting is sensible (financial + delivery dominate) but should be
  externalized so a procurement SME can tune it without code changes.

---

## Cross-cutting priority order (recommendation)

The 14 phases can't land safely in arbitrary order. Dependency-driven sequence:

1. **Foundation refactor (enables everything):** async repository interface +
   per-request context; extract `now()` clock; add Zod; configure ESLint; add
   the first analytics unit tests. *Non-breaking — signatures change behind the
   stable `core` math.*
2. **Phase 1 Auth + Phase 2 Multi-tenancy** (together — tenancy is meaningless
   without identity). Decision required: Auth provider + isolation model.
3. **Phase 4 Data model + persistence** (Postgres/Prisma) with line items and GR.
4. **Phase 10 Security** hardening (rate limit the copilot first) + **Phase 11**
   observability — fold in continuously, not at the end.
5. **Phase 5 AI grounding via tool-use** + **Phase 6 Copilot** capabilities.
6. **Phase 3 ERP connectors** behind the repository port.
7. **Phases 7/8** advanced analytics + risk engine (extends `core`).
8. **Phases 9/14** performance + enterprise UX.
9. **Phases 12/13** testing depth + DevOps run alongside throughout.

### Decisions that are the user's to make before Phase 1 coding
- **Auth provider:** Auth.js (self-hosted, free, more wiring) vs Clerk (managed,
  fastest org/SSO/invitations, paid).
- **Tenancy isolation:** shared-schema + `tenant_id` (recommended default) vs
  schema/DB-per-tenant.
- **Database + host:** Postgres flavor (Neon / Supabase / RDS) and deploy target
  (Vercel vs container/K8s) — these gate Phases 4, 9, 13.
- **Scope/sequencing:** this is a multi-iteration program, not a single PR.

---

## Verification performed for this review
- Read every source file under `src/` and all config.
- `npm install` ✅ · `npm run build` ✅ (10 routes, 87.5 kB shared) ·
  `npm run typecheck` ✅ · `npm run lint` ❌ (interactive prompt — not CI-safe).
- No application code modified.
