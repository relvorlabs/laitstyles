# Phase 4 — Storefront client-state consolidation

Tracking: [#21](https://github.com/relvorlabs/laitstyles/issues/21)  
Coordination: [#19](https://github.com/relvorlabs/laitstyles/issues/19)  
Base: `20e178cc01feb0efb13c1f8196f0811bdc969cfa`

## State

`implementation — storage contract complete, provider cutover in progress`

## Objective

Replace overlapping storefront state owners with one truthful client-state owner for cart, saved products and client-only holds, while preserving the server-owned catalogue, existing public routes and approved storefront design.

## Role chain

`orchestrator → planner → domain-engineer (auth contract only) → ui-engineer → reviewer`

The fixed role roster in `AGENTS.md` applies. No invented or nested child roles.

## Current source truth

- `StorefrontProvider` owns catalogue projection, cart, saved products, recent products, filters and shared overlays.
- `StorefrontExperienceProvider` owns client auth mirrors, auth-dialog transport, account seed items, storefront-originated holds, hold feedback and a second toast system.
- `ShopProvider` owns another independent hold list, another timer and another persistence key for `/cart`.
- `SiteChrome` mounts `ShopProvider`, `StorefrontProvider` and `QueryProvider`; `StorefrontProviders` mounts `StorefrontExperienceProvider` above it.
- The catalogue remains server-owned and enters the storefront boundary through `loadStorefrontCatalog()`.

## Scope

- One storefront client-state owner for minimal cart, saved and hold intent records.
- One versioned storage snapshot and explicit migration/reset behaviour.
- One state source for `/cart`, the cart sheet, saved interactions and hold interactions.
- Overlay state narrowed to local ownership or a dedicated overlay boundary.
- Sign-in dialog moved to the canonical auth Server Actions.
- Client identity mirrors removed where they can disagree with server cookies.
- `ShopProvider`, `StorefrontExperienceProvider`, `src/lib/catalogue.ts`, `src/lib/order.ts` and other compatibility paths removed only after every live consumer is migrated.
- Storefront route grouping retained without changing public URLs; admin/auth routes must not mount storefront providers.

## Exclusions

- No admin Inventory persistence; Phase 3 owns it.
- No real checkout or payment execution.
- No database reservation semantics.
- No new global state dependency without demonstrated need.
- No visual redesign, typography change, spacing change or public route change.
- No canonical product identifier or availability-contract change without #19 coordination.

## Implementation slices

1. **State contract and migration**
   - versioned minimal snapshot `{cart, saved, holds}`;
   - migrate all existing session/local storage keys;
   - prune expired holds and malformed entries;
   - remove legacy keys only after the v3 snapshot is persisted.
2. **Hold-source cutover**
   - move `/cart` and product hold actions to the unified state owner;
   - retire the independent `ShopProvider` timer and `laitstyle-held-items-v1` write path.
3. **Cart and saved cutover**
   - move current `StorefrontProvider` cart/saved ownership behind the unified state contract;
   - keep compatibility selectors only while live consumers migrate.
4. **Auth and overlay narrowing**
   - submit canonical auth actions;
   - remove browser-auth duplication and client identity authority;
   - split overlay-only state from durable client intent state.
5. **Compatibility deletion and route proof**
   - delete retired providers/modules;
   - prove admin/auth do not mount storefront state;
   - complete browser and bundle/RSC review.

## Required evidence

- Focused unit tests for normalization, migration, expiry pruning and cleanup.
- Provider/selector tests for cart, saved and holds.
- Browser flows at mobile and desktop widths for cart, auth dialog and navigation.
- Proof that admin/auth routes do not mount storefront providers.
- Proof that no full catalogue is serialized into the persisted client snapshot.
- `pnpm` architecture, lint, typecheck, test and build evidence.
- Reviewer completion report before leaving draft.

## Progress ledger

```text
State: implementation
Completed: Phase 3 merged; fresh Phase 4 branch created from current main; v3 minimal client-state snapshot, legacy migration, expiry pruning and cleanup tests added
Current: wire the unified state owner into the storefront provider boundary, beginning with holds and /cart
Blocked by: GitHub-hosted ubuntu-latest jobs currently terminate before step allocation; source validation remains unexecuted until runner access is restored
Contracts changed: new versioned client-state storage contract only; no public UI or product DTO changes
Files/surfaces owned: storefront shared state, shell composition, cart/saved/hold consumers, compatibility provider deletion
Validation evidence: source tests authored; no runner-executed evidence yet
Next handoff: planner → ui-engineer hold-source cutover → reviewer
```
