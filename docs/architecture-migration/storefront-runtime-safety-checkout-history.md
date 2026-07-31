# Storefront runtime safety, checkout readiness, and recent history

Status: source implementation in progress; executable and browser gates not run.

Predecessor: PR #62 (`fix(storefront): complete production-ready account and checkout cutover`) was merged before this follow-up began. This document governs the hardening branch `agent/storefront-runtime-safety-checkout-history`.

## Problem statement

The storefront could serialize a rejected Prisma-backed React Server Component promise into the development client, exposing query names, database provider details, hostnames, and internal stack paths. Checkout also represented every unmet prerequisite as one unexplained disabled payment button. The home hero could render the same product twice with the same React key, and recently viewed history only changed when quick view opened and was stored in one unscoped browser session key.

## Non-negotiable contracts

### Server intelligence boundary

- Prisma, provider responses, database URLs, SQL/query names, stack traces, and raw `Error.message` values remain server-only.
- React Server Component reads return a typed public state or a generic public fallback; they do not pass rejected database promises to client components.
- API routes continue through `handleApiRequest`, which logs internal context server-side and returns sanitized `ApiError` contracts.
- Customer-facing code may display `ApiClientError.message` because that message came through the sanitized API contract. Arbitrary browser/provider `Error.message` values are never rendered.

### Checkout readiness

- The payment CTA is enabled only when server-authoritative prerequisites are satisfied.
- Every disabled state has a visible reason and, where possible, an immediate recovery control.
- A missing phone number renders a phone and confirmation form in checkout instead of permanently disabling payment.
- Delivery fees are selected only from a zone matching the saved address city; the first configured zone is never silently charged as a fallback.
- Payment status, cancellation, failure, reversal, and review states remain truthful and do not fabricate success.

### Stable rendering identity

- Product arrays are deduplicated by stable product ID before hero assignment.
- A missing secondary hero product removes that card instead of falling back to an already-rendered product.
- Keys include their surface and stable entity identity.

### Recently viewed

- Opening quick view and visiting a full product page both update the local recent list.
- Guest history is persisted under a guest-scoped browser key.
- Authenticated history is scoped by consumer identity and synchronized through `/api/v1/account/recent-products`.
- Guest history is merged into the authenticated list after sign-in, then accepted by the server.
- Server history is bounded to eight currently published products and never exposes internal event records to the client.

## Six-role execution map

The fixed roster from commit `66433b46e164c60a5e1821de21ef964a4f6d7ba8` is authoritative:

1. **Orchestrator** — classify the incident as cross-layer storefront hardening, enforce ordered handoffs, and prohibit GitHub Actions.
2. **Planner** — map each issue to the real route, server, client, state, and test files; exclude unrelated refactors.
3. **Data engineer** — verify the existing Prisma migration history is replayable and that no new schema is required. Recent history reuses the bounded `activity_events` relation rather than introducing an ungenerated model.
4. **Domain engineer** — contain RSC read failures, add the typed recent-products API, preserve authorization, and expose only public contracts.
5. **UI engineer** — add the safe unavailable state, actionable checkout prerequisites, unique hero assignment, identity-scoped persistence, and PDP tracking.
6. **Reviewer** — inspect the complete diff for server leakage, unstable keys, unsafe payment states, and scope drift; report unavailable command/browser gates as blocked rather than passed.

## Relevant agent-controller skills and MCP guidance

The implementation plan follows the repository-agent workflow and the relevant `relvorlabs/agent-controller` guidance:

- `using-superpowers` and `find-skills` for workflow selection and explicit handoffs.
- `next-best-practices` and `vercel-react-best-practices` for Server Component/client boundaries, stable rendering, and React data ownership.
- `supabase` and `supabase-postgres-best-practices` for pooled database failure handling and avoiding provider detail exposure.
- `prisma-cli` for the local migration/validation commands that remain required before merge.
- `ui-ux-pro-max` and shadcn MCP guidance for visible disabled-state explanations, accessible controls, and existing component composition.
- `react-doctor`, Playwright CLI, and Chrome DevTools MCP define the reviewer gates; they have not been executed from the GitHub-only environment.

## Implementation phases

### Phase 1 — server containment

- [x] Add a typed shell availability state.
- [x] Catch catalogue database failures before the RSC promise reaches the client.
- [x] Log only server-side scope and error class at the boundary.
- [x] Render a generic storefront fallback with no internal detail.
- [x] Catch product-page and metadata read failures before rendering.

### Phase 2 — checkout readiness

- [x] Remove the arbitrary first-delivery-zone fallback.
- [x] Render and validate the missing-phone recovery form.
- [x] Display the exact payment blocker beneath the CTA.
- [x] Trust only sanitized `ApiClientError` messages in customer UI.
- [x] Retain real Paystack initialization and verification paths.

### Phase 3 — stable keys

- [x] Select distinct hero products by stable ID.
- [x] Remove duplicate-product fallback cards.
- [x] Add surface-qualified hero keys.

### Phase 4 — recent history

- [x] Track full product-page visits.
- [x] Persist guest and consumer browser histories under separate keys.
- [x] Add authenticated GET/PUT recent-products API contracts.
- [x] Reconcile guest, local consumer, and server histories.
- [x] Bound server records and return only product IDs.

### Phase 5 — reviewer gates

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
- Guest-to-customer merge, customer logout isolation, and customer history on a second browser session.
- Console has no duplicate-key warnings or uncaught application errors.

## Current reviewer verdict

**Blocked from merge.** Source changes are present, but no local typecheck, test, build, Prisma command, React Doctor, Playwright, browser, console, network, or real Paystack verification has been executed in this GitHub-only session.
