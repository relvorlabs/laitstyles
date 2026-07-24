# Architecture Migration Phase 0 Baseline

**Status:** Complete  
**Phase 0 evidence score:** 10/10 — every baseline task is closed with evidence or an explicit security/environment limitation  
**Baseline branch:** `main`  
**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Baseline date:** July 24, 2026  
**Scope:** Documentation, inventories, preservation contract, and runtime characterization only

## 1. Phase 0 objective

Freeze and record the current application behaviour before any route, provider, domain, data-access, or state-ownership migration begins.

Phase 0 did not:

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

The existing doctrine remains authoritative for current-code safety until Phase 1 updates it. This override is recorded so implementation does not silently mix the old and new targets.

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

## 4. Current source route baseline

The source tree is organized around one root App Router tree with separate storefront and admin visual surfaces.

### Storefront and customer routes

| Route | Current responsibility | Preservation requirement |
| --- | --- | --- |
| `/` | Storefront homepage | Preserve complete composition |
| `/products` | Public catalogue | Preserve catalogue layout and controls |
| `/products/[slug]` | Product detail | Preserve PDP and current quick-view/navigation semantics |
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
| `/auth/sign-in` | Page/entry flow | Keep URL compatibility |
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

### Machine-facing routes

Verified source categories include:

- `/api/health`;
- admin inventory endpoints;
- payment initialize/callback/webhook endpoints.

## 5. Machine-generated runtime route baseline

Playwright generated route and redirect manifests against `https://laitstyles.vercel.app/` at desktop, tablet, and mobile viewports.

Observed consistently working or redirecting routes included:

- `/`, `/products`, `/products/archive-varsity-jacket`;
- `/cart`, `/checkout`, `/order-confirmation`, `/account`;
- `/auth/sign-in`, `/auth/error`;
- all tested `/admin/**` routes redirecting unauthenticated users to sign-in.

The public deployment returned `404` for:

- `/account/orders`;
- `/account/orders/detail`;
- `/account/profile`;
- `/account/preferences`;
- `/account/notifications`;
- `/account/privacy`;
- `/account/support`;
- `/auth/sign-up`;
- `/auth/forgot-password`;
- `/auth/reset-password`;
- `/control-room`;
- `/api/health`.

This is a recorded source/deployment discrepancy, not silently classified as a source defect. The public deployment cannot be cryptographically tied to baseline commit `6f5087f4`; a fresh deployment verification is required before route relocation begins.

No concrete collection-detail link was present in the homepage link inventory, so a collection slug was not invented.

## 6. Current data and state baseline

The detailed path-level inventory is in [`phase-0-source-inventory.md`](phase-0-source-inventory.md).

| Area | Current owner/path | Baseline concern | Target owner |
| --- | --- | --- | --- |
| Public products/catalogue | Server Components and `src/server/commerce/catalogue/**` | Legacy projections and broad shell payload | `modules/products/server/**` |
| Admin inventory | Fetch repository plus AdminStore mutations and TanStack Query | Mixed persistence and cache ownership | API/domain operation -> Prisma -> TanStack Query |
| Admin orders, holds, returns, customers, settings | AdminStore + in-memory repositories + TanStack Query wrappers | Multiple state owners and fake remote boundaries | Prisma + API + TanStack Query |
| Catalogue filters and pagination | URL + context + local state | Competing sources of truth | URL |
| Storefront cart/saved/holds/overlays | Broad storefront contexts | Mixed browser and interaction ownership | Focused Zustand stores/local state |
| Authentication | `app/auth/**`, `lib/auth/server/**`, `server/auth/**` | Three ownership locations | `modules/auth/**` with thin adapters |
| Checkout completion | Client flow/session storage | Browser-authoritative business state | Server-authoritative checkout/payment modules |

## 7. Provider and cache baseline

Current global composition includes:

- theme provider;
- one app-wide TanStack Query provider;
- toaster.

Current admin composition includes:

- AdminAccessProvider;
- AdminProvider and synchronous AdminStore;
- AdminRepositoryProvider;
- ProductEditorControllerProvider;
- RecordSaleControllerProvider.

Current storefront composition includes broad catalogue/interaction state and a browser-persisted cart/saved/hold context.

Locked target decision:

- theme and toaster may remain global;
- TanStack Query must be scoped to surfaces that need browser server-state synchronization;
- server-owned records must not be copied into Context, reducers, or Zustand;
- query data must not be synchronized into a second client store.

## 8. Playwright evidence

Detailed execution evidence is in [`phase-0-playwright-evidence.md`](phase-0-playwright-evidence.md).

Summary:

- external public runner used because private-repository jobs were billing-blocked before checkout;
- target: `https://laitstyles.vercel.app/`;
- Playwright `1.61.1`, Chromium;
- 15 passed, 0 failed, 0 skipped, 0 errors;
- desktop `1280 x 800`;
- tablet `768 x 1024`;
- mobile `375 x 812`;
- light and dark screenshots;
- full-page and viewport screenshots;
- traces, HTML, JSON, and JUnit reports;
- route/redirect manifests;
- console/page/network inventories;
- product-interaction evidence;
- unauthenticated admin-boundary evidence.

Artifact:

```text
Run: 30099471635
Artifact ID: 8599046423
Artifact: laitstyles-phase0-playwright-30099471635
Digest: sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3
Expires: 2026-08-23
```

## 9. Recorded runtime behaviour

### Homepage

Across all three viewports and both themes:

- homepage loaded without a 5xx;
- expected Laitstyles content rendered;
- captured console errors: `0`;
- captured uncaught page errors: `0`;
- captured failed requests: `0`;
- full-page and viewport screenshots were produced.

### Product interaction

At all three viewports, the first product link opened an in-place product view while the URL remained `/`.

```text
interactionMode: in-place-product-view
product: /products/archive-varsity-jacket
```

### Admin access

At all three viewports, unauthenticated `/admin` navigation resolved to:

```text
/auth/sign-in?next=/admin
```

Authenticated admin mutations were not executed because credentials were not placed in a public runner. This is a recorded security limitation, not a false authenticated-flow pass.

## 10. Validation status

| Check | Status | Evidence or limitation |
| --- | --- | --- |
| Repository instructions inspected | Complete | `AGENTS.md`, `CLAUDE.md`, and relevant doctrine reviewed |
| Approved architecture source captured | Complete | Controlling decision record committed |
| Baseline commit recorded | Complete | `6f5087f4aa08a5d9bce5989bad7b230344cdb493` |
| Source route baseline | Complete | App Router surfaces recorded |
| Runtime route/redirect manifest | Complete | Generated for desktop, tablet, and mobile |
| Production seed/in-memory inventory | Complete | Exact import and ownership chains recorded |
| Provider/store/query-cache map | Complete | Exact current owners recorded |
| Desktop/tablet/mobile screenshots | Complete | Artifact contains viewport and full-page evidence |
| Light/dark screenshots | Complete | Six homepage captures plus Playwright traces |
| Console/network baseline | Complete | Zero captured homepage runtime errors/failed requests |
| Product interaction characterization | Complete | In-place product view recorded at every viewport |
| Admin access characterization | Complete with security boundary | Unauthenticated redirect captured; no public credentials used |
| Playwright | Complete | 15/15 passing; artifact and digest recorded |
| Lint/typecheck/unit tests/build | Not run; no production diff | External runner cannot securely checkout the private repo; PR changes documentation only |
| React Doctor | Not run; no React production diff | Required again when a React implementation phase begins |

## 11. Phase 0 exit gate

Phase 0 is complete because:

- source and machine-generated runtime route manifests are recorded;
- desktop, tablet, and mobile screenshots are captured;
- light and dark themes are captured;
- storefront product interaction is characterized;
- unauthenticated admin access behaviour is characterized without leaking credentials;
- console, page-error, and failed-request baselines are recorded;
- production dummy/in-memory ownership and import chains are inventoried;
- provider, store, query-cache, context, and persistence ownership is mapped;
- Playwright executed successfully and produced a downloadable artifact;
- deployment/source discrepancies and validation limitations are explicit.

**Phase 0 status: Complete — 10/10 evidence checklist.**

This score means all Phase 0 evidence tasks are closed. It does not mean the current application has no defects, and it does not waive source-level validation for implementation phases.
