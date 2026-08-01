# Storefront Runtime Resilience and Performance Design

**Date:** 2026-07-31  
**PR:** #64  
**Status:** Approved by the user request; implementation and executable acceptance remain open.

## Problem

The local Next.js runtime reports PostgreSQL authentication/message timeouts through Prisma's driver adapter, repeated aborted requests, intermittent admin product failures, missing placeholder assets, slow storefront and admin route responses, and an LCP image warning. The application currently performs heavyweight catalogue reads for the global storefront shell and uses database patterns that amplify pressure on a small pooled connection budget.

The existing API error classifier understands selected Prisma and PostgreSQL codes only when they appear at the top level or in Prisma metadata. The observed `DriverAdapterError` stores PostgreSQL code `08006` and `EAUTHTIMEOUT` inside `cause`, so the request can still be reported as an unrelated HTTP 500.

The shell catalogue loads up to 300 complete product details—including all media, measurements, variants and stock—then strips most of that data for shell use. Category loading also executes one product count per category. When the connection is slow or temporarily unavailable, server paths wait for the database timeout and multiple concurrent requests repeat the same pressure.

## Goals

- classify observed nested Prisma/adapter/PostgreSQL connection failures as safe HTTP 503 responses
- reduce database round trips and payload size for global storefront catalogue data
- provide bounded, retryable unavailable states instead of long blocking renders
- remove broken local placeholder references
- fix only genuine application LCP warnings by eagerly loading the actual above-the-fold image
- separate application failures from extension, unsupported runtime, or generated-development-tool noise
- keep all changes type-safe and measurable

## Error classification

Database classification traverses a bounded `cause` chain, maximum depth three. It reads only safe machine codes from these fields:

- `code`
- `errorCode`
- `originalCode`
- `errno`
- `meta.code`
- `meta.databaseCode`

It never logs or returns raw error messages, connection strings, hosts, SQL, table names or column names.

Recognized connection signals include PostgreSQL class `08`, `08006`, `EAUTHTIMEOUT`, `ECONNREFUSED`, `ECONNRESET`, `ETIMEDOUT`, Prisma P1000/P1001/P1002/P1003/P1008/P1017, and pool-exhaustion/termination codes already present in the project.

Responses:

- missing relation/column: `503 DATABASE_SCHEMA_NOT_READY`
- connection/pool/auth-message timeout: `503 DATABASE_UNAVAILABLE`
- unrelated application defects: `500 INTERNAL_ERROR`

## Query architecture

### Lightweight shell catalogue

The global shell must not load complete product detail records. Introduce a shell-specific repository query that selects only:

- product identity, slug, name, brand and taxonomy labels
- price/reference price
- inventory mode and low-stock threshold
- cover asset fields needed by `CloudImage`
- product-level stock
- variant identity, label, size, colour, optional price and stock

Descriptions, all detail media, care instructions, flaw notes, measurements and reviews remain product-page concerns.

The shell projection continues to expose the existing public contract, but its data source is lightweight and bounded. The maximum shell payload is set deliberately and documented. Pagination/product pages use their own summary/page queries rather than the global shell payload.

### Category counts

Replace the category N+1 count loop with a bounded aggregate:

1. fetch categories once
2. aggregate published product counts grouped by `category_id` once
3. join in memory and remove zero-count categories

### Request recovery

Public storefront shell loading returns `availability: "temporarily-unavailable"` promptly after a classified database failure. Client Query retries remain bounded and must not enter a render/refetch loop.

Server catalogue page queries convert classified database unavailability to an explicit public unavailable result or route-level recovery boundary rather than blocking for repeated long attempts. Unexpected programming errors still surface to the nearest error boundary.

## Connection policy

Runtime Prisma uses `DATABASE_URL`; migration commands use `DIRECT_URL` when provided. The implementation must not guess the correct Supabase endpoint from source. Verification records the redacted host category and port locally without committing secrets.

The runtime checks:

- Node 25.x as declared by the repository
- a transaction-pooler/runtime-compatible `DATABASE_URL` where applicable
- a direct/session connection for Prisma migrations through `DIRECT_URL`
- one shared Prisma client in development
- a conservative pool size appropriate to Next.js local concurrency

No source change claims that Node 26 caused the database timeout. Node 25 is required to remove an unsupported-variable during acceptance.

## Asset and image policy

- Replace `/placeholder.svg` with the existing canonical `/product-placeholder.svg` or a semantic no-image state.
- Do not request a placeholder URL when the component already supports an inline unavailable state.
- Only the genuine above-the-fold/LCP image receives eager loading. Below-the-fold product cards remain lazy.
- `CloudImage` remains the only storefront image boundary.
- Width/height or aspect ratio remains reserved to avoid layout shift.

## Development-only diagnostics

The following are triaged separately and are not automatically treated as product bugs:

- React instrumentation errors whose stack originates exclusively from the React DevTools extension
- invalid source-map warnings from generated `.next/dev` Prisma chunks
- aborted requests caused by navigation or query cancellation

Acceptance repeats the scenario with:

1. Node 25.x
2. regenerated Prisma client
3. cleared `.next`
4. React DevTools disabled

If warnings persist without the extension and unsupported runtime, they become implementation defects with a minimal reproduction.

`MaxListenersExceededWarning` is treated similarly: reproduce under Node 25 with one clean dev server. Do not silence it with `setMaxListeners` until the listener owner is identified.

## Performance budgets

Development measurements are noisy, but the following acceptance targets expose major regressions:

- warm storefront shell/API request: under 2 seconds locally when the database is healthy
- warm admin list API request: under 3 seconds locally when the database is healthy
- no route repeatedly waits for the full database connection timeout after a classified outage
- no category-count N+1 queries
- no 300-record full-detail query for global shell hydration
- no unbounded client refetch loop

Production/browser measurement uses route timing and LCP evidence, not development compilation time alone.

## Testing

Automated coverage:

- nested `cause.code = "08006"` maps to `DATABASE_UNAVAILABLE`
- nested `cause.originalCode = "EAUTHTIMEOUT"` maps to `DATABASE_UNAVAILABLE`
- raw messages are absent from response and structured logs
- shell repository selects only its documented shape
- category count aggregate returns the same public result as the former N+1 implementation
- unavailable catalogue state does not trigger unbounded retries
- all mapper fallback image URLs resolve to the canonical asset
- only the designated hero/LCP image requests eager loading

Database/query evidence:

- capture query count for shell catalogue before and after
- capture payload size before and after
- verify pooled runtime connection and migration connection separately
- exercise a temporary database outage and recovery

Reviewer gates:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:browser
```

## Explicit exclusions

- No swallowing of unknown programming errors as “database unavailable”.
- No secret values in source, logs, docs or PR comments.
- No global eager loading of product images.
- No `setMaxListeners` workaround without a proven listener leak owner.
- No database-provider replacement.
- No broad admin query rewrite beyond code proven to contribute to the reported failures.
