# Laitstyle Control Room V2 — Progress Tracker

## Current score

**Phase 8 planned — implementation not started**

The user explicitly extended the Control Room programme with:

- Phase 8 — fashion-grade visual system, shell, Overview and Inventory correction
- Phase 9 — TanStack Query server-state foundation

This planning extension does not mark Phase 4, Phase 5, Phase 6 or Phase 7 as accepted. The private-repository executable gate remains unavailable, and PR #4 remains non-mergeable because the feature branch is behind and diverged from `main`.

No blocked check, visual review or merge condition is represented as passing.

## Current phase

| Field | Value |
| --- | --- |
| Status | Phase 8 scope approved and documented; feature implementation not started |
| Active implementation phase | Phase 8 — Visual System, Shell and Overview Correction |
| Queued phase | Phase 9 — TanStack Query Server-State Foundation |
| Branch | `feat/control-room-v2` |
| Pull request | `#4` — draft, currently non-mergeable |
| Phase 7 application head | `02f442ed017281f27932dff35096b3b4f7358ae3` |
| Source specification | `docs/control-room-v2/spec.md` |
| Execution plan | `docs/control-room-v2/implementation-plan.md` |
| Phase 8 plan | `docs/control-room-v2/phase8-plan.md` |
| Phase 9 plan | `docs/control-room-v2/phase9-plan.md` |
| Architecture decisions | `docs/control-room-v2/decisions.md` |
| Accepted Batch 4A head/run | `2b14028c4e60c3395a9bbe819506adca8bfdcae1` / `29044424035` |
| Accepted Batch 4B head/run | `2dd8442898703354d34e292361e0f5f70064ebdc` / `29046530809` |
| Unresolved executable gates | 4F, 5D, 6E and 7E |
| Merge integration | Feature branch remains 31 commits behind `main`; reconcile with reviewed conflict resolution |
| Review readiness | Blocked |

## Completed and accepted foundation

### Phase 0 — Discovery, specification and execution contract

- [x] Product and UX specification
- [x] Gated implementation plan and progress tracker
- [x] Durable `AGENTS.md` skill, architecture and verification contract
- [x] Dedicated branch and draft pull request

### Phase 1 — Control Room foundation, shell and Overview

- [x] Route-level Admin shell and adaptive navigation
- [x] Active-store and new-store Overview states
- [x] Connected operational selectors and deterministic records
- [x] Loading and error boundaries
- [x] Legacy Admin catch-all monolith removed from the feature branch
- [x] Phase 1 verification gate

### Phase 2 — Inventory domain and responsive workspace

- [x] Unique, stocked and variant inventory model
- [x] Quantity invariants and cross-record validation
- [x] Saved views, search, filters and sorting
- [x] Grid, desktop table and mobile cards
- [x] Deep-linkable product detail
- [x] CSV export and selection feedback
- [x] Responsive browser matrix and React Doctor 100/100

Final Phase 2 verification: run `29021779448` on `b5ad5c64a906cef216a6b8e441893d095b09e4ff`.

### Phase 3 — Product editor and Intake

- [x] Seven-step unique, stocked and variant editor
- [x] React Hook Form and Zod validation
- [x] Back/Next preservation and dirty-close confirmation
- [x] Draft, publish, schedule and editing flows
- [x] Connected Intake queue and live Inventory updates
- [x] Full-viewport mobile editor
- [x] Tests, build, browser interactions and React Doctor 100/100

Final Phase 3 verification: run `29035766157` on `ba05d413d62154f1b41a415e5d31003bdf2c20f1`.

### Phase 4A — Sales domain — accepted

- [x] Atomic reserve, release, sale, cancellation and return helpers
- [x] Typed order, hold, sale and return actions
- [x] Cross-domain inventory/revenue/customer/activity updates
- [x] Tests and React Doctor 100/100

Accepted head/run: `2b14028c4e60c3395a9bbe819506adca8bfdcae1` / `29044424035`.

### Phase 4B — Orders workspace — accepted

- [x] Responsive Orders route and detail
- [x] Search, saved views, filters and sorting
- [x] Timeline, transitions, confirmations and errors
- [x] Responsive browser evidence and React Doctor 100/100

Accepted head/run: `2dd8442898703354d34e292361e0f5f70064ebdc` / `29046530809`.

## Implemented but unaccepted phases

### Phase 4C–4F — Holds, Record Sale, Returns and consolidated acceptance

- [x] Holds workspace and actions implemented
- [x] Record Sale workflow implemented
- [x] Returns workspace and disposition implemented
- [x] Browser and responsive coverage encoded
- [ ] Consolidated executable verification
- [ ] Screenshot review
- [ ] Phase 4 accepted

### Phase 5 — Customers

- [x] Connected customer metrics, segments and attention reasons
- [x] Responsive Customers workspace
- [x] Detail, timeline, products, delivery and notes
- [x] Tests and browser coverage encoded
- [ ] Executable lint, TypeScript, tests, build, React Doctor and browser gate
- [ ] Screenshot review
- [ ] Phase 5 accepted

Exact evidence: `docs/control-room-v2/phase5-blocker.md`.

### Phase 6 — Store Settings

- [x] One typed settings record
- [x] Identity, Selling, Delivery, Payments, Notifications and Team
- [x] URL-backed sections and dirty-state protection
- [x] Validation, atomic save and browser coverage encoded
- [ ] Executable lint, TypeScript, tests, build, React Doctor and browser gate
- [ ] Screenshot review
- [ ] Phase 6 accepted

Exact evidence: `docs/control-room-v2/phase6-blocker.md`.

### Phase 7 — Brand, themes, Inventory density and media

- [x] Approved woven L/S identity added
- [x] Theme-aware brand rendering
- [x] Light, Dark and System controller
- [x] Initial semantic token system
- [x] Shared Inventory media viewer
- [x] Legacy catch-all route confirmed absent on the feature branch
- [x] Theme/media browser coverage encoded
- [ ] ESLint executed on final application head
- [ ] TypeScript executed on final application head
- [ ] Full Vitest suite executed on final application head
- [ ] Theme audit executed on final application head
- [ ] Production build executed on final application head
- [ ] React Doctor executed on final application head
- [ ] Browser interactions executed on final application head
- [ ] Screenshot review completed
- [ ] Upstream `main` integrated safely
- [ ] Pull request mergeable
- [ ] Phase 7 accepted

Exact evidence: `docs/control-room-v2/phase7-blocker.md`.

## Phase 8 — Visual System, Shell and Overview Correction

### Planning audit — complete

- [x] Rewritten implementation brief
- [x] Verified Base UI theme-menu context error from current component composition
- [x] Verified sidebar has no internal short-height scroll boundary
- [x] Verified selected navigation uses conflicting nested light surfaces
- [x] Verified dark primary/sidebar hierarchy can produce bright white cards and buried content
- [x] Verified command menu is primarily a static destination list
- [x] Compared current Overview with the stronger queue/orders/right-rail hierarchy on `main`
- [x] Rejected restoration of the legacy monolith and one-of-one-only assumptions
- [x] Verified five-column Inventory at 1280px is too narrow beside the 280px sidebar
- [x] Verified table thumbnail is not a separate media-preview action
- [x] Locked exclusions and acceptance criteria

### Batch 8A — theme role and token correction — not started

- [ ] Inventory scoped raw colours and manual dark patches
- [ ] Light/Dark semantic role matrix
- [ ] Primary, selected, interactive and elevated-state correction
- [ ] Contrast and elevation audit
- [ ] Updated source guard

### Batch 8B — theme control, sidebar and command surface — not started

- [ ] Correct Base UI group composition
- [ ] Theme-menu runtime regression test
- [ ] Desktop/mobile theme-control parity
- [ ] Scroll-safe sidebar regions
- [ ] Accessible selected navigation
- [ ] Fashion-grade command trigger and palette
- [ ] Real product/order/customer/hold/settings search results

### Batch 8C — Overview information architecture — not started

- [ ] Module responsibility matrix
- [ ] Remove or merge duplicate summary/activity roles
- [ ] Primary owner-judgment queue
- [ ] Recent/open-orders preview
- [ ] Supporting desktop rail
- [ ] Sales Pulse and Inventory Watch retain unique responsibilities
- [ ] Task-priority tablet/mobile composition

### Batch 8D — Inventory presentation and table media — not started

- [ ] Minimum useful card-width rule
- [ ] Four useful cards at the 1280px/sidebar target unless measured space supports more
- [ ] Product-image and typography redesign
- [ ] Consistent card height and footer rhythm
- [ ] Dedicated table-thumbnail media trigger
- [ ] Separate media and product-record actions

### Batch 8E — acceptance — not started

- [ ] Token and hardcoded-colour audit
- [ ] Theme menu opens without console/runtime error
- [ ] Sidebar short-height checks at 800px, 700px and 600px
- [ ] Light/Dark route matrix
- [ ] Command search keyboard and record checks
- [ ] Overview responsive screenshots and review
- [ ] Inventory card-width/image-height/equal-row assertions
- [ ] Table media interaction checks
- [ ] ESLint, TypeScript, Vitest, build and React Doctor
- [ ] Consolidated Phase 4–8 browser regression
- [ ] Phase 8 accepted

## Phase 9 — TanStack Query Server-State Foundation

### Planning — complete

- [x] Rewritten server-state implementation brief
- [x] Confirmed no dedicated TanStack Query skill exists in `agent-controller`
- [x] Locked official TanStack Query React documentation as the package source of truth
- [x] Approved deterministic Promise-based in-memory adapter boundary
- [x] Prohibited fake API routes, artificial latency and random failures
- [x] Defined server-state versus ephemeral UI-state ownership
- [x] Defined domain query-key factory requirements
- [x] Defined mutation invalidation and optimistic rollback rules
- [x] Defined Next.js QueryClient and hydration boundaries
- [x] Locked exclusions and acceptance criteria

### Batch 9A — packages, provider and repositories — queued

- [ ] Install `@tanstack/react-query`
- [ ] Install and configure `@tanstack/eslint-plugin-query`
- [ ] Stable Control Room QueryClient provider
- [ ] Typed repositories and deterministic in-memory adapters
- [ ] Future adapter handoff

### Batch 9B — Inventory and Products — queued

- [ ] Query keys and colocated options
- [ ] List/detail/media migration
- [ ] Product mutations and cache reconciliation
- [ ] Loading/error/empty/stale/refetch states

### Batch 9C — Sales, Customers, Settings and Overview — queued

- [ ] Domain key factories and query options
- [ ] Remove migrated records from duplicate global state
- [ ] Preserve connected Overview/customer updates
- [ ] Avoid query waterfalls

### Batch 9D — mutations and invalidation — queued

- [ ] Explicit mutation hooks by business action
- [ ] Targeted invalidation matrix
- [ ] Safe optimistic updates with snapshot and rollback
- [ ] Pessimistic stock/payment/ownership writes
- [ ] Concurrent-mutation tests

### Batch 9E — state experience and acceptance — queued

- [ ] Initial loading, error, empty, stale and background-refetch UI
- [ ] Query-key and invalidation tests
- [ ] Rollback and cache-isolation tests
- [ ] Browser state checks
- [ ] Production integration handoff
- [ ] Full Phase 4–9 regression
- [ ] Phase 9 accepted

## Verification and integration blockers

After the last successful Orders acceptance run, GitHub Actions began creating private-repository jobs with zero steps or no associated run. Jobs expose no usable logs or artifacts. This remains an execution-environment condition rather than an application result.

Separately, PR #4 reports `mergeable: false`. The feature branch remains behind and diverged from `main`. Upstream integration must use reviewed conflict resolution; an “ours” or tree-only merge is not acceptable because it could discard upstream work.

Phases 8 and 9 were added through explicit user scope extension. Their planning commits do not waive any earlier gate.

## Loaded planning contract for Phases 8 and 9

- [x] `using-superpowers`
- [x] `product-designer`
- [x] `ui-ux-pro-max`
- [x] `frontend-design`
- [x] `shadcn`
- [x] `next-best-practices`
- [x] `vercel-react-best-practices`
- [x] `chrome-devtools`
- [x] `web-perf`
- [x] shadcn MCP documentation and Base UI composition rules
- [x] official TanStack Query React overview, installation, query-key, invalidation, optimistic-update and Next.js SSR guidance
- [x] current branch implementation, current `main` legacy Overview and PR state audited

## Next action

Implement Phase 8 only, batch by batch, starting with the theme-role inventory and Base UI theme-menu fix. Do not start Phase 9 feature code until Phase 8 passes its executable and visual gate or the user explicitly overrides that gate again. Keep PR #4 draft and non-review-ready while executable and merge-integration blockers remain.
