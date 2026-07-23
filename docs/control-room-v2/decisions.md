# Laitstyle Control Room V2 — Architecture and Product Decisions

## Decision 001 — Phase 2 Inventory table architecture

**Date:** 2026-07-09  
**Status:** Accepted for Phase 2  
**Decision owner:** Control Room V2 implementation  
**Review trigger:** Real server-side inventory data, 50+ visible rows per page, dynamic column configuration, grouping/aggregation, virtualization, or server pagination

### Context

Phase 2 requires three presentations of the same inventory truth:

1. A product-led visual grid that remains recognisably connected to the Laitstyle storefront
2. A compact operational table for desktop comparison and bulk selection
3. Mobile operational cards that do not compress the desktop table

The storefront treats products as visual pieces first. Product cards lead with photography, name, category, size, condition, price and availability state. The Control Room expands that truth to support unique pieces, stocked products and variant products, while retaining product recognition and the editorial Laitstyle character.

The repository at the Phase 2 decision point had:

- a small typed local inventory seed
- no asynchronous inventory service
- no server-side pagination
- no user-configurable columns
- no table grouping or aggregation requirement
- no row virtualization requirement
- an existing shadcn `Table` primitive
- no TanStack dependency

### Required Phase 2 behaviour

The Inventory workspace needs:

- search across product name, archive number, SKU, category, brand and variants
- saved operational views
- product-mode, stock-status, category, collection and channel filters
- sorting by recently updated, stock, sales, price and name
- grid/table presentation switching on desktop and tablet
- mobile cards instead of the desktop table
- row selection and select-all for the visible result set
- safe non-destructive bulk actions
- responsive column reduction controlled by the design

### Options considered

#### Option A — Add `@tanstack/react-table`

Advantages:

- built-in sorting and row-selection state
- flexible column definitions
- future path for pagination, grouping and column visibility

Costs in Phase 2:

- introduces a new row-model abstraction for only one of three presentations
- risks making the table the source of truth while grid and mobile need the same result set
- adds dependency and adapter code without server pagination, grouping, resizing, virtualization or dynamic columns
- encourages table-specific filters that could drift from the other presentations

#### Option B — Existing shadcn Table plus shared typed selectors

Advantages:

- one Inventory query state feeds grid, table and mobile cards
- product-mode invariants remain in the domain layer
- keeps the visual grid primary and the table secondary
- uses the existing component system
- supports the required fixed sorting, filters and selection without general-purpose table infrastructure

Costs:

- sorting and selection helpers are local
- future server pagination or dynamic columns may justify migration

### Decision

Use the existing shadcn `Table` with a shared typed Inventory query and selector pipeline. Do **not** add `@tanstack/react-table` or TanStack Query in Phase 2.

```text
Inventory query state
        ↓
Typed inventory selectors
        ↓
One ordered result set
   ↙        ↓        ↘
Grid      Table     Mobile cards
```

The table is a desktop operational lens, not the inventory domain model and not the primary product experience.

### Consequences

- Phase 2 adds no package dependency.
- Filtering, sorting and saved-view logic belongs in typed selectors.
- Selection remains presentation state inside the Inventory client boundary.
- Grid, table and mobile cards consume the same result array.
- Revisit `@tanstack/react-table` when server pagination, grouping, dynamic columns or virtualization create proportional value.

## Decision 002 — Phase 7 brand, theme and Inventory media architecture

**Date:** 2026-07-10  
**Status:** Implemented under explicit Phase 7 override; executable acceptance pending  
**Decision owner:** Control Room V2 implementation  
**Review trigger:** Production brand-system export, server-persisted user preferences, production media management, or a redesign that changes the approved woven L/S geometry

### Context

Phase 7 adds the approved Laitstyle Concept Option 3 identity and supports both light and dark operation without maintaining separate component palettes. Inventory also gains a dedicated image-viewing workflow.

The approved direction uses:

- a woven L/S mark
- Ink as the primary high-contrast colour
- Bone as the editorial surface colour
- Sage as the brand accent
- calm, premium and modern presentation

### Decision

Use one semantic token system and one root theme controller.

- The provider owns `light`, `dark` and `system` preference.
- Preference is stored locally for the prototype and applied before hydration.
- Theme controls appear in public and Control Room chrome.
- Components consume semantic tokens rather than separate theme component trees.
- Brand path geometry remains fixed; token-driven rendering changes by theme.
- Theme-critical source is guarded by a raw-colour audit.

Do not introduce a separate dark-mode component tree and do not add `next-themes` solely to wrap the local prototype.

### Initial Inventory density decision

Phase 7 initially set:

- mobile task-focused list cards
- tablet three visual columns
- standard desktop at 1280px five columns
- wide desktop at 1720px six columns

This fixed desktop count is superseded by Decision 003 after visual review showed that the 280px Control Room sidebar leaves the five-column cards too narrow at a 1280px viewport.

### Media interaction decision

Product images and product records are separate actions.

- Clicking an image opens a shared media dialog.
- Clicking the product title or explicit `Open record` action opens product detail.
- The dialog supports thumbnails, previous/next, keyboard navigation, zoom, reset, open-original and copy-link feedback.
- The same viewer is reused in grid, mobile list and product Media tab.
- The viewer is non-destructive and does not imply upload, crop, deletion or backend persistence.

### Consequences

- Public and Control Room chrome share the approved symbol.
- Dark mode changes contrast through tokens rather than SVG mutation.
- Shared overlays consume a semantic overlay token.
- Production theme persistence may later move to an authenticated profile without changing component contracts.
- Production media editing requires a separate action boundary.

## Decision 003 — Phase 8 fashion-grade visual hierarchy and adaptive Inventory density

**Date:** 2026-07-10  
**Status:** Planned; implementation not started  
**Decision owner:** User-approved Phase 8 extension  
**Review trigger:** Phase 8 visual QA, material change to sidebar width, a new Admin shell, or a product-card redesign

### Context

A code and design audit confirmed that Phase 7’s token introduction did not yet produce a coherent fashion-grade system:

- the theme menu crashes because a Base UI group label is outside its required group context
- dark mode promotes Bone to generic primary and selected surfaces, producing bright cards and weak hierarchy
- sidebar content has no internal vertical scroll boundary
- selected navigation can bury nested icon or descriptive content
- command search is primarily a static destination list
- Overview modules have overlapping responsibilities and excessive vertical stacking
- the fixed five-column Inventory rule makes cards too narrow beside the 280px sidebar
- table thumbnails are not a separate media-preview action

The legacy Overview on `main` contains a useful primary queue, open-orders section and supporting right rail, but its implementation is a monolith with raw colours and old one-of-one assumptions.

### Decision

Phase 8 is a system correction rather than another theme repaint.

#### Theme roles

Define paired Light and Dark roles for:

- canvas
- sunken workspace
- standard panel
- raised panel
- interactive surface
- selected navigation
- primary and secondary actions
- input/search surface
- inverse content
- focus
- functional success, warning and destructive pairs

Ink, Bone and Sage remain the brand foundation, but no single colour is used indiscriminately as canvas, card, selected state and primary action.

#### Sidebar and command surface

- Split the sidebar into fixed and internally scrollable regions with `min-h-0` and `overflow-y-auto`.
- Keep active icon, label and description readable in both themes.
- Reduce competing promotional/support cards in the sidebar.
- Redesign command search around actual products, orders, customers, holds, settings sections and recent actions.

#### Overview

Use the stronger information hierarchy from `main` without copying its implementation:

- compact daily strip
- primary owner-judgment queue
- useful recent/open-orders preview
- supporting desktop rail for continue-work, hold clock, fulfilment exceptions and concise activity
- Sales Pulse and Inventory Watch only where each has a unique job

#### Inventory density

Replace fixed viewport column counts with a minimum useful card width measured inside the actual content container.

Expected direction:

- mobile uses task-focused cards
- tablet adapts to available width
- a 1280px viewport with the desktop sidebar should normally show about four useful cards, not five compressed cards
- larger desktops may show five
- six appears only when every card retains the approved minimum width and image presence

The acceptance contract must assert minimum card width and image height rather than only counting columns.

### Consequences

- Decision 003 supersedes Decision 002’s fixed five-at-1280 rule.
- The legacy `main` page remains reference-only and is not restored.
- Theme completion requires computed-style and screenshot review, not only token presence.
- Table media preview becomes a separate action from record navigation.
- Phase 8 must pass short-height sidebar and full Light/Dark route tests.

## Decision 004 — Phase 9 TanStack Query server-state foundation without a production backend

**Date:** 2026-07-10  
**Status:** Superseded by Decision 005 for phase timing; technical constraints still apply in Phase 12
**Decision owner:** User-approved Phase 9 extension  
**Review trigger:** A production API/RPC contract, authentication/tenant context, SSR prefetch, realtime synchronization, offline support, or stock-concurrency implementation

### Context

The original architecture deferred TanStack Query until a real asynchronous backend existed. The user has now explicitly approved a preparatory server-state layer so the application can adopt stable query keys, invalidation rules and async boundaries before production integration.

The risk is creating fake infrastructure: API routes that wrap local arrays, random latency, duplicated query/provider state or optimistic stock writes that imply concurrency safety.

### Decision

The original Decision 004 introduced TanStack Query v5 in Phase 9 through a truthful repository boundary. Decision 005 now preserves the technical constraints below but moves TanStack runtime work to Phase 12.

#### Packages

- `@tanstack/react-query`
- `@tanstack/eslint-plugin-query`
- Devtools only when development-only and excluded from production; otherwise omit

#### Repository boundary

- Define typed domain repositories.
- Use deterministic Promise-based in-memory adapters backed by existing typed records.
- Do not add artificial latency, random failures or fake API routes.
- Feature components depend on query options/hooks, not seed arrays.
- A future HTTP/RPC adapter must replace the in-memory adapter without changing feature contracts.

#### Query ownership

TanStack Query owns migrated server-like resources. Local state continues to own dialogs, tabs, forms, unsaved values, selection, theme preference and other ephemeral UI state.

Do not duplicate query records in the global Control Room provider.

#### Keys and colocation

- One typed key factory per domain.
- List keys include all data-affecting filters, sorts, views and pagination inputs.
- Detail keys use stable business IDs.
- Query functions/options and mutations are colocated by domain.
- Key factories are the only source for cache writes and invalidation.

#### Mutations

Use, in order of preference:

1. exact cache reconciliation from an authoritative mutation result
2. targeted invalidation
3. optimistic update only for reversible low-conflict actions

Every optimistic update requires cancellation, snapshot, rollback and settlement reconciliation.

Sales, payment, fulfilment, stock release, returns, refunds and unique-item ownership remain pessimistic until concurrency safety is proven.

#### Next.js boundary

- Use one stable browser QueryClient.
- Use a fresh per-request server QueryClient if hydration is later introduced.
- Do not use Server Actions as query functions.
- Do not convert entire routes into Client Components solely for query access.

### Consequences

- The earlier blanket TanStack deferral was initially superseded for Phase 9, but Decision 005 now defers TanStack runtime work until Phase 12.
- Phase 9 does not create production persistence.
- Migrated server-like records must be removed from duplicate global client state.
- Loading, error, empty, stale and background-refetch states become explicit product states.
- A production handoff must document endpoint, authentication, concurrency, stale-time and invalidation requirements.

## Decision 005 — Supabase Auth before Prisma-backed server state

**Date:** 2026-07-10
**Status:** Superseded and restated on 2026-07-15
**Decision owner:** Direct user instruction
**Review trigger:** Changing the auth provider or server-state architecture

Supabase owns authentication identities, OAuth and cookie sessions. Prisma owns all application database models, migrations and generated database types. Authorization comes from `profiles.role` and the static typed capability map.

The delivery order is:

1. Phase 9: backend boundary readiness.
2. Phase 10: Supabase Auth, consumer/admin/manager roles and server guards.
3. Phase 11: Prisma schema, migrations, generated client and public catalog projection.
4. Phase 12: TanStack Query over authenticated Prisma-backed resource contracts.

No database setup, migration, type generation or reset is performed with Supabase tooling.
## Decision 006 — Phase 9 Supabase readiness boundary

**Date:** 2026-07-10
**Status:** Implemented for Phase 9; auth activation remains Phase 10
**Decision owner:** Control Room V2 implementation
**Review trigger:** Starting Phase 10 auth routes, starting Phase 11 migrations, or replacing Supabase Auth

### Context

The repository already had generated Supabase helper snippets at `src/lib/client.ts`, `src/lib/server.ts` and `src/lib/middleware.ts`. That placement was ambiguous and the middleware helper redirected signed-out users to an auth route that does not exist yet.

Phase 9 needs readiness without user-facing auth behavior or backend claims.

### Decision

Normalize Supabase setup code into `src/lib/supabase/` and keep root-level compatibility re-exports for now.

- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`
- Proxy/session refresh helper: `src/lib/supabase/proxy.ts`
- Public environment validation: `src/lib/supabase/env.ts`
- Prisma-generated database client destination: `prisma/generated/prisma`

Do not add root `src/proxy.ts`, redirects, auth pages or protected routes in Phase 9. The proxy helper only refreshes Supabase cookies through `getClaims()` when Phase 10 wires it into Next.js.

Add pure role, capability and guard helpers under `src/lib/auth/` so admin, manager and consumer boundaries are testable independently of the database.

### Consequences

- Supabase public URL and publishable key are the only browser/server client inputs.
- No service role key is introduced to the app runtime.
- Store permissions are modeled as application authorization, not Supabase Auth metadata.
- Phase 10 can activate auth behavior without moving files again.
- Phase 11 generates Prisma Client from the validated schema.

## Decision 007 — Phase 9 Biome quality baseline and external asset boundary

**Date:** 2026-07-10
**Status:** Implemented for Phase 9
**Decision owner:** User-requested tooling and security hardening
**Review trigger:** Phase 12 TanStack lint requirements, production upload signing, a different asset provider, or a reintroduction of ESLint/Prettier

### Context

The user requested that Phase 9 migrate the codebase from ESLint/Prettier to Biome, improve folder separation, harden server/client boundaries and prepare Supabase assets to use Cloudinary and Cloudflare without leaking server credentials into the browser.

### Decision

Use Biome as the repository formatting and linting entrypoint:

- `pnpm lint` runs `biome check .`
- `pnpm format` runs `biome format --write .`
- `pnpm check` runs `biome check --write .`
- `pnpm verify` composes lint, typecheck, tests and build

Remove the legacy ESLint and Prettier package/config surface from the active project. If Phase 12 still needs TanStack Query's ESLint-only plugin, it must be introduced as a narrow query-specific compatibility check and documented separately instead of silently restoring the old repo-wide ESLint baseline.

For assets:

- Prisma stores asset ownership, product links, metadata and audit trails.
- Cloudinary and Cloudflare R2/Images own external image delivery.
- Browser-safe provider types and image host allowlists live under `src/lib/assets/*`.
- Server-only asset credentials and provider checks live under `src/server/assets/*`.
- Upload signatures, R2 writes and storage policies remain Phase 11 work.

### Consequences

- Phase 9 avoids service-role or asset-write credentials in Client Components.
- Next image configuration is generated from one shared asset allowlist.
- Control Room raw color drift is checked against semantic theme-token usage in changed UI files.
- A static Vitest boundary test guards accidental client imports of server-only modules.

## Decision 008 — Phase 10 Supabase Auth activation

**Date:** 2026-07-10
**Status:** Implemented for Phase 10; Prisma persistence remains Phase 11
**Decision owner:** Control Room V2 implementation
**Review trigger:** Starting Phase 11 migrations or changing the auth provider

### Context

Phase 10 activates real Supabase Auth behavior before Control Room data moves through Prisma repositories.
The app needs staff and consumer sessions, Google OAuth with PKCE, server-side cookie handling and
store-scoped role checks without exposing service-role credentials or trusting user metadata.

### Decision

Use the Phase 9 Supabase SSR clients and activate them through root `src/proxy.ts`.

- Auth callback route: `src/app/auth/callback/route.ts`
- Sign-in UI and actions: `src/app/auth/sign-in/page.tsx` and `src/app/auth/actions.ts`
- Sign-out route: `src/app/auth/sign-out/route.ts`
- Request-bound auth helpers: `src/lib/auth/server/*`
- Control Room route guard: `src/app/admin/layout.tsx`
- Consumer account guard: `src/app/account/layout.tsx`

Server identity checks use `getClaims()` with `getUser()` fallback, never `getSession()` for
authorization. Access resolves from `profiles.role` and customer linkage
contracts, while Phase 11 remains responsible for Prisma migrations and generated client types.

### Consequences

- Signed-out Control Room requests redirect to `/auth/sign-in?next=/admin`.
- Signed-in users without an active membership or capability see a permission-restricted state.
- Consumers can reach `/account` only after Supabase Auth establishes a session.
- Google OAuth is wired through Supabase PKCE callback, but provider-console credentials and full
  database membership rows must exist before a complete end-to-end staff login can be accepted.

## Decision 009 — Route-handler Google OAuth entry point

**Date:** 2026-07-11
**Status:** Implemented for Phase 10 verification
**Decision owner:** Control Room V2 implementation
**Review trigger:** Adding another social provider, replacing Supabase Auth, or moving OAuth initiation behind a dedicated auth service

### Context

The first Phase 10 implementation initiated Google OAuth from a React Server Action on the sign-in page. That worked architecturally, but it made local smoke evidence depend on Next's internal Server Action transport rather than a stable browser route.

### Decision

Add `src/app/auth/google/route.ts` as the explicit OAuth initiation boundary and point the sign-in form at it with `method="post"`.

- The route accepts a sanitized `next` target.
- The route calls Supabase `signInWithOAuth({ provider: "google" })`.
- The redirect target remains `/auth/callback?next=...`.
- The route returns a 303 redirect to the Supabase OAuth authorize URL.

Email/password sign-in and sign-up remain Server Actions because they are form mutations that complete inside the app.

### Consequences

- Google OAuth initiation is directly testable with HTTP and browser tools.
- The sign-in UI no longer depends on a Server Action for a cross-site OAuth redirect.
- The PKCE callback and Supabase SSR cookies remain the source of session truth.
- Full Google account completion still requires an interactive browser session and configured provider credentials.

## Decision 010 — Phase 11 CLI-only owner bootstrap and Cloudinary-only image metadata

**Date:** 2026-07-11
**Status:** Superseded by the Prisma-only single-store foundation
**Decision owner:** Direct user instruction
**Review trigger:** Adding a production upload UI, changing asset provider or changing the admin lifecycle

### Context

The user clarified that the one admin account must be created from narrow CLI tooling and that Prisma
is the only database management layer. Supabase remains the authentication provider, and Cloudinary
remains the image provider.

### Decision

Admin bootstrap is implemented as `pnpm auth:bootstrap-admin -- --email <email> --password <password>`, backed by
`scripts/bootstrap-owner.mjs`. The script accepts only email and password, requires service-role
credentials, creates or updates the Supabase Auth user and upserts the matching Prisma profile with the
`admin` role. The database permits only one admin.

The Prisma schema and server authorization enforce this model:

- public staff registration is unavailable; managers are provisioned through an owner-controlled backend process.
- Consumers cannot promote their own role.
- Admin creation remains service-role/CLI only.

For assets:

- The database stores `cloudinary_assets`, `product_media` and `store_brand_assets` metadata only.
- `cloudinary_assets.provider` is constrained to `cloudinary`, and `resource_type` is constrained to
  `image`.
- Image binary storage remains outside the application database.

### Consequences

- Public sign-up and Google OAuth can create consumer identities, but cannot create admin access.
- Service-role keys stay outside the app runtime and client bundle.
- Future production uploads need a server-issued Cloudinary signature/write route before a UI can
  persist asset metadata.
- Cloudflare can still be evaluated later as CDN/proxy delivery infrastructure, but it is not a
  Phase 11 image upload path.
- Prisma validation, migration review and Prisma Client generation are the database gates.

## Decision 011 — Phase 12 follows the Prisma role and database foundation

**Date:** 2026-07-11
**Status:** Restated on 2026-07-15
**Decision owner:** Direct user instruction
**Review trigger:** Migrating the first domain read, SSR prefetch/hydration or replacing a Prisma repository

TanStack Query may own server-like resource state only after the relevant Prisma repository and profile-role authorization boundary are ready. The deterministic in-memory adapter remains truthful prototype scaffolding until a domain is migrated.

Consequences:

- Server authorization remains authoritative.
- Query keys and adapters cannot encode a store or tenant selector.
- Prisma Client is regenerated after schema changes.
- Phase 12 cannot claim production persistence from prototype data.
## Decision 012 — Merge PR #4 as an integration milestone and continue from updated main

**Date:** 2026-07-13
**Status:** Approved by direct user instruction and integration-verified
**Decision owner:** Direct user instruction
**Review trigger:** The continuation PR changes phase scope, Phase 11 unblocks, or another long-lived branch diverges materially from `main`

### Context

PR #4 accumulated the Control Room specification, implementation history and phase conversation while
its branch diverged by 31 commits from `main`. Those upstream commits delivered the connected storefront
reservation, cart, checkout, account and order-confirmation flows. The user asked to resolve and merge
PR #4, then continue Control Room work from current `main` without losing the original PR context.

GitHub cannot transfer an existing pull request's conversation timeline to another pull request. A new
continuation PR therefore needs an explicit handoff that links PR #4, summarizes its chronological
phase decisions and preserves every unresolved gate.

### Decision

- Merge current `main` into `feat/control-room-v2` with a normal merge commit.
- Resolve shared storefront conflicts in favour of `main`'s newer connected implementation.
- Preserve the Control Room root theme provider, semantic light/dark role system and brand metadata.
- Merge PR #4 as the integration milestone after local verification.
- Create `surdma/control-room-v2-continuation` from the resulting `main` and open a draft PR with a
  repository handoff document plus a comprehensive PR #4 conversation summary.
- Keep Phase 4–8 acceptance, Phase 10 browser OAuth/React Doctor, Phase 11 Prisma schema/generated-client,
  and Phase 12 data-migration blockers explicit. The merge is not phase acceptance.

### Verification evidence

- Biome: passed with 44 warnings still visible.
- TypeScript: passed with `tsc --noEmit --pretty false --incremental false`.
- Vitest: 35 files and 139 tests passed.
- Next.js 16.2.10 production build: passed with the default Turbopack build.
- React Doctor exact `--diff`: timed out after five minutes with no diagnostics.
- React Doctor changed-scope fallback: completed with 11 warnings in upstream storefront files.

### Consequences

- `main` becomes the shared integration baseline for both storefront and Control Room work.
- The continuation branch can be refreshed from `main` regularly without replaying the original
  31-commit divergence.
- PR #4 remains the immutable source conversation; the continuation PR carries a durable summary and
  source links rather than pretending GitHub moved the original comments.
- Outstanding phase gates remain blocking evidence for feature acceptance even though the integration
  milestone is merged.
