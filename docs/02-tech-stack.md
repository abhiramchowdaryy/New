# Tech Stack

## Frontend
- **Next.js 14 (App Router)** — server components for data, client components for charts/chat.
- **React 18 + TypeScript** (strict).
- **Tailwind CSS** for styling.
- **Recharts** for spend/delivery visualizations.
- **lucide-react** for icons.

## Backend
- **Next.js Route Handlers** (`src/app/api/*`) — run server-side only.
- **Analytics layer** (`src/lib/analytics.ts`) — pure functions computing spend,
  risk, and delivery metrics from the data layer.
- **Data layer** (`src/lib/data.ts`) — seed dataset today; swappable for a DB
  (Postgres/Prisma) or ERP connector later. All access goes through typed accessors.

## AI
- **Anthropic Claude** via the official `@anthropic-ai/sdk`.
- Default model: **`claude-opus-4-8`** (adaptive thinking).
- The copilot is a **single grounded call**: the route builds a compact,
  pre-computed analytics snapshot and passes it as system context, then streams
  the answer. This keeps figures accurate and latency low.

## Why this stack
- One codebase, one deploy target (Vercel/Node), no separate API server to run.
- Server components keep the Anthropic key and raw data off the client.
- Pure analytics functions are easy to unit test and reuse across UI + copilot.

## Environments
- `ANTHROPIC_API_KEY` — required, server-only.
- `ANTHROPIC_MODEL` — optional override.

## Future swaps
- Data layer → Postgres + Prisma, or a connector to NetSuite/SAP/Coupa.
- Copilot → tool-use loop so Claude can query live data instead of a snapshot.
- Auth → Clerk/Auth.js with workspace scoping.
