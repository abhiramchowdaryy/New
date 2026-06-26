# PRD — AI Procurement Copilot (B2B)

## 1. Vision
An AI copilot that helps procurement, finance, and operations teams understand
and control company spend. It ingests purchase orders (POs), invoices, supplier
records, and delivery events, then surfaces spend insights, supplier risk,
invoice anomalies, and delivery-delay alerts — and answers natural-language
questions about all of it.

## 2. Target Customers
- Mid-market & enterprise procurement / finance teams ($5M–$2B annual spend).
- Operations leads who own supplier relationships and delivery SLAs.

## 3. Pricing
SaaS, billed monthly per workspace:
| Tier | Price / mo | For |
|------|-----------|-----|
| Starter | $100 | Up to 250 POs/mo, 1 workspace, copilot Q&A |
| Growth | $500 | Up to 5k POs/mo, anomaly detection, risk scoring |
| Scale | $2,000+ | Unlimited, SSO, custom risk models, API access |

## 4. Core Problems Solved
1. **Spend is opaque** — leaders can't see where money goes by category/supplier/month.
2. **Invoice leakage** — duplicate invoices, price variances vs PO, overbilling.
3. **Supplier risk is reactive** — no early signal on financially or operationally risky suppliers.
4. **Delivery delays surprise teams** — no proactive SLA tracking.
5. **Answers take days** — analysts manually pull spreadsheets.

## 5. Key Features (MVP scope in this build)
- **Dashboard**: total spend, spend trend, on-time delivery rate, open risk alerts.
- **Spend analysis**: by category, by supplier, monthly trend.
- **Purchase Orders**: list, status, value, linked supplier & delivery.
- **Invoices + anomaly detection**: duplicate, price variance vs PO, overdue.
- **Supplier risk scoring**: composite score from delivery, quality, financial, compliance signals.
- **Delivery delays**: expected vs actual, days late, SLA breach flags.
- **AI Copilot**: natural-language Q&A grounded in the workspace's procurement data.

## 6. Out of Scope (future)
ERP write-back, multi-currency normalization, contract lifecycle management,
e-sourcing/RFQ, payment execution, role-based access control beyond demo.

## 7. Success Metrics
- Time-to-insight: < 10s for a copilot answer.
- % of invoices auto-flagged that are true positives (target > 80%).
- Spend under management visualized within first session.
- Weekly active analysts per workspace.

## 8. Non-Functional Requirements
- Answers must be grounded in actual workspace data (no hallucinated figures).
- p95 dashboard load < 1.5s on seed data.
- Secrets (LLM keys) never exposed to the browser.
