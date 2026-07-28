# Architecture Migration Tracker

## Complete API, Account and Paystack Migration Suite (started 2026-07-28)

A new, separately-tracked 8-plan suite continues this tracker's Phase 8 ("Make checkout and payment
server-authoritative") and Phase 9 ("Delete remaining legacy architecture") scope with a fuller account,
checkout, refunds/disputes and owner-finance surface than those two phase rows described. Index:
`docs/superpowers/plans/2026-07-28-complete-api-account-paystack-index.md`. That suite's Task 1
(`2026-07-28-complete-api-01-ledger-persistence-foundation.md`) froze the exact current
`/api/v1` endpoint baseline and every prototype/browser-owned/server-direct interaction across the
storefront account, checkout and admin-finance surfaces:

- Ledger: [`complete-api-endpoint-ledger.md`](complete-api-endpoint-ledger.md) — 109 rows (31 existing
  real endpoints, 36 target account endpoints, 30 target checkout/payment/finance endpoints, 12
  additional browser-owned/prototype interactions found by direct code inspection).
- Captured at worktree `plan-01-ledger-persistence`, HEAD `54570e02ed3ebd809c6f03f4b536c17c3a98f510`,
  2026-07-28.
- Key finding not previously recorded anywhere in this tracker: the storefront checkout
  (`checkout-flow-v2.tsx`) is entirely client-side — it opens a hardcoded external
  `https://paystack.shop/pay/...` link and fakes order placement into `sessionStorage`, with no server
  order, no real Paystack transaction, and no persisted payment record, even though a real, tested
  Paystack transaction-initialize client already exists unused at `src/modules/payments/server/paystack.ts`.
  See the ledger's PAY-001..004 rows and "Judged classifications" section for the full evidence trail,
  including a mobile-vs-desktop account sign-out inconsistency (MISC-011/012) found during the same pass.

This suite's own plan files carry their own task ledgers going forward; this tracker's Phase 8/9 rows
below are superseded in scope by that suite and are not being updated further here.

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Phase 1 merge:** `1ca1b184207ea2a36fa41c10162b8a059abe5289`  
**Phase 2 merge:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Phase 3 merge:** `d7e3149c96f234d7deb41151ac603d6f652ceb4d`  
**Phase 4 merge:** `646ad2942ec2afbdb42e5269bad6d1993b01444b`  
**Phase 5 merge:** `cd12b89e9ec2eb9210704e200e30731d864646e1`  
**Current branch:** `main` (the `codex/phase-1-6-full-acceptance` branch has since merged; the storefront-state Zustand work described below is on `main`, not a separate branch)  
**Current phase:** Phase 6 source complete; Phase 1–6 cross-phase acceptance in progress per `phase-1-6-full-acceptance-design.md`  
**Overall status:** See [Reconciliation evidence](#reconciliation-evidence-2026-07-26) below — this section and the Phase 6 task ledger previously described a Zustand lockfile blocker that no longer exists and reported WS1 guard status that predated a guard-script fix. Both are corrected below with dated, executed evidence. No phase is newly accepted by this reconciliation.

## Completed cross-cutting change: provider centralization (2026-07-27)

**Read this before touching any provider, layout, or query-client file.** The three-way provider
split (root theme/toaster, admin's own `QueryProvider`, storefront's own
`StorefrontQueryProvider`/`StorefrontAuthProvider`) was collapsed into one shared root provider
tree on 2026-07-27. Full design: `docs/superpowers/specs/2026-07-27-provider-centralization-design.md`;
implementation plan and task-by-task execution ledger:
`docs/superpowers/plans/2026-07-27-provider-centralization.md` and
`.superpowers/sdd/progress-provider-centralization.md`. See this session's Vitest/build results
below for verification evidence.

This was an explicit, recorded override of the Phase 7 "no auth-provider merge" exclusion — narrow
in scope (client-side session-data context only; `src/server/auth/**`, sign-in/sign-up forms, and
Supabase semantics are untouched). See that spec's "Recorded override" section.

**Files this touches, so later Phase 2–6 work doesn't silently conflict with a different file
shape than the original phase-1-3/phase-4-5 plans describe:**

- Deleted: `src/providers/query-provider.tsx`, `src/providers/storefront-query-provider.tsx`,
  `src/lib/query/admin-query-client.ts` (+ its test), `src/lib/query/storefront-query-client.ts`.
- New: `src/lib/query/app-query-client.ts` (replaces both — single `APP_QUERY_DEFAULTS`,
  `makeAppQueryClient()`, `getAppQueryClient()`), `src/providers/session-provider.tsx`.
- Modified: `src/providers/providers.tsx`, `src/app/layout.tsx`, `src/app/admin/layout.tsx`,
  `src/app/storefront-route-boundary.tsx`, `src/app/storefront-client-boundary.tsx`,
  `src/features/storefront/shared/storefront-auth-provider.tsx` (narrowed to actions-only, reads
  session via `useSession()` instead of an `authSession` prop), `src/server/auth/session.ts`
  (`getCurrentSession` wrapped in `React.cache()` — no behavior change), `scripts/checks/layout-provider-contract.mjs`.
- **Cache-policy change:** admin and storefront queries now share one policy —
  `staleTime: 5 * 60_000, retry: 1` (the storefront's prior values, kept over admin's prior
  30 s/no-retry, per explicit user decision recorded in the spec). Any later Phase 4/5 work that
  assumed the 30 s admin default should check this before relying on staleness timing; existing
  mutation flows already invalidate explicitly and are expected to be unaffected.
- WS2a's `phase-1-6-full-acceptance.md` verdict has been rewritten against this current shape —
  see that document's WS2a row, which is no longer marked superseded.

**Three implementation deviations from the original plan text**, discovered and fixed during
execution (Tasks 7–8; full detail in `.superpowers/sdd/progress-provider-centralization.md` and
the plan file's own "Implementation deviation recorded during execution (Task 7)" section):

1. **Cache Components / Suspense fix.** The plan originally had `AppProvider({ session, children })`
   mount `SessionProvider` directly, with `RootLayout` `await`-ing the session before returning
   JSX. This broke `pnpm build`: this repo has `cacheComponents: true` (Next.js 16 Cache
   Components), which requires any uncached per-request read to sit behind a `<Suspense>` boundary
   covering every route rendering under it. Fixed by moving session resolution into a new async
   `SessionSlot` component, wrapped in `<Suspense fallback={<AppShellFallback />}>`, inside
   `src/app/layout.tsx`. `AppProvider`'s signature changed from `{ session, children }` to
   `{ children }` — it no longer takes or mounts session at all; `SessionSlot` mounts
   `SessionProvider` one level below `AppProvider`, inside the new Suspense boundary.
2. **`http-module-contract.mjs` gap.** This Phase 3 HTTP guard (distinct from
   `layout-provider-contract.mjs`) hardcoded checks for the retired
   `src/lib/query/admin-query-client.ts` (+ test) and `src/providers/query-provider.tsx` — neither
   of which the original plan anticipated needing updates, since the guard-chain's `&&` meant this
   guard was never reached until the guards ahead of it were fixed. Updated to check
   `app-query-client.ts`/`providers.tsx` with `APP_QUERY_DEFAULTS`/`getAppQueryClient` instead.
3. **`SessionProvider`-string check fragility.** Both `layout-provider-contract.mjs` and
   `src/lib/boundaries/app-provider-boundary.test.ts` asserted that the string `"SessionProvider"`
   appears in `src/providers/providers.tsx` — which only "passed" because of an explanatory code
   comment there, not real behavior (the actual mount is in `src/app/layout.tsx`'s `SessionSlot`).
   Fixed to check the file that actually mounts it.

A small, deliberate addition (not a deviation): `ReactQueryDevtools` was added back to the shared
`AppProvider`, dev-only (`process.env.NODE_ENV === "development"`), matching what the old
admin-only `QueryProvider` used to render.

**Verification (this session, 2026-07-27):**

- `pnpm check:architecture` — 0 errors across all five guards (`module-export-guard`,
  `architecture-guard`, `error-validation-contract`, `layout-provider-contract`,
  `http-module-contract`).
- `pnpm biome` — 0 errors, 65 pre-existing warnings. This session found and fixed 9 new format
  errors in this plan's own new/modified files (line-ending drift plus two genuine import-order/
  line-wrap issues in `src/app/layout.tsx` and `src/lib/boundaries/app-provider-boundary.test.ts`)
  as a dedicated, scoped commit (`572b77f`) before the docs commit — see that commit message for
  the full file list and rationale. No repo-wide reformat was run; the 65 pre-existing warnings are
  untouched.
- `pnpm typecheck` — 0 errors. The 7-error Prisma model-typing gap recorded elsewhere in this
  tracker (`profile_details`/`product_variant_measurements`) is resolved as of this candidate,
  attributable to the unrelated `f3be101` Prisma import-path fix noted in the execution ledger, not
  to anything in this plan.
- `pnpm exec vitest run` — 484 passed, 6 failed, 6 skipped (496 total). Five failures exactly match
  the 2026-07-26 baseline below (Products/Inventory/Settings module-boundary and HTTP-status
  mismatches). The sixth was a worker-timeout flake on `admin-persistence-boundary.test.ts` in this
  run (confirmed passing in isolation in under 1 second across a targeted rerun) — the same class
  of full-suite worker-contention flake the 2026-07-26 baseline already documents for a different
  file (`category-card.test.tsx`), not a new defect. Re-running the full suite twice more reproduced
  the identical five named failures plus the same flake pattern each time.
- `pnpm build` — succeeds. Cache Components prerenders every route, including `/admin/**` and
  `/auth/error`, with no "Uncached data was accessed outside of `<Suspense>`" errors, confirming the
  Suspense fix (deviation 1 above) holds under a full production build.
- Browser verification (theme sync, signed-in state, cart/hold hydration, hydration warnings) is
  explicitly out of scope for this pass and is handled separately.

## Reconciliation evidence (2026-07-26)

This pass corrected two stale claims and re-verified real status by executing commands, not by
reading prior status prose. Candidate at time of this pass: `f088430...` on `main`.

- **Zustand lockfile blocker — resolved, not current.** `pnpm install --frozen-lockfile` succeeds
  with no lockfile diff; `pnpm-lock.yaml` contains both an importer entry and a package snapshot for
  `zustand@5.0.14`. The blocker recorded below at P6-T01 was already stale before this pass (see
  the full-acceptance design's own note to that effect); it is now corrected instead of repeated.
- **WS1 architecture guards fixed and passing.** `pnpm check:architecture` previously failed with
  `src/test/product-authorization-contract.test.ts: Cannot resolve internal module
  ../../scripts/auth/product-authorization-contract.mjs` — not a real missing file, but a blind
  spot in `module-export-guard.mjs`, which never scanned `scripts/auth/**`. Fixed in `f088430`. A
  second defect, an orphaned test at `src/features/storefront/shared/storefront-fonts.test.ts`
  reading a file that had moved to `src/modules/storefront-shell/ui/` during the Phase 6 cutover,
  was relocated in the same commit. All five guards (`module-export-guard`, `architecture-guard`,
  `error-validation-contract`, `layout-provider-contract`, `http-module-contract`) now report
  **0 errors**.
- **`.next/types` typecheck noise was pure build-cache staleness.** Deleting `.next` and
  re-running `pnpm typecheck` removed 25 phantom `TS2307` errors that referenced pre-Phase-2 flat
  routes (`src/app/cart`, `src/app/account/**`, etc.) which no longer exist under `(storefront)/`.
  No source change was needed or made.
- **`pnpm biome` passes** (0 errors, 65 pre-existing warnings, none in files touched by this pass).
- **`pnpm typecheck` still fails — real defect, not this pass's scope.** Seven errors remain, all
  the same shape: `profile_details` and `product_variant_measurements` (added for account-profile
  persistence and variant measurements) do not type-check as `PrismaClient` properties, across
  `src/server/auth/profile.ts`, the account profile route/action, `src/modules/products/server/storefront/queries.ts`,
  and two `scripts/seed/**` files. Regenerating the Prisma client (`pnpm prisma:generate`) did not
  change this. This is a data-engineer-owned Prisma/schema generation defect, not an import/export
  or architecture-boundary violation.
- **`pnpm build` fails on the same defect** (`next build`'s TypeScript pass fails at
  `scripts/seed/catalog-import-preflight.ts:194` on `product_variant_measurements`). The build was
  not previously reported as executed against this head; it is now reported as executed and
  failing.
- **`pnpm exec vitest run` (full suite): 482 passed, 6 failed, 6 skipped (494 total).** None of the
  six failures are in Phase 6 storefront-state/store/hydration/overlay files — they are in
  Products/Inventory/Settings module-boundary and HTTP-contract tests, i.e. Phase 4/5 territory:
  - `src/modules/products/server/editor-ownership.test.ts` — `src/modules/settings/types.ts`
    imports a legacy admin contract/policy it shouldn't.
  - `src/modules/products/server/storefront/type-ownership.test.ts` — `src/modules/products/ui/storefront/product-selection.ts`
    is flagged as a non-type-only consumer of the compatibility facade.
  - `src/modules/inventory/client/api.test.ts` — the adjustments POST call is not sending a
    `Content-Type: application/json` header the test expects.
  - `src/app/api/v1/admin/inventory/route.test.ts` and `.../adjustments/route.test.ts` — both
    expect HTTP `400` for a validation failure but the route now returns `422`. This looks like a
    stale test expectation rather than a regression: the documented Phase 3 contract
    (`phase-3-http-module-status.md`) maps Zod validation failures to `422`.
  - One worker crash on `src/features/storefront/home/components/category-card.test.tsx` (timeout
    starting a fork worker) was observed on one run and did not reproduce on a second run —
    recorded as flaky/environmental, not a fixed defect.
- **Not executed in this pass:** Playwright/browser, React Doctor, and any real-database
  (WS6a/WS6b) evidence. No claim is made about those.
- **Environment note:** this session's Node is `v26.5.0`; the plan requires `25.x`. The last
  captured WS0 context (`ci-evidence/phase-1-6-full-acceptance/context/context.json`) was taken on
  `v25.9.0` against candidate `8959632...`, an ancestor of current `HEAD` — that context is stale
  and must be recaptured on the correct toolchain before any WS0 claim is made on the current SHA.

Status values: `Not started`, `In progress`, `Source complete`, `Complete`, `Merged with debt`.

## Phase summary

| Phase | Goal | Status | Gate |
| --- | --- | --- | --- |
| 0 | Freeze and record current behaviour | Complete | Baseline evidence complete |
| 1 | Establish architecture rules, language and validation | Merged with debt | Final private source validation unresolved |
| 2 | Consolidate layouts and provider scope | Merged with debt | Route and visual parity debt recorded |
| 3 | Create HTTP and domain-module foundation | Merged with debt | Final-head workflows did not execute before merge |
| 4 | Cut over products and inventory | Merged with debt | Exact-head workflows did not execute before merge |
| 5 | Remove remaining admin dummy domains | Merged with debt | Source scope merged; exact-head gates did not execute |
| 6 | Split storefront state and add Zustand | In progress | Lockfile, runtime, storage, history and UI parity |
| 7 | Consolidate authentication | Not started | Auth flow parity |
| 8 | Make checkout and payment server-authoritative | Not started | Idempotent settlement |
| 9 | Delete remaining legacy architecture | Not started | No undocumented legacy imports |
| 10 | Final validation and release readiness | Not started | Full gates and visual parity |

## Historical evidence state

### Phase 0

Phase 0 merged through PR #37 with recorded baseline evidence:

```text
Playwright run: 30099471635
Result: 15 passed, 0 failed, 0 skipped, 0 errors
Artifact ID: 8599046423
Digest: sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3
```

### Phase 1

Phase 1 merged through PR #38 while its final workflows remained queued:

```text
Implementation Quality: 30103043887
Playwright UI Contract: 30103043857
```

Phase 1 remains **Merged with debt**.

### Phase 2

Phase 2 merged through PR #39 while its final workflows remained queued:

```text
Implementation Quality: 30106477826
Playwright UI Contract: 30106477740
```

Phase 2 remains **Merged with debt**.

### Phase 3

Phase 3 merged through PR #40. Earlier repair evidence reached database validation and 460 passing Vitest tests, but final-head workflows did not execute before merge:

```text
Implementation Quality: 30118703848
Playwright UI Contract: 30118703866
```

Phase 3 remains **Merged with debt**.

### Phase 4

Phase 4 merged through PR #41. It delivered canonical Product and Inventory ownership, versioned APIs, typed clients, TanStack ownership, database pagination, transactional stock adjustments and duplicate persistence removal.

Final-head workflows did not execute before merge:

```text
Implementation Quality: 30150645155
Playwright UI Contract: 30150645124
```

Phase 4 remains **Merged with debt**.

### Phase 5

Phase 5 was squash-merged through PR #43 as `cd12b89e9ec2eb9210704e200e30731d864646e1` at the repository owner’s explicit direction.

Source outcomes:

- Orders, Holds, Returns, Customers, Settings and Overview moved to Prisma-backed domain/API/TanStack paths.
- AdminStore business-record ownership was removed.
- Admin repository context, contracts and in-memory implementation were removed.
- Runtime seed and reducer ownership for migrated domains was removed.
- A permanent persistence boundary protects the migrated domains.

Merge-time validation debt:

```text
Implementation Quality: 30164712987 — queued at merge
Playwright UI Contract: 30164712918 — queued at merge
```

Phase 5 remains **Merged with debt**.

## Phase 6 current state

Controlling document:

- [`phase-6-storefront-state-status.md`](phase-6-storefront-state-status.md)

### Current runtime composition

```text
StorefrontRouteBoundary
  -> StorefrontClientBoundary
     -> StorefrontQueryProvider
        -> StorefrontStateHydrator
           -> StorefrontHoldClockBoundary
           -> StorefrontAuthProvider
              -> SiteChrome
                 -> SiteHeader / route / SiteFooter / StorefrontOverlays
           -> StorefrontAuthDialogHost
```

### Implemented ownership

- `cart.store.ts` owns minimal cart-line intents and actions.
- `saved-items.store.ts` owns saved product IDs and actions.
- `storefront-ui.store.ts` owns shared overlay identity, recent IDs, utility dismissal and non-authoritative hold intents.
- One `StorefrontHoldClockBoundary` serves all mounted countdown consumers and expires stale hold intents.
- The storefront catalogue remains TanStack-backed and is not copied into Zustand.
- `STOREFRONT_QUERY_DEFAULTS` is the single storefront cache-policy definition.
- The hydration boundary preserves the version-3 cart/saved/hold migration and persists minimal identifiers only.
- Catalogue filters, sorting, search, quick links, chip removal and pagination mutate the URL through `useCatalogueNavigation()` only.
- Quick view, image viewer, auth and Zustand overlays transition through one coordinator so they cannot remain stacked.
- Product catalogue contracts and projection code are owned by the Products module.
- The public client and API contract uses British `catalogue` naming throughout.
- The original cart empty-state copy and storefront presentation contract are preserved.
- `StorefrontProvider` and `StorefrontClientStateProvider` are deleted.
- Architecture tests reject retired providers, American catalogue paths/symbols, duplicate router ownership and reversed server dependencies.
- Focused store, clock, overlay, catalogue-projection, API and Playwright contracts are authored.

### Dependency blocker — resolved

This section previously reported that `pnpm-lock.yaml` lacked a Zustand importer entry or package
snapshot. As of the 2026-07-26 reconciliation pass, that is no longer true: `pnpm-lock.yaml`
contains both the importer entry and the package snapshot for `zustand@5.0.14`, and
`pnpm install --frozen-lockfile` succeeds without modifying the lockfile. Frozen-lockfile
enforcement remains enabled. See [Reconciliation evidence](#reconciliation-evidence-2026-07-26).

### Phase 6 task ledger

| ID | Approved task | Source status | Evidence status |
| --- | --- | --- | --- |
| P6-T00 | Record Phase 5 merge and validation debt | Complete | Recorded |
| P6-T00A | Map original provider, persistence and URL ownership | Complete | Source-audited |
| P6-T00B | Add storefront-state non-expansion guards | Complete | Execution pending |
| P6-T01 | Add Zustand | Complete | `pnpm install --frozen-lockfile` verified 2026-07-26; `zustand@5.0.14` present in `package.json` and `pnpm-lock.yaml` (importer + package snapshot) |
| P6-T02 | Create cart store | Source complete | Unit tests passing (`cart.store.test.ts`, 3/3, 2026-07-26) |
| P6-T03 | Create saved-items store | Source complete | Unit tests passing (`saved-items.store.test.ts`, 2/2, 2026-07-26) |
| P6-T04 | Create storefront UI store | Source complete | Unit tests passing (`storefront-ui.store.test.ts`, 3/3, 2026-07-26) |
| P6-T05 | Preserve versioned storage migration | Source complete | Migration/hydration execution pending |
| P6-T06 | Add hydration-safe selectors | Source complete | Runtime execution pending |
| P6-T07 | Prevent complete product persistence | Source complete | Guard/browser execution pending |
| P6-T08 | Move catalogue filters to URL ownership | Source complete | Browser execution pending |
| P6-T09 | Keep pagination in URL ownership | Source complete | Browser execution pending |
| P6-T10 | Keep sorting in URL ownership | Source complete | Browser execution pending |
| P6-T11 | Keep navigational search in URL ownership | Source complete | Browser execution pending |
| P6-T12 | Remove URL/context synchronisation effects | Source complete | Architecture/browser execution pending |
| P6-T13 | Move image viewer state locally | Source complete | Browser execution pending |
| P6-T14 | Move measurement state to narrow shared boundary | Source complete | Browser execution pending |
| P6-T15 | Move newsletter state locally | Source complete | Browser execution pending |
| P6-T16 | Move delivery-estimate state locally | Source complete | Browser execution pending |
| P6-T17 | Move header scroll state into header | Source complete | Browser execution pending |
| P6-T18 | Separate auth-dialog local state | Source complete | Auth/browser execution pending |
| P6-T19 | Remove migrated values from `StorefrontProvider` | Complete | Provider deleted |
| P6-T20 | Remove unused context selectors and consumers | Source complete | Guard passing (`pnpm check:architecture`, 0 errors, 2026-07-26); TypeScript still fails, but only on the unrelated Prisma model gap in the reconciliation evidence above — no Phase 6 regression identified |
| P6-T21 | Delete final legacy provider after consumer cutover | Complete | Both providers deleted |
| P6-T22 | Pass static, unit, build, React Doctor and browser gates | Pending | Static guards and Biome pass; full Vitest passes except six Phase 4/5-area failures (see reconciliation evidence); TypeScript and build still fail on the Prisma model gap; React Doctor and Playwright/browser remain unexecuted |

### Exact-head evidence state

The PR workflows remain queued or pending. Queued, cancelled, skipped, superseded or unavailable checks remain validation debt and are never reported as passes. Locally executed evidence from 2026-07-26 is recorded above under Reconciliation evidence; it supplements but does not replace CI execution.

## Phase 6 remaining order

1. ~~Regenerate and commit the pnpm 11.13.0 lockfile with Zustand.~~ Done — verified 2026-07-26.
2. ~~Prove frozen installation on the resulting exact head.~~ Done — verified 2026-07-26.
3. ~~Run architecture guards, Biome and TypeScript.~~ Guards and Biome pass; TypeScript still fails on the Prisma model gap (data-engineer owned, tracked in the reconciliation evidence).
4. ~~Run focused and full Vitest suites.~~ Done — 482 passed, 6 failed (Phase 4/5-area, not Phase 6), 6 skipped.
5. Run production build and React Doctor. Build currently fails on the same Prisma model gap; React Doctor not yet run.
6. Run desktop, tablet and mobile Playwright plus light/dark visual comparison.
7. Inspect artifacts, logs, traces and screenshots.
8. Repair only evidenced failures.
9. Reconcile the final task ledger, PR body and review state.

## Decision safeguards

- UI remains unchanged unless a verified defect requires correction.
- Zustand owns browser state only and never becomes a remote-data cache.
- Complete Product records are not persisted in Zustand.
- URL owns navigable filters, sorting, pagination and search.
- TanStack Query owns remote browser data; Prisma owns persistent data.
- Local state moves to the narrowest useful component boundary.
- Phase 6 does not absorb Phase 7 auth consolidation or Phase 8 payment settlement.
- Source implementation and executed certification are reported separately.
