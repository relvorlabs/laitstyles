# Laitstyle Control Room V2 — Phased Implementation Plan

**Source of truth:** `docs/control-room-v2/spec.md` plus the active phase plan  
**Working branch:** `feat/control-room-v2`  
**PR mode:** Draft until the final phase is verified and the branch is mergeable  
**Execution rule:** Do not begin a later phase until the current phase satisfies every required gate unless the user explicitly overrides that gate.

## 1. Planning decisions

### 1.1 One PR, multiple verified batches

The revamp is implemented in one dedicated draft pull request so design and architecture decisions remain reviewable in one place. Each phase has:

- a narrow scope
- focused commits
- its own acceptance checklist
- required repository checks
- an updated tracker and PR summary

A phase must not mix unrelated work from a later phase.

### 1.2 Replace the monolith progressively

The original `src/app/admin/[[...section]]/page.tsx` combined routing, seed data, domain types, timers, dialogs, page sections and mutations in one client file. It has been replaced with route-level pages and focused feature folders.

The legacy file on `main` may be inspected as a design and information-architecture reference in Phase 8, but it must not be restored, expanded or copied back as a monolith.

### 1.3 No fake backend architecture

The current repository has no production Control Room data service.

- Phases 0–8 use typed deterministic records behind explicit domain boundaries.
- Do not create API routes whose only purpose is to wrap local seed arrays.
- Do not add random latency, random failures, fake background jobs or production persistence claims.
- Phase 9 is an explicit exception to the earlier TanStack deferral: it may introduce a Promise-based in-memory repository adapter solely to prove a replaceable server-state boundary.
- The in-memory adapter must remain truthful, deterministic and session-only.
- A future HTTP/RPC adapter must be replaceable without rewriting feature components or query keys.

### 1.4 TanStack decisions

No dedicated TanStack Query skill exists in the current `agent-controller` index. Do not invent one. Use the current official TanStack Query React documentation and the repository’s Next.js, React, TypeScript and testing contracts.

#### TanStack Table

- `@tanstack/react-table` was evaluated during Phase 2 only.
- It should be introduced only if the operational table needs sorting, filtering, selection or column infrastructure that would otherwise become meaningful custom code.
- This decision is separate from TanStack Query.

#### TanStack Query

Phase 9 is approved to add a future-ready server-state layer even before a production backend exists, under these conditions:

- query data is backed by typed repository interfaces
- the development adapter is deterministic and Promise-based
- server-like records are removed from duplicate global client state as each domain migrates
- query keys model resource identity and all data-affecting inputs
- query functions and options are colocated by domain
- writes use exact cache reconciliation or targeted invalidation
- optimistic updates are limited to reversible, low-conflict actions with snapshot and rollback
- stock-, payment- and ownership-sensitive actions remain pessimistic until concurrency safety is proven
- loading, error, empty, stale and background-refetch states are explicit
- no fake API, persistence or network guarantee is claimed

Every dependency addition must be recorded in the active phase notes, architecture decisions and PR body.

### 1.5 Component boundaries

Pages compose features. Features own presentation and interaction. Domain data, repository contracts, selectors and actions remain outside React page files.

Target structure:

```text
src/app/admin/
  layout.tsx
  page.tsx
  loading.tsx
  error.tsx
  inventory/page.tsx
  orders/page.tsx
  holds/page.tsx
  returns/page.tsx
  customers/page.tsx
  settings/page.tsx
  query-provider.tsx                 # Phase 9

src/features/control-room/
  shell/
  overview/
  inventory/
  product-editor/
  orders/
  holds/
  returns/
  record-sale/
  customers/
  settings/
  shared/

src/lib/control-room/
  types.ts
  seed.ts
  selectors.ts
  result.ts
  data/                              # Phase 9 repository contracts/adapters
```

Routes are created only in the phase that completes their useful default, empty, loading and error states.

## 2. Required workflow for every phase

### Before coding

1. Reload `docs/control-room-v2/spec.md`.
2. Reload this implementation plan.
3. Reload the active phase plan.
4. Read the current `AGENTS.md` rules.
5. Inspect the latest changed files, current PR state and upstream divergence.
6. Load `using-superpowers` first and then every relevant current skill from `relvorlabs/agent-controller`.
7. Fetch current official documentation for dependencies whose API may have changed.
8. State the exact scope and exclusions in `progress.md`.

### During coding

1. Keep route files small and compositional.
2. Split domain types, repositories, selectors and actions from UI components.
3. Use existing shadcn components before custom overlays or controls.
4. Respect Base UI composition requirements such as keeping group labels/items inside their group context.
5. Use the repository icon convention in rebuilt Control Room components.
6. Include default, empty, loading, error and success states required by the phase.
7. Do not expose unfinished later-phase navigation or actions.
8. Do not add random timers, fake mutations or misleading integration claims.
9. Preserve session-only truth until a production adapter exists.

### Before completing the phase

1. Review changed UI files against the latest Web Interface Guidelines.
2. Verify keyboard, labels, focus, contrast and responsive composition.
3. Run ESLint.
4. Run `tsc --noEmit`.
5. Run the full Vitest suite.
6. Run the production build.
7. Run React Doctor against the changed scope and resolve findings.
8. Perform browser validation at 375 × 812, 768 × 1024 and 1280 × 800 plus phase-specific targets.
9. Generate and visually review screenshots for UI phases.
10. Update `progress.md`, architecture decisions and the PR body.
11. Stop. Do not begin the next phase in the same uncontrolled batch.

## 3. Phase 0 — Discovery, specification and execution contract

### Goal

Create the product specification, phased plan, agent rules and draft PR before UI implementation.

### Deliverables

- `docs/control-room-v2/spec.md`
- `docs/control-room-v2/implementation-plan.md`
- `docs/control-room-v2/progress.md`
- updated `AGENTS.md`
- dedicated draft PR from `feat/control-room-v2` to `main`

### Acceptance criteria

- Current Control Room architecture is documented accurately.
- Inventory supports unique, stocked and variant products in the locked specification.
- Intake, offline sales and sidebar responsibilities are unambiguous.
- Every phase has a clear boundary and completion gate.
- Required skills and tool-use honesty are recorded.
- No Control Room UI implementation is included in Phase 0.

## 4. Phase 1 — Control Room foundation, shell and Overview

### Goal

Replace the generic Admin shell and deliver the first complete Overview command centre without exposing unfinished destinations.

### In scope

- route-based Admin shell
- desktop sidebar and adaptive mobile navigation
- top command bar and working search boundary
- shared page frame
- typed core domain foundation
- active-store and new-store Overview
- Overview loading, empty and error states
- removal of Overview responsibility from the catch-all page

### Initial Overview modules

- Today strip
- Attention queue
- Sales pulse
- Fulfilment lane
- Inventory watch
- Continue working
- Activity stream
- working quick actions

### Acceptance criteria

- Overview answers the daily operational questions from the specification.
- Desktop behaves as a command centre rather than a uniform KPI grid.
- Tablet remains useful without desktop sidebar width.
- Mobile prioritises attention and focused actions.
- New-store state avoids meaningless zero charts.
- No giant client page replaces the legacy monolith.
- Phase checks and responsive validation pass.

## 5. Phase 2 — Inventory domain and responsive workspace

### Goal

Deliver the inventory operating model and browsing/management workspace for unique, stocked and variant products.

### In scope

- discriminated product types and quantity invariants
- stock movement model
- Inventory route
- saved views, filters, search and sorting
- visual grid, operational table and mobile cards
- product detail with read-only operational tabs
- bulk selection and safe non-destructive actions
- loading, empty, error and success feedback

### Acceptance criteria

- Botanical Jeans can represent 50 received, 29 available, 3 reserved and 18 sold.
- Unique pieces remain quantity-one records.
- Variant products expose per-variant availability.
- Grid, table and mobile cards represent the same truth.
- Product detail exposes connected records without fake integrations.
- No desktop table is compressed onto mobile.
- Phase checks pass.

## 6. Phase 3 — Add-product wizard and Intake queue

### Goal

Deliver product creation and make Intake a real Inventory workflow rather than a duplicate page.

### In scope

- focused product-editor feature
- responsive dialog/drawer workflow
- React Hook Form and Zod validation
- unique, stocked and variant branches
- draft preservation and back/next navigation
- step and final validation
- dirty-close confirmation
- draft, publish and schedule prototype actions
- Intake saved view and stage transitions
- existing-product editing
- success and recoverable error feedback

### Acceptance criteria

- Product mode changes the stock step without retaining irrelevant hidden values.
- Back navigation preserves valid data.
- Errors appear beside the affected fields.
- Draft and publication actions are visibly different.
- Intake moves one record rather than duplicating products.
- Dirty close requires confirmation.
- Keyboard and mobile behavior pass.

## 7. Phase 4 — Sales workspace: Orders, Holds, Record Sale and Returns

### Goal

Connect online orders, holds, offline sales and returns to the same inventory truth.

### In scope

- Orders route, detail, timeline and valid transitions
- Holds route, risk views, extension, release and conversion
- global Record Sale workflow
- product/variant selection and quantity validation
- channel, customer, payment and notes capture
- connected offline-sale action
- Returns route and refund/disposition states
- typed expected failures
- loading, empty, error and confirmation states

### Acceptance criteria

- Unique-item sale prevents a second sale.
- Stocked and variant sales affect only the selected quantity.
- Holds reserve quantities correctly.
- Offline sale creates a real connected sales record.
- Revenue includes online and offline channels.
- Invalid transitions return recoverable business errors.
- Destructive actions require confirmation.

## 8. Phase 5 — Customers workspace

### Goal

Deliver an operational customer view connected to orders, holds, products, addresses and reviews.

### In scope

- Customers route
- search, segments and attention views
- responsive list/cards
- detail workspace
- relationship metrics and timeline
- purchased, held, saved and reviewed products
- addresses and delivery history
- internal notes prototype boundary
- loading, empty and error states

### Acceptance criteria

- Customer totals derive from connected records.
- Offline purchases appear in history.
- Holds and returns appear in the timeline.
- Mobile detail remains focused and navigable.
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
- truthful Team boundary
- useful previews
- React Hook Form/Zod validation
- dirty and saved-state feedback
- mobile settings navigation

### Acceptance criteria

- Labels describe business outcomes.
- No technical infrastructure terminology appears in operator-facing copy.
- Save feedback is explicit and contextual.
- Sections remain visually distinct without becoming unrelated generic pages.
- Phase checks pass.

## 10. Phase 7 — Brand integration, themes, media and legacy hardening

### Goal

Integrate the approved Laitstyle identity, add token-driven Light/Dark/System support, improve Inventory media behavior and remove superseded Admin implementation.

### In scope

- approved woven L/S symbol and favicon
- Ink/Bone/Sage semantic tokens
- root theme preference and pre-hydration application
- public and Control Room theme controls
- raw-colour audit in scoped files
- denser Inventory grid and shared media viewer
- route/deep-link verification
- removal of the legacy catch-all route from the feature branch
- browser and screenshot coverage encoded

### Acceptance criteria

- Approved identity appears in public and Control Room chrome.
- Theme preference persists.
- Images and product-record navigation are separate actions.
- No old catch-all Admin implementation remains on the feature branch.
- Required executable and visual checks pass before acceptance.

### Current status

Implementation is present, but executable acceptance and upstream merge integration remain blocked. See `docs/control-room-v2/phase7-plan.md` and `docs/control-room-v2/phase7-blocker.md`.

## 11. Phase 8 — Fashion-grade visual system, shell and Overview correction

### Goal

Correct the implemented Control Room so it feels like a premium editorial fashion-operations studio while remaining clear, responsive and operationally useful.

### Locked plan

See `docs/control-room-v2/phase8-plan.md`.

### Core scope

- fix the Base UI theme-menu group-context crash
- redesign semantic light/dark surface hierarchy and primary/selected states
- remove remaining scoped hardcoded colours and manual dark patches
- fix sidebar short-height overflow and active-state readability
- redesign the top search trigger and command menu around real operational records
- audit and rebalance Overview responsibilities
- intelligently incorporate the useful queue/orders/right-rail structure from `main` without restoring its monolith or obsolete assumptions
- replace fixed Inventory column counts with a minimum useful card-width model
- redesign Inventory card image presence, typography, height and hierarchy
- add distinct table-thumbnail media preview
- perform full light/dark responsive and visual acceptance

### Explicit exclusions

- TanStack Query or server-state migration
- real backend, persistence, authentication or API routes
- restoration of the legacy catch-all page
- public storefront body redesign

### Acceptance criteria

- Theme switching works without the Base UI context error.
- Light and dark have deliberate, accessible surface hierarchies.
- Selected sidebar content remains readable in all supported conditions.
- Sidebar content is reachable at short viewport heights.
- Command search includes useful records and actions.
- Overview modules have unique responsibilities and stronger desktop/tablet/mobile hierarchy.
- Inventory cards retain a professional minimum width and image presence.
- Table media preview and product-record navigation remain separate.
- Full executable and visual gates pass.

## 12. Phase 9 — TanStack Query server-state foundation

### Goal

Create a replaceable, tested TanStack Query v5 server-state boundary without pretending that the current in-memory prototype is a production backend.

### Locked plan

See `docs/control-room-v2/phase9-plan.md`.

### Core scope

- install `@tanstack/react-query`
- add the official Query ESLint plugin
- create one stable Control Room QueryClient provider
- define typed domain repositories and deterministic Promise-based in-memory adapters
- define query-key factories for Overview, Inventory, Products, Orders, Holds, Returns, Customers and Settings
- colocate query functions/options and mutations by domain
- migrate server-like records out of duplicate global client state
- preserve URL, overlay, form, theme and other ephemeral UI state outside the query cache
- add targeted invalidation, exact cache reconciliation and safe optimistic rollback
- represent initial loading, error, empty, stale and background-refetch states
- document future HTTP/RPC, authentication, concurrency and hydration requirements

### Explicit exclusions

- production backend, database or API
- fake API routes around seed data
- artificial latency or random failures
- persisted/offline/realtime query infrastructure
- optimistic completion of unsafe stock/payment/ownership operations

### Acceptance criteria

- QueryClient lifecycle is stable.
- Keys are typed, serialisable and complete.
- Data functions are colocated with domain repositories.
- Migrated server-like data is not duplicated in global client state.
- Loading/error/empty/stale/refetch states are distinct.
- Invalidations are targeted.
- Optimistic writes have cancellation, snapshot, rollback and reconciliation.
- Stock-sensitive writes remain safe and pessimistic unless proven otherwise.
- Full Phase 4–9 regression passes.

## 13. Phase tracker format

`progress.md` must record:

| Field | Meaning |
| --- | --- |
| Current phase | The only phase allowed to receive feature code |
| Status | Not started, planned, in progress, blocked or complete |
| Scope | Exact files/features allowed in the batch |
| Exclusions | Later-phase work that must not enter the batch |
| Acceptance | Checklist copied or linked from the active plan |
| Verification | Commands, browser evidence and screenshots |
| Decisions | Architecture and design decision links |
| Blockers | Missing tools, data, execution or integration boundaries |

## 14. Stop conditions

Stop implementation and keep the current phase open when:

- a required check fails or never executes
- a responsive layout is visibly broken
- a workflow has a dead button or incomplete feedback path
- the phase requires unapproved backend or dependency work
- records begin duplicating across providers, reducers and query caches
- later-phase navigation or architecture enters the active phase
- a feature file accumulates unrelated responsibilities
- a Base UI/shadcn primitive is composed against the wrong API
- a merge strategy would discard upstream work

The correct response is to resolve or document the blocker inside the current phase, not to move ahead and represent unfinished work as accepted.
