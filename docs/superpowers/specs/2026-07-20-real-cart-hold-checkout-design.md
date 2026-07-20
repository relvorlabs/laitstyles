# Real cart, hold & checkout (no payment gateway) — design

**Date:** 2026-07-20
**Branch context:** designed against `feat/admin-overview-broadsheet`; implementation should land on its own branch off `main` since this is unrelated storefront work.
**Status:** proposed, pending owner review.

## Problem

`/products`, `/products/[slug]`, the cart drawer/page, and `/checkout` are fully simulated:

- Product catalogue is read from a static dev fixture (`public/assets/data/storefront-catalog.json`), not the live database.
- Cart state lives only in React state + `sessionStorage`; nothing is persisted server-side.
- "Hold" is a client-side `setInterval` countdown mirrored to `sessionStorage`; no row exists anywhere in the database.
- Checkout's item list is hardcoded (`storefront.products.slice(0, 3)`), unrelated to the actual cart.
- The final payment step opens a static Paystack link in a new tab and unconditionally marks the order "placed" — nothing is written to the database. Two dialogs (`ProcessingDialog`, `DeclinedDialog`) simulate gateway outcomes with no gateway involved.
- Guest shoppers have no real identity, so nothing could be persisted per-session even if the above were wired up.

The database already has real tables built for this (`products`, `product_variants`, `stock_levels`, `holds`, `orders`, `order_lines`, `customers`), and a real Prisma-backed catalogue repository already exists and is live under `/shop`. This spec wires the prototype storefront (`/products*`, cart, checkout) onto that same real backend, end to end, stopping short of an actual payment gateway integration (explicitly out of scope — to be handled in a later pass).

## Decisions carried over from existing docs (not re-litigated here)

- `docs/storefront-v2/03-commerce-domain-and-data-contract.md`: cart modeled **as holds** (`holds` rows, `stage='cart'`), not a separate cart table. Guest ownership via signed cookie, no `guest_sessions` table.
- `docs/storefront-v2/04-prisma-supabase-architecture.md`: Prisma owns `public` schema; Supabase owns only auth identities. Single-store, no tenant FK.
- `docs/storefront-v2/06-implementation-plan.md` Phase 5: atomic reserve transaction (verify → lock/conditional update → create hold → adjust stock → movement → commit); release/expiry/cancel idempotent; server `expiresAt` is truth, never a client timer.

## Scope decision (this session)

User chose to keep `/products*` as the customer-facing storefront rather than switching users onto `/shop`. This means the static-JSON catalogue adapter must be replaced with a live Prisma adapter before cart/hold/checkout can be real (there must be a real product row to reserve stock against). `/shop` is left untouched — it keeps its own existing real Prisma repository; both surfaces will now read the same live data through the same underlying repository, just projected into different shapes for their respective UIs.

Checkout's final step does not integrate a payment gateway. It performs the one thing that's real today: creating a genuine pending order from the genuine cart. The button is not labeled or presented as "Pay" in a way that implies money moved — the resulting order/confirmation state is honestly "awaiting payment," matching the already-documented consumer status mapping (`03` §8). Paystack/Flutterwave integration is future work.

## Sub-projects (built and gated in this order)

### A — Real catalogue adapter

**Objective:** `/products`, `/products/[slug]` read live Prisma data instead of the static JSON fixture, with zero changes to consuming components.

**Approach:** `src/lib/storefront/catalog-data.ts` currently: reads+validates the JSON fixture, then maps its rows into `Product`/`StorefrontCatalogPayload` (the shopper-facing DTOs already consumed by ~40 prototype components). Replace only the source: fetch `ProductDetail[]`/`ProductSummary[]`/taxonomy from the existing `src/server/commerce/catalogue/*` Prisma repository (same one `/shop` uses — `publishedProductWhere()`, `mapProductDetail`, `mapProductSummary`), then run the **same mapping logic** currently used to turn JSON rows into `Product` (condition-grade mapping, `inventory` mode mapping, `images` flattening, etc.), sourced from the Prisma rows instead. Public function signatures (`loadStorefrontCatalog`, `loadStorefrontProductBySlug`, `loadStorefrontProductPageBySlug`, `loadStorefrontProductSlugs`) stay identical so no caller changes.

**Availability must be per-shopper**, not just per-product: the existing `Availability` type already models this (`reserved_by_me` vs `reserved_by_others`), but that requires knowing the current cart-owner id at read time — this is why sub-project A's repository call sites need the resolved owner id threaded in (from sub-project B's session resolver), even though A itself does no writes.

**Files:** `src/lib/storefront/catalog-data.ts` (rewritten adapter), no changes to `src/features/storefront/shared/catalogue-data.ts` (types/helpers stay), no changes to `src/server/commerce/catalogue/*` (reused as-is).

**DB:** none (read-only). Requires at least one real published product to exist — see Seed below.

**Exclusions:** no UI redesign; no changes to `/shop`.

**Acceptance:** `/products` and `/products/[slug]` render real DB products; deleting/unpublishing a product in the (still in-memory) admin has no effect yet since admin doesn't write through Prisma — real products must currently be created via the seed script or a manual Prisma write until admin's own Phase 1 write path lands. `pnpm build` + existing catalogue tests pass; new adapter unit tests mirror the removed JSON-adapter's test coverage.

### B — Cart & hold as one reservation system

**Objective:** "Add to bag" and "Hold" become the same underlying mechanism — an atomic, expiring reservation against real stock, scoped to a real (guest or authenticated) owner.

**Guest identity.** `src/server/authorization/storefront-session.ts` gains `resolveCartOwner()`:
- If a Supabase session exists, resolve/create the `customers` row for that `profile_id` (existing account-provisioning pattern from `06` Phase 6) → return its id.
- Else, read a signed httpOnly cookie (`lst_guest`, HMAC-signed with a server secret, not just base64). If valid, return the guest customer id it names. If absent/invalid, create a new `customers` row (`type` distinguishes it from a real account — no `profile_id`), set the signed cookie (path `/`, `sameSite: lax`, long-lived e.g. 30 days), return its id.
- Ownership is **never** taken from a client-supplied id in a request body — only from the verified cookie or the verified Supabase session, server-side, on every call.

**Reservation transaction** (`src/server/commerce/cart/reserve-line.ts`), inside `prisma.$transaction`:
1. Reclaim expired holds touching this product/variant first (lazy expiry — see below).
2. Re-derive availability server-side (never trust client-sent stock numbers).
3. Unique (`inventory_mode='unique'`): if any *other* customer holds an active hold on this product, fail with `reserved_by_others`. If this customer already holds it, no-op success. Else create `holds` row (`stage='cart'`, `quantity=1`, `expires_at=now()+CART_HOLD_MINUTES`).
4. Stocked/variant: check `stock_levels.available` (already `total_received - reserved - sold - ...` truth), fail with `sold_out`/`insufficient_stock` if the requested quantity exceeds it. Upsert this customer's existing cart hold for that product+variant (increment quantity, extend expiry) or create a new one. Increment `stock_levels.reserved` by the delta, write a `stock_movements` row (`kind='reserved'`, `related_hold_id`).
5. Return the updated cart view.

**Symmetric operations**, same transactional discipline: `change-quantity.ts` (delta can be negative — release proportional reserved stock), `release-line.ts` (explicit remove, or "remove all" release), `expire-holds.ts` (find `status='active' AND expires_at < now()`, release stock, mark `status='expired'`, movement `kind='released'`). Every mutating cart/hold read runs `expire-holds.ts` scoped to the relevant rows first so expiry is always truth-derived, never client-timed.

**Cart view** (`get-cart.ts`): aggregates the owner's active `holds` (`stage IN ('cart')`, `status='active'`) joined to `products`/`product_variants` for display — this is the "cart" the UI renders; there is no separate cart table.

**CART_HOLD_MINUTES = 15.** The current fake UI already uses 15 minutes for "hold" and a ~14-minute countdown (852s) at checkout; this becomes the one real reservation window end-to-end (cart and checkout are the same hold, not two separate timers), refreshed each time the shopper reaches the checkout review step, matching the existing UX literally while making the number real.

**Server Actions**: thin wrappers in `src/app/cart/actions.ts` (and equivalent for product/quick-view add-to-bag call sites) that call the above, revalidate the affected product's cache tag, and return a typed `{ ok, cart, error? }` result — never a thrown exception for an expected business outcome (stale stock, expired hold, sold out).

**UI rewiring**: `storefront-provider.tsx`'s `cart` state and `addToCart`/`removeFromCart`/`changeQty`, and `storefront-experience-provider.tsx`'s `holdProduct`/`releaseProduct`/the 15-minute countdown, switch from local state + `sessionStorage` to: an optimistic local update for snappy UI, immediately reconciled with the Server Action's real result; the displayed countdown computes `expiresAt - Date.now()` from the real `expires_at` the server returned, ticking client-side for display only (never the source of truth). `cart-lines.ts`/`cart-persistence.ts` (client-only helpers) are retired once mutations go server-side — display-only formatting helpers (`cartSubtotal`, etc.) can stay if still useful for rendering the server-fetched cart.

**Sign-in merge** (`src/server/commerce/auth/merge-guest.ts`): called right after a successful sign-in/sign-up in `storefront-experience-provider.tsx`'s existing auth success path. Reassigns the guest customer's active `holds.customer_id` to the authenticated customer's id (re-validating stock/uniqueness isn't needed — they're already reserved rows, just changing ownership), deletes the now-empty guest `customers` row, clears the guest cookie.

**Files:** `src/server/authorization/storefront-session.ts` (extended), `src/server/commerce/cart/*` (new), `src/server/commerce/auth/merge-guest.ts` (new), `src/app/cart/actions.ts` (new), `src/features/storefront/shared/storefront-provider.tsx`, `storefront-experience-provider.tsx`, `cart-lines.ts`/`cart-persistence.ts` (retired or trimmed), `product-purchase-panel.tsx`, `quick-view-overlay.tsx`, `storefront-cart-sheet.tsx`/`legacy-cart-drawer.tsx` (call real actions instead of context-only state).

**DB:** no schema changes — `holds`/`stock_levels`/`stock_movements` already model this exactly.

**Exclusions:** payment, order creation (sub-project C).

**Acceptance:** two concurrent add-to-bag calls on one unique piece → exactly one succeeds, race-tested; expired hold restores stock automatically on next read; a guest's bag survives a page reload via the cookie; signing in mid-session keeps the guest's bag. Gate green (lint/tsc/vitest/build).

### C — Checkout → real pending order

**Objective:** the checkout stepper operates on the real cart from B, and the final action creates a real order — no gateway, no simulated success/decline.

**Scope:** `checkout-flow.tsx`'s `checkoutItems` source changes from `storefront.products.slice(0, 3)` to the real cart from B. Delivery zone/fee stays as existing static `zones` data (real DB-backed `delivery_zones` wiring is a nice-to-have, not required to remove simulation — flag as a follow-up, not blocking, since it's already server-defined *data*, just not yet read from the `delivery_zones` table). `payNow()`/`ProcessingDialog`/`DeclinedDialog`/the hardcoded `window.open` Paystack link are deleted entirely. The final step's action, `place-order.ts`:

1. Re-validates the cart's holds are still active (re-runs expiry check).
2. Inside one transaction: creates `orders` (`payment_status='pending'`, `fulfilment_status='unfulfilled'`, `source='storefront'`, `total` computed server-side from the real held lines + delivery fee — never trust a client-sent total), creates one `order_lines` row per held line with a **price snapshot** (`unit_price` = the price at hold time, not a live re-read), converts each hold (`status='converted'`, `converted_order_id`), writes an `order_timeline_events` row (`status='pending'`).
3. Returns the created order's number.

Confirmation screen (`ConfirmationScreen` / `/order-confirmation`) reads the real order by number and shows real line items/total/status ("Awaiting payment"), replacing the current fake success screen fed by local component state.

**Files:** `src/server/commerce/checkout/place-order.ts` (new), `checkout-flow.tsx`, `checkout-helpers.ts` (drop payment-simulation types: `PayState`, gateway labels), `components/confirmation-screen.tsx`, `components/processing-dialog.tsx`/`declined-dialog.tsx` (deleted), `src/app/checkout/page.tsx`, `src/app/order-confirmation/page.tsx`.

**DB:** no schema changes.

**Exclusions:** payment gateway integration (explicitly deferred), returns, order tracking beyond the initial pending state.

**Acceptance:** completing checkout creates a real, queryable `orders` row with correct snapshot totals and converts the exact holds involved; the cart is empty afterward; reloading `/order-confirmation` shows the same real order (not component state that vanishes on refresh). Gate green.

## Cross-cutting

- **Contrast:** while touching each surface's UI (product purchase panel, cart drawer/page, checkout), run a WCAG AA contrast check on changed elements (existing token system per `AGENTS.md` §7/§10) and fix anything found — opportunistic, not a separate audit pass.
- **Dev seed:** the live database currently has no seed script and admin still runs on in-memory data for products (not yet Prisma-backed per `AGENTS.md` §5), so the live `products` table is likely empty. A one-time seed script (`scripts/db/seed-storefront-dev.mjs`), writing through Prisma directly (unique + stocked + variant examples with real `stock_levels`), is needed purely so this work is verifiable — not a simulated feature, just realistic setup data, matching Phase 1's own plan for "a DB seed script of real published products."
- **Cache invalidation:** product/catalogue reads use `cacheTag`/`cacheLife` per `AGENTS.md` §6; every mutation in B/C that changes availability or creates an order must call `revalidateTag` for the affected product tag(s) so readers see the change immediately.

## Testing

- Unit: new Prisma catalogue adapter mapping (mirrors removed JSON-adapter tests); reservation transaction functions with a real test database (concurrency/race test on a unique product; stock arithmetic balance; idempotent release/expiry).
- Server Action tests: merge-on-sign-in, place-order idempotency (retrying the same request doesn't double-create an order).
- Playwright: guest add-to-bag → reload → still in bag; two browser sessions race one unique piece → one wins; sign-in merges bag; full checkout → real order number → confirmation persists across reload.
- Existing gate per `AGENTS.md` §11 (`pnpm lint`, `tsc --noEmit`, `vitest run`, `pnpm build`, React Doctor) run after each sub-project, not just at the end.

## Explicitly out of scope

- Payment gateway integration (Paystack/Flutterwave/webhooks) — future work, tracked as `06`'s Phase 7.
- Admin writing products through Prisma (admin stays in-memory per `AGENTS.md` §5 until its own phase) — the dev seed script exists solely to unblock verification of this work, not to substitute for that phase.
- `/shop`'s own UI or repository — untouched.
- Real delivery-zone/fee data from `delivery_zones` (kept as existing static data this pass; flagged as a follow-up).
- Order tracking, returns, reviews, notifications.
