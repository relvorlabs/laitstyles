# Laitstyle Control Room V2 — Progress Tracker

## Current score

**Phase 5 of 7 started — Batch 5A customer truth and selectors**

Phase 5 began by explicit user override. Phase 4 remains implemented but unaccepted because both required GitHub Actions workflows still fail before checkout with zero steps and no logs. The override permits Phase 5 work; it does not mark Phase 4 as passing.

## Current phase

| Field | Value |
| --- | --- |
| Status | Phase 5 Batch 5A in progress; repository verification environment blocked |
| Branch | `feat/control-room-v2` |
| Pull request | `#4` — draft |
| Source specification | `docs/control-room-v2/spec.md` |
| Execution plan | `docs/control-room-v2/implementation-plan.md` |
| Phase 4 plan | `docs/control-room-v2/phase4-plan.md` |
| Phase 5 plan | `docs/control-room-v2/phase5-plan.md` |
| Architecture decisions | `docs/control-room-v2/decisions.md` |
| Accepted Batch 4A head | `2b14028c4e60c3395a9bbe819506adca8bfdcae1` |
| Accepted Batch 4A run | `29044424035` |
| Accepted Batch 4B head | `2dd8442898703354d34e292361e0f5f70064ebdc` |
| Accepted Batch 4B run | `29046530809` |
| Unresolved earlier gate | 4F — consolidated Phase 4 acceptance |
| Active batch | 5A — customer truth and selectors |
| Next batch | 5B — blocked until Batch 5A is reviewed and executable checks pass or are explicitly overridden |

## Completed phases

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
- [x] Legacy Admin catch-all monolith removed
- [x] Full verification gate

### Phase 2 — Inventory domain and responsive workspace

- [x] Unique, stocked and variant inventory model
- [x] Quantity invariants and cross-record validation
- [x] Saved views, search, filters and sorting
- [x] Storefront-aligned grid, desktop table and mobile cards
- [x] Deep-linkable product detail workspace
- [x] Real CSV export and selection feedback
- [x] Responsive browser matrix and React Doctor 100/100

Final Phase 2 verification: run `29021779448` on `b5ad5c64a906cef216a6b8e441893d095b09e4ff`.

### Phase 3 — Add-product wizard and Intake queue

- [x] Seven-step unique, stocked and variant product editor
- [x] React Hook Form and Zod validation
- [x] Back/Next preservation and dirty-close confirmation
- [x] Draft, publish and schedule actions
- [x] Existing-product editing
- [x] Connected Intake queue and adjacent transitions
- [x] Explicit subscribed catalogue store
- [x] Live Inventory updates after draft save
- [x] Full-viewport mobile editor
- [x] 30 tests, build, browser interactions and React Doctor 100/100

Final Phase 3 verification: run `29035766157` on `ba05d413d62154f1b41a415e5d31003bdf2c20f1`.

## Phase 4 — Sales workspace

Connect Orders, Holds, Offline Sales and Returns to the same inventory, revenue, customer and activity truth.

### Batch 4A — sales domain and typed actions — accepted

- [x] Focused sales domain types
- [x] Explicit order and return transition graphs
- [x] Atomic reserve, release, sale, cancellation and return helpers
- [x] Payment-confirmed orders own sold stock
- [x] Typed order, hold, offline-sale and return actions
- [x] Partial refund and net-revenue tracking
- [x] Shared store integration
- [x] Unique, stocked and variant tests
- [x] Existing Phase 1–3 browser regression
- [x] React Doctor 100/100

Accepted evidence:

- Head `2b14028c4e60c3395a9bbe819506adca8bfdcae1`
- Control Room run `29044424035`
- Parity run `29044424098`
- 46 tests across 7 files

### Batch 4B — Orders workspace — accepted

- [x] `/admin/orders`
- [x] Saved status views, search, channel/payment filters and sorting
- [x] Desktop operational table
- [x] Responsive order cards
- [x] Connected order detail sheet and timeline
- [x] Only domain-permitted transitions exposed
- [x] Confirmation for cancellation/refund actions
- [x] Recoverable transition errors and success feedback
- [x] Empty, loading and route error states
- [x] Desktop and mobile Sales navigation
- [x] Full-width mobile detail with safe-area handling
- [x] Desktop, tablet and mobile browser evidence
- [x] React Doctor 100/100

Accepted evidence:

- Head `2dd8442898703354d34e292361e0f5f70064ebdc`
- Control Room run `29046530809`
- Parity run `29046530866`
- 52 tests across 9 files
- Production build passed
- Orders search, detail opening, normal transition, cancellation confirmation and confirmed cancellation passed in Chromium
- Desktop and mobile navigation passed
- Mobile detail passed exact 375 × 812 viewport geometry
- Phase 3 interaction regression passed
- Screenshot and log artifacts uploaded

### Batch 4C — Holds workspace — implemented, consolidated verification blocked

- [x] `/admin/holds`
- [x] Active, expiring, expired and payment-risk views
- [x] Search and lightweight filters
- [x] Desktop operational table and responsive cards
- [x] Hold detail, extend, release confirmation and convert-to-order workflow
- [x] Recoverable feedback inside the active surface
- [x] Full-viewport mobile detail target
- [x] Focused selector, URL and browser scripts
- [ ] Consolidated lint, TypeScript, tests, build, browser and React Doctor run

### Batch 4D — global Record Sale — implemented, consolidated verification blocked

- [x] Global entry point and four-step responsive workflow
- [x] Product, variant, quantity, channel, customer, payment and notes capture
- [x] Dirty-close confirmation and truthful payment-provider boundary
- [x] Connected inventory, Orders, revenue, movement and activity action
- [x] Success summary and generated-order deep link
- [x] Conflict and insufficient-stock errors
- [x] Theme-safe semantic success styling
- [x] Full-viewport mobile target and browser script
- [ ] Consolidated lint, TypeScript, tests, build, browser and React Doctor run

### Batch 4E — Returns workspace — implemented, consolidated verification blocked

- [x] `/admin/returns`
- [x] Saved views, search, status filter and sorting
- [x] Desktop table and responsive mobile cards
- [x] Eligible delivered order-line selection and quantity validation
- [x] Return detail and permitted transitions
- [x] Refund-state, rejection and damage confirmations
- [x] Restock/damage inventory disposition
- [x] Feedback and validation inside the active surface
- [x] Loading, empty and error states
- [x] Deep-linkable full-viewport mobile targets
- [x] Selector, URL and cross-workspace browser scripts
- [ ] Consolidated lint, TypeScript, tests, build, browser and React Doctor run

### Batch 4F — consolidated acceptance — unresolved

- [x] Scope and PR diff audit
- [x] Latest Web Interface Guidelines fetched and applied
- [x] Required viewport and interaction coverage encoded
- [x] Phase 3, Orders, Holds, Record Sale, Returns, Overview and Inventory regression scripts present
- [ ] ESLint
- [ ] TypeScript
- [ ] Full Vitest suite
- [ ] Production build
- [ ] React Doctor changed-scope review
- [ ] Required 375 × 812, 768 × 1024 and 1280 × 800 browser matrix
- [ ] Screenshot review
- [ ] Phase 4 changed from blocked to accepted

## Phase 5 locked scope

Deliver an operational customer relationship workspace connected to orders, holds, returns, reviews, products, addresses and activity.

### In scope

- Customer route, search, segments, type filter and sorting
- Responsive customer table/cards
- Customer detail summary and relationship timeline
- Purchased, held, saved and reviewed product context
- Addresses, delivery history and preferences
- Session-only internal notes
- Default, loading, empty, error, validation and success states

### Out of scope

- Marketing automation
- Messaging integration
- Enterprise CRM pipelines
- Loyalty programme
- Backend, database, API, auth or staff-permission work
- Phase 6 Settings

## Phase 5 batches

### Batch 5A — customer truth and selectors — active

- [x] Phase 5 product and execution plan
- [x] Dedicated typed customer profile domain
- [x] Derived spend, average order value, orders, returns, cancellations, holds and reviews
- [x] Derived operational segments and attention reasons
- [x] Connected customer timeline selectors
- [x] Purchased, held, saved and reviewed product relationships
- [x] Delivery-history selector
- [x] Focused tests for connected totals, offline sales, holds, returns and product relationships
- [x] Customers route and navigation remain hidden
- [ ] ESLint
- [ ] TypeScript
- [ ] Focused and full Vitest suites
- [ ] Production build
- [ ] React Doctor changed-scope review

### Batch 5B — responsive Customers workspace — locked

- [ ] `/admin/customers`
- [ ] URL-backed search, segments, type filter and sorting
- [ ] Desktop operational table
- [ ] Tablet composition
- [ ] Mobile customer cards
- [ ] Summary strip and empty state
- [ ] Loading and route error states
- [ ] People navigation exposed after route completion

### Batch 5C — detail workspace and notes — locked

- [ ] Deep-linkable customer detail
- [ ] Summary, timeline, products, addresses and delivery sections
- [ ] Internal note action through shared store
- [ ] Validation and visible success feedback
- [ ] Full-viewport mobile detail target
- [ ] Cross-workspace interaction tests

### Batch 5D — consolidated acceptance — locked

- [ ] Scope and PR diff audit
- [ ] Latest Web Interface Guidelines review
- [ ] ESLint, TypeScript, tests and production build
- [ ] React Doctor changed-scope review
- [ ] Required browser viewport matrix
- [ ] Screenshot review
- [ ] Tracker and PR updated

## Verification blocker

After the last successful Orders acceptance run, GitHub Actions began creating both required private-repository jobs with zero steps. The jobs fail before checkout, expose no logs or artifacts, and failed-job reruns behave the same way. This remains an external runner, billing or organization execution condition rather than an application result.

Phase 5 started only because the user explicitly overrode the earlier phase gate. No blocked check is represented as passing.

## Loaded implementation contract

- [x] Reloaded specification, implementation plan, tracker and `AGENTS.md`
- [x] Loaded current process, product, UI/UX, frontend, Web Interface Guidelines, Next.js, React, composition, shadcn, TypeScript, error-handling, Playwright, React Doctor and PR skills
- [x] Searched for `brainstorming`; no current skill was found and no replacement was invented
- [x] Re-fetched the latest Web Interface Guidelines

## Next action

Run or restore an executable validation environment for Batch 5A. Review and resolve any static or test failures before opening Batch 5B unless the user explicitly overrides that batch gate too.
