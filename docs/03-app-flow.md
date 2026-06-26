# App Flow

## Navigation
Persistent left sidebar: Dashboard · Spend · Purchase Orders · Invoices ·
Suppliers · Deliveries · Copilot.

## 1. Dashboard (`/`)
Landing view. KPI cards (total spend, on-time delivery %, open risk alerts,
flagged invoices) → spend-trend chart → top suppliers → most recent alerts.
Each alert links to its source record.

## 2. Spend (`/spend`)
Spend by category (bar), by supplier (table), and monthly trend (area).
Answers "where is the money going?"

## 3. Purchase Orders (`/purchase-orders`)
Sortable table: PO #, supplier, category, amount, status (open/received/closed/cancelled),
order & expected dates. Surfaces total committed spend.

## 4. Invoices (`/invoices`)
Table of invoices with an **anomaly column**. Detection runs server-side:
- `duplicate` — same supplier + amount + near date as another invoice.
- `price_variance` — invoice amount materially exceeds its linked PO.
- `overdue` — past due date and unpaid.
Each flagged invoice shows the reason and severity.

## 5. Suppliers (`/suppliers`)
Supplier cards/table with composite **risk score (0–100)** and band
(low/medium/high). Drill-in shows the sub-scores: delivery, quality, financial,
compliance, plus spend and PO count.

## 6. Deliveries (`/deliveries`)
Expected vs actual delivery dates, days late, and SLA-breach flags. On-time rate
headline.

## 7. Copilot (`/copilot`)
Chat UI. User asks e.g. "Which suppliers are highest risk and why?" or
"How much did we spend on logistics last quarter?". The server builds a grounded
analytics snapshot, calls Claude, and streams the answer. Suggested prompts seed
the empty state.

## Data flow (per request)
Browser → Server Component / Route Handler → `lib/analytics` (pure compute over
`lib/data`) → rendered HTML or streamed copilot tokens. The Anthropic key and raw
data never reach the browser.
