# Account, Cart, Checkout and Product Media Cutover

**Branch:** `agent/account-cart-checkout-media-cutover`  
**Base:** `main` at `9b607376da1faa406bba1cf19d1b7ae6492d65cb`  
**Workflow:** specification → planner → data engineer → domain engineer → UI engineer → reviewer  
**Status:** source implementation and connector-backed source review complete; execution gates not passed

## Authority and execution contract

This work follows the fixed six-role roster introduced by commit
`66433b46e164c60a5e1821de21ef964a4f6d7ba8` and the feature workflow in
`.agents/workflows/feature.md`. The orchestrator verifies each handoff before the next role starts;
the reviewer is never skipped.

The relevant `relvorlabs/agent-controller` capabilities are part of the plan of record:

| Role / concern | Controller skill or MCP guidance | Application in this PR |
| --- | --- | --- |
| Process | `using-superpowers` | Load applicable process/domain guidance before implementation and report unavailable tools rather than silently planning around them. |
| Planner | `find-skills`, repository doctrine | Select only task-relevant skills, map files to owning roles, keep exclusions explicit. |
| Data engineer | `supabase`, `supabase-postgres-best-practices`, `prisma-cli` | Keep Prisma public-schema ownership, apply constraints/indexes/RLS, prevent direct Data API access, and define migration verification commands. |
| Domain engineer | `next-best-practices`, `vercel-react-best-practices` | Keep Route Handlers thin, enforce server ownership, use transactions, publish typed contracts and TanStack invalidation behavior. |
| UI engineer | `ui-ux-pro-max`, shadcn MCP guidance | Preserve the current visual baseline, use existing shadcn/Base UI primitives, progressive disclosure, explicit states, accessible labels and responsive behavior. |
| Reviewer | `react-doctor`, `playwright-cli`, `chrome-devtools` MCP guidance | Run changed-scope React analysis, browser storage/network/console checks, responsive viewports and accessibility inspection. |

### Tool execution policy

- The connected GitHub tool is used for repository inspection, branch edits and PR comments.
- No GitHub Actions workflow is created, triggered or treated as evidence for this task.
- Supabase MCP, shadcn MCP, Chrome DevTools MCP, Playwright CLI, Prisma CLI and React Doctor are
  relevant reviewer tools, but they are not available through this connector-only execution. Their
  checks remain explicit manual/local gates and must not be reported as passed.

## Problem statement

The merged storefront still had four incomplete end-to-end boundaries:

1. `/account/**` route composition consumed legacy `src/features/storefront/account/**` files instead
   of domain-owned `src/modules/**` UI, and its overview/chrome still displayed prototype identity,
   counts, order numbers and simulated actions.
2. The active cart was browser-only. Authenticated selected variants and quantities were not stored
   as the customer's canonical cart, and refresh/sign-in/checkout could diverge or erase intent.
3. Checkout embedded profile and address creation forms. It should consume the signed-in customer's
   account data, ask only for a missing phone number, default to the saved default address, allow
   selection from existing addresses, and direct address management to `/account/addresses`.
4. Product media handling was inconsistent. Admin upload required manual alt text while consumers
   frequently indexed `product.images[0]` rather than using the selected cover/default media.

## Product contract

### Account

- Production account UI ownership lives under the owning modules in `src/modules/**`.
- Route files remain thin and do not import `@/features/storefront/account/**` for migrated surfaces.
- The overview loads the owned profile, real commerce orders and saved-product count from existing
  server domain boundaries; it contains no sample customer, order, status or monetary data.
- Desktop/mobile chrome uses the real session identity and the real POST-only sign-out flow.
- Simulated verification/modal actions are not retained. Real security actions remain owned by
  `AccountSecuritySection` and its provider-backed modals.
- The existing visual structure, interaction intent, responsive behavior and accessibility contract
  are preserved during the architecture cutover.

### Cart persistence

- Prisma is authoritative for a signed-in customer's active cart lines, selected variant and
  quantity.
- Guest cart intent remains browser-owned and survives refresh, navigation and browser restart.
- On authentication, guest intent merges into the server cart using idempotent maximum-quantity
  semantics after product/variant/availability validation.
- The customer's own active checkout reservations count as usable quantity during cart
  canonicalization, so checkout cannot make its own cart lines disappear.
- TanStack Query owns remote cache; Zustand remains the immediate browser interaction cache.
- Query keys are scoped to a stable authenticated identity propagated by the server/auth flow, so one
  signed-in customer's cached cart is not reused for another even when email is absent.
- Unsynced browser intent is retained until the server confirms the merge/write. Same-tab snapshot
  writes are serialized so a slower response cannot overwrite a newer cart.
- `pagehide` performs a best-effort keepalive write only while there is unconfirmed intent.
- Verified settlement subtracts only the purchased product/variant quantities. Exact or smaller
  selections are deleted before larger selections are decremented, preserving the precise remainder.
- Items added after checkout creation, including additions from another tab/session, are preserved.
- The browser does not blanket-clear the cart after payment; it rehydrates the invalidated canonical
  server snapshot.

### Cart database security

- `customer_cart_lines` has positive-quantity, owner/product/variant uniqueness and product-variant
  consistency constraints.
- The public-schema table has RLS enabled and direct `anon`/`authenticated` table grants revoked.
- No browser-supplied customer id is accepted. Authenticated Route Handlers resolve ownership and use
  the privileged Prisma connection.

### Checkout

- Checkout reads the canonical profile, saved addresses, default address and delivery zones.
- Existing name and email data are display-only.
- When phone is missing, checkout asks for the phone twice and requires matching values before saving
  it to the account. This is input confirmation, not a claim of SMS/OTP ownership verification; no
  phone-verification provider exists in the current repository scope.
- The default address is selected automatically.
- “Change delivery address” reveals a compact selector containing only existing owned addresses.
- New/edit address actions link to `/account/addresses`; checkout creates no addresses.
- Coupon code is the only general checkout form and validates automatically with loading, valid and
  invalid states. The server recalculates and persists the discount.
- A recoverable checkout produces a persistent storefront alert and reopens the existing Paystack
  attempt instead of creating a duplicate order.

### Product media

- Product upload is upload-first and no longer requires the operator to author alt text.
- Accessibility text is inferred from product identity and media role, with a server fallback that
  includes the actual product name for imported or legacy empty-alt media.
- The existing cover media kind remains the single default-image invariant; no duplicate default
  column is introduced.
- Product projections expose a canonical `defaultImage`, order cover media first, and changed
  consumers use `getProductDefaultImage` plus `CloudImage`.
- Migrated account UI does not use raw `<img>` or Next `<Image>`.

## Acceptance criteria

- No active `/account/**` route imports the legacy account feature tree.
- Account overview/chrome shows owned/session data rather than placeholders or simulated actions.
- Guest cart survives hard refresh and browser restart.
- Signed-in cart survives hard refresh, sign-out/sign-in and another session because it is DB-backed.
- Variant selection and quantity round-trip through authenticated API/database ownership.
- A failed guest merge never erases local intent.
- Rapid same-tab mutations cannot complete out of order and publish an older snapshot last.
- Successful settlement preserves the exact unpurchased remainder and later additions.
- Checkout does not ask for already-known account details or create addresses.
- Missing phone values must match before being persisted.
- Default and alternate existing-address selection work as specified.
- Coupon validation is server-authoritative and automatic.
- Recoverable checkout alert/sheet survives refresh.
- Product upload does not require manual alt entry and changed consumers use canonical cover media.
- Required execution and browser gates are recorded honestly.

## Phased implementation and handoffs

### Phase 1 — Planner

- Survey merged account/payment/cart/media code and establish scope/exclusions.
- Publish the specification and file/role plan before implementation.
- Record relevant controller skills/MCPs and unavailable-tool gates.

**Handoff:** approved scope, target files, role ownership and acceptance criteria.

### Phase 2 — Data engineer

- Add canonical customer cart persistence without conflating cart intent with stock-reserving holds.
- Add constraints, indexes, variant consistency trigger, RLS and Data API grant removal.
- Retain the existing product-cover media invariant rather than adding a second default flag.

**Handoff:** schema/migration plus documented ownership, security and concurrency implications.

### Phase 3 — Domain engineer

- Publish cart schema/types/server operations, thin authenticated route and typed client/hooks.
- Validate product/variant/publication/availability on every canonical write, including customer-owned
  active reservations.
- Extend checkout context with active recovery and server-authoritative coupon validation.
- Make successful payment consume only matching purchased cart quantities in remainder-safe order.
- Publish canonical default-image projection and product-aware server alt fallback.
- Propagate a stable authenticated identity for remote cart cache isolation.

**Handoff:** typed UI contracts, cache/invalidation behavior and transaction boundaries.

### Phase 4 — UI engineer

- Cut account route composition over to module-owned UI while preserving the visual baseline.
- Replace prototype account overview/chrome values with real profile, orders, saved data and sign-out.
- Reconcile guest/server carts without erasing pending intent and serialize browser writes.
- Replace checkout account/address forms with summary, matching phone confirmation, default address,
  opt-in alternate selector and account address links.
- Add automatic coupon status and persistent checkout recovery alert.
- Simplify image upload and migrate changed media consumers to canonical cover + `CloudImage`.

**Handoff:** source-complete UI states awaiting reviewer execution gates.

### Phase 5 — Reviewer

Connector-backed source review inspected ownership, SQL security, transaction behavior, cache identity,
effect stability, source imports, account placeholder/simulation drift, media selection, test fixtures
and scope drift. Source findings were corrected on the branch before this record was finalized.

The following remain manual/local and **not passed** in this session:

```bash
pnpm prisma:validate
pnpm prisma:migrate:status
pnpm test src/modules/cart src/modules/checkout src/modules/products src/modules/customers src/providers
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm build
pnpm react-doctor
pnpm test:e2e
```

Browser review must cover 375×812, 768×1024 and 1280×800 in both themes, keyboard/focus behavior,
real account overview and sign-out, guest refresh persistence, guest-to-account merge failure/success,
second-session canonical refresh, alternate address, phone mismatch/match, coupon states, Paystack
recovery, settlement with exact quantity remainder and post-checkout cart additions, console/network
errors and default-image rendering.

## Reviewer source corrections

- Added RLS/direct-grant protection for the customer cart table.
- Retained failed guest intent and stabilized reconciliation effects.
- Scoped remote cart caches to stable session identity.
- Serialized same-tab full-snapshot writes.
- Counted customer-owned reservations during cart validation.
- Removed blanket server/client cart clearing after payment.
- Corrected settlement ordering so valid quantity remainder is not deleted.
- Added matching phone confirmation instead of making a false verification claim.
- Updated checkout/cart/session tests for the new contracts.
- Replaced account overview/chrome placeholders and simulated sign-out/verification actions with real
  domain/session behavior.
- Removed direct default-image indexing and strengthened server media-alt fallback.

## Explicit exclusions

- No visual redesign of storefront, account or admin.
- No new generic account persistence domain.
- No client-supplied price, total, customer id, address ownership or payment truth.
- No broad deletion of unrelated legacy features.
- No replacement of Cloudinary, Supabase Auth or Paystack infrastructure.
- No SMS/OTP phone-verification infrastructure in this scope.
- No GitHub Actions execution or validation claim.
- No completion claim until the reviewer gates are actually executed.
