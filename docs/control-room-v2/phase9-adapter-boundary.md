# Phase 9 Repository and Adapter Boundary

## Status

**Batch 9A started under the user's explicit override.**

Phase 8 remains implemented but unaccepted. Starting Phase 9 does not reclassify any blocked Phase 4–8 check as passing.

## Implemented foundation

The Control Room now has typed asynchronous repository contracts for:

- Inventory products, taxonomy and stock movements
- Orders
- Holds
- Returns
- Customers
- Store settings
- Overview resources

The development adapter wraps the existing `ControlRoomStore` rather than copying its state. Every repository read resolves from `store.getSnapshot()` at call time and returns a structured clone. This preserves one current session source of truth while creating a replaceable Promise-based data boundary.

The repository provider is mounted at the existing Control Room provider boundary and is initialized once per mounted store. Feature components have not yet been migrated to query hooks, so the legacy store still owns current reads and writes during this transition.

## Truthful prototype behavior

- No API route was added around seed data.
- No fake latency, random failure or background job was introduced.
- No persistence across refresh is claimed.
- Repository methods return Promises solely so a later HTTP or RPC adapter can preserve the same feature-facing contract.
- The in-memory adapter remains live after store mutations; it does not retain a stale copied snapshot.

## Production adapter replacement

A future production adapter must implement the same domain capabilities but obtain records from authenticated, tenant-scoped endpoints. It must define:

- request and response schemas for list and detail resources
- pagination and filter contracts
- version or concurrency tokens for stock-sensitive writes
- normalized not-found, validation, conflict and authorization errors
- authentication and store/tenant context
- upload/object-storage contracts for product media
- retry policy for transport failures versus non-retryable business failures

Feature components and query-key factories must depend on repository interfaces, not on seed files or the concrete in-memory adapter.

## Package and QueryClient boundary still pending

`@tanstack/react-query` and `@tanstack/eslint-plugin-query` are not yet committed because this environment cannot safely regenerate the repository's pnpm lockfile. Editing `package.json` without a matching lockfile would deliberately break `pnpm install --frozen-lockfile`.

The next Batch 9A step is therefore:

1. regenerate `package.json` and `pnpm-lock.yaml` together using pnpm;
2. add the TanStack ESLint flat-config rules;
3. mount one stable browser `QueryClient` at the Control Room boundary;
4. add intentional default stale, garbage-collection, retry and refetch policies;
5. begin Inventory query-key and query-option migration.

No package installation or QueryClient execution is represented as complete until those files are generated and executable checks run.
