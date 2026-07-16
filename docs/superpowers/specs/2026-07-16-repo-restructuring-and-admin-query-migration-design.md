# Repository Structural Reorganization & Admin Server-State Migration — Design

## Status

Design accepted, pending user review of this written spec before the implementation plan is written (`superpowers:writing-plans`).

## Context

The user asked for a "complete file restructuring" of the Laitstyle repository: grouping/splitting large files, proper naming, clear hooks/server-actions/API-request/third-party-integration organization, and "proper caching." Investigation (recorded in full in this conversation, summarized here) found:

- The codebase is **not** generally disorganized. Recent git history shows a disciplined, incremental `refactor(admin): canonicalize X` pattern already in use. Most files are reasonably sized.
- `AGENTS.md` enforces a strict phase gate for Control Room V2: only the active phase may receive architecture changes. Current active phase per `docs/control-room-v2/progress.md` is **Phase 12 — TanStack Query server-state foundation**, itself already started "by direct user override" while Phase 10/11 remain blocked/unaccepted.
- The working tree already carries a large, unrelated in-flight diff (231 files, button-primitive canonicalization on `chore/admin-theme-button-audit`). This work is **not touched** by this spec or its implementation.
- Specific, concrete problems were found (not vague "messiness"): a 60-file flat `lib/admin/` directory, 11 files named `*-actions.ts` that are pure in-memory reducers and not Next.js Server Actions (a real mental-model trap), dead/orphaned components, stale 1-line re-export shims, a naming collision between two `session.ts` files in two different auth roots, two independently hand-rolled `QueryClientProvider` factories with zero query consumers between them, zero Next.js-level caching anywhere in the app, and one page (`checkout/page.tsx`, 1118 lines) that bundles a route, 13 presentational sub-components, and 4 helpers in a single file.
- Three parallel product/catalogue data sources and two simultaneously-mounted cart providers (`ShopProvider` legacy + `StorefrontProvider` current) were also found. This is a real problem but is **already tracked** in `docs/superpowers/plans/2026-07-13-product-field-reconciliation.md` and storefront-v2 docs — explicitly **out of scope** here to avoid silently absorbing or duplicating that effort.

## Governance note (required by AGENTS.md)

This spec authorizes a repo-wide structural and server-state pass across both Admin and Storefront surfaces, and extends the admin TanStack Query migration to all six domains with existing repository contracts (Inventory, Orders, Holds, Returns, Customers, Settings) rather than the Inventory-only sequencing that `docs/control-room-v2/phase12-plan.md` currently states as the starting point.

**This is a direct user override**, made explicitly and with full knowledge of the existing phase-12 sequencing (confirmed in conversation). Per `AGENTS.md` §3: *"A direct user override may permit planning or implementation of a later phase, but it never reclassifies an earlier blocked gate as passing."* Accordingly:

- Phase 10 and Phase 11 blockers remain recorded and blocked. Nothing here marks them accepted.
- No prototype adapter created or touched here is represented as production persistence, real authentication-gated data, or a real backend. The in-memory `AdminStore` remains the single source of truth; TanStack Query becomes a client-cache boundary in front of it, not a new backend.
- `docs/control-room-v2/progress.md` and `docs/control-room-v2/phase12-plan.md` get an update recording this override once the migration lands, so the tracker stays truthful.

## Goals

1. Reorganize file/folder structure for clarity: group the flat `lib/admin/` directory by sub-domain, remove dead code and stale shims, fix misleading names, split the one genuinely oversized file.
2. Establish (not mass-enforce) a clear convention for hooks, Server Actions vs. reducers, route handlers, and third-party integration wiring.
3. Consolidate duplicated infrastructure (two `QueryClientProvider` factories → one).
4. Add real caching where a genuine freshness/invalidation need exists (the Prisma-backed catalogue reads), via Cache Components — nowhere else.
5. Migrate all six admin domains with existing repository contracts off the monolithic `useSyncExternalStore` store and onto TanStack Query, replacing incidental `useState`/`useEffect` data-sync in the touched components, while preserving every existing business rule (validation, `Result` error handling, no optimistic finalization of sensitive writes).

## Non-goals / explicitly out of scope

- The three-way catalogue data model and dual cart provider issue (tracked separately in `docs/superpowers/plans/2026-07-13-product-field-reconciliation.md`).
- Any change to the 231-file `chore/admin-theme-button-audit` WIP already in the tree.
- Wiring a real Supabase/Prisma-backed production adapter behind the repositories — they stay Promise-based in-memory adapters, per Phase 12/9 rules.
- Storefront TanStack Query adoption (storefront `QueryProvider` also currently has zero consumers; left as-is — no repository contracts exist there yet, unlike admin).
- Any change to authentication, authorization, or the role capability matrix.

## Workstreams

Eight workstreams, sequenced so each later one builds on a stable earlier one. Each workstream lands as its own commit (or small group of commits), verified with `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` before moving on — matching this repo's existing canonicalize-commit convention and AGENTS.md's "no failing checks before the next unit of work" rule. Per the user's instruction, workstreams run continuously without a review pause between them, but each still lands as a separately reviewable, revertible commit.

### 1. Foundation cleanup (low risk)

- Delete stale 1-line re-export shims: `lib/client.ts`, `lib/server.ts`, `lib/middleware.ts` (re-export `lib/supabase/*`). Update any remaining importers to the canonical path first.
- Consolidate the `session.ts` naming collision: `lib/auth/server/session.ts` (low-level Supabase identity: `getVerifiedIdentity`, `getServerAuthPrincipal`) and `server/authorization/session.ts` (storefront session composition, built on the former) keep their layering but get distinguishing names (`lib/auth/server/session.ts` → stays; `server/authorization/session.ts` → `server/authorization/storefront-session.ts`) so a grep/import-autocomplete doesn't collide.
- Fix `components/ui/sonner.tsx` importing `useTheme` directly from `"next-themes"` instead of the app's own `components/theme/theme-provider.tsx` wrapper.
- Delete orphaned `components/layout/header.tsx`, `footer.tsx`, `cart-sheet.tsx` (confirmed unimported by anything except each other; the live header/footer is `features/storefront/shell/site-header.tsx`).

### 2. Admin domain split

Break `lib/admin/` (60 files, flat) into sub-domain folders mirroring the existing `features/admin/*` naming already used elsewhere in the repo:

```
lib/admin/
  inventory/        (inventory-*.ts, catalogue-taxonomy.ts, sku.ts, product-lifecycle-actions.ts)
  product-editor/   (product-editor-*.ts)
  orders/           (order-actions.ts, sales-*.ts shared with holds/returns as needed)
  holds/            (hold-actions.ts)
  returns/          (return-actions.ts)
  customers/        (customer-*.ts)
  settings/         (settings-*.ts)
  shared/           (result.ts, formatters.ts, types.ts, selectors.ts, seed.ts split — see Workstream 6)
  data/             (unchanged: repositories.ts, in-memory/)
```

Import paths update repo-wide (mechanical — safe to script with a find/replace pass validated by `pnpm typecheck`). No behavior change.

### 3. Reducer naming clarity

Rename the 11 `lib/admin/*-actions.ts` files to `*-reducer.ts` (e.g., `customer-actions.ts` → `customer-reducer.ts`, `hold-actions.ts` → `hold-reducer.ts`). Rationale: these are pure `(state, input) => Result<{state, action}, error>` functions consumed by `createAdminStore`'s `commitAction`, not Next.js Server Actions — the current name creates a genuine mental-model trap for anyone reading the codebase expecting `"use server"` RPC semantics. The one real Server Action (`app/auth/actions.ts`, file-level `"use server"`) and the three route handlers (`app/auth/{sign-out,google,callback}/route.ts`) are correctly colocated with the auth feature already and are **not** moved — Next.js route handlers and Server Actions colocate with the feature they serve; there is no `/api` convention to force them into, and the empty `app/api/` directory is left as-is (reserved, unused).

This workstream merges into Workstream 2's file moves (same files, one rename+move pass).

### 4. Hooks convention

- Extract `useAccountProducts` out of `features/storefront/account/components/account-product-grid.tsx` into its own file (`features/storefront/account/hooks/use-account-products.ts`) — the one hook genuinely buried inside an unrelated component file.
- No other hook relocation. The other 10 context-consumer hooks (`useAdmin`, `useStorefront`, `useTheme`, etc.) stay colocated with their provider — per `vercel-composition-patterns`' `state-decouple-implementation` rule, the provider is the only place that should know how state is managed, and splitting the hook into a separate file from its provider would not improve that; it would just add an indirection. Document this reasoning as a one-line note in `AGENTS.md` so a future pass doesn't "fix" it by force.
- Where React 19's `use()` can replace a plain `useContext()` call in these hooks, switch it (per `vercel-composition-patterns`' `react19-no-forwardref` guidance covering `use()` adoption) — small, mechanical, no behavior change.

### 5. Integration consolidation

Merge `lib/query/query-provider.tsx` (storefront) and `app/admin/admin-query-provider.tsx` (admin) into one shared factory (`lib/query/create-query-client.ts`) parameterized by the caller (default options are already nearly identical: both use conservative `staleTime`/`retry`/`refetchOnWindowFocus` settings for a prototype backend). Each surface keeps its own `QueryClientProvider` instance (admin and storefront must not share a client — different domains, different invalidation boundaries) but both construct it from the one factory. No new query consumers added by this workstream (that's Workstream 8, admin-only per the confirmed scope).

### 6. Large-file split

- `app/checkout/page.tsx` (1118 lines) becomes `features/storefront/checkout/`: thin `app/checkout/page.tsx` route (delegates, matching every other route in the app), `checkout-flow.tsx` (the current `CheckoutPage` body), `components/` for the 13 sub-components (`order-summary.tsx`, `confirmation-screen.tsx`, `step-indicator.tsx`, `field-input.tsx`, `choice-row.tsx`, `radio-dot.tsx`, `check-box.tsx`, `review-row.tsx`, `summary-rows.tsx`, `trust-badge.tsx`, `processing-dialog.tsx`, `declined-dialog.tsx`, `confirm-metric.tsx`, `currency-button.tsx`), `checkout-helpers.ts` (`validate`, `moneyLabel`, `formatSeconds`, `buildCheckoutSnapshot`, the local types).
- `lib/admin/seed.ts` (1021 lines) splits into `lib/admin/shared/seed/active-store.ts`, `new-store.ts`, `helpers.ts` (`driveImage`, `stock`, `productMedia`), re-exported from a thin `seed/index.ts`.
- No other file crosses the size threshold that justifies a mechanical split; the next-largest files (`storefront-provider.tsx` 596 lines, `account-modals.tsx` 484 lines) are cohesive single-responsibility files (one big context, one modal-router) and are left alone — splitting them would fragment cohesive state per `vercel-composition-patterns`, not clarify it.

### 7. Caching adoption

- Enable Cache Components: `cacheComponents: true` in `next.config.ts`.
- Apply `'use cache'` + `cacheTag('catalogue')` / `cacheTag(`product-${slug}`)` + `cacheLife('minutes')` to the **Prisma-backed** catalogue repository only (`server/commerce/catalogue/catalog-repository.ts`'s `listPublishedProducts`, `getPublishedProductBySlug`, etc.) — this is the one place in the app with a real, current freshness/invalidation need (published-product reads against a live Prisma database), satisfying AGENTS.md's own existing carve-out rather than contradicting it.
- Do **not** cache `lib/storefront/catalog-data.ts` (the static JSON snapshot, already memoized correctly via React's request-scoped `cache()`) or any admin in-memory prototype read — those are explicitly the cases AGENTS.md forbids caching.
- Invalidation: since no admin write path is Prisma-backed yet (admin mutations still operate on the in-memory store, Workstream 8), there is no live mutation to call `revalidateTag`/`updateTag` from today. Document the tag names now (`'catalogue'`, `product-${slug}`) so a future Prisma-backed admin write can call `revalidateTag` without re-deriving the convention; do not fabricate a fake invalidation trigger to make the feature look more complete than it is.
- **AGENTS.md amendment** (§6, Next.js and React rules): the line "Do not enable Cache Components or add `use cache` for static prototype seed data" is kept verbatim (it still correctly forbids caching the seed/prototype paths) and a new line is added, dated to the day Workstream 7 actually lands (not authored speculatively ahead of the change): *"Cache Components are enabled repo-wide as of \<landing date\>. `use cache`/`cacheTag`/`cacheLife` are approved for the Prisma-backed storefront catalogue repository (`server/commerce/catalogue/*`), where a real published/unpublished freshness boundary exists. Do not extend `use cache` to admin in-memory prototype reads or static JSON snapshot reads."*

### 8. Admin TanStack Query migration — all six domains (the largest workstream)

**Current architecture** (confirmed by reading the code): one monolithic `AdminStore` (`features/admin/state/admin-store.ts`) holds all admin domain state in a single `AdminState` object and exposes ~17 synchronous mutation methods, all funneled through `useSyncExternalStore` in `useAdmin()` (`features/admin/state/admin-provider.tsx`). 19 component files across every admin domain call `useAdmin()` directly today. A parallel, already-Promise-based `AdminRepositories` read interface (`lib/admin/data/repositories.ts` + `lib/admin/data/in-memory/admin-repositories.ts`) already wraps `store.getSnapshot()` per-domain — this is exactly the seam Phase 9/12 groundwork intended for query-hook migration. `AdminQueryProvider` is already mounted in `admin-shell.tsx` (wrapping `AdminProvider`) with sane defaults (`staleTime: 30_000`, `retry: false`, `refetchOnWindowFocus: false`) but currently has zero consumers.

**Pattern to apply per domain** (Inventory, Orders, Holds, Returns, Customers, Settings):

1. **Query keys**: a typed key factory colocated with the domain's repository, e.g. `lib/admin/inventory/inventory-query-keys.ts`: `inventoryKeys.all`, `.products()`, `.product(id)`, `.taxonomy()`, `.stockMovements(productId?)`.
2. **Query options**: thin `queryOptions({ queryKey, queryFn: () => repositories.inventory.listProducts() })` wrappers, colocated next to the keys, consuming the existing `AdminRepositories` read methods unchanged.
3. **Reads**: components currently destructuring `state.products` etc. out of `useAdmin()` switch to `useQuery(productsQueryOptions(repositories))` (repositories obtained from the existing `useAdminRepositories()` context, already wired). `useSuspenseQuery` where the component already assumes data is present (matches existing prototype behavior — no new loading states invented where none existed); plain `useQuery` where a loading/empty state already exists in the component today.
4. **Mutations**: wrap each existing synchronous `AdminStore` method (`saveProduct`, `transitionOrder`, `extendHold`, etc.) in a `useMutation` whose `mutationFn` calls the store method and resolves the existing `Result<TSuccess, TError>` value **without throwing on business-rule failure** — a `Result` with `ok: false` is still a successful Promise resolution; only unexpected/thrown errors reach TanStack's error channel. This preserves every existing validation/business-rule path unchanged.
5. **Cache updates on success**: because the underlying store mutation is synchronous and already authoritative (no real network round-trip to hide), use `queryClient.setQueryData` with the fresh value read straight from the repository immediately after a successful mutation — not `invalidateQueries` + refetch. This matches phase12-plan.md's stated preference ("prefer authoritative cache replacement, then targeted invalidation") and avoids an unnecessary extra tick. Each mutation's affected query keys are enumerated explicitly (e.g., `saveProduct` touches `inventoryKeys.products()`, `inventoryKeys.product(id)`, and `overviewKeys.overview()` since Overview's sales pulse/open-orders derive from the same state) — no domain-wide invalidation-by-guess.
6. **No optimistic updates anywhere in this migration.** Per phase12-plan.md: never optimistically finalize payments, fulfilment, stock release, returns, refunds, or unique-item ownership — and since every mutation here resolves synchronously with an authoritative result, optimistic updates would add risk (a moment of UI showing an update that then needs reverting on a validation failure) for zero latency benefit. Settings and catalogue-taxonomy CRUD (the only genuinely "safe" mutations) still use the same authoritative-replacement pattern for consistency, not because optimism is needed.
7. **Local state stays local**: dialog open/closed, active tab, form draft values (React Hook Form's own state), saved-view/filter selections, and theme preference are explicitly *not* touched — they were never server-like state and AGENTS.md's Phase 12 rule already says so. This is also where the user's "avoid irrelevant `useState`/`useEffect`" instruction applies concretely: any component with a `useEffect` that exists only to copy `useAdmin().state.X` into local `useState` for re-rendering purposes is deleted once the component reads directly from `useQuery` (React Query already handles the re-render); components using `useState`/`useEffect` for genuine local UI concerns are left alone.
8. **Deprecated aliases removed, not preserved**: `useControlRoom`, `useControlRoomRepositories`, `ControlRoomRepositoryProvider` (all `@deprecated` re-exports of the `Admin*` equivalents) are deleted once the last consumer is confirmed migrated — grep confirms these are compatibility shims from the earlier control-room→admin rename, not live functionality.

**Domain migration order** (dependency-driven, not arbitrary): Settings and Customers first (simplest, no cross-domain cache effects) → Holds and Returns (touch Orders/Inventory only indirectly) → Orders (touches Overview) → Inventory last (touches Overview, Orders via stock, and Product Editor/Intake, the largest fan-out — 8 of the 19 consuming files). Each domain is its own commit, `useAdmin()` call sites for that domain's reads/mutations updated, verified before moving to the next.

**What does not change**: `AdminStore`'s internal synchronous reducer logic, the `Result<T,E>` error-handling convention, the seven-step product editor's validation flow, the `AdminRepositories` interface shape (only its consumers change), and the underlying prototype-adapter truthfulness rules (still an in-memory store — TanStack Query here is a client-cache/re-render boundary, not a new persistence layer).

## Verification per workstream

- `pnpm typecheck`, `pnpm lint` (Biome), `pnpm test` (Vitest — existing `*-actions.test.ts` / reducer tests must still pass after the Workstream 3 rename, just renamed alongside their subject files), `pnpm build`.
- Workstream 8 additionally needs a manual/browser smoke pass per migrated domain (admin sign-in → exercise the domain's list + one mutation) since it changes runtime behavior, not just file locations — `chrome-devtools`/Playwright per AGENTS.md's browser validation rules, to the extent the harness supports it in this session.
- `pnpm audit:buttons` must continue to pass throughout (unrelated to this work, but touched files must not regress it, given the concurrent WIP on the same concern).

## Risk register

- **Workstream 8 is materially larger and riskier than the other seven combined** (19 consuming files across 6 domains, real runtime behavior change vs. pure file moves elsewhere). It is sequenced last so a problem there doesn't block the lower-risk structural cleanup from landing.
- Renaming `lib/admin/*-actions.ts` (Workstream 3) touches every domain's reducer tests and the store — mechanical but wide; done in the same pass as Workstream 2 to avoid two separate churn passes over the same files.
- The AGENTS.md caching amendment (Workstream 7) must land in the same commit as enabling `cacheComponents`, so the doc is never momentarily stale relative to the code.
- If any workstream's verification fails and can't be fixed quickly, that workstream's commit is reverted rather than left broken — later workstreams do not proceed on top of a known-failing one (AGENTS.md §3).
