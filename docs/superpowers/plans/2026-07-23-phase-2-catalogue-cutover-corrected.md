# Corrected Phase 2 — storefront catalogue cutover

**Branch:** `refactor/phase-2-catalogue-complete`  
**Base:** `feat/admin-overview-broadsheet`  
**Integration PR:** #12

## Goal

Complete the architecture-recovery Phase 2 without changing the approved storefront design. PostgreSQL through Prisma becomes the only runtime catalogue authority; route and client boundaries consume typed adapters over that authority.

## Hard visual invariant

The approved baseline is the `feat/admin-overview-broadsheet` head from which this branch was created. The following must retain their existing composition, DOM hierarchy, class names, typography, spacing, responsive breakpoints and interaction layout unless a data-only prop/type change is unavoidable:

- storefront header and footer;
- homepage section composition;
- product-card presentation;
- catalogue toolbar, filters, grid, empty state and pagination presentation;
- product-detail gallery, information, purchase controls and mobile buy bar;
- storefront theme and typography files.

No redesign, styling cleanup, component replacement or opportunistic refactor belongs in this phase.

## Acceptance criteria

1. Prisma/PostgreSQL is the only runtime product, category, collection, stock, variant and measurement source.
2. The root application layout no longer reads or serializes the full catalogue for admin/auth routes.
3. `/products` resolves URL search parameters into validated server-side filters, sort, count and pagination.
4. Variant colour/size filtering includes product variants, and inventory mode is filterable.
5. Product detail reads use a dedicated slug query and include variant-level measurements.
6. Static catalogue JSON remains migration input only, outside `public/`, and no runtime module imports it.
7. Import validation rejects invalid versions, duplicate identifiers/SKUs, broken relationships, invalid stock shapes and conflicting target rows before an atomic write.
8. Compatibility adapters may preserve the approved UI-facing product contract, but they must be pure, typed, tested and fed only by canonical DTOs.
9. Catalogue cache tags and route boundaries remain explicit; no server-only module reaches a client bundle.
10. CI runs lint, TypeScript, tests, build and storefront parity checks; required checks are not commented out or bypassed.

## Role sequence and ownership

### Planner

- freeze scope and visual invariants in this document;
- map existing and rejected Phase 2 work;
- record explicit exclusions.

### Data engineer

Owns `prisma/**` and `scripts/seed/**`:

- add normalized variant measurement storage;
- validate and atomically import the retained snapshot;
- preserve the existing migration baseline and migration history.

### Domain engineer

Owns `src/server/**`, cross-cutting DTOs and server-boundary tests:

- complete catalogue filtering, facets, pagination and slug/detail reads;
- expose pure compatibility adapters where the UI contract must remain unchanged;
- remove runtime snapshot access and root catalogue reads;
- retain cache tags and deterministic style-smoke fixtures.

### UI integration

May change only route data wiring and data-only component inputs/state synchronization. It must not alter approved markup, classes or visual composition.

### Reviewer

- compare critical visual files against the base branch;
- run all validation gates;
- inspect screenshots at 375×812, 768×1024 and 1280×800;
- keep the PR draft until all required evidence is available.

## Explicit exclusions

- admin product mutations and persistence (Phase 3);
- storefront provider/state consolidation beyond what is strictly required to remove root data access (Phase 4);
- account persistence, payment implementation, design-system migration or CSS cleanup;
- any new visual language, copy direction or layout.

## Rollback

The work is isolated in this dedicated branch. Each data, domain, integration and verification commit must be independently revertible. If a compatibility cutover changes the rendered storefront, restore the affected visual file from the branch base and move the transformation into a pure adapter or route boundary instead.
