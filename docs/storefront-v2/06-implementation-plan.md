# 06 — Implementation Plan (Phases 0–10)

Small, accepted phases — **not** one giant rewrite. Each phase: *objective · scope · files likely affected · DB changes · UI surfaces · tests · acceptance criteria · exclusions · blockers · rollback · required evidence.* **No phase is accepted on appearance alone.** Every phase runs the gate (below) and reports BLOCKED honestly where tooling is unavailable.

**Per-phase gate (AGENTS.md §11):** `pnpm install --frozen-lockfile` · `pnpm lint` (Biome) · `pnpm exec tsc --noEmit` · `pnpm exec vitest run` · `pnpm build` · React Doctor · `prisma format` + `prisma validate` + migration status + generated-client & Supabase-type freshness (from Phase 1) · responsive review 375/390/768/1024/1280/1440 · console/network check · screenshots for UI phases · PR body update. Do not start the next phase while the current has failing checks, dead actions, incomplete states, or unresolved changed-scope React Doctor findings.

---

## Phase 0 — Audit & specification (this deliverable)
- **Objective:** produce the reviewable spec. **Scope:** docs `00–07` + README. **DB:** none. **UI:** wireframes only.
- **Acceptance:** owner reviews and explicitly accepts; branch + base SHA recorded. **Exclusions:** all implementation. **Blockers:** open decisions in `04` §11 (esp. ADR-05 Prisma/RLS). **Rollback:** n/a (docs). **Evidence:** these files; confirmation no implementation started.

## Phase 1 — Database & repository foundation
- **Objective:** Prisma integrated + real data flowing; authorization boundary + repositories; minimal admin→DB product persistence.
- **Scope:** add Prisma 7 (`provider = "prisma-client"`, output path, **driver adapter** `@prisma/adapter-pg`+`pg`, `prisma.config.ts`, ESM); resolve Next16/Turbopack module fix; `prisma db pull` + baseline (`0_init` via `migrate diff` + `migrate resolve --applied`); connection URLs (`DATABASE_URL` pooled 6543, `DIRECT_URL` 5432); `src/lib/prisma/client.ts` (`server-only`, singleton, explicit pg pool opts); `src/server/authorization/*` (`getStorefrontSession`, `requireCustomer`, `publishedProductWhere`, ownership guards); `src/server/repositories/*` + `src/server/commerce/*/contract.ts` + DTO mappers (strip never-expose); TanStack Query provider + `getQueryClient` (per-request server / browser singleton) mounted in `(storefront)` layout; **DB seed script** of real published products (unique/stocked/variant + media/measurements/stock); **minimal admin product create+publish → Prisma** persistence behind existing `InventoryRepository`-style interface.
- **Files:** `package.json`, `prisma.config.ts`, `prisma/schema.prisma`, `prisma/migrations/0_init/*`, `src/lib/prisma/**`, `src/lib/query/**`, `src/server/**`, `scripts/seed-storefront.*`, existing admin inventory action/repository (minimal), `server-client-boundary.test.ts` (extend).
- **DB:** baseline only (no schema change) + confirm applied state first; RLS/functions stay Supabase-owned.
- **Also in scope:** provision env (`08` §6) — `DATABASE_URL`/`DIRECT_URL`, Paystack (test), `RESEND_API_KEY`, Cloudinary; set the three environment origins + per-request origin derivation; confirm image/file storage split (Cloudinary product imagery / Supabase Storage free tier for private uploads, `08` §4); **create the dedicated least-privilege `BYPASSRLS` runtime DB role (≠ migration role)** and decide whether to disable the unused Supabase Data API for Prisma-only tables (`04` §4.1 #7–#8); **reorganize `scripts/`** (`08` §4b.3: real scripts at root, `scripts/checks/` for the `control-room-phaseN-*-check.mjs` files, `scripts/seed/` for the storefront seed) and add a top-level `tests/{integration,e2e}` layout; centralized **fail-closed authorization module** (`src/server/authorization/*`).
- **Admin persistence path** follows the codebase standard (`08` §4b.3): repository + Server Action, plus a route-handler **API endpoint** if needed — not a bespoke script. Owner/staff accounts remain **CLI-only** (`bootstrap-owner.mjs`); no web staff signup.
- **Tests:** boundary test (no client import of Prisma/server); repository unit tests with deterministic data; `publishedProductWhere` hides unpublished/archived/channel-off; prisma validate + migrate status; type-freshness check.
- **Acceptance:** storefront can read a published product from the DB via a repository; admin create+publish writes a DB row the storefront reads; no Prisma in client bundle; gate green.
- **Exclusions:** UI redesign, checkout, payments. **Blockers:** ADR-05 accepted; DB applied-state known; secrets provisioned. **Rollback:** feature-flag repositories to seed script; revert Prisma add (isolated). **Evidence:** migrate status output, seed run log, a test proving unpublished hidden, bundle check.

## Phase 2 — Storefront shell & design system
- **Objective:** route groups, tokens, typography, header/nav/search shell, cart shell, footer, responsive foundation.
- **Scope:** `(storefront)`/`(account)`/`(checkout)` route groups + layouts (replace `SiteChrome` pathname-sniff); semantic OKLCH token layer (replace raw hex); confirm repo fonts; **HugeIcons** migration; Header (real nav from taxonomy, working search→`/search`, session-aware account, saved, cart count), Footer (real links + safe settings), mobile menu sheet, search command dialog shell, cart sheet shell; dark-mode demoted per `05` §2.5.
- **Files:** `src/app/(storefront)/layout.tsx` et al., `src/components/layout/*`, token CSS, `src/features/storefront/shell/*`.
- **DB:** none (reads settings). **UI:** shell, header, footer, menus.
- **Tests:** a11y (focus, labels, targets), responsive, no-overflow; **token-only lint** (no raw hex/inline style colour) + **shadcn-first** review (`08` §5); Playwright mobile menu/search open.
- **Acceptance:** no dead `href="#"`; search routes; account reflects session; all visuals token-driven; no hand-rolled primitives where shadcn exists; gate green + screenshots.
- **Exclusions:** page content redesign. **Blockers:** Phase 1. **Rollback:** keep old layout behind flag. **Evidence:** screenshots 6 viewports, a11y check.

## Phase 3 — Homepage & catalogue discovery
- **Objective:** home, shop, category, collection, filters, sorting, pagination, search.
- **Scope:** SSR home sections from DB/settings; `/shop`, `/shop/category/[slug]`, `/collections/[slug]` server shell + prefetch + hydrated grid; URL-synced facets/sort/pagination; `ProductCard` contract + variants; `/search` + search command; Postgres FTS + `pg_trgm`.
- **Files:** `(storefront)/{page,shop,collections,search}/*`, `src/features/storefront/{home,catalogue,search}/*`, `src/server/commerce/catalogue/*`, route handlers `api/storefront/products|search`.
- **DB:** search indexes (`tsvector`, `pg_trgm`) migration (domain-named); category/collection count queries.
- **Tests:** visibility integration (unpublished/archived/channel-off hidden), category/collection queries, search ranking/typo, URL-state round-trip; Playwright filter/sort/paginate.
- **Acceptance:** admin-published product appears with no code change; filters shareable; no fabricated counts; gate green.
- **Exclusions:** cart/checkout. **Blockers:** Phase 1–2. **Rollback:** per-route revert. **Evidence:** screenshots (default/empty/loading/error/no-results), search test output.

## Phase 4 — Product detail & availability
- **Objective:** canonical PDP, media, modes, measurements, condition, variants, recommendations.
- **Scope:** `/products/[slug]` SSR + client islands (gallery, selector, add-to-cart); `/p/[slug]`→301; availability derivation; VariantSelector (disable impossible combos); lightbox/size/condition dialogs (Base UI); reviews read (real) + JSON-LD/`AggregateRating`; recommendations; recently viewed.
- **Files:** `(storefront)/products/[slug]/*`, `src/features/storefront/product/*`, `src/server/commerce/catalogue/*`, `next.config.ts` redirect, `src/lib/seo/*`.
- **DB:** `product_reviews` add `fit_note,size_ordered` (additive migration).
- **Tests:** unique/stocked/variant mapping; variant impossible-combo blocked; not-found for unpublished; JSON-LD only real reviews; Playwright PDP open/select/zoom.
- **Acceptance:** three modes render correctly; old `/p` redirects; a11y dialogs; gate green.
- **Exclusions:** hold/cart writes (Phase 5). **Blockers:** Phase 3. **Rollback:** route revert. **Evidence:** screenshots per mode + states, redirect check.

## Phase 5 — Cart & transactional holds
- **Objective:** guest session, cart, hold transaction, expiry, release, contention-safe.
- **Scope:** guest-session ownership (signed cookie); holds-as-cart; **atomic reserve** transaction (verify→lock/conditional update→create hold→adjust stock→movement→commit); release/expiry/cancel idempotent; cart sheet + `/cart`; server `expiresAt` truth; availability flips to `reserved_by_others`.
- **Files:** `src/server/commerce/{cart,holds}/*`, `api/storefront/cart/*`, `src/features/storefront/{cart,holds}/*`, `components/layout/cart-sheet.tsx` (replace).
- **DB:** guest ownership (table or cookie-only per `03`/`04`); hold expiry job/edge (or lazy expiry on read) decision.
- **Tests (transactional, required):** two users race one unique piece → exactly one hold; expiry releases + restores stock; release idempotent; movements balance (`stock_levels_counts_match`). Playwright: add→cart→second user blocked.
- **Acceptance:** no double-hold on unique; timers are display-only; gate green. **Exclusions:** payment. **Blockers:** Phase 4. **Rollback:** disable hold-writes flag (browse still works). **Evidence:** race-test output, movement ledger assertions.

## Phase 6 — Consumer authentication & account
- **Objective:** complete auth + account (no fakes).
- **Scope:** sign-up/verify-email/forgot/reset pages; **Supabase owns auth emails** (sign-up confirmation, email change, reset — `08` §3); customer provisioning (`customers` upsert on first shopper request); customer **Google sign-in open**; `getStorefrontSession` gating `(account)`; account overview/profile/orders/saved/addresses/returns/security reading real queries; **guest cart/hold merge on sign-in**; account deactivation policy. Owner/staff accounts are **CLI-only** — no web staff signup (`08` §4b.1).
- **Proposed minimal admin capability:** staff **Google identity-linking from the admin dashboard** (`linkIdentity`) so a CLI-created owner/staff can log in with Google (`08` §4b.2). Small, login-story-required; admin UI otherwise untouched.
- **Files:** `auth/*`, `(account)/**`, `src/features/storefront/account/*`, `src/server/commerce/{account,orders}/*`.
- **DB:** none new (uses customers/addresses/saved). **Tests:** ownership (address/order/saved scoped to customer), merge dedupe, auth flows; Playwright email/password + OAuth boundary + reset + cart merge.
- **Acceptance:** `account/page.tsx` no longer fakes `signedIn`; all account data server-authenticated; gate green. **Exclusions:** checkout. **Blockers:** Phase 5. **Rollback:** gate flag. **Evidence:** ownership test output, merge test.

## Phase 7 — Checkout & payments
- **Objective:** checkout state machine, delivery, payment provider, webhook, idempotent order creation, confirmation.
- **Scope:** `/checkout` stepper (guest allowed); delivery zones/pickup from DB; server-computed amounts; order draft + idempotency; **`PaymentProvider` adapter — Paystack (test keys present)**; **`/checkout/callback`** redirect route (non-authoritative) + **`POST /api/webhooks/paystack`** (verify `x-paystack-signature` HMAC-SHA512, act on `charge.success`, idempotent, amount/currency verify); atomic order+stock conversion; `/checkout/success/[orderNumber]`; **Resend receipt email** on success; explicit payment-pending boundary if unconfigured. Webhook URLs + full spec in `08`.
- **Files:** `(checkout)/**` incl. `checkout/callback/route.ts`, `src/server/commerce/{checkout,payments,orders,notifications}/*`, `src/app/api/webhooks/paystack/route.ts`, Paystack + Resend adapters.
- **DB:** `payment_attempts` (if needed); order/movement writes. **Tests (transactional):** duplicate webhook idempotent; failed/pending payment; webhook-before-redirect; order idempotency; stock conversion atomic. Playwright: guest checkout → verified payment → one order.
- **Acceptance:** no `window.open` hardcoded URL; browser never marks paid; webhook authoritative; cart cleared only on success; gate green. **Exclusions:** returns. **Blockers:** provider keys/config, Phase 6. **Rollback:** disable checkout (cart persists). **Evidence:** webhook idempotency test, order-created proof, no-secret-in-bundle check.

## Phase 8 — Orders, tracking & fulfilment
- **Objective:** account orders, order detail, public tracking, admin fulfilment sync.
- **Scope:** order list/detail with timeline + courier/tracking; consumer status mapping; `/track-order` (secure lookup, rate-limited, no leakage); reflect admin fulfilment updates via `order_timeline_events`.
- **DB:** optional `shipments`. **Tests:** public-tracking privacy/enumeration, status mapping, ownership; Playwright: admin updates fulfilment → customer tracking reflects it.
- **Acceptance:** raw DB status never shown; tracking safe; gate green. **Blockers:** Phase 7. **Rollback:** hide tracking. **Evidence:** privacy test, mapping test.

## Phase 9 — Reviews, returns & notifications
- **Objective:** verified reviews, return requests, wishlist/hold notifications.
- **Scope:** verified-purchase review submit + moderation + aggregation; return request (eligibility, line qty, disposition, timeline, **evidence upload → Supabase Storage** free tier); notification subscriptions (back-in-stock/released-hold) delivered via **Resend** (`08` §3) — persisted, deduped, expiring; no fake "notify".
- **DB:** `notification_subscriptions`; review `fit/size_ordered` (from Phase 4). **Tests:** review eligibility (one per eligible line), return eligibility, notification persistence/dedupe. Playwright: purchase→review; ineligible return blocked.
- **Acceptance:** no hardcoded reviews anywhere; notifications real or absent (not faked); gate green. **Blockers:** Phase 8. **Rollback:** hide reviews/returns UI. **Evidence:** eligibility tests.

## Phase 10 — Hardening & release
- **Objective:** a11y, performance, SEO, analytics, full regression, visual comparison, production readiness.
- **Scope:** WCAG AA sweep + keyboard/screen-reader/reduced-motion; Core Web Vitals + Cloudinary transforms + image priority limits + bundle boundaries + font loading + streaming; SEO (canonical/OG/JSON-LD/sitemap/robots/noindex/redirects/sold retention); analytics events (`07`); full Playwright regression + screenshot comparison across 6 viewports.
- **Tests:** everything in `07`. **Acceptance:** all gates green with executed evidence; ADR-05 authz tests pass; no anti-patterns remain. **Blockers:** all prior. **Rollback:** feature flags per surface. **Evidence:** Lighthouse/CWV, a11y report, full Playwright run, visual diffs.

---

## Cross-phase rules
- Admin is **not** redesigned; only the Phase 1 minimal product-persistence path touches admin, documented in the PR.
- Every phase updates the PR body (current phase, scope, exclusions/prototype boundaries, verification evidence, blockers, next gate) and keeps the PR **draft** until final gates pass.
- **No claim of "tested" without the command/browser test actually run.** BLOCKED is reported, never disguised as passed.
