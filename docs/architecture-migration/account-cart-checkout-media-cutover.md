# Account, Cart, Checkout and Product Media Cutover

**Branch:** `agent/account-cart-checkout-media-cutover`  
**Base:** `main` at `9b607376da1faa406bba1cf19d1b7ae6492d65cb`  
**Agent workflow:** orchestrator → planner → data engineer → domain engineer → UI engineer → reviewer

## Problem statement

The merged storefront still has four incomplete end-to-end boundaries:

1. `/account/**` route composition continues to consume legacy `src/features/storefront/account/**` files instead of domain-owned `src/modules/**` UI.
2. The active cart is browser-only. Guest cart intent may be stored locally, but authenticated cart state is not server-owned, selected variants/quantities are not persisted as the customer’s canonical cart, and the browser can clear or diverge from the server-created checkout.
3. Checkout still embeds profile and address creation forms. It should consume the signed-in customer’s account data, ask only for a missing phone number, default to the account’s default address, allow selection from existing addresses, and direct address creation/editing to `/account/addresses`.
4. Product media handling is inconsistent. Admin upload asks users to author alt text manually, while storefront/account consumers often use `product.images[0]` rather than the selected default media and some account UI still bypasses `CloudImage`.

## Product contract

### Account

- New production account UI ownership lives in the owning modules under `src/modules/**`.
- Route files remain thin and must not import `@/features/storefront/account/**` after the migrated surface is complete.
- Existing visual structure, copy intent, responsive behavior and accessibility contract are preserved.

### Cart persistence

- Prisma is authoritative for a signed-in customer’s active cart lines, selected variant and quantity.
- Guest cart identity and minimal line intent remain browser-owned and persist across refresh, navigation and browser restart.
- On authentication, guest lines merge into the customer cart using deterministic quantity/availability rules; the customer cart then hydrates the UI.
- Cart mutations use typed API routes and TanStack Query. Zustand remains an interaction cache, not the signed-in source of truth.
- Checkout success clears the cart only after server-confirmed settlement. Refresh/reopen restores the canonical cart or active checkout.

### Checkout

- Checkout reads the canonical account profile, saved addresses, default address and delivery zones.
- Existing first/last/preferred names and email are display-only in checkout.
- A missing phone number is the only account field that may be completed inline; the update is persisted to the account before payment creation.
- The default address is selected automatically.
- A compact selector allows choosing another existing address only after the shopper activates “Change delivery address”.
- New/edit address actions link to `/account/addresses`; checkout does not create addresses.
- Coupon code remains the only general form in the cart/checkout sheet and validates automatically with debouncing and explicit valid/invalid/loading states.
- An active recoverable checkout produces a persistent storefront alert/sheet entry, parallel to the hold alert, and survives refresh.

### Product media

- Product upload is upload-first: no required alt input.
- Alt text is inferred from product name plus media position/variant context, with a server fallback when client context is absent.
- Admin can select one default image smoothly; persistence enforces one default per product.
- Product projections expose a canonical `defaultImage`/primary-media helper.
- Changed consumers stop indexing `images[0]` and use the canonical default media.
- Account/storefront images use `CloudImage`; raw `<img>` and Next `<Image>` are removed from the migrated account surface.

## Acceptance criteria

- No active `/account/**` route imports `@/features/storefront/account/**` for migrated surfaces.
- Guest cart survives hard refresh and browser restart.
- Signed-in cart survives hard refresh, sign-out/sign-in and a second session because it is DB-backed.
- Variant selection and quantity round-trip through the API and database.
- Guest-to-customer merge is idempotent and never trusts a client-supplied customer id.
- Checkout does not ask for existing account details again and does not create addresses.
- Default address is selected automatically; alternate existing address selection works.
- Missing phone completion blocks checkout until saved and confirmed.
- Recoverable checkout alert reopens the existing checkout after refresh.
- Coupon validation is server-authoritative and does not require submit to show status.
- Product upload does not require alt entry; default-image selection is persisted and used throughout changed consumers.
- Scope-relevant unit, route, architecture, type, build, React Doctor, Playwright, responsive and accessibility gates are recorded honestly.

## Phased implementation plan

### Phase 1 — Data engineer: persistence and media invariants

1. Audit existing Prisma cart/checkout/media models and migrations.
2. Add only missing cart-line/default-media fields or constraints.
3. Add migrations for one active cart per owner and one default media item per product when not already enforced.
4. Regenerate Prisma types and document merge/concurrency behavior.

### Phase 2 — Domain engineer: canonical cart and checkout context

1. Add cart queries/commands for guest merge, list, add, quantity update, remove and clear.
2. Publish authenticated cart routes plus typed browser client/hooks/query keys.
3. Reconcile Zustand/local guest state with server state on session changes.
4. Tighten checkout context so it exposes account completeness, default address, alternatives, active recoverable checkout and coupon validation.
5. Remove address creation from the checkout contract; allow only missing-phone completion.
6. Publish canonical product default-media projection/helper and inferred-alt normalization.

### Phase 3 — UI engineer: account, cart, checkout and media consumers

1. Mechanically move account shell/sections/components from legacy features into owning module UI folders and update thin routes.
2. Connect signed-in cart interactions to mutations while retaining optimistic UX and guest persistence.
3. Replace checkout profile/address forms with account summary, missing-phone completion, default-address summary and opt-in existing-address selector.
4. Add persistent recoverable-checkout alert and reopening flow.
5. Add debounced coupon validation state.
6. Simplify product image upload/default selection and replace changed `images[0]`, `<img>` and Next `<Image>` usage with canonical default media and `CloudImage`.
7. Delete only legacy account files with no remaining consumers.

### Phase 4 — Reviewer: end-to-end gate

1. Run focused domain, route, client and UI tests.
2. Run Prisma validation/migration status, architecture guards, Biome, TypeScript, build and React Doctor.
3. Run Playwright at 375×812, 768×1024 and 1280×800 in light/dark themes for guest persistence, auth merge, signed-in persistence, alternate address selection, missing-phone completion, coupon validation, checkout recovery and default-image rendering.
4. Inspect console, network and server logs; record skipped/unavailable gates as blocked rather than passed.
5. Update the PR task comments phase by phase with exact commits and evidence.

## Explicit exclusions

- No redesign of the storefront, account or admin visual language.
- No new generic `account` persistence domain.
- No client-supplied prices, totals, customer ids or address ownership.
- No broad deletion of unrelated legacy features.
- No replacement of Cloudinary or Paystack infrastructure.
- No claim of validation completion without executed evidence.
