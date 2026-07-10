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

## Decision 005 — Supabase Auth and database before TanStack Query

**Date:** 2026-07-10
**Status:** Accepted for the next implementation sequence
**Decision owner:** User-requested Supabase-first replan
**Review trigger:** Production backend provider changes, a different auth provider, multi-store enterprise scope, or a user override to resume TanStack earlier

### Context

The user requested a full Supabase setup before TanStack Query:

1. Supabase Auth and Google Auth for staff and storefront consumers.
2. Organization-level roles and permissions for owner/CEO, manager and operator/sales staff.
3. A meticulous codebase review and structural fixes before backend wiring.
4. A complete Supabase table/storage/RLS plan for everything Control Room and storefront need.
5. TanStack Query moved after those foundations.

The branch already contains preliminary repository interfaces, in-memory adapters and initial query-key factories from the previous Phase 9 start. That work is useful, but it should not drive the next phase before authenticated Supabase resource ownership is clear.

### Decision

Reorder the remaining phases:

- **Phase 9:** Codebase structure review and Supabase readiness.
- **Phase 10:** Supabase Auth, Google OAuth, organization/store membership, staff roles and consumer auth.
- **Phase 11:** Supabase database schema, storage, RLS policies, deterministic seed data and generated database types.
- **Phase 12:** TanStack Query server-state foundation over the authenticated Supabase-backed resource contracts.

Preserve the already-started TanStack repository/key work as paused preliminary Phase 12 foundation. Do not install TanStack packages, mount a QueryClient or migrate reads before Phases 10 and 11 are complete.

### Auth and permission direction

- Supabase Auth owns identity.
- Application tables own authorization.
- Staff permissions are store-scoped through memberships and role capabilities.
- Consumers can own storefront account records but cannot access Control Room data.
- Authorization decisions must not rely on user-editable metadata.
- Server protection should use `getClaims()` or `getUser()` as appropriate; `getSession()` is not trusted for authorization.

### Database direction

The schema must map to existing Laitstyle domains:

- profiles, organizations, stores, memberships, invitations, role capabilities and audit events
- products, variants, media, categories, collections, channels and measurements
- stock levels, stock movements and intake records
- holds, orders, order lines, payment events, fulfilment events, returns and return lines
- customers, addresses, notes, saved products and reviews
- store settings, delivery zones, pickup locations and storage buckets

RLS is required on exposed tables, with explicit public storefront, consumer-owned and staff membership policies.

### Consequences

- Docs and AGENTS instructions must no longer describe TanStack Query as the active Phase 9.
- Supabase client/auth/permission folders are planned before query folders are expanded.
- The in-memory repository adapter remains truthful prototype scaffolding until Supabase adapters exist.
- Phase 12 query keys and mutations must include authenticated store/consumer context from Phases 10 and 11.

## Decision 006 — Phase 9 Supabase readiness boundary

**Date:** 2026-07-10
**Status:** Implemented for Phase 9; auth activation remains Phase 10
**Decision owner:** Control Room V2 implementation
**Review trigger:** Starting Phase 10 auth routes, starting Phase 11 migrations, or replacing Supabase as the backend provider

### Context

The repository already had generated Supabase helper snippets at `src/lib/client.ts`, `src/lib/server.ts` and `src/lib/middleware.ts`. That placement was ambiguous and the middleware helper redirected signed-out users to an auth route that does not exist yet.

Phase 9 needs readiness without user-facing auth behavior or backend claims.

### Decision

Normalize Supabase setup code into `src/lib/supabase/` and keep root-level compatibility re-exports for now.

- Browser client: `src/lib/supabase/client.ts`
- Server client: `src/lib/supabase/server.ts`
- Proxy/session refresh helper: `src/lib/supabase/proxy.ts`
- Public environment validation: `src/lib/supabase/env.ts`
- Placeholder generated type destination: `src/lib/supabase/types.ts`

Do not add root `src/proxy.ts`, redirects, auth pages or protected routes in Phase 9. The proxy helper only refreshes Supabase cookies through `getClaims()` when Phase 10 wires it into Next.js.

Add pure role, capability and guard helpers under `src/lib/auth/` so staff owner, manager, operator and consumer boundaries are testable before database tables and RLS exist.

### Consequences

- Supabase public URL and publishable key are the only browser/server client inputs.
- No service role key is introduced to the app runtime.
- Store permissions are modeled as application authorization, not Supabase Auth metadata.
- Phase 10 can activate auth behavior without moving files again.
- Phase 11 can replace placeholder database types with generated Supabase types.

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

- Supabase stores ownership, product links, RLS-protected metadata and audit trails.
- Cloudinary and Cloudflare R2/Images own external image delivery.
- Browser-safe provider types and image host allowlists live under `src/lib/assets/*`.
- Server-only asset credentials and provider checks live under `src/server/assets/*`.
- Upload signatures, R2 writes and storage policies remain Phase 11 work.

### Consequences

- Phase 9 avoids service-role or asset-write credentials in Client Components.
- Next image configuration is generated from one shared asset allowlist.
- Control Room raw color drift is checked against semantic theme-token usage in changed UI files.
- A static Vitest boundary test guards accidental client imports of server-only modules.
