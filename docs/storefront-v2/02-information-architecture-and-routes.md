# 02 — Information Architecture, Routes & Wiring

Canonical route map, redirects, rendering strategy, folder structure, the **page↔sheet↔dialog decision**, and — the piece missing from the earlier draft — the **explicit wiring map** of how every surface links to every other.

## 1. Route decisions (binding)

- Canonical product URL is **`/products/[slug]`**. `/p/[slug]` is **retired** and **permanently redirected** (301) to preserve old/shared URLs.
- **Kill fragment routes** (`/#justin`, `/#journal`) as primary catalogue navigation → real routes (`/shop`, `/collections/[slug]`).
- No `/admin` or inventory terminology in consumer URLs.
- Filters, search, sort, pagination carry **stable, shareable URL state** (query params) with back/forward preserved.
- Route files do **composition + metadata only** — no business logic (that lives in `src/features/*` and `src/server/*`).
- Prefer a **sheet/dialog/popover** where that is the correct interaction; but **never trap deep-linkable or essential information exclusively in an overlay** (every overlay-backed thing that matters also has a route or is server-rendered on a page).

## 2. Route groups & tree (verified/improved from the suggested structure)

```text
src/app/
├── (storefront)/
│   ├── layout.tsx                          # header + footer + storefront QueryClient provider
│   ├── page.tsx                            # /
│   ├── shop/
│   │   ├── page.tsx                        # /shop
│   │   └── category/[slug]/page.tsx        # /shop/category/[slug]
│   ├── collections/[slug]/page.tsx         # /collections/[slug]
│   ├── products/[slug]/page.tsx            # /products/[slug]   (canonical PDP)
│   ├── search/page.tsx                     # /search?q=
│   ├── cart/page.tsx                       # /cart              (deep-link fallback for the sheet)
│   ├── track-order/page.tsx                # /track-order       (public, no account)
│   ├── help/{page,delivery,returns,condition-guide}/page.tsx
│   └── policies/{privacy,terms}/page.tsx
├── (checkout)/
│   ├── layout.tsx                          # minimal chrome (no full header/footer), noindex
│   ├── checkout/page.tsx                   # /checkout
│   └── checkout/success/[orderNumber]/page.tsx
├── (account)/
│   └── account/
│       ├── layout.tsx                      # requireCustomerSession gate + account nav
│       ├── page.tsx                        # /account (overview)
│       ├── profile/page.tsx
│       ├── orders/page.tsx
│       ├── orders/[orderNumber]/page.tsx   # order tracking/detail
│       ├── saved/page.tsx
│       ├── addresses/page.tsx
│       ├── returns/page.tsx
│       └── security/page.tsx
└── auth/
    ├── sign-in/page.tsx                    # exists — reuse
    ├── sign-up/page.tsx                    # new
    ├── verify-email/page.tsx               # new
    ├── forgot-password/page.tsx            # new
    ├── reset-password/page.tsx             # new
    ├── callback/route.ts                   # exists
    └── sign-out/route.ts                   # exists
```

**Route-group rationale:** `(storefront)` owns the header/footer + storefront `QueryClient`; `(checkout)` uses stripped chrome + `noindex`; `(account)` gates every child via `layout.tsx`. This **replaces `SiteChrome`'s `usePathname` admin-sniffing** with real segment boundaries (admin already lives under `/admin` with its own layout). `catch-all` not-found + per-group `error.tsx`/`loading.tsx` where async work occurs.

**API & webhook routes (not indexed, not user-navigable):** `src/app/api/storefront/**` (route handlers backing client queries), `src/app/(checkout)/checkout/callback/route.ts` (Paystack redirect, non-authoritative), `src/app/api/webhooks/paystack/route.ts` (authoritative, signature-verified, CSRF-exempt, rate-limited). All redirect/callback/webhook URLs are built from the **per-request origin** across the three environments (prod `www.laitstyles.com` / preview `preview.laitstyles.com` / dev `laitstyle.localhost`, portless) — never hardcoded. Full spec in [`08`](08-integrations-and-environments.md).

## 3. Per-route contract table

Legend — Render: **SSR** (server component, dynamic), **SSG/ISR** (cache+tags), **Client-island** (server shell + client widgets). Index: whether search engines should index.

| Canonical route | Purpose | Replaces / problem | Redirect | Auth | Render | Data source | Index | Mobile |
|---|---|---|---|---|---|---|---|---|
| `/` | Home / merchandising | replaces client `page.tsx` (fake) | — | none | SSR + tags | catalogue/settings repos | yes | stacked sections |
| `/shop` | All visible pieces | replaces `(shop)/shop` (fake) | — | none | Client-island (server shell, initial data prefetched) | catalogue repo | yes | filter **sheet** |
| `/shop/category/[slug]` | Category landing | new | — | none | SSR+tags shell, island grid | category+catalogue | yes | as `/shop` |
| `/collections/[slug]` | Collection landing | new | — | none | SSR+tags shell, island grid | collection+catalogue | yes | as `/shop` |
| `/products/[slug]` | PDP | **replaces `/p/[slug]`** | `/p/[slug]`→301 | none | SSR (client islands: gallery, selector, add-to-cart) | product repo | yes | single-column, sticky CTA |
| `/search` | Search results | replaces client typo-map | — | none | Client-island | search repo | **noindex** (thin/duplicate) | overlay + results |
| `/cart` | Cart page (fallback) | new (sheet also exists) | — | none (guest ok) | Client-island | cart/holds repo | **noindex** | full page |
| `/track-order` | Public tracking | new | — | none | SSR on submit | orders repo (token/email) | **noindex** | form → timeline |
| `/help/*`, `/policies/*` | Support/legal | replaces `#` footer | — | none | SSG | settings/static | yes | prose |
| `/checkout` | Checkout | replaces faked checkout | — | guest ok | Client-island + Server Actions | checkout/payments repo | **noindex** | single column steps |
| `/checkout/success/[orderNumber]` | Confirmation | new | — | guest ok (scoped) | SSR | orders repo | **noindex** | receipt |
| `/account` + children | Account | replaces faked account | — | **required** | SSR (gated) | account/orders/... repos | **noindex** | tab nav → sheets |
| `/auth/*` | Auth | extend existing | — | public | SSR + Server Actions | Supabase Auth | **noindex** | forms |

**Redirects (permanent, 301):** `/p/[slug]` → `/products/[slug]`; any legacy `/#justin` entry points link to `/shop`; `/shop?category=` (if ever emitted) canonicalizes to `/shop/category/[slug]`. Implemented in `next.config.ts` (static) + middleware (dynamic slug mapping) — see `04` for slug-change handling (old slug retained → redirect).

## 4. Page vs sheet vs dialog vs popover (decision, with deep-link rule)

| Surface | Interaction | Why | Deep-link fallback |
|---|---|---|---|
| Mobile menu | **Sheet** | large touch nav | nav also in footer |
| Cart | **Sheet** (fast) | review from anywhere | **`/cart` page** |
| Mobile filters | **Sheet** | task-focused | URL state on `/shop` |
| Search | **Dialog (command)** | autocomplete/keyboard | **`/search?q=`** |
| Image lightbox | **Dialog** | focus trap, zoom | gallery on PDP page |
| Size guide / measurements / condition guide | **Dialog** | contextual | `/help/condition-guide` |
| Delivery estimate | **Popover/Sheet** | quick | stated on PDP + `/help/delivery` |
| Address add/edit | **Dialog/Sheet** | form, confirm delete | `/account/addresses` |
| Sign-in encouragement | **Dialog** | in-flow | `/auth/sign-in?next=` |
| Sort menu / account menu | **Popover** | short list | — |
| Review form | **Dialog** | focused form | `/account/orders/[n]` entry |
| Return request | **Dialog/step** on order | contextual | `/account/returns` |
| Quick-view (PLP) | **Dialog** | peek | canonical `/products/[slug]` |

**Full pages (never modal):** search results, shop, category, collection, PDP, checkout, account sections, order detail, public tracking, help/policy. **Core product info is never modal-only.**

## 5. Feature & server folder structure

```text
src/features/storefront/           # client + presentational, per surface
├── shell/ home/ catalogue/ search/ product/ cart/ holds/
├── checkout/ account/ orders/ tracking/ reviews/ returns/ shared/

src/server/                        # SERVER-ONLY (import "server-only")
├── commerce/
│   ├── catalogue/ inventory/ cart/ holds/ checkout/ payments/
│   ├── orders/ fulfilment/ reviews/ returns/
├── repositories/                  # Prisma-backed implementations of domain repos
├── authorization/                 # session resolution + ownership scoping (RLS re-impl)
└── validation/                    # Zod schemas for inputs (shared with client via type-only import)

src/lib/
├── prisma/                        # server-only client factory (adapter), prisma.config.ts lives at root
├── supabase/                      # existing @supabase/ssr clients
├── query/                         # QueryClient factory, providers, key factories, query-options
├── money/                         # kobo helpers, naira()/usd() formatting
├── seo/                           # metadata builders, JSON-LD, sitemap/robots
└── errors/                        # Result<T,E> + typed error taxonomy
```

### 5.1 Module boundaries (explicit)
- **Server-only:** everything under `src/server/**` and `src/lib/prisma/**` carries `import "server-only"`. The Prisma client is never importable from a `"use client"` file (enforced by boundary test, `04`/`07`).
- **DTOs crossing to client:** only typed, **filtered** DTOs from `src/server/commerce/*/dto.ts` (never Prisma models, never rows with `cost`/notes/audit). DTOs are plain serializable types.
- **Zod:** input validation in `src/server/validation/**`; schemas are imported **type-only** or as parse functions into Server Actions/route handlers; client forms may import the same schema for RHF resolver (schema is isomorphic, no server deps).
- **Query-key factories:** `src/lib/query/keys/<domain>-keys.ts` — one per domain; array keys include every data-affecting input.
- **Query-options colocation:** `src/features/storefront/<domain>/queries.ts` composes keys + fetchers (calling route handlers).
- **Mutation orchestration:** in `src/server/commerce/*` (transactional); client mutations call route handlers/Server Actions, never Prisma.
- **Provider adapters** (payments, email, search): `src/server/commerce/payments/adapters/*`, behind an interface — swappable.
- **Circular-import avoidance:** shared domain **contracts** (types + Zod) live in a leaf module (`src/server/commerce/<domain>/contract.ts`) that neither UI nor other domains' UI import from each other. Admin and storefront both depend on shared **contracts**, never on each other's **UI** modules. Direction of dependency: `features → lib/query → route handlers → server/commerce → repositories → prisma`. No back-edges.

## 6. The wiring map — how every surface connects

The earlier draft never specified this. Below is the connection graph (entry → destination · trigger).

### 6.1 Global shell (present on all `(storefront)` routes)
- **Header brand** → `/`.
- **Header nav** (from taxonomy): "New in" → `/shop?sort=newest`; category items → `/shop/category/[slug]`; "Collections" → `/collections` index or featured collection; "Sale" (only if valid compare-at exists) → `/shop?reduced=1`.
- **Header search icon/field** → opens **search dialog**; submit → `/search?q=`.
- **Header account** → if session: `/account`; else opens **sign-in dialog** (or `/auth/sign-in?next=<current>`).
- **Header saved** → `/account/saved` (auth-gated → sign-in dialog with `next`).
- **Header cart** → opens **cart sheet**; "View full bag" in sheet → `/cart`.
- **Footer** → real links: shop/categories, `/track-order`, `/help/delivery`, `/help/returns`, `/help/condition-guide`, `/policies/privacy`, `/policies/terms`, contact, social, newsletter (§10 in `01`).

### 6.2 Discovery → evaluation
- **Home rails / category tiles / collection cards** → `/shop`, `/shop/category/[slug]`, `/collections/[slug]`.
- **Product card (anywhere)** → canonical `/products/[slug]`; **quick-view** dialog also opens from card; card "Save" → wishlist mutation (auth-gated); card "Reserve/Add" (unambiguous only) → hold mutation → **cart sheet** opens.
- **PLP filter chips / sort** → update URL query on same route; **"Filters" (mobile)** → filter **sheet**; **clear-all** → resets query.
- **Search overlay suggestions** → product → `/products/[slug]`; category → `/shop/category/[slug]`; "View all" → `/search?q=`.

### 6.3 Evaluation → cart → auth
- **PDP add-to-cart / reserve** → hold mutation (server-atomic) → success opens **cart sheet**; failure → inline "reserved by another shopper" + notify-me dialog + alternatives.
- **PDP size guide / measurements / lightbox / condition guide / delivery estimate** → respective dialogs/popovers; condition guide also linkable at `/help/condition-guide`.
- **Cart sheet / `/cart`** → "Checkout" → `/checkout` (guest allowed); "Continue shopping" → back or `/shop`; per-line "Remove/Release" → hold release mutation.
- **Any auth-gated action** (save, review, account) → **sign-in dialog** or `/auth/sign-in?next=<origin>`; on success, returns to `next`, **merges guest cart/holds** (`01` §7.1).

### 6.4 Checkout → order → tracking
- **`/checkout`** steps (Contact → Delivery → Method → Payment → Review → Processing → Success/Failure). Delivery options from `delivery_zones`/`pickup_locations`. "Place order/Pay" → server draft + provider redirect/session; **webhook** confirms → order created → redirect to **`/checkout/success/[orderNumber]`**.
- **Success page** → "Track order" → `/account/orders/[orderNumber]` (if signed in) or `/track-order`; "Back to shop" → `/`; "View my orders" → `/account/orders`.
- **`/track-order`** (public) → order number + email/token → tracking timeline (safe fields).

### 6.5 Account graph
- **`/account`** overview cards → `/account/orders`, `/account/saved`, `/account/addresses`, active-holds → **cart sheet**.
- **`/account/orders`** → row → `/account/orders/[orderNumber]` → return request dialog → `/account/returns`; reorder → adds to cart → **cart sheet**.
- **`/account/saved`** → product → `/products/[slug]`; "Move to bag" → hold mutation → cart sheet.
- **`/account/addresses`** → add/edit **dialog**; delete → confirm **AlertDialog**.
- **`/account/security`** → change password/email → Supabase auth flows; **sign-out** → `/auth/sign-out` → `/`.

### 6.6 Error/empty routing
- Unpublished/archived/invalid product → **not-found** (`/products/[slug]` `not-found.tsx`) with alternatives.
- Disabled collection/empty category → designed empty with "Shop New in".
- Expired hold at checkout → inline recovery, back to cart.
- Auth-required deep link (e.g. `/account/orders/x` while signed out) → redirect `/auth/sign-in?next=/account/orders/x`.

## 7. Pagination strategy (per surface)
- **PLP / category / collection:** **URL-paged** (`?page=`) with server prefetch + "Load more" that updates URL — shareable, back/forward safe, SEO-friendly. Avoid pure infinite scroll for indexable listing.
- **Search:** same URL-paged pattern; `noindex` so SEO cost is nil.
- **Reviews on PDP:** cursor "load more" (client), not URL (secondary content).
- **Account orders:** URL-paged.

## 8. SEO & metadata (per route)
- Per-route `generateMetadata`: title/description, **canonical URL**, Open Graph, product social cards.
- **JSON-LD:** `Product` + `Offer`/availability mapping on PDP; `AggregateRating` **only from real published reviews**; `BreadcrumbList` on PDP/category/collection; `Organization`/`Store` sitewide.
- Collection/category metadata; **sitemap** (published products/categories/collections only) + **robots**; **noindex** for account, cart, checkout, and internal search combinations.
- **Sold/discontinued products:** retain URL, mark unavailable in JSON-LD (`Offer` availability `SoldOut`/`Discontinued`), show alternatives; only 404 for never-existed/hard-removed. Slug change → keep old slug → 301 to new.
