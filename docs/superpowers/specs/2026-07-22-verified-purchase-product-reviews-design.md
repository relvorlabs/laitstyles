# Verified-purchase product reviews

**Date:** 2026-07-22  
**Branch:** `codex/verified-purchase-reviews`  
**Status:** approved for implementation planning  
**Scope override:** the owner explicitly approved this storefront feature while the broader Storefront V2 phase tracker still records unrelated visual-migration blockers. Those blockers are not reclassified as passing.

## Problem

The product-detail page currently exposes a dead **Write a review** action, while the account order list and order detail are hardcoded prototype surfaces. The Prisma schema has a one-to-one `product_reviews -> order_lines` relationship, but there is no complete customer-owned read/write path and no line-level delivery state capable of handling mixed or partially fulfilled orders.

Customers must write a product review from the exact item in their order history, and only after that item has been delivered. The server and database—not the visibility of a button—must enforce ownership, delivery, return/refund, time-window, duplicate, and moderation rules.

## Goals

- Move review creation from product detail into the authenticated account order journey.
- Use real Prisma-backed order and review data on the changed account surfaces.
- Authorize every private read and mutation against the resolved storefront customer.
- Model line-level fulfilment and refund state with Prisma enums so mixed orders are correct.
- Enforce one review per eligible order line, including repeat purchases of the same product.
- Support review submission, moderation state, editing, rejection recovery, and customer withdrawal.
- Preserve published feedback when a later return/refund occurs, with an honest lifecycle marker.
- Cover mobile, tablet, desktop, keyboard, loading, empty, error, stale, and conflict states.

## Non-goals

- Rebuilding checkout, courier integrations, admin fulfilment, returns, or refund execution.
- Adding fake orders, fake delivery transitions, fake delays, or client-controlled eligibility.
- Building a new review-moderation admin workspace.
- Replacing the published-review summary and listing on product detail; only its creation action moves.
- Solving the broader Storefront V2 CSS and visual-regression blockers.

## Considered approaches

### A. Line-level state on `order_lines` — selected

Extend each purchased line with typed fulfilment/refund state and the minimum quantities/timestamps needed to make eligibility deterministic. This supports mixed orders, partial delivery, cancellations, returns, refunds, and one review per purchased line without introducing a shipment platform.

### B. Aggregate order status only

Use `orders.fulfilment_status` to unlock every line. This is smaller, but it incorrectly treats all products as delivered in partially fulfilled orders and cannot explain per-item ineligibility. Rejected.

### C. Shipment-item and event model

Introduce shipments, packages, shipment items, and append-only line events. This is the most extensible fulfilment architecture, but it expands the review feature into a courier/warehouse project. Deferred until a real multi-shipment integration requires it.

## Data model

### Order identity

Account URLs use a stable public order number rather than a raw UUID. Add `orders.order_number` as an application-generated unique value, backfill existing rows deterministically in the migration, and use it for `/account/orders/[orderNumber]`. UUIDs remain internal.

### Order-line fulfilment

Add a Prisma enum whose values describe the state of one purchased line:

```text
order_line_fulfilment_status
  unfulfilled
  processing
  ready_for_dispatch
  dispatched
  partially_delivered
  delivered
  partially_cancelled
  cancelled
  partially_returned
  returned
```

Add to `order_lines`:

- `fulfilment_status` using the enum, default `unfulfilled`;
- `delivered_quantity`, default `0`;
- `delivered_at`, nullable and set when the first unit is delivered;
- `cancelled_quantity`, default `0`.

Existing aggregate `orders.fulfilment_status` remains the order-summary state. New review logic never assumes that it proves delivery of every line.

### Line refunds

Add a Prisma enum:

```text
order_line_refund_status
  not_refunded
  partially_refunded
  refunded
```

Add `refund_status`, `refunded_amount`, and `refunded_at` to `order_lines`. Monetary allocation remains server-owned. Review eligibility treats `refunded` as fully refunded and `partially_refunded` as still eligible when delivered product experience remains.

Completed `return_lines` remain the quantity source for returns. The line fulfilment state must be updated to `partially_returned` or `returned` by the authoritative return workflow; the review policy checks both the typed line state and completed-return data so stale denormalized state fails safely.

### Review lifecycle and fashion feedback

Align the existing review lifecycle with storefront language:

```text
review_status
  pending
  published
  rejected
  withdrawn
```

The migration preserves existing `approved` data by renaming/mapping it to `published`; it must not drop review rows.

Add a nullable fit enum:

```text
review_fit
  runs_small
  true_to_size
  runs_large
  not_applicable
```

Add `fit`, `size_ordered`, `submitted_at`, and `published_at` to `product_reviews`. `size_ordered` is a purchase-time review snapshot derived server-side from `order_lines.variant_label`/the purchased size, never accepted as authoritative client input.

Keep `product_reviews.order_line_id @unique`. This makes one review per purchased line a database invariant. Ordering the same product again creates another order line and therefore another independently eligible verified-purchase review.

## Eligibility policy

The server returns a discriminated eligibility result rather than a boolean so the UI can explain the state in plain language.

A new review is eligible only when all are true:

1. A verified consumer session resolves to a customer.
2. The order line is selected inside a Prisma ownership query joining `orders.customer_id` to that customer.
3. `delivered_quantity > 0`, `delivered_at` exists, and the line is in `partially_delivered`, `delivered`, or `partially_returned`.
4. The line is not fully cancelled, fully returned, or fully refunded.
5. The submission occurs no later than 90 days after `delivered_at`.
6. No review already exists for the line.

Canonical ineligibility reasons:

- `authentication_required`
- `customer_record_required`
- `order_line_not_found` (also used for another customer's line to prevent ID enumeration)
- `awaiting_delivery`
- `cancelled`
- `fully_returned`
- `fully_refunded`
- `review_window_expired`
- `already_reviewed`

Eligibility is recomputed inside the mutation transaction. A page rendered before a return, refund, expiry, or duplicate submission cannot bypass the current state.

### Return and refund policy

- Cancelled or never-delivered lines are never eligible.
- A line fully returned or fully refunded before submission is ineligible.
- A partial return/refund remains eligible when at least one delivered unit/product experience remains.
- A review published before a later full return/refund remains public to avoid survivorship bias. It receives a visible, non-punitive `Item returned` or `Item refunded` marker alongside `Verified purchase`.
- Return reasons and private refund details are never exposed in public review DTOs.

## Review lifecycle

- **Create:** eligible customer submits rating, optional title, review body, and optional fit feedback. Server derives product, order, customer, variant, and size context from the owned line. Status becomes `pending`.
- **Pending:** visible to the author in account; excluded from public product review lists and aggregates.
- **Published:** visible publicly and included in real aggregate ratings and structured data.
- **Rejected:** visible only to the author/staff with a plain-language rejection reason. The customer may revise and resubmit while the 90-day window and item eligibility still hold.
- **Edit:** the author may edit a pending, rejected, or published review within the 90-day window. Editing a published review moves it back to `pending` and temporarily removes it from public aggregates until moderation republishes it.
- **Withdraw:** the author may withdraw their review at any time. `withdrawn` content is not public or aggregated. Withdrawal is reversible only through an explicit resubmission that rechecks eligibility; no hard delete occurs.

All expected failures use typed results. Unknown database/runtime failures flow to the route error boundary and are logged without exposing internals.

## Server architecture

Create a review domain under `src/server/commerce/reviews/` with focused modules:

- policy: pure eligibility/state-transition functions;
- schemas: Zod input validation and character limits;
- repository: owned order reads, review reads, and transactional writes;
- DTO mapper: allow-listed account and public projections;
- actions: thin server action wrappers for create, edit, resubmit, and withdraw.

Private reads must scope ownership in the Prisma query itself. Fetching a line by ID and checking ownership afterward is prohibited. Mutations re-authorize inside the transaction and handle the unique constraint as `already_reviewed`, not a generic failure.

The account order repository returns order summaries and detail DTOs with per-line `reviewState`. Client code never imports Prisma types, seed arrays, or review-eligibility rules.

## Routes and data flow

- `/account/orders` — authenticated server-composed order list.
- `/account/orders/[orderNumber]` — authenticated order detail with line-level delivery and review state.
- `/account/orders/[orderNumber]/items/[orderLineId]/review` — deep-linkable create/edit/resubmit page.

The review page loads an owned order line and its existing review on the server. Submission uses a server action; successful creation or update redirects to the order detail with accessible success feedback. Invalid/stale mutations keep entered values where safe and show field/action errors with a recovery path.

Replace the current `/account/orders/detail` prototype route with a redirect to `/account/orders`; canonical details always require an explicit public order number. No account route may render hardcoded production-looking order data after its domain moves.

## Product-detail changes

The PDP keeps real published review summaries, rating distribution, individual reviews, verified-purchase labels, sorting/filtering when backed by data, and empty states. Remove the **Write a review** button and its unavailable toast/copy. Review creation is not linked from a generic product because eligibility belongs to one owned order line.

## Account experience

### Order list

Each order shows public number, placed date, item summary, total, consumer payment state, consumer fulfilment state, and latest update. When eligible lines exist, show `Review 1 item` / `Review N items` as a clear secondary action leading to order detail. Do not show a disabled generic review button when nothing is eligible.

### Order detail

Each line displays the purchase snapshot, delivered/return/refund state in consumer language, and exactly one contextual review treatment:

- `Write a review`
- `Awaiting moderation`
- `View or edit review`
- `Revise review` with rejection reason
- `Review withdrawn`
- explanatory text for awaiting delivery, cancellation, full return/refund, or expired window

Status is conveyed by text and iconography, never colour alone. Product imagery uses `next/image` with accurate sizes. Mobile places identity and status before actions, preserves 44px targets, and avoids horizontal tables.

### Review form

Use shadcn/Base UI composition and React Hook Form + Zod:

- semantic star-rating radio group with a visible legend and keyboard operation;
- title with visible optional label;
- review body with visible label, helper text, live character count, and inline errors;
- fit field using the typed enum, including `Not applicable`;
- read-only purchase context (product, variant/size, order number, delivery date);
- one primary submit action, disabled with progress during submission;
- cancel/back path and dirty-dismiss confirmation when applicable;
- success/error announcement without stealing focus.

The UI uses existing account/storefront semantic tokens, Instrument Serif/Geist typography, HugeIcons, restrained editorial surfaces, and no new raw colours or generic SaaS card grid. The UI/UX Pro Max recommendations are applied for mobile-first structure, labels, touch targets, focus, submit feedback, error recovery, deep links, reduced motion, and WCAG AA contrast; its unrelated suggested palette/fonts do not override the repository design system.

## State and edge-case matrix

- anonymous, expired session, consumer without customer row;
- order missing, another customer's order/line, malformed public number;
- unpaid/processing/partially refunded/refunded orders;
- mixed order with delivered and undelivered lines;
- partial quantity delivery, partial cancellation, partial/full return, partial/full refund;
- delivery occurs while page is open; return/refund or 90-day expiry occurs before submit;
- duplicate tabs submit the same line;
- existing pending, published, rejected, or withdrawn review;
- repeat purchase of the same product;
- product renamed, unpublished, archived, or sold out after purchase;
- variant/product image missing;
- validation failure, database unavailable, transaction conflict, and unique constraint race;
- empty order history and orders with no reviewable lines.

Archived/unpublished products remain reviewable from a valid owned line during the window because the purchase record is historical truth. Their reviews become publicly visible only on a publicly visible product surface.

## Testing and verification

Implementation follows red-green-refactor.

- Unit-test eligibility and lifecycle transition matrices before production logic.
- Test Zod boundaries and consumer-copy mappings.
- Test owned repository queries and IDOR denial for reads and every mutation.
- Test transaction-time stale eligibility, duplicate submissions, and unique-constraint mapping.
- Test account DTOs for mixed line states and never-expose fields.
- Test order-list/detail and review-form states, keyboard rating input, inline errors, pending state, success redirect, rejection recovery, and withdrawal.
- Add Playwright coverage for delivered line -> review -> pending account state, plus undelivered/returned denial.
- Validate 375x812, 768x1024, 1280x800, keyboard order, focus, console/network errors, light/dark themes where supported, and screenshots.
- Run Prisma format/validate/generate, lint, TypeScript, Vitest, build, strict button audit, React Doctor, and the latest Web Interface Guidelines review.

## Migration and rollout

The migration is additive except for the data-preserving review-status value rename. It includes check constraints for non-negative quantities/amounts and quantities not exceeding the purchased quantity where Prisma cannot express them. Existing rows are backfilled conservatively; no historical line is marked delivered merely because the aggregate order is delivered unless reliable evidence exists. Ambiguous rows remain ineligible until an authoritative line update occurs.

No database migration is applied to a production environment as part of local implementation. The committed migration, generated client, and deployment notes are reviewed together.

## Acceptance criteria

1. Product detail has no review-creation action.
2. An authenticated customer can reach review creation only from their delivered order line.
3. Server authorization and transaction-time eligibility reject forged, stale, duplicate, cancelled, fully returned/refunded, undelivered, and expired submissions.
4. One review per order line is enforced by Prisma/database uniqueness.
5. Mixed and partially fulfilled orders show correct per-item actions and explanations.
6. Account order list/detail use real Prisma-backed DTOs in changed scope and cover loading/empty/error/success states.
7. Pending/published/rejected/withdrawn lifecycle and edit/resubmit/withdraw actions behave as specified.
8. Public reviews and aggregates include published reviews only, while later return/refund markers remain honest.
9. Required automated, build, browser, responsive, and accessibility checks have executed evidence or are explicitly reported blocked.
