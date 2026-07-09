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

The storefront currently treats products as visual pieces first. Product cards lead with photography, name, category, size, condition, price and availability state. The Control Room expands that truth to support unique pieces, stocked products and variant products, while retaining product recognition and the editorial Laitstyle character.

The repository currently has:

- A small typed local inventory seed
- No asynchronous inventory service
- No server-side pagination
- No user-configurable columns
- No table grouping or aggregation requirement
- No row virtualization requirement
- An existing shadcn `Table` primitive
- No TanStack dependency

### Required Phase 2 behaviour

The Inventory workspace needs:

- Search across product name, archive number, SKU, category, brand and variants
- Saved views such as All, Live, Drafts, Intake, Low stock, Out of stock, Held, Sold, Unpublished and Needs attention
- Product-mode, stock-status, category, collection and channel filters
- Sorting by recently updated, stock, sales, price and name
- Grid/table presentation switching on desktop and tablet
- Mobile cards instead of the desktop table
- Row selection
- Select-all for the currently visible filtered set
- Safe non-destructive bulk actions such as export and clear selection
- Responsive column reduction controlled by the design, not by user-configurable column visibility

### Options considered

#### Option A — Add `@tanstack/react-table`

Advantages:

- Built-in sorting and row-selection state
- Flexible column definitions
- Useful future path for pagination, grouping and column visibility

Costs in the current phase:

- Introduces a new row-model abstraction for only one of three presentations
- Risks making the table the source of truth while the grid and mobile cards need the same independent result set
- Adds dependency and adapter code without server pagination, grouping, resizing, virtualization or dynamic columns
- Encourages table-specific filter state that could drift from the visual grid and mobile cards
- Increases implementation and review surface for a local typed prototype

#### Option B — Existing shadcn Table plus shared typed selectors

Advantages:

- One inventory query state feeds grid, table and mobile cards
- Product-mode invariants remain in the domain layer rather than column definitions
- Keeps the visual grid primary and the table appropriately secondary
- Uses the existing project component system
- Supports the required fixed sorting, filters and selection without general-purpose table infrastructure
- Avoids a dependency that cannot yet demonstrate proportional value

Costs:

- Sorting and selection helpers must be implemented locally
- Future server pagination or dynamic columns may justify migration

### Decision

Use the existing shadcn `Table` with a shared typed Inventory query and selector pipeline. Do **not** add `@tanstack/react-table` or TanStack Query in Phase 2.

The implementation will use:

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

### Column strategy

Phase 2 uses a fixed operational column set:

- Selection
- Product
- Mode
- Availability
- Reserved
- Sold
- Price
- Visibility/status
- Updated
- Row action

Tablet hides lower-priority columns through responsive composition. Mobile does not render the table.

User-configurable column visibility is intentionally deferred because the operator has one store context and a stable set of high-value fields. Adding a column-management interface now would be generic admin complexity rather than a demonstrated Laitstyle need.

### Bulk-action strategy

Phase 2 implements only actions that are truthful without persistence:

- Export selected records
- Clear selection
- Open a selected product when exactly one record is selected

Publish, unpublish, archive and collection assignment remain visible as future domain capabilities in the specification but are not exposed as working controls until a connected action boundary is implemented. No dead buttons or fake persistence are permitted.

### Add-product action

The specification calls for a persistent Add product action, but the complete product wizard belongs to Phase 3. Phase 2 will not expose a dead Add product button. The action enters the Inventory header only when the Phase 3 dialog/drawer is fully implemented.

### Consequences

- Phase 2 adds no package dependency.
- Filtering, sorting and saved-view logic belongs in `src/lib/control-room/inventory-selectors.ts`.
- Selection remains presentation state inside the Inventory client boundary.
- Grid, table and mobile cards consume the same result array.
- The decision must be revisited when real inventory APIs introduce server pagination or when the visible dataset requires virtualization.
