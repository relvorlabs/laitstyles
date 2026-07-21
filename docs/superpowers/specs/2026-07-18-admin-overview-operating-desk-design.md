# Admin Overview — Store Operating Desk

Date: 2026-07-18 · Branch: `feat/admin-overview-broadsheet` · Supersedes the broadsheet on this branch.
User approved: replace the broadsheet; build deterministic seed adapters for absent domains.

## Concept

The Overview becomes a **manager-first store operating desk**, not a KPI dashboard. Hierarchy:
quick actions → operational workload → revenue/order movement → fulfilment → merchandise health →
customer signals → meaningful activity. Answers, in order: what can I do, what needs me now, which
task first, are orders moving, are customers waiting, is merchandise healthy, how is revenue moving,
what changed. Structure via shared surfaces, section bands, and hairline rules — not blanket cards.

## Data map (real vs adapter)

Backed by existing records/routes:
- **Operating queue** ← `attention[]` (selectors already build it).
- **Operations pulse** ← order fulfilment statuses, holds, low-stock/unpublished products.
- **Fulfilment runway** ← order `fulfilmentStatus` (payment-confirmed→preparing→packed→dispatched),
  stalled = oldest `placedAt` per non-terminal stage.
- **Revenue net/gross/refunds/AOV/orders** ← derived from `orders[]` (`total`, `refundedAmount`,
  `payments[]`, `channel`, `placedAt`) — real derivation, not invention.
- **Merchandise watch** ← products (low stock, unpublished/draft, recently added); "sold" from order lines.
- **Meaningful activity** ← `activities[]`.
- Routes exist: `/admin/orders`, `/admin/inventory`, `/admin/returns`, `/admin/customers`, `/admin/holds`, `/admin/settings`.

Absent from the model → **new deterministic seed adapters** (user-approved scope change):
- **Customer messages** (`src/lib/admin/messages/`): thread type + seed of waiting conversations tied
  to real orders/customers. Powers "messages waiting" (pulse), "unread conversations" (signals), and a
  "Reply to messages" quick action that opens an on-page Sheet (no messages route exists; do not invent one).
- **Discounts** (`src/lib/admin/discounts/`): active discount type + seed with redemption totals.
  Powers the revenue "Discounts" figure and a "Create discount" action opening an on-page Sheet listing
  active codes (deterministic, explicitly prototype). No `/admin/discounts` route is created.
- **Returns**: author `ControlRoomReturn[]` seed (type exists; array currently empty) tied to an order.
- **Revenue history**: today-hourly + 30-day deterministic series (only a 7-day `salesPulse` and 6 orders
  exist). 7-day view reuses `salesPulse`; today/30-day come from the new history seed. No random values.

The "add discount / message" Sheets mutate nothing persistent — they are read + explicit prototype
boundaries, consistent with AGENTS.md (no fake persistence, no random latency, no dead buttons).

## Roles

Staff roles are `admin` (owner) and `manager`. `page.tsx` resolves the role via `getAdminAccess()`
and passes it to the Desk. Owner sees the full revenue breakdown (net, gross, refunds, discounts, AOV)
and discount management. Manager sees operational sales context (completed orders, order volume, AOV)
but not gross/refund/discount financial internals — gated **server-side** (owner-only figures are not
emitted into manager markup, never hidden with CSS). Both see queue, pulse, fulfilment, merchandise,
customer signals, and activity. No role switcher is added.

## Layout

Desktop (≥1280): compact header band → full-width quick-action dock → 8-col operating queue + 4-col
operations pulse → full-width revenue composition (period controls + one time-series chart +
accessible table + derived figures) → full-width fulfilment runway (horizontal stage strip) →
full-width merchandise watch rail (carousel) → split customer signals + meaningful activity.
Tablet (768): one/two columns, urgent work and revenue ahead of secondary; runway and rail scroll
horizontally. Mobile (375): ordered operational feed (header → swipeable dock → queue → pulse →
revenue → runway → merchandise → signals → activity). Restrained motion; `prefers-reduced-motion`
respected; carousel keyboard + touch + position indicator, no autoplay.

## States (per module)

Default (full density) · empty (explain + next action; e.g. "No orders are waiting for fulfilment.
The last order shipped 20 minutes ago.") · loading (skeletons matching geometry; shell stays usable) ·
partial (show available, mark unavailable — never zero-fill) · error (inline beside the module +
retry; page never blanks) · success (concise toast/inline naming what changed) · restricted (owner-only
finance never rendered for manager).

## Components (reuse-first)

Existing primitives: Card, Badge, Empty, Skeleton, Separator, Alert, Sheet/Dialog, Progress, Tabs,
buttonVariants, AdminIcon (HugeIcons), OrderStatusBadge. New feature components under
`src/features/admin/overview/`: operating-desk-header, quick-action-dock, operating-queue,
operations-pulse, revenue-panel (+ revenue-chart client), fulfilment-runway, merchandise-watch
(client carousel), customer-signals, meaningful-activity, and the messages/discounts Sheets.
Link-buttons carry `data-slot="button"` (see [[link-buttons-need-data-slot]]).

## Scope guard

Overview page + its data adapters only. No storefront, sidebar, auth, or other admin pages changed.
No new admin sub-routes. No new npm dependencies (chart is hand-rolled SVG as in the wireframe;
`motion` already present for the carousel/counter). TypeScript strict, no `any`.

## Verification

`pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm exec vitest run --passWithNoTests` · `pnpm build`;
browser at 375/768/1280 in light+dark, both roles. Python tooling + `react-doctor` remain blocked
(no runtime) — reported blocked, not passed.
