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
**Status:** Planned; implementation not started  
**Decision owner:** User-approved Phase 9 extension  
**Review trigger:** A production API/RPC contract, authentication/tenant context, SSR prefetch, realtime synchronization, offline support, or stock-concurrency implementation

### Context

The original architecture deferred TanStack Query until a real asynchronous backend existed. The user has now explicitly approved a preparatory server-state layer so the application can adopt stable query keys, invalidation rules and async boundaries before production integration.

The risk is creating fake infrastructure: API routes that wrap local arrays, random latency, duplicated query/provider state or optimistic stock writes that imply concurrency safety.

### Decision

Introduce TanStack Query v5 in Phase 9 through a truthful repository boundary.

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

- The earlier blanket TanStack deferral is superseded only for Phase 9.
- Phase 9 does not create production persistence.
- Migrated server-like records must be removed from duplicate global client state.
- Loading, error, empty, stale and background-refetch states become explicit product states.
- A production handoff must document endpoint, authentication, concurrency, stale-time and invalidation requirements.
