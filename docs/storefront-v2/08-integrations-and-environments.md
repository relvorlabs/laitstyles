# 08 — Integrations & Environments

Concrete configuration for payments (Paystack), email (Resend), image/file storage (Cloudinary + Supabase Storage), the three deployment environments, and two reinforced engineering rules. Supplements [`04`](04-prisma-supabase-architecture.md). All secrets are **server-only**; none may enter a client bundle.

## 1. Environments & URLs

| Env | Origin | Admin | Notes |
|---|---|---|---|
| **Production** | `https://www.laitstyles.com` | `https://www.laitstyles.com/admin` | live keys later; storefront + admin same origin |
| **Preview** | `https://preview.laitstyles.com` | `https://preview.laitstyles.com/admin` | test keys; used for Paystack **test** webhooks (publicly reachable) |
| **Dev** | `https://laitstyle.localhost` | `https://laitstyle.localhost/admin` | **portless** (hostname, no `:port`); HTTPS on `.localhost` |

Rules:
- **Never hardcode an origin.** Derive per-request from headers (`x-forwarded-host`/`x-forwarded-proto`) via the existing `src/lib/auth/server/request-origin.ts` (`getRequestOrigin`), which already backs `emailRedirectTo`. All redirect/callback/webhook URLs are built from the resolved origin + a stable path.
- **Auth cookies are host-scoped** (do **not** set a broad `.laitstyles.com` cookie domain) so preview/dev never share a production session. Storefront and admin share a session **within one origin** (same host, `/admin` sub-path) — intended.
- **Portless dev:** `pnpm dev` uses `portless` (existing script). Paystack cannot reach `https://laitstyle.localhost`, so **local webhook testing uses the preview URL** (test mode) or a tunnel; document, do not fake. Google OAuth + Supabase must allow-list all three origins' `/auth/callback`.
- **Supabase Auth redirect allow-list** must include: `https://www.laitstyles.com/auth/callback`, `https://preview.laitstyles.com/auth/callback`, `https://laitstyle.localhost/auth/callback`. Google Cloud OAuth authorized redirect URIs → the Supabase project callback (Supabase brokers OAuth).
- **Next config:** `next.config.ts` `images.remotePatterns` allows the Cloudinary delivery host; env-driven `NEXT_PUBLIC_SITE_URL` only as a **fallback** for metadata canonical when no request context (build-time), never as the authority for auth/payment origins.

## 2. Payments — Paystack (test mode now)

Keys present (test): **secret** (`PAYSTACK_SECRET_KEY`, server-only) + **public** (`NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, browser-safe for inline/redirect init only). Primary provider behind the `PaymentProvider` adapter (`04` §10). **Webhook is authoritative; the browser callback is not.**

### 2.1 Payment initiation
Server (`src/server/commerce/payments/paystack.ts`): create/confirm the order **draft** + `payment_attempt` (idempotency key) with a **server-computed amount** (kobo) and currency (NGN), then initialize the Paystack transaction (amount, email, `reference` = our attempt id, `callback_url` = resolved origin + `/checkout/callback`, metadata = `{ orderId, attemptId }`). Return the authorization URL for redirect. **Amount is never client-supplied.**

### 2.2 Callback route (redirect — NOT authoritative)
`GET /checkout/callback` (`src/app/(checkout)/checkout/callback/route.ts`): Paystack redirects the shopper here with `?reference=`. This route **only** (a) optionally calls Paystack **verify** (`GET /transaction/verify/:reference` with the secret key) for a fast UX read, then (b) redirects to `/checkout/success/[orderNumber]` if the order is already finalized, or to a "confirming your payment" pending state otherwise. **It must not finalize the order or mark paid** — that is the webhook's job. Handles: missing/invalid reference, verify failure, user-abandoned return.

### 2.3 Webhook route (authoritative)
`POST /api/webhooks/paystack` (`src/app/api/webhooks/paystack/route.ts`):
1. Read the **raw** request body (do not JSON-parse before verifying).
2. Verify signature: compute `HMAC-SHA512(rawBody, PAYSTACK_SECRET_KEY)` and constant-time compare to the **`x-paystack-signature`** header. Reject (401) on mismatch.
3. Parse event; act on **`charge.success`** (and `charge.failed`/others as needed).
4. **Idempotent processing** keyed by `reference`/event id: if already processed, return 200 (Paystack may deliver twice; webhook may arrive **before** the browser redirect).
5. **Verify amount + currency** against the order draft (defense against tampering).
6. In **one transaction**: mark order paid, convert holds→sold, write `stock_movements`, append `order_payment_events` + `order_timeline_events`, clear the cart. Commit.
7. Trigger the **receipt email** (Resend, §3). Return 200 quickly (offload heavy work if needed).

**Webhook URL per env** (set in Paystack dashboard, test mode): `https://preview.laitstyles.com/api/webhooks/paystack` (test) / `https://www.laitstyles.com/api/webhooks/paystack` (live later). The route is **CSRF-exempt** (no session, signature is the auth) and **rate-limited**. `pay-on-delivery`/deposit only if store settings enable it.

### 2.4 Tests (add to `07`)
Signature verification (valid/invalid/replayed); `charge.success` finalizes exactly one order; duplicate webhook idempotent; webhook-before-redirect; amount/currency mismatch rejected; declined/pending handled; no secret in client bundle; callback never finalizes.

## 3. Email — Resend (`RESEND_API_KEY` added)

Server-only `RESEND_API_KEY`. Provider behind an `EmailProvider` adapter (swappable) in `src/server/commerce/notifications/`. Templates authored with **`react-email`** (repo skill available) and sent via Resend.

- **Domain authentication:** `laitstyles.com` is **configured in Resend** (SPF/DKIM/DMARC set). Send from branded addresses (e.g. `orders@laitstyles.com`, `hello@laitstyles.com`). (Sending still verified in CI/staging before Phase 9 ships.)
- **Auth-email ownership (decided): Supabase owns auth emails.** Sign-up confirmation, email change, and password reset are sent by **Supabase Auth** (the existing auth system stays the source of these). **Resend owns commerce/transactional + notification email:** order receipt/confirmation, fulfilment/tracking updates, return updates, back-in-stock / released-hold, newsletter. *(Optional, non-blocking: Supabase Auth SMTP can later be pointed at Resend SMTP for branded auth mails — not required; default keeps Supabase's built-in sender for auth.)*
- **Notifications (`03` NotificationSubscription):** back-in-stock (stocked/variant) and released-hold (unique) — this is the **defined delivery mechanism** that makes "notify me" real (persisted subscription → Resend send → dedupe → expiry). Newsletter opt-in via double opt-in; unsubscribe link; consent + rate limiting (`email-best-practices`).
- **Email styling:** email HTML cannot use app CSS tokens at runtime, but templates must **mirror the brand** (Newsreader-style display via web-safe fallback, brand accent, logo from Cloudinary). No inline app theme leakage; templates are self-contained and reviewed against brand.
- **No PII/payment data** beyond what the email needs; no card data ever.

### 3.1 Tests
Domain-verified check (or BLOCKED); receipt sent on `charge.success` (mocked Resend in CI); reset/verify flow; notification dedupe + expiry; unsubscribe honored; no secret in bundle.

## 4. Image & file storage — Cloudinary primary, Supabase Storage for private uploads

**Decision (ADR-13):** product/brand imagery = **Cloudinary** (already wired via `next-cloudinary`; schema models `cloudinary_assets` metadata; "blob uploads to Supabase storage are forbidden" for product media stands). Rationale verified: Supabase Storage **free tier = 1 GB storage / 50 MB per file / 5 GB egress, and image transformations are NOT free** — an image-led fashion store needs on-the-fly responsive transforms (Nigerian-mobile performance), which Cloudinary provides and the free Supabase tier does not.

- **Prisma + Cloudinary:** Prisma reads/writes **metadata rows only** (`cloudinary_assets`, `product_media`) — public_id, secure_url, dimensions, alt, position. The binary lives in Cloudinary; the storefront renders via `next/image` + Cloudinary transforms with accurate `sizes`. Uploads are **signed** server-side (Cloudinary API secret server-only); the browser never holds the signing secret.
- **Supabase Storage (use it where free + good):**适 for **private, non-transformed files** where 1 GB suffices — e.g. **return-evidence uploads** and possibly generated **PDF receipts**. Access via signed URLs + RLS on the storage bucket; not used for product imagery. Enable only when Phase 9 (returns) needs evidence upload.
- **Never** expose Cloudinary API secret, Supabase service-role, or signed-upload secrets to the browser.

## 4b. Account provisioning & operational scripts

### 4b.1 Who may create which account (binding)
- **Staff / owner / admin accounts are created ONLY by a service-role CLI script — never from a web page.** This is the codebase's existing standard (`scripts/bootstrap-owner.mjs` runs with `SUPABASE_SERVICE_ROLE_KEY`) and is **schema-enforced**: `store_memberships_owner_cli_only` requires `role <> 'owner' OR created_by_cli`, and RLS forbids browser clients from inserting owner rows. The storefront (and admin UI) must **never** expose a staff/owner sign-up. New staff below owner come through the existing invitation flow (`staff_invitations`), not open signup.
- **Customer accounts are self-service** via the storefront (`/auth/sign-up`, Google OAuth) — a `customers` row is provisioned on first authenticated shopper request (`profile_id = auth.uid()`). Customers never gain staff capability (capability separation, `04` §4.1 #6).

### 4b.2 Google sign-in
- **Customers:** open Google sign-in/sign-up on the storefront (standard Supabase Google OAuth).
- **Staff/admin:** an owner/staff account (created by CLI, email-based) can **link a Google identity from the admin dashboard** (Supabase Auth `linkIdentity`) so they can subsequently log in with Google. This is **identity linking to an existing account — not self-signup**. It is a small admin-dashboard capability; documented here as the *minimal admin integration* the login story requires (admin UI otherwise unchanged, per the branch rules).

### 4b.3 Scripts & DB-operation standard (keep `scripts/` clean)
The repo's `scripts/` is currently flat — the real service-role script (`bootstrap-owner.mjs`) sits beside 12 `control-room-phaseN-*-check.mjs` verification scripts. **Reorganize (Phase 1) so scripts are not dirty:**
```text
scripts/
├── bootstrap-owner.mjs           # real operational scripts stay at scripts/ root
├── seed/                         # deterministic seed scripts (e.g. seed-storefront.mjs)
├── checks/                       # phase/verification checks (move control-room-phaseN-*-check.mjs here)
└── db/                           # one-off DB maintenance/migration helpers (service-role)
```
- **Real operational scripts** (bootstrap, seed) live at `scripts/` root or a named subfolder; **phase/verification checks nested under `scripts/checks/`**; never dump ad-hoc scripts loose.
- **Unit tests stay colocated** (`src/**/*.test.ts`, the codebase standard + `vitest.config.ts` include). **Integration/transactional + Playwright e2e go in a dedicated top-level `tests/` folder** (`tests/integration/`, `tests/e2e/`) with their own config/project (they need a DB / browser, unlike colocated unit tests). Do not scatter them.
- **DB operations follow the codebase's standard approach:** privileged/bootstrap work → **service-role CLI script** (like `bootstrap-owner.mjs`); request-time DB work → **server-side repositories + Server Actions**, and a **route handler API endpoint** where a client or external caller needs it (e.g. the minimal admin product-persist path, customer provisioning, webhooks). Where an operation needs an endpoint, create one following the established server/route-handler pattern rather than a bespoke script — scripts are for CLI/ops, endpoints for app runtime.

## 5. Reinforced engineering rules (global — apply to every phase)

### 5.1 Tokens only — zero hardcoded/inline theme or style
No raw hex, no inline colours/spacing/typography literals in JSX, no per-page bespoke theme. **All visual values come from the centralized semantic token layer** (`05` §2). Enforcement: a review/lint check flags raw hex and inline style colour in `src/features/**` and `src/components/**`; the existing anti-pattern gate (`07` §10) fails a phase that introduces them. Store-identity values (logo, campaign image) may come from **safe** `store_settings`, but arbitrary CSS never comes from the database.

### 5.2 shadcn-first components
Before building any custom component, **confirm shadcn (base-mira / Base UI) does not already provide it** — use the `shadcn` skill + shadcn MCP registry search, and inspect `components.json` + installed `src/components/ui/*`. If a needed primitive is missing, **add it via shadcn first**, then compose. A "custom" component is allowed and expected to be a **deep composition of shadcn primitives** (e.g. a `ProductCard` built from `Card`/`Badge`/`Button`/`AspectRatio`), not a hand-rolled reinvention of an existing primitive. Hand-rolled `fixed inset-0` modals, custom popovers, or bespoke form controls where a shadcn/Base UI primitive exists are **rejected** (this is why the current lightbox/size-guide/sort-menu are replaced — `00` §H).

### 5.3 Deep links (never forget)
Every meaningful state is reachable by URL. Overlays (sheets/dialogs) never hold the *only* copy of deep-linkable information — each has a route or server-rendered fallback (`02` §4/§6): cart→`/cart`, condition guide→`/help/condition-guide`, quick-view→`/products/[slug]`, auth→`/auth/sign-in?next=`, filters→URL state, order→`/account/orders/[orderNumber]`, tracking→`/track-order`. Shareable/bookmarkable filter, search, sort, pagination, product, collection, category, and order URLs are required.

## 6. Environment variable registry (server-only unless marked public)

| Var | Scope | Purpose |
|---|---|---|
| `DATABASE_URL` | server | Prisma runtime (pooler `:6543?pgbouncer=true`) |
| `DIRECT_URL` | server | Prisma CLI/migrations (`:5432`) |
| `SUPABASE_SERVICE_ROLE_KEY` | server | privileged paths only (rare) |
| `NEXT_PUBLIC_SUPABASE_URL` / publishable key | **public** | existing auth (RLS-scoped) |
| `PAYSTACK_SECRET_KEY` | server | init + verify + webhook HMAC |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | **public** | client init/redirect only |
| `RESEND_API_KEY` | server | transactional + notification email |
| `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | server | signed uploads |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | **public** | delivery URLs |
| `NEXT_PUBLIC_SITE_URL` | **public** | build-time metadata canonical fallback only |

The `server-client-boundary` test (extended in `06` Phase 1) fails if any non-`NEXT_PUBLIC_` var or `src/server/**`/`src/lib/prisma/**` module is reachable from a `"use client"` file.

## Sources
- Supabase Storage free tier / pricing: https://supabase.com/pricing · https://supabase.com/docs/guides/storage/pricing · https://supabase.com/docs/guides/storage/uploads/file-limits
- Paystack webhooks (verify `x-paystack-signature` = HMAC-SHA512 with secret key; act on `charge.success`; webhook authoritative): https://paystack.com/docs/payments/webhooks/ · https://paystack.com/docs/payments/verify-payments/ *(re-confirm exact snippet at implementation.)*
- Resend + domain auth (SPF/DKIM/DMARC): https://resend.com/docs/dashboard/domains/introduction
