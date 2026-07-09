# Laitstyle Control Room V2 — Phased Implementation Plan

**Source of truth:** `docs/control-room-v2/spec.md`  
**Working branch:** `feat/control-room-v2`  
**PR mode:** Draft until the final phase is verified  
**Execution rule:** Do not begin a later phase until the current phase satisfies every required gate.

## 1. Planning decisions

### 1.1 One PR, multiple verified batches

The revamp will be implemented in one dedicated draft pull request so that design and architecture decisions remain reviewable in one place. Each phase is a separate batch with:

- A narrow scope
- Focused commits
- Its own acceptance checklist
- Required repository checks
- An updated tracker and PR summary

A phase must not mix unrelated work from later phases.

### 1.2 Replace the monolith progressively

The existing `src/app/admin/[[...section]]/page.tsx` combines routing, seed data, domain types, timers, dialogs, page sections and mutations in one client file. It will be replaced through route-level pages and feature folders.

The old catch-all route remains only until the new shell and first route are functional. It must not be expanded during the revamp.

### 1.3 No fake backend architecture

The current repository has no production Control Room data service. Early phases use typed seed data behind selectors and a single action/reducer boundary. The implementation must not introduce API routes, caching infrastructure or TanStack Query merely to simulate a backend.

### 1.4 TanStack decision

No TanStack package or dedicated TanStack skill exists in the current repository/controller index.

- Evaluate `@tanstack/react-table` in Phase 2 only.
- Add it only if the operational inventory table genuinely benefits from its sorting, filtering, row selection and column visibility model.
- Do not introduce TanStack Query until real asynchronous server state exists.
- Record any dependency addition in the phase notes and PR body.

### 1.5 Component boundaries

Pages compose features. Features own presentation and interaction. Domain data and selectors remain outside React page files.

Target structure:

```text
src/app/admin/
  layout.tsx
  page.tsx
  loading.tsx
  error.tsx
  inventory/page.tsx
  collections/page.tsx
  orders/page.tsx
  holds/page.tsx
  returns/page.tsx
  customers/page.tsx
  settings/page.tsx

src/features/control-room/
  shell/
  overview/
  inventory/
  product-editor/
  sales/
  customers/
  settings/
  shared/

src/lib/control-room/
  types.ts
  seed.ts
  selectors.ts
  actions.ts
  result.ts
```

Routes are created only in the phase that completes their useful default, empty, loading and error states.

## 2. Required workflow for every phase

Before coding:

1. Reload `docs/control-room-v2/spec.md`.
2. Reload this implementation plan.
3. Read the current `AGENTS.md` rules.
4. Inspect the latest changed files and current PR feedback.
5. Activate the relevant skills listed in `AGENTS.md`.
6. State the exact phase scope and exclusions in the phase tracker.

During coding:

1. Keep route files small and compositional.
2. Split domain types, seed data, selectors and actions from UI components.
3. Use existing shadcn components before custom overlays or controls.
4. Use HugeIcons in rebuilt Control Room components.
5. Include default, empty, loading, error and success states required by the phase.
6. Do not expose navigation or actions for unfinished later phases.
7. Do not add random timers, fake status mutation or misleading integration claims.

Before completing the phase:

1. Review changed files against the latest Web Interface Guidelines.
2. Verify keyboard, labels, focus, contrast and responsive composition.
3. Run ESLint.
4. Run `tsc --noEmit`.
5. Run available tests.
6. Run the production build.
7. Run React Doctor against the diff and resolve changed-scope errors.
8. Perform browser validation at 375 × 812, 768 × 1024 and 1280 × 800 when browser tooling is available.
9. Update `progress.md` and the PR body.
10. Stop. Do not begin the next phase in the same uncontrolled batch.

## 3. Phase 0 — Discovery, specification and execution contract

### Goal

Create the product specification, phased plan, agent rules and draft PR before UI implementation.

### Deliverables

- `docs/control-room-v2/spec.md`
- `docs/control-room-v2/implementation-plan.md`
- `docs/control-room-v2/progress.md`
- Updated `AGENTS.md`
- Dedicated draft PR from `feat/control-room-v2` to `main`

### Acceptance criteria

- Current Control Room architecture is documented accurately.
- Inventory supports unique, stocked and variant products in the locked specification.
- Intake, offline sales and sidebar responsibilities are unambiguous.
- Every phase has a clear boundary and completion gate.
- Required skills and tool-use honesty are recorded in `AGENTS.md`.
- No Control Room UI implementation is included in Phase 0.

### Gate

Phase 0 is complete only after all documents are committed, re-read from the branch, and the draft PR is open.

## 4. Phase 1 — Control Room foundation, shell and Overview

### Goal

Replace the generic admin shell and deliver the complete Overview command centre without exposing unfinished destinations.

### In scope

- Route-based `src/app/admin/layout.tsx`
- New Control Room desktop sidebar and mobile navigation sheet
- Top command bar with working search boundary and only implemented actions
- Shared page header and responsive content frame
- Typed core domain foundation in `src/lib/control-room/`
- Seed data and selectors required by Overview
- Active-store Overview
- New-store/onboarding Overview state
- Overview loading, empty and error states
- Remove Overview responsibility from the catch-all page

### Overview modules

- Today strip
- Attention queue
- Sales pulse
- Fulfilment lane
- Inventory watch
- Continue working
- Activity stream
- Working quick actions only

### Out of scope

- Inventory editing
- Product wizard
- Order mutation
- Hold mutation
- Offline-sale recording
- Customer detail
- Settings forms
- Collections and Returns routes

### Architecture batch

```text
src/app/admin/layout.tsx
src/app/admin/page.tsx
src/app/admin/loading.tsx
src/app/admin/error.tsx
src/features/control-room/shell/*
src/features/control-room/overview/*
src/features/control-room/shared/*
src/lib/control-room/types.ts
src/lib/control-room/seed.ts
src/lib/control-room/selectors.ts
src/lib/control-room/result.ts
```

### Acceptance criteria

- Overview answers the daily operational questions from the specification.
- Desktop is a command centre, not a grid of generic KPI cards.
- Tablet composition remains useful without the desktop sidebar width.
- Mobile prioritises attention, quick actions and compact product/order cards.
- New-store state does not show meaningless zero charts.
- Navigation contains only Overview plus implemented safe exits such as storefront preview.
- No giant client page replaces the old giant client page.
- Phase checks and responsive validation pass.

## 5. Phase 2 — Inventory domain and responsive workspace

### Goal

Deliver the inventory operating model and browsing/management workspace for unique, stocked and variant products.

### In scope

- Full discriminated inventory product types
- Inventory quantity invariants and selectors
- Stock movement seed model
- Inventory route
- Saved views and filters
- Search and sorting
- Visual grid
- Operational table
- Mobile inventory cards
- Product detail sheet with read-only operational tabs
- Bulk selection and safe non-destructive actions
- Collections route if it can be completed in this phase without weakening Inventory
- Loading, empty, error and success feedback

### TanStack checkpoint

Before implementing the table:

1. List required table behaviour.
2. Compare existing shadcn Table plus local state with `@tanstack/react-table`.
3. Introduce TanStack Table only if it removes meaningful custom infrastructure.
4. Record the decision in `docs/control-room-v2/decisions.md`.

### Out of scope

- Add/edit product wizard
- Media uploads
- Persisted backend stock mutations
- Order and hold management

### Acceptance criteria

- Botanical Jeans can be represented as 50 received, 29 available, 3 reserved and 18 sold.
- Unique pieces remain quantity-one records.
- Variant products expose meaningful per-variant availability.
- Grid, table and mobile cards represent the same inventory truth.
- Product detail shows stock, media, pricing, orders, holds, movements, reviews and activity boundaries without fake data integrations.
- No horizontal desktop table is forced onto mobile.
- Phase checks pass.

## 6. Phase 3 — Add-product wizard and Intake queue

### Goal

Deliver a complete product-creation workflow and make Intake a real stage of Inventory rather than a duplicate page.

### In scope

- Product-editor feature folder
- Responsive Dialog/Drawer wizard
- React Hook Form and Zod schema
- Seven specification steps
- Unique, stocked and variant field branches
- Draft preservation while open
- Back/next navigation
- Step validation and final validation summary
- Unsaved-change confirmation
- Save-draft prototype action through the shared action boundary
- Publish prototype action when requirements are satisfied
- Inventory Intake saved view
- Intake stages and stage transitions
- Product edit boundary for existing records
- Success, validation and recoverable error feedback

### Out of scope

- Real file upload/storage
- Real backend persistence
- AI extraction claims
- Sales operations

### Acceptance criteria

- Product mode changes the stock step without leaving irrelevant hidden values.
- The operator can move backward without losing valid data.
- Required errors appear beside fields.
- Draft and publish are visibly different actions.
- Intake moves the same record through stages; it never duplicates the product.
- Closing dirty work requires confirmation.
- Keyboard and mobile drawer behaviour pass.
- Phase checks pass.

## 7. Phase 4 — Sales workspace: Orders, Holds, Offline Sales and Returns

### Goal

Connect the full sales-operating model so online orders, holds, offline sales and returns affect the same inventory truth.

### In scope

- Orders route and status views
- Order detail sheet
- Order timeline and permitted status transitions
- Holds route and risk views
- Extend, release and convert-hold prototype actions
- Global Record Sale dialog
- Product/variant selection
- Quantity and stock validation
- Channel, customer and payment capture
- Connected offline-sale action that updates inventory, revenue, customer and activity records
- Returns route and return/refund states
- Typed Result errors for invalid transitions and insufficient stock
- Loading, empty, error and confirmation states

### Out of scope

- Real payment capture
- Courier integration
- Messaging integration
- Production refunds

### Acceptance criteria

- Unique-item sale prevents a second sale.
- Stocked and variant sales decrement only the selected quantity.
- Holds reserve quantities correctly.
- Offline sale creates a sales record rather than only changing product status.
- Revenue selectors include online and offline channels.
- Invalid transitions produce understandable recoverable errors.
- Destructive actions require confirmation.
- Phase checks pass.

## 8. Phase 5 — Customers workspace

### Goal

Deliver an operational customer view connected to orders, holds, products, addresses and reviews.

### In scope

- Customer route
- Search, segments and attention filters
- Responsive customer list/cards
- Customer detail sheet/workspace
- Summary metrics
- Timeline
- Purchased, held, saved and reviewed products
- Addresses and delivery history
- Internal notes prototype boundary
- Loading, empty and error states

### Out of scope

- Marketing automation
- Messaging integration
- Enterprise CRM pipelines
- Loyalty programme

### Acceptance criteria

- Customer totals are derived from connected records rather than duplicated seed numbers.
- Offline purchases appear in customer history.
- Holds and returns appear in the timeline.
- Mobile detail remains navigable and does not become an oversized desktop sheet.
- Phase checks pass.

## 9. Phase 6 — Store Settings

### Goal

Deliver a polished, non-technical store-configuration experience.

### In scope

- Settings route and section navigation
- Store identity
- Selling preferences
- Delivery
- Payments
- Notifications
- Team boundary
- Visual previews where useful
- React Hook Form/Zod validation
- Dirty-state and saved-state feedback
- Mobile settings navigation
- Loading, error and success states

### Out of scope

- Provider API setup
- Webhooks
- Database/admin infrastructure
- Real staff authentication and permission enforcement

### Acceptance criteria

- All labels describe business outcomes.
- No technical implementation terminology is visible.
- Save feedback is explicit and contextual.
- Settings sections are visually distinct without becoming separate generic pages.
- Phase checks pass.

## 10. Phase 7 — Integration hardening, visual QA and legacy removal

### Goal

Finish the revamp as one coherent system and remove superseded admin code.

### In scope

- Remove `src/app/admin/[[...section]]/page.tsx` after route parity is complete
- Resolve duplicate types, seed records and unused components
- Verify navigation and deep links
- Verify every required state
- Full Web Interface Guidelines audit
- Full responsive browser pass
- Keyboard and focus pass
- React Doctor diff and repository review
- Performance and bundle review
- PR screenshots and final description
- Update documentation and decisions

### Acceptance criteria

- No dead Control Room route or action.
- No old catch-all admin implementation remains.
- No new Control Room feature file has become a replacement monolith.
- All routes pass the required viewports and interaction flows.
- ESLint, TypeScript, tests and production build pass.
- React Doctor changed-scope errors are resolved.
- The PR is ready for review rather than draft only after all gates are complete.

## 11. Phase tracker format

`progress.md` must record:

| Field | Meaning |
| --- | --- |
| Current phase | The only phase allowed to receive feature code |
| Status | Not started, in progress, blocked or complete |
| Scope | Exact files/features allowed in the batch |
| Exclusions | Later-phase work that must not enter the batch |
| Acceptance | Checklist copied from this plan |
| Verification | Commands and browser evidence |
| Decisions | Links to architecture/design decisions |
| Blockers | Missing tools, data or integration boundaries |

## 12. Stop conditions

Stop implementation and keep the current phase open when:

- A required check fails.
- A responsive layout is visibly broken.
- A workflow has a dead button or incomplete success/error path.
- The phase requires unapproved backend or dependency work.
- The implementation begins duplicating records across features.
- The active change would expose a later-phase navigation destination.
- A feature file is accumulating unrelated responsibilities.

The correct response is to resolve or document the blocker inside the current phase, not to move ahead and leave unfinished work behind.
