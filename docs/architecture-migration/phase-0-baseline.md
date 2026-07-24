# Architecture Migration Phase 0 Baseline

**Status:** In progress  
**Baseline branch:** `main`  
**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Baseline date:** July 24, 2026  
**Scope:** Documentation, inventories, preservation contract, and validation planning only

## 1. Phase 0 objective

Freeze and record the current application behaviour before any route, provider, domain, data-access, or state-ownership migration begins.

Phase 0 must not:

- move production source files;
- change runtime data flow;
- change route URLs;
- change providers;
- introduce Zustand;
- remove repositories or dummy data;
- alter the header, footer, homepage, product cards, catalogue, PDP, typography, spacing, themes, or responsive behaviour.

## 2. Authority and recorded override

The approved architecture decision is the controlling user instruction for this migration.

It intentionally overrides the current repository doctrine where the doctrine still declares these as the permanent target:

- `src/features/**` as the canonical feature architecture;
- top-level `src/server/**` as the canonical domain architecture;
- `src/server/commerce/**` and `src/lib/commerce/**` as the permanent shared-commerce namespace;
- app-wide TanStack Query as a permanent provider boundary;
- deterministic in-memory repositories as an acceptable continuing runtime architecture.

The existing doctrine remains authoritative for current-code safety until the relevant migration phase updates it. This override is recorded now so implementation does not silently mix the old and new targets.

## 3. Locked preservation contract

Every later phase must preserve the current:

- header and footer;
- homepage section order and composition;
- product-card structure and dimensions;
- catalogue grid, filters, sorting, pagination presentation, and mobile drawers;
- PDP gallery, options, CTA placement, typography, spacing, and responsive composition;
- cart and checkout presentation;
- account shell and navigation;
- admin shell, navigation, tables, forms, dialogs, sheets, and responsive sidebar;
- light and dark theme behaviour;
- current public URLs and navigation semantics.

Any unexpected screenshot difference is a regression until reviewed and explicitly accepted.

## 4. Current route baseline

The current application is organized around one root App Router tree with separate storefront and admin visual surfaces.

### Storefront and customer routes

| Route | Current responsibility | Preservation requirement |
| --- | --- | --- |
| `/` | Storefront homepage | Preserve complete composition |
| `/products` | Public catalogue | Preserve catalogue layout and controls |
| `/products/[slug]` | Product detail | Preserve PDP layout and interactions |
| `/collections/[slug]` | Collection catalogue | Preserve cards and filters |
| `/cart` | Cart page | Preserve cart presentation and actions |
| `/checkout` | Checkout flow | Preserve presentation while later replacing authority boundaries |
| `/order-confirmation` | Order confirmation | Preserve presentation |
| `/account` | Account landing | Preserve account shell |
| `/account/orders` | Customer orders | Preserve list presentation |
| `/account/orders/detail` | Customer order detail | Preserve detail presentation |
| `/account/profile` | Customer profile | Preserve form presentation |
| `/account/preferences` | Preferences | Preserve presentation |
| `/account/notifications` | Notifications | Preserve presentation |
| `/account/privacy` | Privacy | Preserve presentation |
| `/account/support` | Support | Preserve presentation |

### Authentication routes

| Route | Kind | Current decision |
| --- | --- | --- |
| `/auth/sign-in` | Page | Keep URL |
| `/auth/sign-up` | Page | Keep URL |
| `/auth/forgot-password` | Page | Keep URL |
| `/auth/reset-password` | Page | Keep URL |
| `/auth/error` | Page | Keep URL |
| `/auth/google` | Browser redirect Route Handler | May remain outside `/api` |
| `/auth/callback` | Browser callback Route Handler | May remain outside `/api` |
| `/auth/sign-out` | Browser form/redirect Route Handler | May remain outside `/api` |

### Admin and compatibility routes

| Route | Current responsibility | Preservation requirement |
| --- | --- | --- |
| `/admin` | Admin overview | Preserve shell and overview |
| `/admin/inventory` | Inventory workspace | Preserve grid/table and editor interactions |
| `/admin/orders` | Order management | Preserve table and actions |
| `/admin/holds` | Hold management | Preserve presentation |
| `/admin/returns` | Return management | Preserve presentation |
| `/admin/customers` | Customer management | Preserve presentation |
| `/admin/settings` | Admin settings | Preserve presentation |
| `/control-room/[[...path]]` | Legacy compatibility redirect | Preserve redirect behaviour until explicitly retired |

### Current machine-facing routes

Verified existing categories include:

- `/api/health`;
- admin inventory endpoints;
- payment initialize/callback/webhook endpoints.

A mechanically generated route manifest remains a Phase 0 follow-up task before Phase 1 begins.

## 5. Current data and state baseline

| Area | Current owner/path | Baseline concern | Target owner |
| --- | --- | --- | --- |
| Public products/catalogue | Server Components and `src/server/commerce/catalogue/**` | Legacy catalogue projections and broad shell payload | `modules/products/server/**` |
| Admin inventory | Prisma-backed server reads plus TanStack Query | Duplicate server/client initial reads | TanStack Query through API for interactive client reads |
| Admin orders, holds, returns, customers, settings | AdminStore + in-memory repositories + TanStack Query wrappers | Multiple state owners and fake async boundaries | Prisma + API + TanStack Query |
| Catalogue filters and pagination | URL + context + local state | Competing sources of truth | URL |
| Storefront cart/saved/overlays | Large storefront providers | Broad subscriptions and mixed ownership | Focused Zustand stores/local state |
| Authentication | `app/auth/actions.ts`, `lib/auth/server/**`, `server/auth/**` | Three ownership locations | `modules/auth/**` with thin route/action adapters |
| Checkout completion | Client flow/session storage | Browser-authoritative business state | Server-authoritative checkout/payment modules |

## 6. Provider and cache baseline

Current global composition includes:

- theme provider;
- TanStack Query provider;
- toaster.

Current target decision:

- theme and toaster may remain global;
- TanStack Query must be scoped to surfaces that need browser server-state synchronization;
- server-owned records must not be copied into Context, reducers, or Zustand;
- query data must not be synchronized into a second client store.

## 7. Existing validation baseline

Repository scripts currently provide:

```bash
pnpm check:architecture
pnpm prisma:validate
pnpm audit:buttons
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
pnpm verify
pnpm verify:local
```

Playwright currently defines:

- desktop Chromium at 1280 × 800;
- mobile Chromium at 375 × 812;
- tablet Chromium at 768 × 1024;
- trace, screenshot, and video retention on failure.

## 8. Validation status for this PR

| Check | Status | Reason |
| --- | --- | --- |
| Repository instructions inspected | Complete | `AGENTS.md`, `CLAUDE.md`, and relevant doctrine reviewed |
| Approved architecture source captured | Complete | Added as the controlling decision record |
| Baseline commit recorded | Complete | `6f5087f4aa08a5d9bce5989bad7b230344cdb493` |
| Route baseline drafted | Complete with follow-up | Current route surfaces recorded; mechanical manifest still pending |
| Data/state ownership baseline drafted | Complete | Major current owners and target owners recorded |
| UI screenshot baseline | Blocked in connector-only session | Requires running app and browser tooling |
| Console/network baseline | Blocked in connector-only session | Requires running app and browser tooling |
| Playwright characterization execution | Not run | No local checkout/runtime was available |
| Lint/typecheck/tests/build | Not run | Documentation-only connector change; must be run by CI or local checkout |
| React Doctor | Not run | No local checkout/runtime was available |

No runtime or UI behaviour is claimed as validated by this PR.

## 9. Phase 0 exit gate

Phase 0 may be marked complete only when:

- the route manifest is mechanically generated and reviewed;
- desktop, tablet, and mobile screenshots are captured for the preservation matrix;
- light and dark themes are recorded;
- primary storefront and admin interactions are characterized;
- current console and network errors are recorded;
- production imports of dummy/in-memory sources are inventoried;
- the provider, store, query-cache, and persistence ownership map is complete;
- relevant Playwright characterization tests pass or failures are documented as pre-existing.

Until then, Phase 0 remains **in progress**.
