# 07 — Acceptance & Test Matrix

Binding verification for every phase. Nothing is "done" without executed evidence. Where tooling is unavailable, the check is **BLOCKED**, never reported as passed.

## 1. Static checks (every phase)
- `pnpm install --frozen-lockfile`
- `pnpm lint` (**Biome** — not ESLint)
- `pnpm exec tsc --noEmit`
- `pnpm exec vitest run`
- `pnpm build`
- React Doctor (changed scope)
- From Phase 1: `prisma format`, `prisma validate`, migration status and generated Prisma-client freshness
- **eslint-plugin-query rules** → manual review checklist (Biome can't run the plugin): stable keys; no missing deps in keys; no unstable `queryFn`; correct `enabled`; no optimistic stock.
- **Token-only check** — no raw hex / inline style colour literals in `src/features/**`, `src/components/**` (fails the phase; `08` §5.1).
- **shadcn-first review** — no hand-rolled primitive where a shadcn/Base UI component exists; custom components compose shadcn (`08` §5.2).
- **Deep-link check** — no overlay holds the only copy of deep-linkable info; filter/search/sort/page/product/order URLs are shareable (`02` §6, `08` §5.3).

### 1a. Integrations (Paystack / Resend / storage — see `08`)
- **Paystack webhook:** valid `x-paystack-signature` (HMAC-SHA512) accepted, invalid/replayed rejected; `charge.success` finalizes exactly one order; duplicate webhook idempotent; webhook-before-redirect handled; amount/currency mismatch rejected; **callback route never finalizes**; no Paystack secret in client bundle.
- **Resend:** domain-verified or BLOCKED; receipt sent on `charge.success` (mocked in CI); verify/reset flow; notification dedupe + expiry; unsubscribe honored; no `RESEND_API_KEY` in bundle.
- **Storage:** product imagery comes from Cloudinary; private return evidence uses the configured private asset provider; no signing secret enters the browser bundle.
- **Environments/origins:** redirect/callback/webhook URLs derived per-request (no hardcoded origin); host-scoped cookies; the three origins allow-listed in Supabase Auth + Google OAuth.

## 2. Integration tests (data correctness & authorization)
- Public catalogue visibility = `publishedProductWhere` (store active ∧ lifecycle active ∧ published/scheduled ∧ storefront channel ∧ cover media ∧ not archived ∧ price valid).
- Unpublished product hidden · archived product hidden · storefront channel disabled hidden · scheduled-not-yet-effective hidden.
- Unique / stocked / variant product mapping correct.
- Category & collection queries (only visible products; counts correct).
- **Never-expose**: DTOs omit `cost`, notes, audit, raw movements, private ids.
- **Horizontal-privilege (IDOR) — mandatory (ADR-05 §4.1 #11):** User A cannot **read, update, cancel, or track** User B's order, address, cart/hold, profile, review, or return. Ownership is enforced **inside** the query (`where: { id, customerId }`), never post-fetch.
- **Fail-closed authorization:** a missing/failed identity or ownership check **denies by default**; no code path reaches Prisma for private data without a resolved scope.
- **Capability separation:** a customer session cannot reach staff/admin capabilities (and vice-versa); staff/owner accounts are unreachable via web signup (CLI-only).
- **Least-privilege runtime role:** the app runtime database role holds only needed privileges; Prisma is unreachable from any `"use client"` module.
- **Database boundary:** application tables are accessed through Prisma server repositories and protected by server authorization.
- **Sensitive mutations** (checkout, order status, refund, stock adjustment, staff action) re-authorize **inside the transaction** and write an `audit_events` row.
- Public tracking privacy: only safe timeline fields; no PII leak; enumeration-resistant.
- Review eligibility (verified purchase, eligible status, one per line). Return eligibility rules.

## 3. Transactional tests (concurrency & money)
- **Two users racing for one unique product → exactly one active hold.**
- Hold expiry releases + restores `available`; `stock_levels_counts_match` holds.
- Hold release idempotent; cancel idempotent.
- Checkout conversion atomic (order + lines + stock movement one unit).
- **Duplicate payment webhook idempotent** (one order, one stock conversion).
- Failed payment → hold intact, no order finalized. Pending payment handled.
- Stock restoration on cancel/expiry/failed payment.
- Order-creation idempotency (idempotency key).
- Variant quantity contention (no oversell).

## 4. Playwright end-to-end (primary flow)
1. Admin creates & publishes a unique product. 2. It appears on the storefront **with no code change**. 3. Customer finds it via search. 4. Opens PDP. 5. Reserves it. 6. **Second customer cannot reserve the same piece.** 7. First customer checks out. 8. Verified payment creates **one** order. 9. Stock becomes sold. 10. Order appears in customer account. 11. Order appears in admin. 12. Tracking reflects admin fulfilment updates.

Also: guest checkout · sign-in cart merge · email/password auth · Google OAuth boundary (where testable) · forgot/reset password · mobile menu · mobile search · mobile filters · cart sheet · checkout validation · payment failure · tracking · review · return request.

## 5. Viewport & accessibility coverage
- Viewports: **375×812, 390×844, 768×1024, 1024×768, 1280×800, 1440×900**.
- Keyboard-only navigation; focus trapping in overlays; screen-reader labels (icon-only controls named); reduced-motion; automated a11y checks (axe); screenshot comparison; **no horizontal overflow**; touch-target ≥44×44px; status never colour-only; WCAG AA contrast.
- Chrome DevTools MCP / Playwright drive these; if unavailable → BLOCKED.

## 6. Performance
- Core Web Vitals budgets; Cloudinary responsive transforms; **no full-res images in listing grids**; priority-image limits; image placeholders; bundle boundaries + dynamic imports where useful; font loading; streaming/Suspense; skeleton layout stability (no CLS); **no duplicate catalogue fetch** (RSC + client); no interval polling where expiry/event refresh suffices; low-bandwidth Nigerian-mobile consideration.

## 7. Security
Supabase session verification on every non-public operation · safe redirects · authorization on every customer-owned record · **server-side Prisma authorization tested** · input validation · output DTO filtering · IDOR prevention · CSRF considerations · webhook signature verification · payment amount/currency verification · idempotency · rate limiting · order-tracking enumeration resistance · signed asset uploads · **no secrets in client bundle** · **no client-controlled price/fee/stock/customer or order ownership** · PII minimization · audit events for sensitive operations.

## 8. Analytics events (no PII / no payment data in payloads)
homepage viewed · collection viewed · category viewed · search submitted · zero-result search · filter applied · product viewed · variant selected · product saved · hold attempted/succeeded/failed · cart viewed · checkout started · delivery selected · payment initiated · payment failed · purchase completed · order tracked · review submitted · return requested.

## 9. Edge-case matrix (must be handled + tested)
No products exist · products exist but none published · product has no valid cover image · scheduled product not yet public · category empty · collection unpublished · product slug changes · duplicate slug · unique item held by another shopper · unique item sells while viewed · stocked quantity drops · selected variant becomes unavailable · hold expires with cart open · hold expires during checkout · payment succeeds but return redirect fails · webhook delivered twice · webhook before browser redirect · payment declined · payment pending · customer refreshes success page · guest signs in mid-checkout · guest email already exists · cart merge duplicate lines · delivery zone disabled · pickup location disabled · address outside supported region · delivery rate changes · product price changes · compare-at price invalid · order contains now-archived product · order partially refunded · review product later archived · return for ineligible item · Cloudinary image fails · Supabase session expires · Prisma/DB connection fails · JS slow/unavailable.

## 10. Anti-pattern ban list (a phase fails if any appear in changed scope)
`src/lib/catalogue.ts` product import · hardcoded production products · hardcoded reviews · hardcoded checkout products · fake `signedIn` state · fake account orders/addresses · fake client-side stock transitions · random simulated reservations/sales · placeholder `href="#"` · dead navigation · client timers as availability truth · hardcoded payment URL · payment success controlled by browser state · duplicated product truth admin↔storefront · duplicated cart state across pages · cost fields exposed publicly · giant multi-domain route components · unverified authorization · missing loading/empty/error/success states · desktop-only interactions · inaccessible dialogs/sheets · undocumented migration drift · **claims of completion without executed evidence**.

## 11. Definition of done (per surface)
All five states implemented · real data · authorization enforced & tested · a11y (keyboard/labels/contrast/reduced-motion/focus) · responsive across 6 viewports with no overflow · wired per `02` §6 (no dead links) · analytics events emitted · SEO rules applied · gate green with executed evidence · PR body updated · no ban-list item present.
