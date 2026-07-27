# Real cart, hold & checkout (no payment gateway) — design v2

**Date:** 2026-07-27
**Supersedes:** `docs/superpowers/specs/2026-07-20-real-cart-hold-checkout-design.md` (file paths invalidated by the `docs/architecture-migration/` restructure that landed between approval and implementation).
**Status:** proposed, pending owner review.

## What changed since v1

The product decisions from v1 stand unchanged — this section only re-grounds them in the real module layout discovered by re-surveying `main` on 2026-07-27:

- **The catalogue is already real.** `src/modules/products/server/storefront/{queries,catalogue-loader,catalogue-projection,visibility}.ts` already read live Prisma data through `publishedProductWhere()`, with the exact `listPublishedProductDetails`/`listPublishedProductSlugs`/`getPublishedProductBySlug`/`listStorefrontCategories` shape v1's Sub-project A proposed building. **Sub-project A is void — nothing to do.**
- **Admin-side holds are already real, transactional, and reusable as a template.** `src/modules/holds/server/commands.ts` (`extendHold`/`releaseHold`/`convertHold`) already does exactly the atomic pattern this design needs — optimistic-concurrency `updateMany` with an `expected` where-clause, `Result`/`err`/`ok` returns, an audit trail. It only serves `StaffSession` actors today; nothing creates a hold from a shopper action.
- **A real, generic, race-safe stock engine already exists**: `src/modules/inventory/server/operational-stock.ts`'s `applyOperationalStockMutation` (kinds `reserve`/`release-reserved`/…) is the exact atomic reserve/release primitive v1 planned to hand-write. This design calls it directly instead of reimplementing it.
- **A real Paystack integration exists** (`src/modules/payments/server/paystack.ts`, `initializePaystackTransaction`), but its only caller is the admin's offline/in-person sale flow (`src/modules/orders/server/offline-sale.ts`). It is not wired into customer checkout and stays that way — payment gateway integration remains explicitly out of scope per the owner's instruction.
- **A real, unified session resolver exists**: `src/server/auth/session.ts`'s `getCurrentSession()` already returns `{ kind: 'consumer', customerId, ... }` for a signed-in shopper (auto-provisioning a `customers` row via `ensureConsumerAccount` on first request) or `{ kind: 'staff', ... }` for admin. **There is still no anonymous/guest identity** — `{ kind: 'anonymous' }` carries no cookie or customer row. Guest ownership (v1's core ask) is still genuinely missing and is still this design's job.
- **The customer-facing cart/hold/checkout is exactly as simulated as v1 found it**, just relocated and refactored for cleanliness:
  - `src/stores/cart.store.ts` (Zustand) — pure client state, no server write.
  - `src/modules/storefront-shell/client/storefront-client-state.ts` — versioned (`v3`) `sessionStorage`/`localStorage` persistence of cart/saved/hold *intents*, still entirely client-computed (`StorefrontHoldIntent.expiresAt` is a client timestamp, not a DB value).
  - `src/app/(storefront)/cart/page.tsx` — "Hold for 15 minutes" calls a client-only action; the discount code is a hardcoded string check (`LAIT10`).
  - `src/app/(storefront)/checkout/page.tsx` → `src/features/storefront/checkout/checkout-flow-v2.tsx` — byte-for-byte the same fake flow: `payNow()` opens a hardcoded `https://paystack.shop/pay/...` link in a new tab; `ProcessingDialog`/`DeclinedDialog` simulate a gateway outcome with no gateway involved; `markPlaced()` sets local state only.
  - `docs/architecture-migration/migration-tracker.md` independently confirms this: **Phase 8 "Make checkout and payment server-authoritative" is listed "Not started."**

The actual problem the owner asked to fix is therefore still entirely unaddressed — it just lives at new paths. This design fixes it using the real primitives discovered above instead of the ones v1 assumed didn't exist yet.

## Scope (unchanged from v1, restated)

- Real, DB-backed cart + hold as one reservation mechanism (holds-as-cart), owned by a signed guest cookie or the real authenticated `customerId`, merged on sign-in.
- Real checkout: the final action creates a genuine pending `orders` row from the genuine reserved cart, converts the holds, clears the cart. No payment gateway wiring — the button does not claim to charge anything; the resulting state honestly reads "Awaiting payment."
- Explicitly out of scope: Paystack/gateway integration into customer checkout (future work — the admin offline-sale path already proves the primitive works when that phase arrives), admin UI, `/collections/[slug]` or any other already-real storefront surface, order tracking/returns/reviews.

## Architecture

### A — Guest + consumer cart ownership

New `src/server/auth/cart-owner.ts`:

```ts
export type CartOwner = { customerId: string; isGuest: boolean };

export async function resolveCartOwner(): Promise<CartOwner> {
  const session = await getCurrentSession();
  if (session.kind === "consumer") return { customerId: session.customerId, isGuest: false };
  // staff/suspended/unavailable/anonymous all fall back to guest cookie ownership —
  // a staff member browsing the storefront shops as a guest, same as anyone else.
  return resolveOrCreateGuestCustomer();
}
```

`resolveOrCreateGuestCustomer()` reads a signed, httpOnly cookie (`lst_guest`, HMAC-SHA256 over the customer id with a server secret — not a bare id, so it can't be forged into someone else's customer row). If valid, returns that id. If missing/invalid, creates a new `customers` row (no `profile_id`; a `type` value distinguishes it, e.g. `"guest"`) inside the current request, sets the signed cookie (`path: "/"`, `sameSite: "lax"`, 30-day `maxAge`), returns the new id. Ownership is **never** taken from anything client-supplied in a request body — only from the verified cookie or `getCurrentSession()`, server-side, on every mutating call.

### B — Cart & hold as one reservation, built on the real stock engine

New `src/modules/cart/server/` (parallel to the existing `src/modules/holds/server/` — cart is customer-initiated holds, holds is staff-initiated actions on the same table):

- **`reserve-line.ts`** — `reserveCartLine(owner: CartOwner, input: { productId, variantId?, quantity }): Promise<Result<CartView, CartActionError>>`. Inside `prisma.$transaction`:
  1. Reclaim any expired holds touching this product/variant first (see Expiry below).
  2. Unique (`inventory_mode: 'unique'`): if another customer already holds an active hold on this product, return `err({ code: 'reserved_by_others', ... })`. If this owner already holds it, no-op success. Else create one `holds` row: `stage: 'cart'`, `source: 'storefront'`, `quantity: 1`, `expires_at: now() + 15 minutes`, `status: 'active'`.
  3. Stocked/variant: upsert this owner's existing cart hold for that product+variant (increment quantity, extend `expires_at`) or create a new one; call `applyOperationalStockMutation(tx, { kind: 'reserve', productId, variantId, quantity: delta, actorProfileId: <see below>, note: 'Storefront add to bag', relatedHoldId })` for the incremental delta only.
  4. Return the owner's updated cart view (Task D).

  `applyOperationalStockMutation`'s `actorProfileId` is typed as a required `string` today (staff-only callers). This design widens it to `actorProfileId?: string` (additive, backward compatible — every existing caller still passes a value) and makes `stock_movements.actor_profile_id` write `null` when omitted, since a guest has no `profiles` row and an authenticated consumer's `authUserId` **is** a real `profiles.id` (per `server/auth/session.ts`) and can be passed when available.

- **`change-quantity.ts`**, **`release-line.ts`** — same transactional discipline; a negative delta calls `applyOperationalStockMutation` with `kind: 'release-reserved'`.
- **`expire-holds.ts`** — `status: 'active' AND expires_at < now()` → `release-reserved` the stock, `status: 'expired'`. Called first inside every cart-mutating transaction above, and by the cart-read path, so expiry is always truth-derived from `expires_at`, never a client timer.
- **`get-cart.ts`** — `getCartView(owner): Promise<CartView>` aggregates the owner's active `holds` (`stage: 'cart'`, `status: 'active'`) joined to `products`/`product_variants`, shaped for the UI (mirrors what `cart.store.ts`'s `lines` currently renders, so `src/app/(storefront)/cart/page.tsx` needs data-shape changes, not a redesign).

**One reservation, not two systems.** "Add to bag" and "Hold" become the same `holds` row. For a one-of-one piece, adding it to the bag *is* the hold — there is no separate hold step; the existing "Hold for 15 minutes" button on `/cart` becomes unnecessary for unique pieces (already held the moment it was added) and is removed for that case. `CART_HOLD_MINUTES = 15`, matching the existing UI's number exactly.

Server Actions (`src/app/(storefront)/cart/actions.ts`, called from wherever "add to bag" is triggered — `product-purchase-panel.tsx`, `quick-view-overlay.tsx`, `mobile-buy-bar.tsx`) wrap the above, call `revalidateTag` for the product's existing cache tag (the same tag `modules/products/server/storefront/*` already writes on catalogue reads), and return the typed `Result` — never a thrown exception for an expected outcome (sold out, reserved by someone else, hold expired).

### C — Sign-in merge

New `src/server/auth/merge-guest-cart.ts`: `mergeGuestCartIntoCustomer(guestCustomerId, authenticatedCustomerId)` reassigns the guest's active `holds.customer_id` to the authenticated customer, deletes the now-empty guest `customers` row, clears the `lst_guest` cookie. Called from the existing sign-in success path (wherever `getCurrentSession()`'s consumer branch first resolves post sign-in — the storefront auth dialog's success handler).

### D — Checkout → real pending order

`checkout-flow-v2.tsx`'s item list stops being whatever it currently derives from and instead renders `getCartView(owner)`'s real lines. `payNow()`, `markPlaced()`, `ProcessingDialog`, `DeclinedDialog`, and the hardcoded Paystack `window.open` are deleted entirely — no gateway theater.

New `src/modules/orders/server/storefront-checkout.ts`: `placeOrderFromCart(owner: CartOwner, input: { deliveryCity, deliveryAddress, ... }): Promise<Result<{ orderNumber: string }, CheckoutError>>`. Inside one transaction, following `convertHold`'s already-proven shape almost exactly:

1. Re-run expiry reclaim on the owner's cart holds; fail with a typed error listing any line that was dropped, so the UI can show the existing "your hold expired, re-add it" state instead of silently checking out a smaller order.
2. Create one `orders` row (`payment_status: 'pending'`, `fulfilment_status: 'unfulfilled'`, `source: 'storefront'`, `channel: 'online'`) with server-computed `total` from the held lines' snapshot prices + delivery fee — never a client-sent total.
3. One `order_lines` row per held line, price snapshotted from the hold at reservation time (not re-read live).
4. Convert each hold (`status: 'converted'`, `order_id`), write an `order_timeline_events` row (`status: 'pending-payment'`, same value `convertHold` already uses for its own admin-created orders — reuse the existing consumer-status mapping, don't invent a new string).
5. Return the order number.

The final button's label is honest about state — not "Pay ₦X" (nothing charges yet) but "Place order" — and the confirmation screen (`src/app/(storefront)/order-confirmation/page.tsx`, currently reading whatever local state `markPlaced()` set) reads the real order by number and shows "Awaiting payment," matching the exact consumer-copy mapping the codebase already uses for `payment_status: 'pending'`.

## Data flow

1. Shopper views a product → real availability already computed by `modules/products/server/storefront/*` (needs one addition: per-shopper `reserved_by_me` vs `reserved_by_others` currently isn't scoped to a session — confirm during implementation whether `catalogue-projection.ts` already threads a viewer id through; if not, that's a small, additive change to pass `resolveCartOwner()`'s id into the existing availability derivation, not a new derivation).
2. "Add to bag" → Server Action → `resolveCartOwner()` (sets cookie if new) → `reserveCartLine` transaction → `revalidateTag` → optimistic local Zustand update reconciled with the real result.
3. `/cart` reads `getCartView(owner)` — real held lines, real `expires_at`-derived countdown (client ticks a display-only countdown computed from the real timestamp, never owns it).
4. Sign-in → `mergeGuestCartIntoCustomer` → guest cart now belongs to the authenticated customer.
5. Checkout final step → `placeOrderFromCart` → real order → `/order-confirmation/[orderNumber]` reads the real order.

## Error handling

Every expected failure returns a typed `Result`/`CartActionError`/`CheckoutError` (mirroring `HoldActionError`'s existing shape in `modules/holds/types.ts` — same codes where they overlap: `stock-write-conflict`, `insufficient-reserved-stock`), never a thrown exception. Unexpected failures use route error boundaries.

## Testing

- Unit: `reserveCartLine`/`change-quantity`/`release-line`/`expire-holds` against a real test Prisma connection (or the same mocking convention `modules/holds/server/commands.test.ts` already uses — follow whichever that file does).
- Concurrency: two simultaneous `reserveCartLine` calls on one unique product → exactly one succeeds (mirrors the existing optimistic-concurrency pattern already proven in `operational-stock.ts` and `holds/server/commands.ts`).
- `placeOrderFromCart` idempotency and expired-line handling.
- `merge-guest-cart` reassignment correctness.
- Playwright: guest add-to-bag survives reload; sign-in merges bag; full checkout produces a real order number that persists across a confirmation-page reload.

## Explicitly out of scope

- Payment gateway wiring into customer checkout (Paystack integration exists and works for admin's offline-sale path; extending it to online checkout is future work per the owner's explicit instruction).
- Per-shopper availability scoping, if it turns out `catalogue-projection.ts` doesn't already have it — implement the smallest addition, not a redesign of that module.
- Any change to `/collections/[slug]`, admin, or any already-real module.
- Delivery-zone/fee real data (kept as whatever `checkout-flow-v2.tsx` currently uses for zones — flag as a follow-up, not blocking).
