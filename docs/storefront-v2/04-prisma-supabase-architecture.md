# 04 — Prisma + Supabase Architecture, Authorization & Data Strategy

Architecture is locked against **current official documentation** (verified July 2026), not remembered APIs. Sources at the end.

## 1. Division of responsibility

| Concern | Owner |
|---|---|
| Identity, sessions, OAuth, cookies, `auth.users` lifecycle | **Supabase Auth** (unchanged) |
| RLS policies, security-definer helpers, grants/revokes, triggers, DB functions, partial/expression indexes | **Supabase CLI migrations (raw SQL)** |
| Tables, relations, enums, ordinary indexes, typed relational queries, transactions, app data types | **Prisma ORM (server-only)** |
| Public/customer data access authorization | **Application code** (because Prisma bypasses RLS — §4) |
| Image binaries | **Cloudinary** (metadata rows only in Postgres) |
| Realtime | Only where justified (e.g. optional hold/stock live update); not required for V1 |

**Prisma does not replace Supabase Auth.** No second password system. Prisma never manages `auth.users`.

## 2. Prisma 7 setup (verified — these are v7 breaking changes)

The repo will add **Prisma 7.x** (current line 7.7.0). v7 differs materially from v6:

- **Generator:** `provider = "prisma-client"` (not `prisma-client-js`), with a **required `output` path** (v7 no longer generates into `node_modules`). Output to e.g. `src/lib/prisma/generated`.
- **Driver adapter is mandatory.** `new PrismaClient()` with no args **throws** in v7 (the internal query engine was removed). We pass an adapter — **`@prisma/adapter-pg`** over `pg` — using the pooled runtime URL.
- **Config file:** connection config lives in a required **`prisma.config.ts`** at repo root (not in `schema.prisma`). It references `DIRECT_URL` for CLI (introspection/migrate) and the schema location.
- **ESM:** Prisma 7 ships ESM; ensure module interop with Next 16.
- **Adapter pool settings:** driver adapters use the **underlying driver's** pool config — `pg` has **no** connection timeout by default (0), unlike v6's 5s. We set explicit `pg` pool options (max, idle/connection timeouts) in the client factory.
- **Next 16 + Turbopack:** there is a known `Cannot find module ".prisma/client/default"` issue with Prisma v7 on Next 16/Turbopack; resolved by the explicit generator `output` path + the documented import/config fix. This must be validated in Phase 1 (the repo is Next 16.2.10 + Turbopack-capable).

### 2.1 Client factory (`src/lib/prisma/client.ts`) — shape
```ts
import "server-only";
import { PrismaClient } from "./generated/client";      // v7 output path
import { PrismaPg } from "@prisma/adapter-pg";
// pooled runtime connection (transaction pooler, pgbouncer=true)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL /* + explicit pool opts */ });
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```
- `import "server-only"` guarantees no client bundle inclusion. Single hot-reload-safe singleton.

## 3. Connection URLs (Supabase, verified)

- **`DATABASE_URL`** (runtime / Prisma Client via adapter) → **transaction pooler (Supavisor), port 6543, `?pgbouncer=true`**:
  `postgres://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true`
- **`DIRECT_URL`** (Prisma CLI: introspect/migrate) → **session pooler or direct, port 5432**:
  `postgres://postgres.[ref]:[pw]@aws-0-[region].pooler.supabase.com:5432/postgres` (or `db.[ref].supabase.co:5432`).
- Runtime app connections flow through Supavisor (pooled); CLI uses the direct/session URL. Both **server-only secrets** — never in a client bundle.
- **Two distinct DB roles (per §4.1 #7):** `DATABASE_URL` uses a **dedicated least-privilege runtime role with `BYPASSRLS`** (application); `DIRECT_URL` uses the **migration/owner role**. They are different credentials with different privileges.

## 4. The authorization boundary (Prisma with RLS-bypass — **conditionally approved**)

**Decision (ADR-05 — CONDITIONAL, owner-approved):** Prisma connects via a **dedicated runtime database role with `BYPASSRLS`** (Supabase's documented pattern for backend components that authorize before DB access). This is approved **only** under the mandatory guardrails below — **not** as a blanket bypass of database security. The danger is explicit: with RLS off on Prisma paths, one forgotten ownership condition can expose another customer's order, address, cart, or profile, and RLS will no longer catch it. Every guardrail is a hard requirement, tested and fail-closed.

**Approval statement:** *Approved provided Prisma is server-only, application-layer authorization is centralized and fail-closed, every private query is ownership/tenant-scoped inside the query, privileged operations are audited and re-authorized in-transaction, and RLS remains enabled wherever Supabase client-facing services (Data API, Realtime, Storage, browser) can reach the data.*

### 4.1 Mandatory guardrails
1. **Prisma is strictly server-only.** `import "server-only"` on every DB/repository module; the boundary test fails if any `"use client"` file reaches `src/lib/prisma/**` or `src/server/**` (`07`).
2. **Identity from Supabase Auth; never trust the client.** `@supabase/ssr` `getUser()` (verified JWT) establishes identity. Client-provided `userId`/`customerId`/`storeId`/`role` values are **never** trusted for authorization.
3. **Centralized, fail-closed authorization** in a dedicated policy/service layer (`src/server/authorization/*`) — **not** scattered through pages, route handlers, and Server Actions. Default deny: a missing/failed check blocks access.
4. **Ownership scoped *inside* the query, not checked afterward.** Required pattern:
   ```ts
   await prisma.order.findFirst({ where: { id: orderId, customerId: authenticatedUser.id } });
   ```
   Forbidden: `findUnique({ where: { id: orderId } })` then check ownership later.
5. **Raw Prisma access is restricted to repositories/services.** UI components and public route handlers cannot query Prisma directly; they call typed repositories that *require* a resolved scope (`customerId`/`profileId`/`storeId` or `publishedProductWhere`). No unscoped repository function exists. (Optional additional guardrail: **per-request Prisma client extensions** that inject the tenant/user filter — treated as defense-in-depth, never the sole mechanism.)
6. **Customer, staff, and administrator capabilities are explicitly separated** — distinct authorization surfaces and scopes; a customer session can never reach staff/admin capabilities and vice-versa.
7. **Dedicated runtime role, separate from the migration role.** The application connects as a least-privilege `BYPASSRLS` runtime role granted only the schema/table privileges it needs; **migrations use a different (owner/direct) role**. `DATABASE_URL` (runtime, pooled) and `DIRECT_URL` (migrations) carry different credentials.
8. **RLS stays enabled wherever client-facing services can reach the data** (Supabase Data API, Realtime, Storage, browser supabase-js) — defense in depth. **If Prisma is the only interface to a table, disable the unused Supabase Data API** (per Supabase's Prisma guidance) so there is no unauthorized surface; otherwise keep RLS correct on that path.
9. **Sensitive mutations are audited and re-authorized in-transaction** — checkout, order status, refunds, stock/inventory adjustment, staff actions: re-verify authorization *inside* the transaction and write `audit_events` for the action.
10. **No mixed writes** to the same commerce entity from both Prisma and browser supabase-js without a documented ownership/transaction model. **Ownership model:** commerce writes (holds, orders, stock, reviews, returns) go through **Prisma server transactions only**; browser supabase-js is limited to auth.
11. **Horizontal-privilege (IDOR) tests are mandatory** (`07` §2): User A cannot read, update, cancel, or track User B's order, address, cart, profile, review, or return.

## 5. Query building — the public predicate
`publishedProductWhere()` (single source) encodes `03` §4: store active ∧ lifecycle active ∧ (published ∨ scheduled effective) ∧ storefront channel ∧ has cover media ∧ not archived ∧ price valid. Every catalogue read composes it; DTO mappers strip never-expose fields (`03` §5).

## 6. Migration & baseline strategy (verified) + drift control

**Step 0 — determine current DB state (required first):** inspect whether the `…phase11…sql` migration has been **applied** to the target environment(s) (`supabase migration list` / query `information_schema`). Never edit or delete an already-applied migration.

**Baseline Prisma against the existing schema** (official Prisma baselining flow):
1. `prisma db pull` (introspect) → `schema.prisma` reflecting the live schema.
2. Create `prisma/migrations/0_init/` and generate the baseline SQL:
   `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql`.
3. **Hand-add** the objects Prisma cannot represent into the baseline (or keep them owned by the Supabase migration): RLS policies, `private.*` security-definer functions, grants/revokes, partial/expression indexes (e.g. `stock_levels_product_variant_unique` on `coalesce(variant_id,…)`), triggers (`set_updated_at`), CHECK constraints Prisma can't express.
4. `prisma migrate resolve --applied 0_init` (mark baseline as already applied — does not re-run).
5. **Forward-only incremental migrations** thereafter, **domain-named** (e.g. `add_review_fit_columns`, `add_notification_subscriptions`), never a single `initial-commerce.sql`.

**Ownership split to prevent drift** (ADR-07):
- **Supabase CLI migrations remain authoritative for RLS/policies/functions/grants/triggers.** Prisma migrations own tables/relations/enums/ordinary indexes.
- Each **raw-SQL step must state why Prisma can't represent it** (RLS, security-definer, grant, partial/expression index, trigger, function, cross-column CHECK).
- **Drift is controlled by a single ordering discipline:** DB is the source of truth; after any schema change, run `prisma db pull` + regenerate client **and** `supabase gen types` (the existing `pnpm supabase:types`) so `schema.prisma`, Prisma migration history, Supabase migration history, generated Supabase types, and deployed Postgres agree. A CI check (`07`) fails on `prisma migrate diff` drift and stale generated types.
- **Decision to make in Phase 1:** whether the large `…phase11…sql` should be **split** into smaller domain migrations *before first deployment* (only if not yet applied anywhere). If already applied, leave it and go forward-only.

## 7. Secrets & environment (all server-only)
`DATABASE_URL`, `DIRECT_URL` (pooled/direct), Supabase `SERVICE_ROLE` key (server-only; privileged paths only), Cloudinary API key/secret + signing, `PAYSTACK_SECRET_KEY` (test now) + webhook uses the same secret for HMAC, `RESEND_API_KEY`. Public (browser-safe): Supabase URL + publishable key (existing), Cloudinary cloud name, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`, `NEXT_PUBLIC_SITE_URL` (metadata fallback only). **Never** ship DB credentials, service-role, Cloudinary secret, Paystack secret, or Resend key to the browser; **no client-controlled prices/fees/stock/ownership**. The existing `server-client-boundary.test.ts` is extended to fail if any `"use client"` module imports `src/lib/prisma/**` or `src/server/**`, or references a non-`NEXT_PUBLIC_` var.

**Full env registry, the three environment origins (prod `www.laitstyles.com` / preview `preview.laitstyles.com` / dev `laitstyle.localhost` portless), origin-derivation rule, and cookie scoping are in [`08`](08-integrations-and-environments.md).**

## 8. TanStack Query data strategy (verified App Router pattern)

Do **not** turn the storefront into a client-rendered Query app. Split by data class:

- **Server-rendered (RSC, authoritative):** homepage merchandising, category/collection landing, initial PLP data, PDP, public reviews, SEO metadata, account-shell authorization, initial order data.
- **TanStack Query (client, interactive):** hydrated catalogue interactions when needed, search suggestions, wishlist mutations, cart/hold refresh, checkout draft refresh, order-tracking polling, account mutations, address CRUD, review/return mutations.
- **URL state:** search query, filters, sort, pagination, category/collection context.
- **Local UI state:** open dialog/sheet, selected gallery image, transient form state, disclosure.

**Hydration pattern (official):** `getQueryClient()` returns a **new `QueryClient` per request on the server** and a **browser singleton** on the client. Server Components call `queryClient.prefetchQuery(...)` (not awaited, to stream) and wrap children in `<HydrationBoundary state={dehydrate(queryClient)}>`; client components use `useQuery`/`useSuspenseQuery`. **No duplicate server+client fetch on initial load.** The `QueryClient` provider is mounted in the `(storefront)` layout subtree only (never `/admin`).

**Client queries call Route Handlers** (`src/app/api/storefront/**`), never Server Actions as query functions. Server Actions are used for mutations where a form/redirect fits (auth, address save, place order). Requirements: typed query-key factories; colocated query options; stable normalized keys (include every data-affecting input); intentional stale times per domain (catalogue ~30s, PDP ~15s, cart `0`+focus refetch, orders ~60s, taxonomy/delivery ~5m); mutation invalidation; error boundaries; cancellation; **retries appropriate to risk — no optimistic stock reservation; optimistic wishlist only with rollback**; documented hydration; no duplicate fetch.

- **eslint-plugin-query note:** the repo uses **Biome**, so `@tanstack/eslint-plugin-query` does not run — its rules become explicit PR review checklist items (`07`).

## 9. Caching & invalidation
- RSC data cached with **tags**; **admin product publish/stock mutation invalidates the relevant tags** (e.g. `products`, `product:[slug]`, `category:[slug]`) so the storefront reflects changes without a deploy. Cart/hold/checkout are dynamic (no cache). Define tag taxonomy in Phase 1; never cache per-customer data.

## 10. Payments architecture (Paystack primary, webhook-authoritative)
- **Paystack** is the primary provider (**test keys added**: `PAYSTACK_SECRET_KEY` server-only, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` public) behind a **`PaymentProvider` adapter interface** for future alternatives. Do not add a second gateway to look complete.
- Flow: server computes amounts → creates order **draft** + `payment_attempt` (idempotency key) → Paystack init (server-computed amount) → shopper pays → **`/checkout/callback`** (redirect, *non-authoritative*, may `verify` for UX) → **`POST /api/webhooks/paystack`** (authoritative): verify `x-paystack-signature` = **HMAC-SHA512(rawBody, secret)**, act on **`charge.success`**, idempotent by `reference`, amount+currency verified, atomic order+stock conversion, clear cart, then receipt email → **only then** paid. **Never** `window.open()` to a hardcoded page; **never** mark paid because the browser returned; **webhook is authoritative**; handle webhook-before-redirect and duplicate webhook. Pay-on-delivery/deposit only if store settings enable it.
- **Full Paystack callback + webhook route spec, Resend email integration, and the Cloudinary/Supabase-Storage decision are in [`08`](08-integrations-and-environments.md).**

## 11. Decision records (ADRs — context · choice · alternatives · trade-offs · consequences · reversibility)
1. **Canonical URL** = `/products/[slug]` (alt: keep `/p`). Trade-off: redirects needed. Reversible via redirect.
2. **Cart = holds-as-cart** (alt: separate cart table). Trade-off: fewer entities, holds do double duty; add `carts` later if durable stocked cart needed. Reversible.
3. **Guest checkout supported** (alt: force account). Trade-off: guest ownership + claim/merge complexity; higher conversion. Reversible.
4. **Search** = Postgres FTS + `pg_trgm` (alt: external search service). Trade-off: good enough at current scale, no new infra. Reversible when scale demands.
5. **Prisma with `BYPASSRLS` runtime role + centralized fail-closed app-layer authz — CONDITIONALLY approved** (alt: supabase-js+RLS for anon/customer, Prisma service-only). Trade-off: typed DX vs. security moved into code. **Approved only under the §4.1 guardrails** (server-only, identity from Supabase Auth, query-level ownership scoping, dedicated least-privilege runtime role ≠ migration role, RLS kept for client-facing surfaces / Data API disabled if unused, audited + in-transaction re-auth for sensitive mutations, IDOR tests). Highest-risk decision — guardrails are non-negotiable. Reversible to the hybrid alt with effort.
6. **Payment provider** = one primary + adapter (alt: multi-gateway now). Reversible via adapter.
7. **Migration ownership split** (Prisma tables / Supabase RLS) (alt: Prisma-only, drop RLS). Trade-off: two migration histories, disciplined ordering; keeps RLS defense-in-depth. Reversible with effort.
8. **Dark mode** — audited in `05`; default recommendation there. Reversible.
9. **Category vs collection** distinct routes (`/shop/category/[slug]` vs `/collections/[slug]`). Reversible.
10. **Pagination** = URL-paged for indexable listings; cursor for reviews. Reversible.
11. **Cache invalidation** = tag-based on publish/stock. Reversible.
12. **Notifications/newsletter provider** = **Resend** (`RESEND_API_KEY` added) — the defined delivery mechanism that makes "notify me" real; requires `laitstyles.com` SPF/DKIM/DMARC before sending (`08` §3). Reversible via `EmailProvider` adapter.
13. **Image/file storage** = **Cloudinary** for product/brand imagery (transforms; Supabase Storage free tier has **no free transforms**, 1 GB); **Supabase Storage (free)** only for private return-evidence/receipt files (`08` §4). Reversible.
14. **Environments** = prod `www.laitstyles.com` / preview `preview.laitstyles.com` / dev `laitstyle.localhost` (portless); origins derived per-request, host-scoped cookies, Paystack test webhooks via preview (`08` §1). Reversible.

## Sources (official docs verified)
- Prisma × Supabase connection: https://www.prisma.io/docs/orm/overview/databases/supabase
- Prisma baselining: https://www.prisma.io/docs/orm/prisma-migrate/workflows/baselining
- Upgrade to Prisma 7 / v7 breaking changes: https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7 · https://www.prisma.io/changelog
- TanStack Query SSR (App Router): https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr
- Next.js docs (repo copy): `node_modules/next/dist/docs/` — verify async params/`generateMetadata`/route handlers/caching before Phase 1.
- Prisma v7 + Next 16 Turbopack module-resolution fix: https://www.buildwithmatija.com/blog/migrate-prisma-v7-nextjs-16-turbopack-fix (validate against official docs during Phase 1).
- Supabase × Prisma (dedicated `BYPASSRLS` Prisma DB user; disable unused Data API): https://supabase.com/docs/guides/database/prisma
- Supabase RLS (defense-in-depth; required on Data-API-exposed schemas): https://supabase.com/docs/guides/database/postgres/row-level-security
- Prisma Client extensions (per-request user isolation — additional guardrail only): https://www.prisma.io/docs/orm/prisma-client/client-extensions
