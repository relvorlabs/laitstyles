# Phase 1–6 Full Acceptance Remediation Design

**Status:** Approved design for implementation planning

**Date:** 2026-07-26

**Controlling requirement:** `update.md`, Phases 1–6

**Repository branch observed during design:** `main`

**Repository head observed during design:** `418f7d44e2a6f903d1a067cd96143b062047fed7`
**Phase 0 preservation baseline:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`

## Objective and 10/10 definition

The objective is to turn the already-merged Phase 1–6 source work into one evidence-backed, exact-head acceptance result without entering Phase 7, Phase 8, or Phase 9 scope. Remediation is complete only when the same immutable commit satisfies every Phase 1–6 architecture, persistence, authorization, runtime, accessibility, responsive, and visual-preservation gate.

“10/10” has a strict binary meaning in this design. It is not an average score and cannot be reached by compensating for a missing category with strength in another category. All of the following must be true on one commit SHA:

1. The checked-out commit, dependency lock, generated Prisma client, database migration state, application build, server process, test reports, browser artifacts, and final documentation all identify the same SHA.
2. Phase 1 guards enforce the language, import, export, fixture, client/server, transport, and legacy-path rules without stale or broad exceptions.
3. Phase 2 has one root layout, one storefront route-group layout, one admin layout, correct provider scope, unchanged public URLs, and no shell or provider duplication.
4. Phase 3 supplies the documented HTTP envelopes, request validation, authentication and policy adapters, cancellation-aware browser client, request correlation, pagination metadata, and admin QueryClient policy.
5. Phase 4 Products and Inventory are Prisma-authoritative for lists, details, and writes; all three inventory modes (`unique`, `stocked`, `variant`) retain their invariants; successful mutations survive reload; and client transports use typed HTTP rather than Server Actions or local fallbacks.
6. Phase 5 Orders, Holds, Returns, Customers, Settings, and Overview satisfy their gates in that mandated order. Each migrated screen reads persisted data, each successful write survives reload, authorization is server-enforced, and no AdminStore/in-memory business-record owner remains.
7. Phase 6 assigns URL, TanStack Query, Zustand, local component state, and server state to their documented owners; persistence migration is hydration-safe; history restoration is exact; and overlays coordinate focus and body locking correctly.
8. A disposable real PostgreSQL database and the existing Supabase-compatible auth/session boundary prove persistence, reload, isolation, and role enforcement. A mocked repository, local array, fixture-backed production path, or `Promise.resolve()` wrapper does not count.
9. Source-backed Playwright covers the `update.md` preservation matrix at 375×812, 768×1024, and 1280×800 in light and dark themes, with Axe checks, console/request/server-log inspection, and human-reviewed screenshots against the Phase 0 baseline.
10. `pnpm validate:full` and `pnpm validate:browser`, plus the repository-owned evidence suites they invoke, pass on the same SHA with manifests, complete logs, exit codes, durations, and retained artifacts. Required failures, missing manifests, skipped commands, queued jobs, or deployment-only checks make the score less than 10/10.

No phase is accepted on source inspection alone. “Source complete,” “merged with debt,” “authored test,” and “queued workflow” are not synonyms for “passed.”

## Authority and architecture mapping

This design applies `update.md` through the target layers in `.agents/doctrine/architecture.md`:

| Layer | Phase 1–6 responsibility | Owning role |
| --- | --- | --- |
| `src/app/**` | Thin routes, route-group layouts, Server Component composition, Route Handlers, and narrow actions | Domain engineer for transports; UI engineer for client route composition |
| `src/modules/**` | Products, Inventory, Orders, Holds, Returns, Customers, Settings, Overview, Cart, Reviews, Storefront Shell contracts and implementations | Domain engineer for `server`/`client`; UI engineer for `ui` |
| `src/components/ui/**` | Existing generic UI primitives only | UI engineer |
| `src/providers/**` | Truly scoped query, theme, hydration, and storefront runtime boundaries | UI engineer |
| `src/stores/**` | Browser-owned cart, saved-item, and storefront overlay intent only | UI engineer |
| `src/hooks/**` | Cross-domain browser interaction hooks only | UI engineer |
| `src/lib/**` | HTTP, Prisma, Supabase, logging, errors, query-client, and other cross-cutting infrastructure | Domain or data engineer according to concern |
| `prisma/**`, `supabase/**` | Schema, migrations, database integrity, and hosted-auth configuration | Data engineer |
| `scripts/checks/**`, `scripts/ci/**`, `tests/e2e/**` | Guards, evidence generation, runtime smoke, and acceptance automation | Reviewer, with the owning engineer repairing failures in their layer |
| `docs/architecture-migration/**` | Acceptance ledger, evidence links, exceptions, and phase status | Planner and reviewer |

Dependencies must continue to point inward: app adapters compose modules; module UI consumes its own client contracts and shared primitives; browser clients use `src/lib/http`; module server code uses Prisma/auth infrastructure and never imports app, providers, stores, or UI. Server Components read domain queries directly. Route Handlers and Server Actions may call the same domain command but never each other.

## Current evidence baseline

The starting point is useful but not certifying:

- Phase 0 is recorded complete against baseline `6f5087f4aa08a5d9bce5989bad7b230344cdb493`, with a 15-test public Playwright run and retained artifact. The record also says that public deployment could not be cryptographically tied to the baseline; it is preservation reference material, not private-source proof for the current head.
- The tracker records Phase 1 merge `1ca1b184207ea2a36fa41c10162b8a059abe5289`, Phase 2 merge `558e34852f38f0982c7ce9d7c32422f09bbf8775`, Phase 3 merge `d7e3149c96f234d7deb41151ac603d6f652ceb4d`, Phase 4 merge `646ad2942ec2afbdb42e5269bad6d1993b01444b`, and Phase 5 merge `cd12b89e9ec2eb9210704e200e30731d864646e1`.
- Phases 1–5 are explicitly labelled “Merged with debt.” Their final private-source or Playwright workflows were queued or otherwise did not execute on their final merge heads.
- Phase 3 has historical evidence of database validation and 460 passing Vitest tests, but its status correctly rejects that evidence as final-head certification.
- Phase 4 documents canonical Products/Inventory modules, versioned APIs, typed browser clients, Prisma-backed commands, database pagination, transactional stock adjustments, and removed TanStack-to-Server-Action coupling. Its final-head gate remains unexecuted.
- Phase 5 documents source-complete migrations for Orders, Holds, Returns, Customers, Settings, and Overview, plus removal guards for AdminStore/repository/seed ownership. Database, runtime, browser, authorization, reload, and final-head evidence remain pending.
- Phase 6 documents focused Zustand stores, versioned hydration, URL-owned catalogue navigation, a shared hold clock, overlay coordination, and deleted legacy providers. It also records runtime certification as blocked.
- The old Phase 6 status says the lockfile omitted Zustand. On the observed current head, `package.json` declares `zustand@^5.0.14` and `pnpm-lock.yaml` contains importer and package snapshots for `zustand@5.0.14`. The old blocker is therefore stale and must be re-tested with frozen installation rather than copied into the new verdict.
- The current head is `418f7d44e2a6f903d1a067cd96143b062047fed7` on `main`, whose subject is `docs(auth): establish Phase 7 implementation contract`. Phase 7 documentation exists, but Phase 7 implementation is excluded from this acceptance effort.
- `update.md` is untracked in the observed working tree and is treated as the user-provided controlling requirement. It must not be silently added, modified, or used as proof of a clean working tree.
- Current source inspection still finds bounded Phase 7/8 compatibility edges and auth imports under `src/server/auth/**`, as well as guard references to those edges. Those are judged only against the explicit exclusions and exact exception contract below; this remediation does not use them as permission for auth consolidation or checkout settlement.
- The repository exposes `pnpm validate`, `pnpm validate:full`, and `pnpm validate:browser`; `scripts/ci/run-gates.mjs` writes redacted logs, manifests, summaries, exit codes, and durations. Playwright already defines the required desktop, tablet, and mobile projects. Axe is installed, but coverage must be demonstrated across the required acceptance surfaces rather than inferred from the dependency.

Because this baseline contains stale status assertions and no complete same-SHA evidence bundle, the first action is provenance capture and the final action is documentation reconciliation. Historical green results can guide diagnosis but cannot be promoted into the new certificate.

## Recommended phase-gated sequence

Remediation follows the original phase order even though much of the source is already present. A workstream may audit ahead, but no downstream source change is accepted and no downstream phase verdict is updated until its predecessor gate passes.

```text
WS0 exact-head provenance
  → WS1 Phase 1 guards/import/export/docs
  → WS2a Phase 2 layouts/providers
  → WS2b Phase 3 HTTP foundation
  → WS6a disposable database/auth harness contract
  → WS3 Phase 4 Products then Inventory
  → WS4 Orders → Holds → Returns → Customers → Settings → Overview
  → WS5 Phase 6 state/hydration/overlays
  → WS6b cross-domain real-DB persistence/reload/auth verdict
  → WS7 Playwright/Axe/visual parity
  → WS8 same-SHA full certification and documentation
```

WS6 is deliberately split across the sequence. WS6a establishes the disposable database and inherited auth-test harness after the Phase 3 transport contract passes and before WS3 changes Product or Inventory code. WS6b issues the cross-domain persistence, reload, and authorization verdict only after WS5. This permits each domain workstream to run real persistence tests as it works while preserving one final end-to-end database gate. WS7 may author characterization coverage earlier, but baseline updates and acceptance claims wait for the owning phase to pass. WS8 performs no opportunistic product work; any failure routes back to the owning workstream and invalidates all later evidence until a new candidate SHA is frozen.

## Exact path ownership and workstream gates

Ownership below is exclusive within the active workstream. Shared evidence and CI paths transfer to a later workstream only through the documented handoff; two workstreams never edit them concurrently. A path not listed for a workstream remains unchanged unless the planner records a narrow amendment before implementation. When a test exposes a production defect, the test owner reports it and the production path owner makes the repair.

### WS0 — Exact-head provenance and clean candidate control

**Owned paths**

- `docs/architecture-migration/phase-1-6-full-acceptance.md` — create the live ledger with candidate SHA, parent SHA, branch, dirty-tree inventory, tool versions, environment identity, database identity hash, and evidence index.
- `ci-evidence/phase-1-6-full-acceptance/context/` — generated context manifest and redacted command output; never hand-edit generated evidence.
- `scripts/ci/collect-context.mjs` — change only if it cannot record the required SHA/tool/database provenance.
- `scripts/ci/lib.mjs` — change only for a demonstrated redaction or manifest-integrity defect.

**Dependencies and interface**

- Consumes the current Git commit, `git status --short`, `package.json`, `pnpm-lock.yaml`, Node/pnpm versions, Prisma version, Playwright browser version, and sanitized database endpoint identity.
- Produces `candidateSha`, `parentSha`, `branch`, `workingTreeEntries`, `nodeVersion`, `pnpmVersion`, `lockfileDigest`, `databaseIdentityDigest`, and `capturedAt`. Every later manifest must match `candidateSha` and `lockfileDigest`.
- The untracked controlling `update.md` and any user-owned files are recorded, not modified or staged.

**Acceptance gate**

- The candidate is an immutable commit, not an uncommitted tree state.
- `pnpm install --frozen-lockfile` succeeds with pnpm 11.13.0 and does not change `pnpm-lock.yaml`.
- The generated context manifest, Git output, and evidence directory agree on the full 40-character SHA.
- Secrets, raw connection strings, cookies, tokens, and auth credentials are absent from logs.
- Any later source or test change creates a new candidate SHA and restarts WS0; evidence from the prior SHA remains historical only.

### WS1 — Phase 1 guards, import/export integrity, and architecture records

**Owned paths**

- `scripts/checks/architecture-guard.mjs`
- `scripts/checks/architecture-legacy-exceptions.mjs`
- `scripts/checks/module-export-guard.mjs`
- `scripts/checks/error-validation-contract.mjs`
- `scripts/checks/layout-provider-contract.mjs`
- `scripts/checks/http-module-contract.mjs`
- `src/lib/boundaries/app-provider-boundary.test.ts`
- `src/lib/boundaries/server-client-boundary.test.ts`
- `src/lib/boundaries/storefront-state-boundary.test.ts`
- `src/modules/admin-persistence-boundary.test.ts`
- `src/modules/products/product-module-boundaries.test.ts`
- `scripts/checks/storefront-server-boundary.test.ts`
- `docs/architecture-migration/phase-1-domain-status.md`
- `docs/architecture-migration/phase-1-legacy-exceptions.md`
- `docs/architecture-migration/migration-tracker.md` for Phase 1 evidence only; WS8 owns the final cross-phase verdict.

Source-specific broken imports or exports are repaired by the workstream that owns the importing consumer. WS1 owns the guard and the failure inventory, not unrelated module implementation.

**Dependencies and interface**

- Consumes WS0 provenance and the current import/export graph.
- Produces a zero-error graph report and a machine-readable exception set whose entries include exact importer, exact imported path or symbol, reason, owner, and removal phase.
- The only accepted future-phase compatibility is an exact Phase 7 auth edge and an exact Phase 8 checkout edge already documented in the repository. No wildcard export, runtime-value expansion, second consumer, or “temporary” unowned exception is permitted.
- Guards must compare `catalog`/`catalogue` debt without rejecting legitimate external package names or database fields; changed production code may not add American-spelled catalogue ownership.

**Acceptance gate**

- `pnpm check:architecture` passes on the WS0 candidate or its explicitly refreshed successor.
- `pnpm typecheck` proves every relative and aliased production import resolves and every named/default export exists.
- Production source cannot import fixtures or seed scripts; Client Components cannot import Prisma or server modules; TanStack hooks cannot import Server Actions; Route Handlers cannot import Server Actions; Server Components cannot fetch internal APIs for their own reads.
- New business modules under `src/features/**` and top-level `src/server/**` are rejected. The exact Phase 7 auth deferral remains named, bounded, and non-expanding.
- Phase 1 language and migration records match the current source and no longer repeat the obsolete Zustand lockfile blocker.

### WS2 — Phase 2 layouts/providers and Phase 3 HTTP foundation

WS2 is split into two gates because `update.md` forbids Phase 3 acceptance before Phase 2 passes.

**WS2a owned paths — Phase 2**

- `src/app/layout.tsx`
- `src/app/(storefront)/layout.tsx`
- `src/app/admin/layout.tsx`
- `src/app/storefront-route-boundary.tsx`
- `src/app/storefront-client-boundary.tsx`
- `src/providers/providers.tsx`
- `src/providers/theme-provider.tsx`
- `src/providers/query-provider.tsx`
- `src/providers/storefront-query-provider.tsx`
- `src/lib/query/create-query-client.ts`
- `src/lib/query/admin-query-client.ts`
- `src/lib/query/storefront-query-client.ts`
- Route placement beneath `src/app/(storefront)/(home)/**`, `src/app/(storefront)/products/**`, `src/app/(storefront)/collections/**`, `src/app/(storefront)/cart/**`, `src/app/(storefront)/checkout/**`, `src/app/(storefront)/order-confirmation/**`, and `src/app/(storefront)/account/**`; page presentation remains owned by its domain/UI workstream.
- `docs/architecture-migration/phase-2-layout-provider-status.md`

**WS2a acceptance gate**

- The Phase 0 route manifest resolves at identical public URLs and redirects.
- Root owns only theme/toaster and truly global infrastructure; admin and storefront query providers appear only where their consumers require them.
- No forwarding layout, duplicate storefront boundary, account double-wrap, header/footer duplication, portal break, or hydration warning remains.
- Focused layout/provider guards, Biome, TypeScript, build, and route-level browser smoke pass before WS2b begins.

**WS2b owned paths — Phase 3**

- `src/lib/http/contracts.ts`
- `src/lib/http/client.ts`
- `src/lib/http/request.ts`
- `src/lib/http/request-context.ts`
- `src/lib/http/server.ts`
- `src/lib/http/auth.ts`
- `src/lib/http/policy.ts`
- `src/lib/http/pagination.ts`
- Colocated `src/lib/http/*.test.ts`
- `src/lib/errors/api-error.ts`
- `src/lib/errors/index.ts`
- `src/lib/logger.ts`
- `src/modules/health/schema.ts`
- `src/modules/health/server/queries.ts`
- `src/modules/health/client/api.ts`
- `src/app/api/v1/health/route.ts`
- `src/app/api/v1/health/route.test.ts`
- `src/lib/query/admin-query-client.ts` and `src/lib/query/admin-query-client.test.ts` for Phase 3 cache defaults
- `docs/architecture-migration/phase-3-http-module-status.md`
- `docs/architecture-migration/phase-3-cache-invalidation-contract.md`

**WS2b interface and acceptance gate**

- Produces the stable success envelope `{ data, meta? }`, error envelope `{ error: { code, message, fieldErrors? } }`, and page metadata `{ page, pageSize, total, pageCount }` used by WS3 and WS4.
- Produces cancellation-preserving typed fetch, JSON/content-type validation, stable malformed-response errors, request IDs, structured logging, session/consumer/staff adapters, and thin Route Handler helpers.
- Health contract tests and HTTP smoke prove success parsing, validation failure, authentication failure, permission failure, query cancellation, request correlation, and typed response handling.
- The abstraction remains direct and function-based; no generic service/repository layer is introduced.
- `pnpm check:architecture`, focused HTTP tests, HTTP smoke, Biome, TypeScript, and build pass before WS3.

### WS3 — Phase 4 Products and Inventory

**Owned paths**

- `src/modules/products/schema.ts`
- `src/modules/products/types.ts`
- `src/modules/products/editor-schema.ts`
- `src/modules/products/storefront-types.ts`
- `src/modules/products/storefront/**`
- `src/modules/products/server/**`
- `src/modules/products/client/**`
- `src/app/api/v1/products/**`
- `src/app/api/v1/admin/products/**`
- `src/modules/inventory/schema.ts`
- `src/modules/inventory/types.ts`
- `src/modules/inventory/server/**`
- `src/modules/inventory/client/**`
- `src/app/api/v1/admin/inventory/**`
- Product and inventory transport consumers beneath `src/features/admin/inventory/**` and `src/features/admin/product-editor/**`; visual JSX/classes are preserved and WS7 owns parity judgment.
- Product/inventory compatibility files beneath `src/server/commerce/catalogue/**`, `src/server/commerce/inventory/**`, `src/lib/storefront/types.ts`, and `src/lib/admin/product-editor/**` only when required to remove duplicate logic or make an exact export-only shim truthful. Broad Phase 9 deletion is excluded.
- `docs/architecture-migration/phase-4-products-inventory-status.md`
- `docs/architecture-migration/phase-4-implementation-report.md`

**Dependencies and interface**

- Consumes WS2 HTTP envelopes, typed browser client, staff/public policy adapters, request correlation, pagination metadata, and QueryClient defaults.
- Produces canonical Product definition/read models and Inventory stock/availability contracts for WS4, WS5, and WS6.
- `unique`, `stocked`, and `variant` remain a discriminated union. Product may exist with zero Inventory. Catalogue remains a published Product read model, never a CRUD owner.
- Server reads call Prisma directly; interactive browser reads/mutations use typed client → `/api/v1/**` → domain query/command → Prisma.

**Acceptance gate**

- Public/admin Product list and detail are database-backed; create, update, publish, archive, restore, and supported delete semantics persist across a fresh browser reload and a fresh server process.
- Inventory list, stock movements, and adjustments are database-backed, paginated in PostgreSQL, transaction-safe, and preserve non-negative/committed-stock/concurrency rules.
- Authorization tests prove anonymous/customer/staff capability boundaries; validation and error envelopes match WS2 contracts.
- Cache mutation behavior uses authoritative replacement or targeted invalidation; no duplicate AdminStore, local array, browser repository, or silent fixture fallback restores stale data.
- Product cards, catalogue, PDP, inventory tables, and product editor retain Phase 0 content, images, pricing, badges, variants, responsive composition, and interaction behavior.
- Focused domain/API/database tests, architecture guards, Biome, TypeScript, Prisma validation/migration, HTTP smoke, build, and relevant Playwright tests pass before WS4.

### WS4 — Phase 5 admin domains in mandated order

WS4 is one workstream with six serial sub-gates. A later domain may be inspected, but may not be accepted or used to close earlier debt before its predecessor passes.

**Shared owned paths**

- `src/modules/admin-persistence-boundary.test.ts`
- `src/lib/query/admin-query-client.ts`
- `src/app/admin/**` only for server/client data composition; visual component changes require a proven parity defect.
- Domain-specific admin UI consumers under the matching `src/features/admin/<domain>/**` and helpers under the matching `src/lib/admin/<domain>/**`. Existing legacy UI may be repaired or moved, but no new business owner is created there.
- `docs/architecture-migration/phase-5-mission.md`
- `docs/architecture-migration/phase-5-admin-dummy-domain-status.md`

**Sub-gate 1 — Orders**

- Owns `src/modules/orders/**`, `src/app/api/v1/admin/orders/**`, `src/app/(storefront)/account/orders/**` server-read composition, `src/features/admin/orders/**`, and `src/lib/admin/orders/**`.
- Proves paginated lists/details, allowed status transitions, account ownership, offline-sale draft creation, exact reservation linkage, pending-payment semantics, and reload persistence. Phase 8 settlement, confirmation, fulfilment after payment, and stock commitment remain excluded.

**Sub-gate 2 — Holds and reservations**

- Owns `src/modules/holds/**`, `src/app/api/v1/admin/holds/**`, and `src/app/admin/holds/**` data composition.
- Proves transaction-safe create/read/extend/release/convert behavior, expiry rules, actor capabilities, reservation continuity into pending Orders, and no client-authoritative stock state.

**Sub-gate 3 — Returns**

- Owns `src/modules/returns/**`, `src/app/api/v1/admin/returns/**`, `src/app/admin/returns/**` data composition, and `src/features/admin/returns/**`.
- Proves eligible-order lookup, create/detail/list, allowed transitions, ownership/capability rules, idempotent rejection of duplicate or invalid transitions, and reload persistence. Payment refunds or financial settlement remain Phase 8 scope.

**Sub-gate 4 — Customers**

- Owns `src/modules/customers/**`, `src/app/api/v1/admin/customers/**`, `src/app/admin/customers/**` data composition, `src/features/admin/customers/**`, and `src/lib/admin/customers/**`.
- Proves database-backed pagination/detail/timeline/notes, server-enforced staff access, customer isolation, deterministic ordering, and durable notes after reload.

**Sub-gate 5 — Settings**

- Owns `src/modules/settings/**`, `src/app/api/v1/admin/settings/**`, `src/app/admin/settings/**`, `src/features/admin/settings/**`, and `src/lib/admin/settings/**`.
- Proves persisted defaults are created only through an intentional server boundary, writes survive restart, concurrent updates do not silently clobber data, validation is structured, and unauthorized clients cannot read or mutate staff settings.

**Sub-gate 6 — Overview/reporting projections**

- Owns `src/modules/overview/**`, `src/app/api/v1/admin/overview/**`, `src/app/admin/page.tsx` data composition, and `src/features/admin/overview/**`.
- Proves every figure is a read projection over persisted Product/Inventory/Order/Hold/Return/Customer data, with no seeded “sales pulse,” in-memory snapshot, or separate write owner. Decorative animation may remain deterministic presentation and must not be described as live server state.

**WS4 acceptance gate**

- Each sub-gate passes focused API, policy, persistence, invalidation, reload, and browser tests before the next sub-gate is accepted.
- No production admin screen imports a seed, fixture, AdminStore, AdminRepositories, in-memory repository, or manual QueryClient/AdminStore synchronization.
- All list APIs implement database pagination with stable sorting; all expected failures use structured domain/API errors.
- Phase 5 UI, table behavior, filters, dialogs, drawers, status transitions, and responsive sidebar remain visually unchanged.
- Full Phase 5 architecture, database, Vitest, HTTP smoke, build, React Doctor, and admin Playwright gates pass before WS5.

### WS5 — Phase 6 state, hydration, URL ownership, and overlays

**Owned paths**

- `src/stores/cart.store.ts` and `src/stores/cart.store.test.ts`
- `src/stores/saved-items.store.ts` and `src/stores/saved-items.store.test.ts`
- `src/stores/storefront-ui.store.ts` and `src/stores/storefront-ui.store.test.ts`
- `src/stores/storefront-state-boundary.test.ts`
- `src/providers/storefront-state-hydrator.tsx`
- `src/providers/storefront-query-provider.tsx`
- `src/modules/cart/**`
- `src/modules/storefront-shell/client/**`
- `src/modules/storefront-shell/ui/**` only for state wiring; visible output remains frozen
- `src/modules/products/client/catalogue-search-params.ts`
- `src/modules/products/client/use-catalogue-navigation.ts`
- `src/modules/products/client/storefront-catalogue.ts`
- `src/modules/products/ui/storefront/product-catalogue.tsx`
- `src/modules/products/ui/storefront/overlays/**`
- Storefront interaction hooks in `src/hooks/**`
- Exact Phase 6 compatibility edges in `src/features/storefront/shared/**`; WS5 may shrink or delete a Phase 6 edge after consumer cutover but may not perform Phase 7 auth or Phase 8 checkout migrations.
- `docs/architecture-migration/phase-6-storefront-state-status.md`

**Dependencies and interface**

- Consumes WS3 canonical Product projections and WS4 persisted Order/Hold facts. Product records and remote collections never become store payloads.
- Produces versioned persisted intents containing only product IDs, variant IDs, quantities, saved IDs, browser hold expiries, and documented UI preferences.
- URL search parameters own catalogue filters, sorting, search, pagination, and history. One navigation implementation owns mutations.
- TanStack Query owns remote catalogue cache. Zustand owns shared browser intent and overlay identity. Component-local interactions remain local. Auth/permissions remain server/session-owned.

**Acceptance gate**

- Frozen installation proves the reconciled Zustand lock; storage migration from the recorded version-3 snapshot preserves supported cart/saved/hold intents and rejects malformed or stale data safely.
- Server and first client render match without hydration warnings, flicker-driven state corruption, or duplicate catalogue fetch ownership.
- Cart and saved IDs survive the intended navigation/storage lifetime; canonical joins handle deleted/unpublished Products and unavailable variants without restoring complete stale Product objects.
- Back/forward restores the exact filter, sort, search, and page state with no URL/context loop.
- One shared hold clock serves all countdowns. Expiry cleanup is deterministic.
- At most one storefront overlay owns focus/body lock; opening quick view, image viewer, search, saved items, cart, auth dialog, or information overlays closes or suspends the prior surface according to the documented transition contract. Escape, close controls, and focus return work.
- Header scroll, newsletter, delivery estimate, image viewer, and measurement state reside at their narrow approved boundaries and do not trigger unrelated global rerenders.
- Focused Zustand/hydration/history/overlay tests, architecture guards, TypeScript, build, and Phase 6 Playwright pass before the cross-domain WS6 verdict.

### WS6 — Real database persistence, reload, and authorization harness

WS6 has two gates. **WS6a**, executed after WS2b and before WS3, proves the disposable database can be migrated, seeded, isolated, and addressed through deterministic inherited auth actors. **WS6b**, executed after WS5, runs the complete cross-domain mutation → restart/reload → authoritative-read matrix and issues the final persistence/authorization verdict. WS3–WS5 may consume only the WS6a harness contract; they cannot pre-claim the WS6b verdict.

**Owned paths**

- `prisma/schema.prisma`
- `prisma/auth-profile.prisma`
- `prisma/product-variant-measurements.prisma`
- `prisma/migrations/**` excluding `prisma/migrations-archive-20260723153441/**`
- `supabase/config.toml`
- `supabase/migrations/laitstyles-auth-and-integrity.sql`
- `src/lib/prisma/**`
- `src/lib/supabase/**`
- `scripts/seed/seed-storefront.ts`
- `scripts/seed/import-catalog-snapshot.ts`
- `scripts/seed/catalog-*.ts` and their colocated tests
- `scripts/auth/setup-local-auth.mjs`
- `scripts/auth/run-auth-e2e.mjs`
- `scripts/bootstrap-owner.mjs`
- Database/auth portions of `scripts/ci/run-gates.mjs` and `scripts/ci/run-local-verification.mjs`
- A new `tests/persistence/phase-1-6-persistence.test.ts` only if existing colocated domain tests cannot express the cross-process reload matrix without duplication.

Schema or migration changes are permitted only when a Phase 1–6 invariant cannot be met by the existing schema. They require the data engineer to document forward migration, compatibility, and rollback. The default is to test the current schema, not redesign it.

**Dependencies and interface**

- Supplies a disposable PostgreSQL 17 database through `DATABASE_URL` and `DIRECT_URL`, deploys committed migrations, seeds deterministic test identities/data, and returns only opaque actor/session handles to tests.
- Uses existing Supabase-compatible session/profile behavior to create anonymous, customer, suspended, staff-with-capability, and staff-without-capability cases. It does not move auth ownership into `src/modules/auth/**` or alter user-visible auth flows.
- Produces a cross-domain persistence matrix: mutation response → database read → fresh server process → fresh browser context → authoritative UI/API read.

**Acceptance gate**

- `pnpm prisma:validate`, `pnpm prisma:migrate:deploy`, and `pnpm prisma:migrate:status` pass against a disposable database on the candidate SHA.
- Products, Inventory, Orders, Holds, Returns, Customers, and Settings writes survive a server restart and fresh browser context; Overview immediately reflects authoritative persisted records after the documented invalidation/freshness boundary.
- Tests prove rollback/atomicity for stock adjustment, reservation/order coupling, and other Phase 1–6 multi-step transitions. No test points at production or a shared developer database.
- Authorization is enforced at domain/transport boundaries, not by hidden UI. Actor isolation and missing-capability behavior return stable WS2 errors without leaking records.
- Seed/fixture material is used only for explicit test/bootstrap setup; no production import chain reaches it and no successful mutation is silently replaced by seed data on reload.
- Logs and evidence redact connection strings, passwords, keys, tokens, cookies, and personal data.

### WS7 — Playwright, Axe, and visual parity

**Owned paths**

- `playwright.config.ts`
- `tests/e2e/storefront-product-detail-parity.spec.ts`
- `tests/e2e/storefront-client-state.spec.ts`
- `tests/e2e/phase-6-storefront-state.spec.ts`
- `tests/e2e/error-validation.spec.ts`
- `tests/e2e/admin-theme-buttons.spec.ts`
- `tests/e2e/auth-flows.spec.ts` only for inherited authentication/role-guard behavior; no Phase 7 feature expectations
- Additional focused files under `tests/e2e/phase-1-6-*.spec.ts` when a preservation-matrix surface has no existing owner
- `scripts/checks/non-admin-style-smoke.mjs`
- `scripts/ci/http-smoke.mjs`
- `scripts/ci/check-server-log.mjs`
- Generated `ci-evidence/phase-1-6-full-acceptance/browser/**`, `test-results/**`, and `playwright-report/**`

**Dependencies and interface**

- Consumes the WS0 candidate SHA, WS6 disposable database/auth actors, the production build, and Phase 0 route/screenshot/interaction records.
- Produces project-specific results for `desktop-chromium` 1280×800, `tablet-chromium` 768×1024, and `mobile-chromium` 375×812 in both light and dark themes.
- Every screenshot name includes route/surface, viewport project, theme, and candidate SHA. Baseline changes require an explicit, evidence-backed defect decision; migration work does not auto-approve diffs.

**Acceptance gate**

- Storefront shell: header/footer, mobile navigation, theme toggle, reduced motion, focus order, and horizontal-overflow checks pass.
- Homepage: composition order, hero, product cards, featured sections, and responsive stacking match Phase 0.
- Catalogue: filters, sorting, pagination, history restoration, desktop controls, mobile drawers, loading/empty/error states, and card layout pass.
- PDP: gallery/viewer, selections, quantity, save, add-to-cart, typography, responsive composition, and unavailable states pass.
- Cart/account/admin: persistence, order list/detail, profile/addresses navigation, role guards, product/inventory/order/customer/return/settings/overview workflows, dialogs/drawers, and responsive sidebar pass. Checkout is checked only for preserved Phase 6-era presentation and interactions; Phase 8 payment-success/settlement claims are excluded.
- Axe reports no new serious or critical violations on primary routes and overlays; icon controls have names, dialogs/sheets/drawers have titles, statuses are not colour-only, focus is trapped/returned, and keyboard/Escape behavior is correct.
- Browser console, page errors, failed requests, and production server logs contain no unexplained errors. Screenshots are reviewed by a human/reviewer, not merely generated.
- Any visual or accessibility repair is routed to the owning UI path and produces a new candidate SHA, invalidating prior WS7 results.

### WS8 — Same-SHA full certification and documentation reconciliation

**Owned paths**

- `scripts/ci/run-gates.mjs`
- `scripts/ci/run-local-verification.mjs`
- `scripts/ci/merge-evidence.mjs`
- `scripts/ci/build-agent-handoff.mjs`
- `docs/architecture-migration/phase-1-6-full-acceptance.md`
- `docs/architecture-migration/migration-tracker.md`
- `docs/architecture-migration/README.md`
- Phase status documents for Phases 1–6, limited to final evidence links, obsolete-blocker correction, and verdict reconciliation
- Generated `ci-evidence/phase-1-6-full-acceptance/**`

Existing workflow files under `.github/workflows/**` are not implementation scope. They may execute the repository suites, but a workflow edit is permitted only if the reviewer proves that the repository-owned same-SHA suite cannot run because of a workflow wiring defect. Runner availability or billing is not solved by weakening a gate.

**Acceptance gate**

- Freeze a final candidate SHA after all repairs. Run frozen install and provenance capture, then `pnpm validate:full` and `pnpm validate:browser` with the WS6 database/app/auth harness.
- Required underlying suites include architecture/module-export/error/layout/HTTP guards, button audit, Biome, TypeScript, Prisma validation/deploy/status, complete Vitest with coverage, production build, pinned React Doctor, HTTP smoke, server-log inspection, and all three Playwright projects.
- Every manifest reports the final SHA and successful required gates. React Doctor remains advisory at process exit only as doctrine permits; every finding touching changed scope is resolved or proved pre-existing with file-level evidence.
- Merge evidence rejects a missing, malformed, mismatched-SHA, skipped, cancelled, queued, zero-step, or required-failed result.
- Final documentation states exactly what changed, actual commands, exit codes, artifact paths/digests, viewport/theme review, warnings, limitations, exclusions, and any recorded doctrine override.
- The tracker marks Phases 1–6 accepted only after all gates above pass. It leaves Phases 7–9 in their real state and does not imply the complete architecture migration or Phase 10 release gate is finished.

## Cross-workstream dependency contracts

| Producer | Consumer | Required interface |
| --- | --- | --- |
| WS0 | WS1–WS8 | Immutable candidate SHA, lockfile digest, clean/recorded working-tree state, redacted environment identity |
| WS1 | WS2–WS8 | Passing import/export/architecture guard and exact bounded exception ledger |
| WS2a | WS2b, WS5, WS7 | Stable route URLs, provider placement, shell composition, no duplicate boundary |
| WS2b | WS3, WS4, WS6, WS7 | Stable API envelopes, typed/cancellable browser client, auth/policy adapters, request IDs, pagination |
| WS3 | WS4, WS5, WS6, WS7 | Canonical Product/Inventory DTOs and persisted stock authority |
| WS4 Orders | WS4 Holds/Returns/Customers/Overview, WS6 | Persisted Order contracts and legal transition model |
| WS4 Holds | WS4 Returns/Overview, WS5, WS6 | Persisted reservation/hold facts; browser hold intent remains non-authoritative |
| WS4 Returns/Customers/Settings | WS4 Overview, WS6, WS7 | Persisted domain data and stable API/error contracts |
| WS5 | WS6, WS7 | Versioned browser-state contract, hydration completion signal, URL-navigation and overlay contracts |
| WS6 | WS3–WS5 tests, WS7, WS8 | Disposable migrated DB, deterministic actors/data, restart/reload driver, secret-safe evidence |
| WS7 | WS8 | Browser reports, Axe output, screenshots, traces, console/network/server-log review tied to final SHA |

An interface change after a consumer gate passes reopens that consumer gate. A new commit always reopens WS0 and WS8, and reopens every validation category affected by the diff.

## Explicit exclusions

The following are not part of Phase 1–6 full acceptance:

- **Phase 7 authentication consolidation:** do not move `src/server/auth/**` into `src/modules/auth/**`, merge auth providers, redesign auth routes/forms, alter Supabase sign-in semantics, or delete auth compatibility edges. WS6 may only exercise the inherited auth/session boundary to prove Phase 1–6 authorization.
- **Phase 8 checkout/payment settlement:** do not add idempotent payment settlement, webhook settlement, confirmed-payment stock commitment, delivery creation, refund settlement, or server-authoritative checkout redesign. Existing pending-payment boundaries must remain honest. Browser parity must not claim real payment success where it does not exist.
- **Phase 9 broad deletion:** do not remove all `src/features/**`, top-level `src/server/**`, compatibility exports, legacy assets, or shell code merely because the target architecture ultimately retires them. Delete only an exact Phase 1–6 duplicate whose consumers are already cut over and whose guard/test proves removal safety.
- **UI redesign:** no new visual language, layout, card, typography, colour, spacing, animation, dialog system, navigation model, copy refresh, or responsive redesign. A verified existing defect may be fixed only with an explicit baseline decision and reviewer evidence.
- **Speculative APIs or abstractions:** no unused endpoints, generic CRUD framework, repository per Prisma model, service-class layer, second modal system, speculative polling, or browser API for Server Component-only reads.
- **Dependency or framework upgrades:** keep Node 25.x, pnpm 11.13.0, Next 16.2.10, React 19.2.4, Prisma 7.8.0, Playwright 1.61.x, React Doctor 0.7.2, and the existing dependency set. Lockfile reconciliation is allowed; version upgrades and unrelated audit remediation are separate decisions.
- **Phase 0 recapture and Phase 10 release:** Phase 0 evidence is the preservation baseline and may be supplemented with current exact-head comparisons, not rewritten. This design certifies Phases 1–6 only and does not claim Phase 10 release readiness.
- Supplier management, accounting, warehouse management, marketing automation, platform administration, and any capability outside `update.md` remain excluded.

## Risks, controls, and rollback

| Risk | Control | Rollback boundary |
| --- | --- | --- |
| Stale status documents are mistaken for current source truth | WS0 captures current SHA and WS8 reconciles documents only from executed evidence | Revert documentation-only verdict changes; retain raw evidence |
| A repair drifts into Phase 7/8/9 | Exact ownership tables, bounded compatibility ledger, phase gate review | Revert the offending workstream commit; restore only the documented compatibility edge |
| Database tests mutate shared or production data | Require disposable PostgreSQL identity and deny known production/shared endpoints | Destroy the disposable database; revert schema/migration commit as a unit before deployment |
| A migration is not backward-safe | Data engineer records forward/rollback SQL and validates deploy from the Phase 5 merge lineage | Revert application use first; apply the reviewed compensating migration rather than editing applied SQL |
| Cache success hides failed persistence | WS6 validates direct DB read, fresh process, fresh browser, and authoritative response after every representative write | Revert the domain workstream commit and keep the prior persisted path active |
| UI drift is normalized through screenshot updates | Phase 0 is read-only; reviewer must approve every changed pixel as a verified defect | Revert the UI/wiring change; never bless an unexplained baseline diff |
| Parallel edits collide across shared app/query/CI files | Exclusive path ownership; cross-owner interface changes require a recorded handoff | Stop integration, restore the last accepted workstream boundary, then rebase the dependent workstream |
| Evidence from different commits is combined | SHA embedded in context, suite manifests, screenshot names, and final merge evidence | Discard mixed evidence and rerun all affected suites on one new candidate SHA |
| Flaky browser behavior is hidden by retries | Retain traces/videos; rerun the failing test diagnostically and require deterministic pass without unexplained intermittent errors | Revert the behavior change or keep the phase unaccepted |
| Secrets or customer data enter artifacts | Existing redaction plus explicit secret scan before publication | Quarantine/delete the artifact, rotate exposed credentials, then regenerate evidence |

Rollback is phase-local until a downstream interface consumes the change. Once consumed, roll back the producer and all dependent workstream commits together. Never use partial filesystem restoration that recreates duplicate providers, data owners, or compatibility implementations. Database rollback uses reviewed migrations, not destructive reset against a shared environment.

## Completion evidence package

The final reviewer must be able to open one evidence index and verify the verdict without relying on chat history. The package contains:

1. `context/manifest.json` with final SHA, branch, parent, lock digest, tool versions, timestamps, and redacted database identity.
2. Frozen-install log and exit code proving the committed lock installs unchanged.
3. Static suite manifest/logs for architecture, module exports, layout/provider, HTTP, error/validation, button audit, Biome, and TypeScript.
4. Database suite manifest/logs for Prisma validate, migrate deploy, migrate status, seed/bootstrap, authorization matrix, transaction rollback, and cross-process persistence/reload.
5. Test suite manifest/logs with focused domain tests and full Vitest coverage.
6. Build suite manifest/logs for Prisma generation and the production Next.js build, plus pinned React Doctor output and disposition of every changed-scope finding.
7. HTTP smoke and server-log reports covering success, validation, authentication, permission, correlation, pagination, cancellation, and unexpected-error sanitization.
8. Playwright JSON/JUnit/HTML output for desktop, tablet, and mobile; Axe reports; screenshots for both themes; traces/videos for investigated failures; and a signed reviewer visual-parity checklist.
9. A persistence matrix naming each representative Product, Inventory, Order, Hold, Return, Customer, and Settings mutation and showing response, DB verification, restart/reload verification, and authoritative read result. Overview is evidenced as a projection over those records.
10. Final diff review covering scope drift, dependency changes, retired/expanded compatibility edges, dead navigation, hidden fixture fallbacks, unresolved imports, oversized files, and accidental UI/copy changes.
11. Updated Phase 1–6 status documents and migration tracker with direct artifact paths/digests, exact commands, exit codes, warnings, limitations, and the statement that Phases 7–9 remain excluded/unaccepted.

The acceptance certificate is invalid if any required item is absent, points to another SHA, cannot be opened, contains an unreviewed required failure, or describes an unexecuted behavior as passed.

## Final handoff

The orchestrator should dispatch implementation in the sequence above to the data, domain, UI, and reviewer roles named by repository doctrine. Each workstream ends at its own acceptance gate and hands its exact interfaces and evidence forward. The reviewer owns the final same-SHA gate and completion report; engineers own repairs only in their assigned paths. No implementation begins from a later phase merely because its source already exists.
