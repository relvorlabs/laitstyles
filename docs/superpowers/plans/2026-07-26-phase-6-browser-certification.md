# Phase 6 Browser and Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fully accept Phase 6 state ownership and certify Phases 1–6 through source-backed accessibility, responsive, visual, and same-SHA evidence.

**Architecture:** Phase 6 keeps Prisma as persistent authority, TanStack Query as remote browser cache, URL parameters as catalogue navigation state, focused Zustand stores as shared browser intent, and React state at the narrowest local boundary. Browser certification consumes the disposable database/auth harness and production build from the persistence plan, then produces immutable Playwright, Axe, React Doctor, log, screenshot, and evidence manifests for the final reviewer.

**Tech Stack:** Next.js 16.2.10, React 19.2.4, TypeScript, Zustand 5.0.14, TanStack Query 5.101.2, Playwright 1.61.x, `@axe-core/playwright`, Biome 2.5.3, React Doctor 0.7.2, pnpm 11.13.0, Node 25.x.

## Global Constraints

- Preserve the Phase 0 UI: no intentional changes to layout, copy, typography, colour, spacing, imagery, animation, theme, or responsive composition.
- Keep checkout payment settlement in Phase 8 and auth consolidation in Phase 7; inherited guards and presentation may be tested but not redesigned.
- Do not perform Phase 9 broad legacy deletion. Remove only an exact Phase 6 compatibility edge after all consumers and replacement coverage are proven.
- Complete Product records, Inventory, Orders, Customers, Payments, and permissions must never become Zustand-owned state.
- Catalogue filters, sort, search, and pagination remain URL-owned; TanStack Query remains the only remote browser cache.
- Every required validation artifact must identify one immutable 40-character source SHA. A new commit invalidates affected browser and final-certification evidence.
- Use repository commands through pnpm. Do not replace `pnpm react-doctor`, `pnpm validate:full`, or `pnpm validate:browser` with ad-hoc substitutes.
- Do not stage or modify the user-provided untracked `update.md` unless the user separately authorizes it.

---

### Task 1: Freeze the Phase 6 ownership characterization

**Files:**
- Modify: `src/stores/storefront-state-boundary.test.ts`
- Modify: `src/lib/boundaries/storefront-state-boundary.test.ts`
- Modify: `src/modules/products/product-module-boundaries.test.ts`
- Verify: `src/stores/cart.store.ts`
- Verify: `src/stores/saved-items.store.ts`
- Verify: `src/stores/storefront-ui.store.ts`
- Verify: `src/providers/storefront-state-hydrator.tsx`
- Verify: `src/modules/products/client/use-catalogue-navigation.ts`
- Verify: `src/modules/storefront-shell/client/storefront-runtime.ts`

**Interfaces:**
- Consumes: canonical Product projections from the Phase 4 plan and the exact future-phase compatibility ledger from the Phase 1 plan.
- Produces: a machine-enforced ownership inventory for Zustand payloads, URL mutations, remote cache, local state, provider retirement, and allowed Phase 7/8 compatibility edges.

- [ ] **Step 1: Add failing ownership assertions**

  Extend the boundary tests to reject complete Product-shaped objects in stores, direct router mutation outside `useCatalogueNavigation()`, target modules importing legacy storefront runtime values, retired provider names, and more than the exact documented Phase 7/8 compatibility consumers.

- [ ] **Step 2: Run the focused tests and capture the baseline failures**

  Run: `pnpm test -- src/stores/storefront-state-boundary.test.ts src/lib/boundaries/storefront-state-boundary.test.ts src/modules/products/product-module-boundaries.test.ts`

  Expected: tests fail only for current, named ownership violations. If they pass immediately, retain them as characterization evidence and do not invent a production change.

- [ ] **Step 3: Repair only evidenced ownership violations**

  Move remote values back to TanStack/domain projections, URL state back to `useCatalogueNavigation()`, and local interaction state to its narrow component. Keep any future-phase compatibility file export-only and exact.

- [ ] **Step 4: Re-run focused tests and architecture checks**

  Run: `pnpm test -- src/stores/storefront-state-boundary.test.ts src/lib/boundaries/storefront-state-boundary.test.ts src/modules/products/product-module-boundaries.test.ts`

  Run: `pnpm check:architecture`

  Expected: focused tests and architecture checks pass with no expanded exception.

- [ ] **Step 5: Commit the ownership boundary**

  ```bash
  git add src/stores src/lib/boundaries/storefront-state-boundary.test.ts src/modules/products/product-module-boundaries.test.ts src/providers src/modules/storefront-shell src/modules/products/client
  git commit -m "test(storefront): enforce phase 6 state ownership"
  ```

### Task 2: Prove versioned persistence and hydration safety

**Files:**
- Modify: `src/providers/storefront-state-hydrator.tsx`
- Modify: `src/stores/cart.store.test.ts`
- Modify: `src/stores/saved-items.store.test.ts`
- Modify: `src/stores/storefront-ui.store.test.ts`
- Modify: `src/modules/cart/cart-restoration.test.ts`
- Modify: `tests/e2e/phase-6-storefront-state.spec.ts`

**Interfaces:**
- Consumes: Phase 4 Product catalogue projections and the existing version-3 persisted snapshot contract.
- Produces: deterministic migration and hydration behavior containing IDs, variant IDs, quantities, saved IDs, browser hold expiries, and documented UI preferences only.

- [ ] **Step 1: Add failing migration cases**

  Cover a valid version-3 snapshot, missing Products, unpublished Products, unavailable variants, malformed JSON, unsupported versions, stale hold expiries, duplicated line IDs, and first render before browser storage is available.

- [ ] **Step 2: Run focused unit tests**

  Run: `pnpm test -- src/stores/cart.store.test.ts src/stores/saved-items.store.test.ts src/stores/storefront-ui.store.test.ts src/modules/cart/cart-restoration.test.ts`

  Expected: new cases fail at the narrow migration/hydration boundary, not in unrelated UI.

- [ ] **Step 3: Implement the minimum migration/hydration corrections**

  Preserve supported IDs and quantities, discard invalid records deterministically, join current Product projections outside Zustand, and avoid storage reads during the server render.

- [ ] **Step 4: Add browser hydration assertions**

  In `phase-6-storefront-state.spec.ts`, seed each supported snapshot before navigation and assert no hydration warning, no first-paint corruption, expected cart/saved results, and minimal stored payload after persistence.

- [ ] **Step 5: Run focused unit and browser tests**

  Run: `pnpm test -- src/stores/cart.store.test.ts src/stores/saved-items.store.test.ts src/stores/storefront-ui.store.test.ts src/modules/cart/cart-restoration.test.ts`

  Run: `pnpm test:e2e -- tests/e2e/phase-6-storefront-state.spec.ts --project=desktop-chromium`

  Expected: all cases pass without console hydration errors.

- [ ] **Step 6: Commit persistence and hydration**

  ```bash
  git add src/providers/storefront-state-hydrator.tsx src/stores src/modules/cart tests/e2e/phase-6-storefront-state.spec.ts
  git commit -m "fix(storefront): certify state hydration migration"
  ```

### Task 3: Certify URL history and catalogue cache ownership

**Files:**
- Modify: `src/modules/products/client/catalogue-search-params.test.ts`
- Modify: `src/modules/products/client/use-catalogue-navigation.ts`
- Modify: `src/modules/products/client/storefront-catalogue.ts`
- Modify: `src/modules/products/ui/storefront/product-catalogue.tsx`
- Modify: `tests/e2e/storefront-client-state.spec.ts`
- Modify: `tests/e2e/phase-6-storefront-state.spec.ts`

**Interfaces:**
- Consumes: Phase 3 HTTP cancellation and Phase 4 `/api/v1/products` contracts.
- Produces: one URL mutation boundary and one TanStack query policy whose keys include every result-affecting filter, sort, search, and page value.

- [ ] **Step 1: Add failing query-key and history tests**

  Cover filter addition/removal, clear, sort, search, pagination reset rules, quick collections, browser back/forward, repeated identical mutations, cancellation, and canonical British `catalogue` naming.

- [ ] **Step 2: Run focused tests**

  Run: `pnpm test -- src/modules/products/client/catalogue-search-params.test.ts`

  Run: `pnpm test:e2e -- tests/e2e/storefront-client-state.spec.ts tests/e2e/phase-6-storefront-state.spec.ts --project=desktop-chromium`

  Expected: failures identify URL or cache-key divergence without requiring a visual rewrite.

- [ ] **Step 3: Repair URL and cache behavior**

  Route every navigable mutation through `useCatalogueNavigation()`, remove synchronization effects that copy URL values into another owner, and ensure the query key mirrors the parsed URL contract.

- [ ] **Step 4: Re-run focused tests and architecture guard**

  Run: `pnpm test -- src/modules/products/client/catalogue-search-params.test.ts`

  Run: `pnpm test:e2e -- tests/e2e/storefront-client-state.spec.ts tests/e2e/phase-6-storefront-state.spec.ts --project=desktop-chromium`

  Run: `pnpm check:architecture`

  Expected: exact history restoration, no loop, one navigation implementation, and passing guard.

- [ ] **Step 5: Commit navigation ownership**

  ```bash
  git add src/modules/products/client src/modules/products/ui/storefront/product-catalogue.tsx tests/e2e/storefront-client-state.spec.ts tests/e2e/phase-6-storefront-state.spec.ts
  git commit -m "fix(catalogue): certify url-owned navigation"
  ```

### Task 4: Certify hold clock, overlays, focus, and local state

**Files:**
- Modify: `src/modules/storefront-shell/client/storefront-hold-clock.test.tsx`
- Modify: `src/modules/storefront-shell/client/storefront-hold-clock.tsx`
- Modify: `src/modules/storefront-shell/client/storefront-overlay-events.ts`
- Modify: `src/modules/storefront-shell/ui/storefront-overlays.tsx`
- Modify: `src/modules/products/ui/storefront/overlays/**`
- Modify: `tests/e2e/phase-6-storefront-state.spec.ts`

**Interfaces:**
- Consumes: browser hold intent as non-authoritative state and the existing overlay identity contract.
- Produces: one timer source and one active focus/body-lock owner with deterministic transition, Escape, close, and focus-return behavior.

- [ ] **Step 1: Add failing clock and transition tests**

  Assert one interval for multiple consumers, deterministic expiry cleanup, transient-to-Zustand and Zustand-to-transient transitions, no stacked overlay, and focus return to the opening control.

- [ ] **Step 2: Run the focused tests**

  Run: `pnpm test -- src/modules/storefront-shell/client/storefront-hold-clock.test.tsx src/stores/storefront-ui.store.test.ts`

  Expected: any duplicate interval or invalid transition fails deterministically under fake timers.

- [ ] **Step 3: Repair only the shared clock/coordinator**

  Keep server reservation authority separate, close or suspend the prior overlay before opening the next, and leave newsletter, delivery estimate, image measurements, and header scroll at their narrow local owners.

- [ ] **Step 4: Add browser focus and Escape coverage**

  Exercise cart, saved items, search, quick view, image viewer, information overlays, and inherited auth dialog. Assert one visible dialog/sheet, one body lock, accessible title, Escape close, and focus restoration.

- [ ] **Step 5: Run focused tests and desktop browser coverage**

  Run: `pnpm test -- src/modules/storefront-shell/client/storefront-hold-clock.test.tsx src/stores/storefront-ui.store.test.ts`

  Run: `pnpm test:e2e -- tests/e2e/phase-6-storefront-state.spec.ts --project=desktop-chromium`

  Expected: one timer, one overlay owner, clean focus behavior, and no console error.

- [ ] **Step 6: Commit interaction ownership**

  ```bash
  git add src/modules/storefront-shell src/modules/products/ui/storefront/overlays src/stores/storefront-ui.store.test.ts tests/e2e/phase-6-storefront-state.spec.ts
  git commit -m "fix(storefront): certify overlay and hold coordination"
  ```

### Task 5: Add the reusable Axe and runtime-health harness

**Files:**
- Create: `tests/e2e/support/accessibility.ts`
- Create: `tests/e2e/phase-1-6-accessibility.spec.ts`
- Modify: `tests/e2e/error-validation.spec.ts`
- Modify: `scripts/ci/check-server-log.mjs`
- Modify: `scripts/ci/http-smoke.mjs`

**Interfaces:**
- Consumes: production server URL, deterministic auth actors from WS6a, and route/surface inventory from the approved design.
- Produces: a reusable Axe helper, required-impact policy, console/page/request capture, and redacted server-log verdict.

- [ ] **Step 1: Write failing accessibility harness tests**

  Add a helper that runs Axe after the page and any requested overlay stabilize, filters only explicitly documented third-party exclusions, and returns violations with route, selector, rule, impact, and help URL.

- [ ] **Step 2: Add the Phase 1–6 accessibility matrix**

  Cover storefront shell, homepage, catalogue, PDP, cart, account, admin overview, products, inventory, orders, holds, returns, customers, and settings plus their primary overlay/dialog states.

- [ ] **Step 3: Run desktop accessibility coverage**

  Run: `pnpm test:e2e -- tests/e2e/phase-1-6-accessibility.spec.ts --project=desktop-chromium`

  Expected: test fails for every serious/critical violation and reports exact owning surface. Do not weaken the policy to obtain green.

- [ ] **Step 4: Route each defect to its owning UI file**

  Repair accessible names, titles, roles, focus, colour-independent status, or semantic structure using existing primitives and tokens. Preserve visual output unless accessibility requires an evidenced correction.

- [ ] **Step 5: Add runtime-health assertions**

  Fail on unexpected console errors, uncaught page errors, required-resource failures, API error-envelope violations, or redacted production server errors. Keep expected negative authorization cases explicitly matched.

- [ ] **Step 6: Re-run Axe and runtime checks**

  Run: `pnpm test:e2e -- tests/e2e/phase-1-6-accessibility.spec.ts tests/e2e/error-validation.spec.ts --project=desktop-chromium`

  Run: `pnpm ci:http-smoke`

  Run: `pnpm ci:server-log`

  Expected: no required Axe or unexplained runtime-health failure.

- [ ] **Step 7: Commit accessibility infrastructure**

  ```bash
  git add tests/e2e/support/accessibility.ts tests/e2e/phase-1-6-accessibility.spec.ts tests/e2e/error-validation.spec.ts scripts/ci/check-server-log.mjs scripts/ci/http-smoke.mjs
  git commit -m "test(a11y): enforce phase 1-6 browser accessibility"
  ```

### Task 6: Complete responsive, theme, and visual-parity coverage

**Files:**
- Modify: `playwright.config.ts`
- Create: `tests/e2e/phase-1-6-visual-parity.spec.ts`
- Modify: `tests/e2e/admin-theme-buttons.spec.ts`
- Modify: `tests/e2e/storefront-product-detail-parity.spec.ts`
- Modify: `scripts/checks/non-admin-style-smoke.mjs`
- Verify: `docs/architecture-migration/phase-0-baseline.md`
- Verify: `docs/architecture-migration/phase-0-playwright-evidence.md`

**Interfaces:**
- Consumes: immutable candidate SHA, Phase 0 route/presentation reference, production build, and deterministic database/auth fixtures.
- Produces: SHA-addressed screenshots for every required surface at exactly 375×812, 768×1024, and 1280×800 in light and dark themes.

- [ ] **Step 1: Add the visual matrix as data, not duplicated tests**

  Define route, actor, surface, ready condition, interaction state, and screenshot name for shell, homepage, catalogue, PDP, cart/checkout presentation, account, and every Phase 4–6 admin surface.

- [ ] **Step 2: Assert viewport, theme, overflow, and reduced motion**

  For every matrix entry, assert the exact project viewport, explicit light/dark theme, no page-level horizontal overflow, usable short-height overlays, and reduced-motion behavior where animation exists.

- [ ] **Step 3: Run all three projects to expose parity failures**

  Run: `pnpm test:e2e -- tests/e2e/phase-1-6-visual-parity.spec.ts tests/e2e/storefront-product-detail-parity.spec.ts tests/e2e/admin-theme-buttons.spec.ts`

  Expected: failures contain the surface, viewport, theme, screenshot path, and owning UI area. Existing Phase 0 evidence is never overwritten automatically.

- [ ] **Step 4: Repair only evidenced regressions**

  Route data/wiring failures to the owning phase. Route visual defects to the existing component and preserve tokens/classes wherever the defect is not visual.

- [ ] **Step 5: Re-run and conduct reviewer screenshot inspection**

  Run: `pnpm test:e2e -- tests/e2e/phase-1-6-visual-parity.spec.ts tests/e2e/storefront-product-detail-parity.spec.ts tests/e2e/admin-theme-buttons.spec.ts`

  Run: `pnpm test:styles:e2e`

  Expected: all projects pass and reviewer records no unexplained typography, spacing, colour, theme, imagery, component-position, or responsive delta.

- [ ] **Step 6: Commit browser parity coverage**

  ```bash
  git add playwright.config.ts tests/e2e/phase-1-6-visual-parity.spec.ts tests/e2e/storefront-product-detail-parity.spec.ts tests/e2e/admin-theme-buttons.spec.ts scripts/checks/non-admin-style-smoke.mjs
  git commit -m "test(ui): certify phase 1-6 visual parity"
  ```

### Task 7: Certify Phase 6 before final aggregation

**Files:**
- Modify: `docs/architecture-migration/phase-6-storefront-state-status.md`
- Modify only if evidenced: Phase 6 files owned by Tasks 1–6

**Interfaces:**
- Consumes: passing Phase 6 unit/browser evidence and unchanged visual contract.
- Produces: a Phase 6 source-and-evidence handoff to WS8 without claiming Phase 7, Phase 8, or Phase 10 completion.

- [ ] **Step 1: Run Phase 6 static and unit gates**

  Run: `pnpm biome`

  Run: `pnpm check:architecture`

  Run: `pnpm typecheck`

  Run: `pnpm test -- src/stores src/modules/cart src/modules/storefront-shell src/modules/products/client`

  Expected: zero required failures.

- [ ] **Step 2: Run production build and pinned React Doctor**

  Run: `pnpm build`

  Run: `pnpm react-doctor`

  Expected: build passes; React Doctor log is retained and every changed-scope finding is resolved or proved pre-existing with file-level evidence. Advisory exit status alone is not acceptance.

- [ ] **Step 3: Run Phase 6 browser projects**

  Run: `pnpm test:e2e -- tests/e2e/phase-6-storefront-state.spec.ts tests/e2e/storefront-client-state.spec.ts tests/e2e/phase-1-6-accessibility.spec.ts tests/e2e/phase-1-6-visual-parity.spec.ts`

  Expected: desktop, tablet, and mobile projects pass with both themes exercised by the specs.

- [ ] **Step 4: Update only executed Phase 6 evidence**

  Record commands, exit codes, SHA, artifacts, warnings, React Doctor disposition, and exclusions. Remove the stale Zustand lockfile blocker only after frozen installation is evidenced.

- [ ] **Step 5: Commit Phase 6 evidence status**

  ```bash
  git add docs/architecture-migration/phase-6-storefront-state-status.md
  git commit -m "docs(architecture): certify phase 6 state ownership"
  ```

### Task 8: Run same-SHA Phase 1–6 full certification

**Files:**
- Modify: `scripts/ci/run-gates.mjs`
- Modify: `scripts/ci/run-local-verification.mjs`
- Modify: `scripts/ci/merge-evidence.mjs`
- Modify: `scripts/ci/build-agent-handoff.mjs`
- Create or update: `docs/architecture-migration/phase-1-6-full-acceptance.md`
- Modify: `docs/architecture-migration/migration-tracker.md`
- Modify: `docs/architecture-migration/README.md`
- Modify: Phase 1–6 status documents only for final executed evidence

**Interfaces:**
- Consumes: all predecessor plans, final immutable SHA, frozen lockfile, WS6b persistence verdict, browser reports, Axe results, screenshots, React Doctor log, and reviewer decisions.
- Produces: one reject-on-missing evidence package and the only authorized 10/10 Phase 1–6 verdict.

- [ ] **Step 1: Write failing evidence-integrity tests**

  Add cases for missing manifest, malformed summary, required failure, skipped/cancelled/queued/zero-step suite, missing project, mixed SHA, mismatched lock digest, absent React Doctor disposition, and missing visual-review record.

- [ ] **Step 2: Run evidence tests and verify rejection**

  Run: `pnpm test -- scripts/ci`

  Expected: each invalid evidence fixture is rejected for its specific reason.

- [ ] **Step 3: Implement minimum aggregation corrections**

  Require full SHA and lock digest equality across context, static, database, tests, build, HTTP, browser, accessibility, visual, and handoff records. Preserve existing redaction.

- [ ] **Step 4: Freeze the candidate and run full source validation**

  Run: `pnpm install --frozen-lockfile`

  Run: `pnpm validate:full`

  Expected: frozen install makes no lockfile change; every required full-suite manifest passes on the frozen SHA.

- [ ] **Step 5: Run source-backed browser validation**

  Run: `pnpm validate:browser`

  Expected: all required Playwright projects, Axe checks, runtime health, screenshots, and visual review complete on the same SHA as Step 4.

- [ ] **Step 6: Merge and inspect evidence**

  Run: `pnpm ci:merge-evidence`

  Run: `pnpm ci:handoff`

  Expected: aggregation rejects nothing, all artifact paths open, all digests and SHAs agree, and no secret appears in the redacted logs.

- [ ] **Step 7: Reconcile the migration documents**

  Update stale branch, merge, queued-workflow, and Zustand-lock statements from retained evidence only. Mark Phases 1–6 accepted without implying Phases 7–10 are complete.

- [ ] **Step 8: Obtain the repository reviewer verdict**

  Reviewer inspects the final diff, manifests, logs, database matrix, React Doctor findings, console/network/server logs, screenshots, traces, accessibility report, and scope exclusions.

  Expected: reviewer issues PASS. Any repair creates a new SHA and reopens affected gates.

- [ ] **Step 9: Commit final certification records**

  ```bash
  git add scripts/ci docs/architecture-migration
  git commit -m "docs(architecture): certify phases 1 through 6"
  ```

## Plan Exit Gate

- Phase 6 unit, architecture, build, React Doctor, browser, accessibility, responsive, theme, persistence, and hydration evidence passes on the final SHA.
- `pnpm validate:full` and `pnpm validate:browser` both pass; neither substitutes for the other.
- Every evidence artifact is retained, redacted, readable, and SHA-consistent.
- The final reviewer reports zero unexplained UI change and zero unresolved changed-scope React Doctor finding.
- Documentation states the real Phase 7–10 status and preserves all prototype boundaries.
