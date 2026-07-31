# Storefront account, checkout, delivery, and promotions redesign

Status: active implementation; source and reviewer gates remain open.

Predecessors: PR #63 was merged into `main` before this follow-up. This specification governs branch `agent/storefront-checkout-delivery-promotions-redesign`.

## Problem statement

The merged storefront hardening introduced a new Cache Components prerender failure because the Pino logger reads wall-clock time inside a Server Component catch path before request or uncached data has been accessed. The account route therefore returns 200 only after a long fallback path and logs the Next.js `next-prerender-current-time` exception as if it were a catalogue outage.

Checkout also treats delivery as city-zone restricted even though the business contract is nationwide delivery. Customers can be blocked by an unsupported-city message, cannot clearly choose another saved address or confirm the default address, and the cart/checkout presentation does not meet the intended modern fashion-house experience. The admin navigation is missing an operational coupon-code generator and management page.

## Non-negotiable contracts

### Server and Cache Components safety

- Server diagnostics must never invoke request-time wall-clock APIs during prerenderable Server Component execution.
- Logging must not convert a handled catalogue/database failure into a new rendering failure.
- Prisma, database provider details, hostnames, SQL/query text, and internal stacks remain server-only.
- Account and storefront routes return public typed states and usable UI when catalogue enrichment is unavailable.
- Client modules never import Prisma, server repositories, or server-only logging helpers.

### Nationwide delivery

- Delivery is available nationwide; an address city is not an eligibility blocker.
- Delivery pricing follows an explicit configured nationwide policy: a store-level fixed delivery fee, a matching regional override when one exists, or a clearly defined zero/free-delivery fallback.
- The checkout UI must never silently charge an arbitrary first zone.
- Customers can view the current/default address, select another saved address, add an address, and understand the applied delivery fee before payment.
- Server order creation and payment initialization must derive the same delivery policy as the UI.

### Checkout and cart experience

- Preserve real cart, coupon, address, payment initialization, verification, pending, failed, abandoned, reversed, and review-required behavior.
- Every disabled payment state remains visible and actionable.
- Redesign the cart sheet and checkout as an elegant fashion-house purchase flow rather than a generic form stack.
- Use existing Laitstyles tokens, `CloudImage`, shadcn/Base UI primitives, responsive layouts, keyboard focus, and accessible labels.
- Mobile, tablet, and desktop surfaces must preserve information hierarchy and payment trust cues.

### Promotions administration

- Admin users with the correct authorization can list, create/generate, activate/deactivate, and inspect coupon codes.
- Coupon generation uses server-owned validation and uniqueness, not client-only random strings.
- The generator supports percentage or fixed-value discounts, optional minimum spend, usage limits, start/end dates, and a human-editable or generated code.
- Customer validation continues through the existing public coupon contract; internal promotion fields are never exposed unnecessarily.

## Fixed six-role execution model

The roster introduced by commit `66433b46e164c60a5e1821de21ef964a4f6d7ba8` is authoritative and must remain exactly six roles:

1. **Orchestrator** — classifies the cross-layer work, enforces ordered handoffs, and prevents GitHub Actions from being used as evidence.
2. **Planner** — maps the real files, dependencies, phases, explicit exclusions, and acceptance checks before source edits.
3. **Data engineer** — owns any Prisma schema/migration or durable store-level delivery/promotion configuration changes.
4. **Domain engineer** — owns server error containment, delivery policy, coupon authorization/validation, APIs, and transactional order/payment consistency.
5. **UI engineer** — owns account recovery UI, address selection, cart/checkout redesign, and admin coupon screens using existing primitives.
6. **Reviewer** — reviews source, runs available gates, records unavailable local/browser gates as blocked, and keeps the PR draft until evidence exists.

## Relevant agent-controller skills and MCP guidance

- `using-superpowers` and `find-skills` for workflow selection and explicit role handoffs.
- `next-best-practices`, `next-cache-components`, and `vercel-react-best-practices` for prerender-safe diagnostics, Server Component boundaries, Suspense, stable data ownership, and rendering performance.
- `prisma-cli`, `supabase`, and `supabase-postgres-best-practices` for migration replay, pooled database behavior, constraints, indexes, authorization, and transaction design.
- `ui-ux-pro-max`, `shadcn`, and shadcn MCP guidance for an elegant commerce hierarchy, accessible form controls, dialogs/sheets, cards, tabs, badges, and responsive composition.
- Playwright CLI, Chrome DevTools MCP, and `react-doctor` define browser, console, interaction, and React-quality reviewer gates; they are not replaced by GitHub Actions.

## Phased implementation

### Phase 0 — PR and planning

- [x] Create a dedicated branch.
- [x] Commit this specification before implementation.
- [ ] Open a draft PR.
- [ ] Add the task-by-task plan as a PR comment.

### Phase 1 — account and logger correction

- [ ] Remove prerender-unsafe logger behavior from the shell catalogue catch path.
- [ ] Preserve bounded server diagnostics without wall-clock reads.
- [ ] Add source-level regression coverage for the handled failure state.
- [ ] Confirm account rendering does not depend on catalogue availability.

### Phase 2 — nationwide delivery policy

- [ ] Inspect current delivery-zone schema, APIs, admin configuration, checkout calculation, order creation, and payment initialization.
- [ ] Define one server-authoritative nationwide delivery resolver.
- [ ] Remove unsupported-city eligibility blocking from customer UI and server commands.
- [ ] Preserve optional regional overrides without arbitrary-zone fallback.
- [ ] Expose the applied fee and policy label in the public checkout DTO.

### Phase 3 — address selection and checkout domain flow

- [ ] Make the default address explicit.
- [ ] Allow selecting another saved address without leaving checkout.
- [ ] Preserve add/edit-address recovery paths.
- [ ] Ensure cart, checkout preview, order creation, and payment initialization use the same selected address and delivery quote.

### Phase 4 — fashion-house cart and checkout redesign

- [ ] Redesign cart sheet information architecture and line-item presentation.
- [ ] Redesign checkout sections for delivery, promotion, payment, trust, and order summary.
- [ ] Retain all loading, empty, unavailable, payment, and error states.
- [ ] Meet 375×812, 768×1024, and 1280×800 responsive requirements.

### Phase 5 — admin coupon generator and management

- [ ] Audit the existing coupon schema and customer validation path.
- [ ] Add typed, authorized admin list/create/update operations.
- [ ] Add an admin promotions route and navigation entry.
- [ ] Add code generation, validation, status, dates, limits, and discount configuration.
- [ ] Keep customer-facing validation backward compatible.

### Phase 6 — reviewer gates

GitHub Actions must not be run or used as evidence.

Required local commands before review readiness:

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

Required manual checks:

- Account route with database available and unavailable.
- No `next-prerender-current-time` error and no internal exception details in browser output.
- Nationwide address examples across multiple Nigerian states and cities.
- Default address, alternate saved address, new address, and edited address flows.
- Fixed fee, regional override, and free-delivery fallback behavior.
- Coupon creation, activation, expiry, usage limit, percentage, fixed amount, and customer validation.
- Cart and checkout at mobile, tablet, and desktop sizes in light and dark appearance.
- Keyboard navigation, focus visibility, labels, contrast, duplicate-key warnings, and uncaught console errors.
- Real Paystack initialization, close, failure, pending verification, success, reversal, and recovery.

## Current verdict

**Blocked from merge.** This document establishes scope only. Implementation, local command evidence, browser verification, and real payment verification are not yet complete.
