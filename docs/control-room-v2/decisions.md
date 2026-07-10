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

## Decision 002 — Phase 7 brand, theme and Inventory media architecture

**Date:** 2026-07-10  
**Status:** Implemented under explicit Phase 7 override; executable acceptance pending  
**Decision owner:** Control Room V2 implementation  
**Review trigger:** Production brand-system export, server-persisted user preferences, production media management, or a redesign that changes the approved woven L/S geometry

### Context

Phase 7 adds the approved Laitstyle Concept Option 3 identity and must support both light and dark operation without maintaining separate component palettes. The Inventory visual grid also needs to become denser and more professional while gaining a useful image-viewing workflow.

The approved visual direction uses:

- a woven L/S mark
- Ink as the primary high-contrast colour
- Bone as the editorial surface colour
- Sage as the brand accent
- calm, premium and modern presentation

The repository already had light and dark CSS variables, but no mounted theme controller, no persistent mode choice, and several component-level colour literals. Inventory images also opened the product record rather than a dedicated media experience.

### Decision

Use a single semantic token system and one root theme controller.

- The root provider owns `light`, `dark` and `system` preference.
- Preference is stored locally for this prototype and applied before hydration.
- The shadcn-composed theme menu appears in public and Control Room chrome.
- Components consume semantic tokens such as `background`, `foreground`, `card`, `accent`, `success`, `warning`, `sidebar` and brand tokens.
- Brand path geometry remains fixed; only token-driven rendering changes between modes.
- Phase 7 theme-critical source files are guarded by a raw-colour audit.

Do not add a separate dark-mode component tree and do not introduce `next-themes` solely to wrap the current local prototype.

### Inventory density decision

The Inventory grid remains CSS-grid based and responsive:

- mobile uses task-focused list cards
- tablet uses three visual columns
- standard desktop at 1280px uses five columns
- wide desktop at 1720px and above uses six columns

Cards are recomposed for the denser width rather than simply shrinking the previous four-column design.

### Media interaction decision

Product images and product records are separate actions.

- Clicking an image opens a shared media dialog.
- Clicking the product title or explicit `Open record` action opens product detail.
- The media dialog supports thumbnails, previous/next navigation, keyboard navigation, zoom, reset, open-original and copy-link feedback.
- The same viewer is reused in the grid, mobile list and product Media tab.
- The viewer is non-destructive and does not claim upload, crop, delete or backend persistence.

### Consequences

- Public and Control Room chrome share the approved Laitstyle symbol.
- Dark mode changes Ink/Bone contrast through tokens rather than SVG mutation.
- Shared dialog and sheet backdrops consume an overlay token.
- Inventory density and media behaviour are covered by browser assertions.
- Production theme persistence may later move from local storage to an authenticated profile without changing component contracts.
- Production media editing will require a separate action boundary and is not implied by the Phase 7 viewer.