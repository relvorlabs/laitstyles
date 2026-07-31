# Storefront runtime safety, checkout readiness, and recent history

Status: source implementation completed and connector-reviewed; executable and browser gates not run.

Predecessor: PR #62 (`fix(storefront): complete production-ready account and checkout cutover`) was merged before this follow-up began. This document governs the hardening branch `agent/storefront-runtime-safety-checkout-history`.

## Problem statement

The storefront could serialize a rejected Prisma-backed React Server Component promise into the development client, exposing query names, database provider details, hostnames, and internal stack paths. Checkout also represented every unmet prerequisite as one unexplained disabled payment button. The home hero could render the same product twice with the same React key, and recently viewed history only changed when quick view opened and was stored in one unscoped browser session key.

## Non-negotiable contracts

### Server intelligence boundary

- Prisma, provider responses, database URLs, SQL/query names, stack traces, and raw `Error.message` values remain server-only.
- Prisma-backed work resolves inside a server component. Client components receive only a resolved typed public DTO, never a database-backed promise or rejected server value.
- React Server Component reads return a typed public state or a generic public fallback.
- API routes continue through `handleApiRequest`, which logs internal context server-side and returns sanitized `ApiError` contracts.
- Customer-facing code may display `ApiClientError.message` because it came through the sanitized API contract. Arbitrary browser, provider, or server `Error.message` values are never rendered.
- The storefront segment owns a generic `error.tsx` as defense in depth and does not inspect error internals.

### Checkout readiness

- The payment CTA is enabled only when server-authoritative prerequisites are satisfied.
- Every disabled state has a visible reason and, where possible, an immediate recovery control.
- A missing phone number renders a phone and confirmation form in checkout instead of permanently disabling payment.
- Delivery fees are selected only from a zone matching the saved address city; the first configured zone is never silently charged as a fallback.
- Payment status, cancellation, failure, reversal, and review states remain truthful and do not fabricate success.
- Real Paystack initialization and server verification remain the only path to a paid order.

### Stable rendering identity

- Product arrays are deduplicated by stable product ID before hero assignment.
- A missing secondary hero product removes that card instead of falling back to an already-rendered product.
- Keys include their surface and stable entity identity.

### Recently viewed

- Opening quick view and visiting a full product page both update the local recent list.
- Guest history is persisted under a guest-scoped browser key.
- Authenticated browser history and TanStack Query cache are scoped by the resolved consumer identity.
- Guest history is merged into the authenticated list after sign-in and removed from the guest key only after the server accepts it.
- Logout never reuses cached signed-in history for the guest identity.
- Authenticated history is synchronized through `/api/v1/account/recent-products`.
- Server history lives in the private SQL-owned `customer_recent_products` table, not `activity_events`, notifications, or staff operational feeds.
- The server accepts only currently published products, stores at most eight rows per customer, and returns product IDs only.

## Six-role execution map

The fixed roster from commit `66433b46e164c60a5e1821de21ef964a4f6d7ba8` is authoritative:

1. **Orchestrator** — classified the incident as cross-layer storefront hardening, enforced ordered handoffs, and prohibited GitHub Actions.
2. **Planner** — mapped each issue to the real route, server, client, state, migration, and test files while excluding unrelated refactors.
3. **Data engineer** — verified the earlier refund/dispute migration no longer duplicates constraints and designed a dedicated SQL-owned recent-history table with ownership FKs, cascading deletion, recency indexing, and bounded retention.
4. **Domain engineer** — contained RSC read failures, added the typed recent-products API, preserved authorization, and exposed only public contracts.
5. **UI engineer** — added the safe unavailable state, actionable checkout prerequisites, unique hero assignment, identity-scoped persistence, and PDP tracking.
6. **Reviewer** — inspected the complete diff for server leakage, unstable keys, unsafe payment states, cross-account cache reuse, staff-feed leakage, and scope drift; unavailable command/browser gates remain blocked rather than passed.

## Relevant agent-controller skills and MCP guidance

The implementation plan follows the repository-agent workflow and relevant `relvorlabs/agent-controller` guidance:

- `using-superpowers` and `find-skills` for workflow selection and explicit handoffs.
- `next-best-practices` and `vercel-react-best-practices` for Server Component/client boundaries, stable rendering, and React data ownership.
- `supabase` and `supabase-postgres-best-practices` for pooled database failure handling and provider-detail containment.
- `prisma-cli` for migration replay, validation, and status commands required locally.
- `ui-ux-pro-max` and shadcn MCP guidance for visible disabled-state explanations, accessible controls, and existing component composition.
- `react-doctor`, Playwright CLI, and Chrome DevTools MCP define reviewer gates; they were not callable from this GitHub-only environment.

## Implementation record

### Phase 1 — server containment

- [x] Add a typed shell availability state.
- [x] Catch catalogue database failures before they leave the server data layer.
- [x] Resolve the catalogue inside a suspended server component and pass only a resolved DTO to the client boundary.
- [x] Log only server-side scope and error class at the storefront boundary.
- [x] Render a generic storefront fallback with no internal detail.
- [x] Catch product-page and metadata read failures before rendering.
- [x] Add a generic storefront route error boundary.
- [x] Add a source test proving a database rejection resolves to the generic public shell state.
- [x] Extend the production-readiness checker to prohibit client imports of Prisma/server data modules and enforce the failure boundary contract.

### Phase 2 — checkout readiness

- [x] Remove the arbitrary first-delivery-zone fallback.
- [x] Render and validate the missing-phone recovery form.
- [x] Display the exact payment blocker beneath the CTA.
- [x] Trust only sanitized `ApiClientError` messages in customer UI.
- [x] Retain real Paystack initialization and verification paths.
- [x] Update source tests for the ready, missing-address, and missing-phone states.

### Phase 3 — stable keys

- [x] Select distinct hero products by stable ID.
- [x] Remove duplicate-product fallback cards.
- [x] Add surface-qualified hero keys.

### Phase 4 — recent history

- [x] Track full product-page visits as well as quick-view opens.
- [x] Persist guest and consumer browser histories under separate keys.
- [x] Scope TanStack Query history by consumer identity.
- [x] Add authenticated GET/PUT recent-products API contracts.
- [x] Reconcile guest, local consumer, and server histories.
- [x] Add a dedicated Prisma schema model and checked-in SQL migration for `customer_recent_products`.
- [x] Mark the table external to future Prisma Migrate diffs so SQL-owned foreign keys remain intact, while runtime writes use parameterized raw Prisma queries.
- [x] Bound server records to eight and keep browsing history out of staff activity feeds.

## Reviewer gates

GitHub Actions must not be used. Before this PR leaves draft, run locally:

```bash
pnpm check:storefront-production
pnpm audit:buttons
pnpm prisma:validate
pnpm prisma:migrate:status
pnpm prisma:migrate:dev
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm test:e2e
```

Manual browser gates:

- 375×812, 768×1024, and 1280×800.
- Light and dark appearance.
- Database unavailable: generic storefront state only; no Prisma/provider/host/query text in DOM or console-forwarded RSC errors.
- Checkout with missing phone, no address, unsupported city, invalid coupon, empty bag, resumable payment, reversal, and review-required status.
- Guest quick-view and PDP recent history across reloads.
- Guest-to-customer merge, customer logout isolation, customer-to-customer isolation, and customer history on a second browser session.
- Staff activity feed does not show product-view history.
- Console has no duplicate-key warnings or uncaught application errors.
- Real Paystack success, close, failure, pending verification, reversal, and recovery behavior.

## Current reviewer verdict

**Blocked from merge.** Source changes are present and the GitHub diff has been reviewed, but no local typecheck, test, build, Prisma command, React Doctor, Playwright, browser, console, network, or real Paystack verification has been executed in this GitHub-only session.
