# Storefront account, checkout, delivery, and promotions redesign

Status: source implementation complete; executable, browser, migration, and real-payment gates remain open.

Predecessors: PR #63 was merged into `main` before this follow-up. This specification governs branch `agent/storefront-checkout-delivery-promotions-redesign` and draft PR #64.

## Problem statement

The merged storefront hardening introduced a Cache Components prerender failure because the timestamped application logger read wall-clock time inside a Server Component recovery path before request or uncached data had been accessed. The account route therefore completed only after a long fallback path and reported the Next.js `next-prerender-current-time` exception as if it were a catalogue outage.

Checkout also treated delivery as city-zone restricted even though the business contract is nationwide delivery. Customers could be blocked by an unsupported-city message, could not clearly choose another saved address or confirm the default address, and the cart/checkout presentation did not meet the intended modern fashion-house experience. The admin navigation also lacked an operational coupon-code generator and management page.

## Non-negotiable contracts

### Server and Cache Components safety

- Server diagnostics do not read wall-clock time during prerenderable Server Component recovery.
- Logging cannot replace a handled catalogue/database failure with a second rendering failure.
- Prisma, database provider details, hostnames, SQL/query text, and internal stacks remain server-only.
- Account and storefront routes receive public typed states and usable fallback UI when catalogue enrichment is unavailable.
- Client modules do not import Prisma, server repositories, or server-only logging helpers.

### Nationwide delivery

- Delivery is available nationwide; an address city is not an eligibility blocker.
- Pricing uses an explicit store-selected nationwide fallback, an optional matching regional override, or a zero-fee nationwide emergency fallback when no enabled rates exist.
- Checkout never silently charges an arbitrary first zone.
- Customers can see the default address, select another saved address, add or edit addresses, and review the applied fee before payment.
- The browser submits the owned address ID, not a delivery-zone ID.
- Checkout preview and transactional order creation derive delivery from the same server-owned policy.

### Checkout and cart experience

- Real cart, coupon, address, payment initialization, verification, pending, failed, abandoned, reversed, and review-required behavior is preserved.
- Every disabled payment state remains visible and actionable.
- Cart and checkout use an editorial fashion-house hierarchy rather than a generic form stack.
- Existing Laitstyles tokens, `CloudImage`, shadcn/Base UI primitives, responsive classes, accessible labels, and stable identities are retained.

### Promotions administration

- Authorized staff can list, create/generate, activate/deactivate, edit, and inspect coupon codes.
- Generation, uniqueness, validation, and audit records are server-owned.
- The generator supports percentage and fixed-value discounts, optional minimum spend, optional maximum discount, verified-order usage limits, start/end dates, and custom or generated codes.
- Coupon identity is immutable after creation so verified-use history is not reset by renaming.
- Customer validation continues through the existing checkout coupon contract.
- General store-settings saves preserve promotion JSON rather than deleting it.

## Fixed six-role execution model

The roster introduced by commit `66433b46e164c60a5e1821de21ef964a4f6d7ba8` is authoritative and remained exactly six roles:

1. **Orchestrator** — classified the cross-layer release, created the PR-first workflow, enforced ordered handoffs, and prohibited GitHub Actions as evidence.
2. **Planner** — traced account recovery, settings, delivery, checkout, payment, coupon, navigation, and UI dependencies before source edits.
3. **Data engineer** — defined the durable nationwide-fallback setting and ensured store-settings persistence preserves promotion data.
4. **Domain engineer** — implemented bounded diagnostics, server-owned delivery quotes, transactional checkout consistency, authorized coupon APIs, generation, validation, usage counts, and audits.
5. **UI engineer** — implemented address choice, nationwide delivery presentation, fashion-house cart/checkout surfaces, and the admin Promotions workspace.
6. **Reviewer** — reconciled tests and fixtures, extended architecture checks, corrected source-level edge cases, and kept the PR draft because executable/browser evidence is unavailable.

## Relevant agent-controller skills and MCP guidance

- `using-superpowers` and `find-skills` for workflow selection and explicit role handoffs.
- `next-best-practices`, `next-cache-components`, and `vercel-react-best-practices` for prerender-safe diagnostics, Server Component boundaries, Suspense, stable data ownership, and rendering performance.
- `prisma-cli`, `supabase`, and `supabase-postgres-best-practices` for migration replay, pooled database behavior, transactional consistency, constraints, indexes, and authorization.
- `ui-ux-pro-max`, `shadcn`, and shadcn MCP guidance for commerce hierarchy, accessible controls, sheets, cards, selection states, responsive composition, and visual polish.
- Playwright CLI, Chrome DevTools MCP, and `react-doctor` remain the required browser, console, interaction, and React-quality reviewer gates; they are not replaced by GitHub Actions.

## Phased implementation record

### Phase 0 — PR and planning

- [x] Create a dedicated branch.
- [x] Commit this specification before implementation.
- [x] Open draft PR #64 before implementation.
- [x] Add the task-by-task six-agent plan as a PR comment.

### Phase 1 — account and logger correction

- [x] Replace timestamped Pino logging in prerenderable storefront recovery paths.
- [x] Add bounded server-only diagnostics that exclude error messages, stacks, database hosts, and provider details.
- [x] Preserve the public `temporarily-unavailable` catalogue state.
- [x] Update source regression coverage and the production-readiness architecture gate.
- [ ] Run `/account` with the database available and unavailable in a real Next.js runtime.

### Phase 2 — nationwide delivery policy

- [x] Audit delivery settings, checkout context, order creation, and payment initialization.
- [x] Add exactly one enabled nationwide fallback selection to store delivery settings.
- [x] Migrate existing settings semantically from names such as `Outside Lagos` or `Nationwide` without a schema migration.
- [x] Add one server-authoritative delivery resolver with optional regional overrides and a zero-fee emergency fallback.
- [x] Remove client delivery-zone selection and unsupported-city eligibility blocking.
- [x] Return address-bound public delivery quotes.
- [x] Re-resolve delivery inside the serializable checkout transaction.
- [x] Add direct delivery-policy and settings-validation tests.
- [ ] Verify real store settings and multiple Nigerian states/cities against the development database.

### Phase 3 — address selection and checkout domain flow

- [x] Expose the default address explicitly.
- [x] Allow selection of another saved address inside checkout.
- [x] Preserve add/edit-address navigation without clearing the persisted bag.
- [x] Keep delivery contact completion inside checkout.
- [x] Reconcile checkout server and UI tests with the address-owned contract.
- [ ] Verify default, alternate, new, and edited address flows in the browser.

### Phase 4 — fashion-house cart and checkout redesign

- [x] Redesign the cart sheet as an editorial private edit with product media, quantity, save/remove, recommendations, and a delivery/payment CTA.
- [x] Redesign checkout around delivery contact, address selection, nationwide quote, private offer, payment trust, and order summary.
- [x] Preserve loading, empty, unavailable, payment, recovery, and disabled states in source.
- [x] Retain real Paystack initialization and verification; no simulated success path was added.
- [ ] Complete responsive visual QA at 375×812, 768×1024, and 1280×800 in light and dark appearance.

### Phase 5 — admin coupon generator and management

- [x] Audit the existing JSON-backed customer coupon contract.
- [x] Add typed, authorized admin list/create/update endpoints.
- [x] Add server-generated unique codes, custom codes, schedule, discount, spend, cap, status, and verified-order usage-limit validation.
- [x] Add audit records and immutable coupon identity.
- [x] Add `/admin/promotions`, navigation, generator, list, edit, activation, and usage presentation.
- [x] Preserve promotion data during general settings saves.
- [x] Add promotion schema tests.
- [ ] Verify the full coupon lifecycle against the development database and customer checkout.

### Phase 6 — reviewer gates

No GitHub Actions were run, modified, or used as evidence.

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
- Regional override, nationwide fixed fee, and zero-fee fallback behavior.
- Coupon creation, generation, activation, expiry, usage limit, percentage, fixed amount, and customer validation.
- Cart and checkout at mobile, tablet, and desktop sizes in light and dark appearance.
- Keyboard navigation, focus visibility, labels, contrast, duplicate-key warnings, and uncaught console errors.
- Real Paystack initialization, close, failure, pending verification, success, reversal, and recovery.

## Current reviewer verdict

**Blocked from merge.** Source implementation and connector review are complete, but no local command, Next.js runtime, browser, database migration/status, or real Paystack gate has been executed in this GitHub-only session.
