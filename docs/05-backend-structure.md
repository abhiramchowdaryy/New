# Backend Structure

## Layers
```
src/lib/
  types.ts       # Domain types: Supplier, PurchaseOrder, Invoice, Delivery, etc.
  data.ts        # Seed dataset + typed accessors (getSuppliers, getInvoices, ...)
  analytics.ts   # Pure functions: spend, risk scoring, anomalies, delivery metrics
  format.ts      # Currency/number/date/percent formatters
  anthropic.ts   # Anthropic client factory + model resolution
src/app/api/
  copilot/route.ts   # POST: grounded, streamed Claude answer
```

## Domain model
- **Supplier**: id, name, category, country, sub-scores (delivery/quality/financial/compliance).
- **PurchaseOrder**: id, supplierId, category, amount, status, orderDate, expectedDate.
- **Invoice**: id, supplierId, poId, amount, issueDate, dueDate, status (paid/unpaid).
- **Delivery**: id, poId, expectedDate, actualDate (nullable if pending).

## Analytics (pure, deterministic)
- `computeSpendSummary()` → total, by category, by supplier, monthly trend.
- `computeSupplierRisk(supplier, ...)` → composite 0–100 + band, weighted from
  sub-scores and live delivery performance.
- `detectInvoiceAnomalies()` → duplicate / price_variance / overdue with severity.
- `computeDeliveryMetrics()` → on-time rate, late deliveries, avg days late.
- `buildCopilotSnapshot()` → compact JSON the LLM is grounded on.

## Copilot route (`POST /api/copilot`)
1. Validate `messages` (chat history) in the body.
2. Build the analytics snapshot (server-side; never trust client figures).
3. Call Claude (`claude-opus-4-8`, adaptive thinking) with a system prompt that:
   - defines the assistant's role,
   - embeds the snapshot,
   - forbids inventing numbers not in the snapshot.
4. Stream the text response back to the browser (`ReadableStream`).
5. On missing key / error → graceful JSON error.

## Security
- Anthropic key read from `process.env` in route handlers only.
- Raw dataset and key never serialized to the client.
- Input validation on the copilot body; capped message count/length.

## Extensibility
Replace `data.ts` internals with DB/ERP calls — accessor signatures stay stable,
so analytics, UI, and copilot are unaffected.
