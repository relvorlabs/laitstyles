# 00 — Current-State Audit

**Base commit:** `4e4f4283a01bd0c0d98708246e19b033211299f7` (PR #4 head). Every file path below was read at this SHA. Nothing here is assumed from a prior prompt.

**Finding format:** each row/block gives *file → symbol/route · current behaviour · why inadequate · customer impact · technical impact · disposition* (retain / refactor / replace / move / remove).

---

## A. The decisive finding — three disconnected data universes

The prompt's premise ("storefront must consume the same records admin writes") is **not currently possible**, because there are three parallel, non-communicating truths and the storefront reads the wrong one:

| Source | Read by | Reality |
|---|---|---|
| `src/lib/catalogue.ts` (740 ln hardcoded `Product`/`PlpProduct`, Google Drive image URLs) | **Storefront** (`/`, `/shop`, `/p/[slug]`) | Static arrays; not the DB |
| `src/lib/control-room/seed.ts` (`activeControlRoomSeed`) via `src/lib/control-room/data/in-memory/control-room-repositories.ts` | **Admin/Control Room** | In-memory seed behind `Promise`-based repository interfaces (`src/lib/control-room/data/repositories.ts`). **Admin does not persist to Supabase either.** |
| `supabase/migrations/20260711011201_phase11_identity_cloudinary_assets.sql` | **Nothing at runtime** (only Auth touches Supabase) | A complete, well-formed relational schema (products/variants/media/stock/holds/orders/reviews/customers/delivery), **dormant**. |

**Disposition:** the SQL schema is the canonical contract (`03`, `04`). Both consumers migrate onto it; admin gets a *minimal* product create/publish→DB write path so the storefront has real data (proposed admin change, `06` Phase 1). **Verified change vs. the input prompt's assumption:** the input says "storefront must consume the same records admin writes" — true as a target, but admin write-to-DB does not exist yet; this is a prerequisite, not a given.

---

## B. Consumer routes

| Route · file | Current behaviour | Why inadequate | Customer / technical impact | Disposition |
|---|---|---|---|---|
| `/` · `src/app/page.tsx` (785 ln, `"use client"`) | Hardcoded `feedItems`/`feedPool`; **`setInterval` randomly flips items to `resOthers`/`sold` and injects "drops"**; hero = Google Drive URL; hero/most links `href="#"` | Fake availability; AGENTS.md §5 bans random state/timers; entire page client-rendered | Shopper sees invented scarcity, dead links; no SEO, large JS, no real merchandising | **Replace** (server-composed, DB-driven — `05` Home) |
| `/shop` · `src/app/(shop)/shop/page.tsx` (1347 ln, `"use client"`) | Facets/search/sort/pagination **client-only over `plpItems`**; in-memory `typoMap`; `setInterval` "another shopper reserved" toasts; demo states via `?state=` | Search/filter not real; scarcity faked; 1 file = many responsibilities | No shareable/consistent results, no real catalogue, no SEO | **Replace** + decompose (`02`, `05` Shop) |
| `/p/[slug]` · `src/app/(shop)/p/[slug]/page.tsx` (1152 ln, `"use client"`) | `findCatalogueProduct(slug)` over static data; **hardcoded reviews, measurements, holds, recommendations**; hand-rolled lightbox/size-guide (`fixed inset-0`, not dialog primitives) | Wrong URL segment (`/p`), fake reviews/stock, inaccessible modals | No trust signals real, a11y gaps, no structured data | **Replace** → `/products/[slug]` (`02`) |
| `/checkout` · `src/app/checkout/page.tsx` (1152 ln) | Hardcoded `checkoutItems`, `zones`, gateways; **`window.open()` to a hardcoded Paystack URL**, then "I've completed payment" button fakes success (`markPlaced`); no persistence | Not a commerce system; browser controls "paid"; money-unsafe | Orders never created; a customer could "confirm" without paying | **Replace** (`01` Checkout, `04` payments) |
| `/account` · `src/app/account/page.tsx` (2377 ln) | **`useState(signedIn=true)`**, seed addresses/wishlist/reservations, generated orders; auth dialog fakes sign-in via `setTimeout`; address CRUD fake-persists | Reproduces auth locally; ignores the real Supabase auth that already exists; all data fake | Real account data absent; security theatre | **Replace**; consume real session (`01` Account) |
| `/account/layout.tsx` | Present | Needs real session gate | — | **Refactor** |
| `/auth/{sign-in,callback,google,sign-out,error}` + `src/app/auth/actions.ts` | **Real** Supabase Auth + Google OAuth; `signInWithPassword`/`signUpWithPassword` Server Actions; safe `next` redirect via `src/lib/auth/server/redirects.ts` | Built for staff/Control Room; account page ignores them | Auth infra largely exists but unused by storefront | **Retain + extend** (customer provisioning, sign-up/verify/reset pages — `01`, `02`) |

**Missing routes (do not exist):** `/products/[slug]` (canonical), `/shop/category/[slug]`, `/collections/[slug]`, `/search`, `/cart` (page), `/track-order`, `/account/orders`, `/account/orders/[orderNumber]` (tracking), `/account/saved`, `/account/addresses`, `/account/returns`, `/account/profile`, `/account/security`, `/checkout/success/[orderNumber]`, `/auth/sign-up`, `/auth/verify-email`, `/auth/forgot-password`, `/auth/reset-password`, help/policy pages. (Route map: `02`.)

**Fragment routes used as primary nav:** `/#justin`, `/#journal` (header + empty-state CTAs). **Disposition: replace** with real routes.

---

## C. Shell, layout, navigation

| File · symbol | Current | Inadequate | Disposition |
|---|---|---|---|
| `src/components/layout/site-chrome.tsx` · `SiteChrome` | Hides Header/Footer on `/admin` via `usePathname` | Clean split, but forces the whole shell client-side | **Refactor** — prefer route groups `(storefront)` / `(account)` / `(checkout)` so admin exclusion isn't pathname-sniffed (`02`) |
| `src/components/layout/header.tsx` · `Header` | `nav = ["Shop New In","Women","Men","Accessories","Journal"]` with `href="#"` (except two fragments); search `<Input>` **non-functional**; wishlist/account `href="#"`; Lucide icons | Dead nav; search does nothing; account not session-aware | **Refactor/replace** — real nav from taxonomy, search → `/search?q=`, session-aware account, HugeIcons (`05`) |
| `footer.tsx` | Placeholder `href="#"` links | No real destinations | **Replace** — real links + settings-driven content (`01` Footer) |
| `cart-sheet.tsx` · `CartSheet` | Derives cart from **static `feedItems`** | Not the real cart | **Replace** — server-truth holds (`01` Cart, `04`) |
| `brand-mark.tsx`, `theme/*` | Brand mark + light/dark theme provider + boot script | Works; dark-mode value for a fashion brand is unverified | **Retain**; **audit dark mode** (`05` §Dark mode) |
| Root `src/app/layout.tsx` | Fonts `Instrument_Sans` + `Newsreader` + `Geist_Mono`; ThemeProvider; metadata `title/description/icons` only | Coherent fonts (differs from any Geist/Instrument-Serif assumption — **keep repo fonts**); metadata is minimal (no OG, canonical, JSON-LD, sitemap, robots) | **Retain** fonts; **expand** metadata/SEO (`02` SEO) |

---

## D. Duplicated / oversized logic

- **Product card** re-implemented ≥4× with incompatible props: `page.tsx ProductCard`, `shop/page.tsx ProductCard`, PDP rails, `account/page.tsx WishlistCard`. **Disposition: replace** with one `ProductCard` contract + variants (`05`).
- **Hold/countdown/price/availability** logic duplicated across home, shop, PDP, account, checkout (each has its own `formatSeconds`, `stockCopy`, discount math, `setInterval`). **Replace** with shared server-derived availability + one formatting module.
- **Oversized files:** `account/page.tsx` 2377 ln, `shop/page.tsx` 1347, `checkout/page.tsx` 1152, `p/[slug]/page.tsx` 1152 — each mixes unrelated domains (data, cards, dialogs, forms, business logic). **Refactor** into `src/features/storefront/*` (`02` §folders).

---

## E. Auth, middleware, session helpers (verified real)

- `src/lib/auth/server/{access,redirects,session,request-origin,control-room}.ts` (+ tests), `src/lib/auth/{guards,permissions,roles}.ts` — real, staff-oriented (resolve `store_memberships`, capabilities). **Retain**; add a customer-session helper (`getStorefrontSession`) and `customers` provisioning.
- `src/lib/supabase/{server,client,proxy,env,types}.ts` — `@supabase/ssr` server client uses **publishable (anon) key + cookie store** → RLS-scoped path. `types.ts` is generated Supabase types. `phase11-schema.test.ts` tests the schema. **Retain.**
- `src/lib/middleware.ts`, `src/lib/{client,server}.ts`, `src/lib/boundaries/server-client-boundary.test.ts` — boundary enforcement exists. **Retain**; extend the boundary test to forbid Prisma import from client code (`04`).
- **One auth model confirmed:** staff = `profiles` + `store_memberships`; shopper = `customers.profile_id = auth.uid()`. Not two systems. **The account page must stop faking `signedIn`.**

---

## F. Data, domain types, migrations, Cloudinary, Query

- **Inventory discriminated union already exists in admin:** `products.inventory_mode` enum `unique|stocked|variant` (migration) and admin `InventoryProduct` types (`src/lib/control-room/types.ts`). Storefront must mirror, not reinvent. **Retain contract.**
- **Migration `…phase11…sql`:** comprehensive — products, variants, `product_media`+`cloudinary_assets`, `product_measurements`, `stock_levels` (with `stock_levels_counts_match` invariant) + `stock_movements`, `holds` (stage/status/`expires_at`), `orders`+`order_lines`+`order_timeline_events`+`order_payment_events`, `returns`+`return_lines`, `product_reviews`, `customers`+`customer_addresses`+`customer_saved_products`+`customer_notes`, `delivery_zones`, `pickup_locations`, `store_settings`, RLS + security-definer helpers (`private.*`) + grants. **Whether it has been applied to any environment is unverified from the repo** — `04` requires checking before baselining. **Retain**; baseline Prisma against it.
- **Cloudinary:** `next-cloudinary` installed; `cloudinary_assets` stores metadata only ("blob uploads to Supabase storage are forbidden"). Storefront currently uses **Google Drive URLs** instead. **Replace** imagery with Cloudinary + `next/image`.
- **TanStack Query:** installed (`^5.101.2`) but **no provider, no query keys, unused in storefront**. Prisma **not installed**. **Add** (`04`).
- **No `/api` routes, no route handlers, no Server Actions for catalogue.** Storefront is 100% client + static import. **Replace** with server data layer + route handlers (`04`).

---

## G. Environment, tests, CI, tooling

- **Linter is Biome** (`pnpm lint` = `biome check .`), not ESLint → `@tanstack/eslint-plugin-query` cannot run; its rules become manual review items (`07`).
- Scripts: `pnpm verify` = `lint && typecheck && test && build`; `typecheck` = `tsc --noEmit`; `test` = `vitest run --passWithNoTests`; `supabase:types` gen script; `supabase:bootstrap-owner`.
- `.env.local` present (contents not printed here for safety); Supabase public config via `src/lib/supabase/env.ts`. **New secrets needed** (`04`): `DATABASE_URL`, `DIRECT_URL`, Cloudinary signing, payment provider keys/webhook secret, Supabase `service_role` (server-only).
- Existing test: `src/lib/supabase/phase11-schema.test.ts`. **No storefront tests, no Playwright specs, no CI workflow inspected under `.github` for storefront** (verify in Phase 0 gate). Chrome DevTools MCP + Playwright available this session.

---

## H. Accessibility / responsive / SEO / performance / security gaps (verified)

- **A11y:** hand-rolled lightbox/size-guide lack focus trap/roles; icon-only `href="#"` controls; status often color-only (dots) though some `aria-live` exists; sort menu is a custom `div` popover. **Refactor** to Base UI dialog/menu primitives.
- **Responsive:** desktop-oriented facet sidebar with mobile Sheet exists (good) but product data faked; account/checkout are wide multi-column that need mobile task restructuring, not shrinking.
- **SEO:** only `title/description/icon` metadata; no canonical, OG, product JSON-LD, breadcrumbs, sitemap, robots, noindex on cart/checkout/account. **Add** (`02`).
- **Performance:** Google Drive images (not optimizable), everything client-rendered, `setInterval` timers, no caching/tags. **Replace**.
- **Security:** no server authz on customer data (there is no server data yet); checkout trusts browser for "paid"; prices/fees/stock computed client-side. **Replace** with server-authoritative flows + app-layer authz (`04`).

---

## I. Data the storefront needs but admin cannot currently write

1. **Any published product in the DB** — admin writes in-memory seed, not Supabase. *(Prereq; `06` Phase 1 minimal write path.)*
2. **Home merchandising controls** — hero/campaign, featured collection/category, announcement bar, merchandising order. No table/settings for these. → `store_settings` JSON or small tables (`03` gaps).
3. **Editorial / "Journal"** — no CMS table. → descope V1 or derive from a flagged collection (`03`).
4. **Review `fit` / `size_ordered`** — PDP shows them; `product_reviews` lacks columns. → small additive migration (`03`, `04`).
5. **Footer/support/social/policy copy, size guide, care content, accepted-payment display, newsletter config** — currently hardcoded. → safe `store_settings` fields (`01` Footer, `03`).
6. **Shipment / courier / tracking number surface** — `orders.courier` jsonb + `order_timeline_events` exist; a `Shipment` concept may be warranted (`03` entity list).
7. **Guest session / guest cart ownership** — no `guest_sessions` concept; holds require `customer_id`. → add guest ownership model (`03` Cart/Holds, `04`).

---

## J. Anti-patterns to eradicate (tracked in `07` ban list)

Static `catalogue.ts` product truth · hardcoded reviews/checkout items/orders/addresses · `useState(signedIn=true)` · client `setInterval`/`setTimeout` as availability/async truth · random simulated reservations/sales · `href="#"` and fragment-only nav · client timer as hold source of truth · `window.open()` hardcoded payment URL · browser-controlled "paid" · duplicated product/cart truth · cost fields never verified absent from public reads · 1000–2400-line multi-domain route files · unverified authorization.

---

## K. Disposition summary

- **Retain:** Supabase Auth routes/actions, auth server helpers, middleware/boundary tests, generated Supabase types, the SQL schema as contract, repo fonts, theme provider, brand mark, the admin repository-interface *pattern*, Cloudinary metadata model.
- **Refactor:** `SiteChrome`→route groups, Header/Footer, account layout, metadata/SEO, boundary test (add Prisma-client client-import ban).
- **Replace:** all storefront pages (`/`, `/shop`, `/p`, `/checkout`, `/account` bodies), `cart-sheet`, `catalogue.ts` consumption, hand-rolled modals, all duplicated cards/hold logic.
- **Move:** page-embedded business logic → `src/features/storefront/*` + `src/server/commerce/*`.
- **Remove:** `catalogue.ts` (after migration), fake timers/state, hardcoded payment URL, `?state=` demo switches.
- **Propose (admin):** minimal product create/publish→DB persistence; safe merchandising/footer settings; `fit/size_ordered` review columns.
