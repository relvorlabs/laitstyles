# Phase 4 — Storefront client-state consolidation

Tracking: [#21](https://github.com/relvorlabs/laitstyles/issues/21)  
Coordination: [#19](https://github.com/relvorlabs/laitstyles/issues/19)  
Base: `20e178cc01feb0efb13c1f8196f0811bdc969cfa`

## State

`source implementation complete — executable validation blocked — draft — not merge-ready`

No lint, typecheck, test, build or browser gate is recorded as passing. GitHub-hosted jobs currently terminate before checkout, and the available runtime cannot clone GitHub independently.

## Objective

Replace overlapping storefront state owners with one truthful client-state owner for cart, saved products and client-only holds, while preserving server catalogue authority, public routes and the approved storefront composition.

## Final ownership

### `StorefrontClientStateProvider`

The only owner of durable shared client intent:

- cart line intents;
- saved product IDs;
- client-only hold expiries;
- one storage migration/write path;
- one hold countdown and hold alert.

The persisted `v3` snapshot contains IDs, quantities and expiries only. Product names, prices, images and availability do not enter storage.

### `StorefrontAuthProvider`

Owns auth-dialog interaction state only. Identity comes from the server-resolved session. Password sign-in, sign-up and sign-out use canonical Server Actions; no browser Supabase subscription or mutable signed-in mirror remains.

### `StorefrontProvider`

Retains storefront presentation composition, filters, local overlay state, recent products and compatibility selectors. Cart and saved mutations delegate to `StorefrontClientStateProvider`; it has no independent persistence path.

### Server catalogue boundary

`StorefrontRouteBoundary` loads `loadStorefrontShellCatalog()`, not the full detail catalogue. The shell projection retains summary and variant-selection data required by search, cards, cart restoration and quick selection while withholding detail galleries, flaw notes, care instructions and product variant-label arrays. Full PDP data remains loaded per slug on the server.

## Implemented work

1. **Unified state and storage**
   - added `laitstyles-storefront:v3:client-state`;
   - migrated every live cart, saved and hold compatibility key;
   - deduplicated lines and IDs, validated quantities and pruned expired holds;
   - recovered from malformed or wrong-version canonical snapshots;
   - preserved legacy recovery data when a canonical storage write fails;
   - extracted canonical cart restoration from minimal intents and current variant availability.
2. **Provider cutover**
   - mounted client state and auth only inside the storefront route boundary;
   - moved `/cart`, the header bag, checkout, saved interactions and product holds to one state owner;
   - removed duplicate hold timers and persistence writers;
   - moved the global hold alert to the unified provider.
3. **Authentication**
   - added typed, user-safe password Server Action results;
   - preserved redirect-based auth pages;
   - moved the modal to canonical actions;
   - removed browser auth duplication and client identity authority.
4. **Cart, checkout and receipt correctness**
   - fixed cart mutations that incorrectly used product IDs instead of stable line keys;
   - made cart page, cart sheet and checkout consume the same lines and quantities;
   - removed the fabricated checkout catalogue selection and synthetic hold timer;
   - added an explicit session receipt written only by the prototype completion callback;
   - made confirmation read that receipt and clear the same cart/holds.
5. **Compatibility removal**
   - deleted `ShopProvider`;
   - deleted `StorefrontExperienceProvider` and its compatibility data/tests;
   - deleted the duplicate cart-persistence module/tests;
   - deleted the legacy checkout controller;
   - deleted `src/lib/catalogue.ts` and `src/lib/order.ts`.
6. **Regression protection**
   - architecture guard rejects retired files/imports and a full-catalogue route boundary;
   - boundary tests enforce provider placement and minimal persistence;
   - focused tests cover migration, failed storage, cart restoration, checkout totals/holds and receipts;
   - Playwright journeys cover shared cart/saved state, reload persistence, real hold expiries and URL-driven auth validation;
   - protected catalogue composition was diff-reviewed and restored after an interim drift was detected.

## Explicit exclusions preserved

- No admin Inventory persistence; Phase 3 owns it.
- No verified payment execution or gateway callback was added.
- No database-backed reservation semantics were added.
- No new state library was introduced.
- No public route, typography, spacing or approved catalogue layout change was intentionally introduced.
- No canonical product identifier or availability contract changed.

## Validation authored

- state normalization and migration tests;
- failed storage-write and cleanup tests;
- canonical cart-restoration tests;
- checkout calculation and validation tests;
- receipt serialization/persistence tests;
- storefront state boundary tests;
- shell catalogue projection tests;
- mobile/tablet/desktop Playwright client-state journeys;
- architecture guard assertions for retired modules, provider placement and shell catalogue loading.

## Validation blocker

GitHub Actions was tested repeatedly on current PR commits. Application jobs and browser jobs finish with no allocated steps or logs. A temporary runner probe tested `ubuntu-24.04`, `windows-latest` and `macos-latest`; all three failed before the first echo or checkout step with `steps: null`. The probe workflow was then deleted.

The connected GitHub app exposes run inspection and rerun actions but not repository Actions settings or billing controls. The execution runtime also cannot resolve GitHub for an independent clone. Therefore the source is implemented and reviewable, but no command is represented as passing until runner access is restored and the real gates execute.

## Required before completion

- restore GitHub-hosted runner allocation for the repository/account;
- run architecture guard, Prisma validation, strict button audit and Biome;
- run TypeScript and the complete Vitest suite;
- run production build and React review;
- run mobile, tablet and desktop Playwright suites;
- inspect logs/artifacts and fix every actual failure;
- rerun until all required checks pass;
- reviewer posts an evidence-backed completion report before the PR leaves draft.

## Progress ledger

```text
State: source implementation complete; executable validation blocked; draft; not merge-ready
Completed: unified cart/saved/hold owner; storage migration; canonical auth actions; server session boundary; cart/checkout/receipt cutover; compatibility deletion; shell catalogue projection; focused and browser tests; architecture enforcement
Current: wait only for executable gate evidence, then fix actual reported failures on the same branch
Blocked by: GitHub Actions cannot allocate Linux, Windows or macOS hosted runners; every job ends before checkout with no steps or logs; independent clone is unavailable in the current runtime
Contracts changed: internal v3 client-intent storage; typed auth action results; explicit prototype receipt; lightweight shell catalogue projection
Files/surfaces owned: storefront shared state/auth, shell composition, cart, checkout, receipt, product hold consumers, tests and architecture guard
Validation evidence: tests and workflows authored; no runtime gate has passed because no runner executed
Next handoff: infrastructure restoration → reviewer executes gates → owning engineer fixes evidenced failures → rerun until green
```
