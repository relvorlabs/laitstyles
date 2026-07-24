# Phase 3 — Typed HTTP and Module Foundation

**Branch:** `refactor/phase-3-http-module-foundation`  
**Base commit:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Status:** Source implementation complete; acceptance validation pending  
**Goal:** Establish the reusable API-first browser transport and domain-module foundation without
migrating a Phase 4 business domain or changing presentation.

## Authority and predecessor debt

This phase is controlled by `decision-and-migration-review.md`, especially the approved browser
flow:

```text
Client Component
  -> TanStack Query hook
  -> typed browser API client
  -> /api/v1 Route Handler
  -> domain query or command
  -> Prisma when the domain requires persistence
```

Phase 2 was squash-merged by explicit repository-owner direction as
`558e34852f38f0982c7ce9d7c32422f09bbf8775` while its trusted-runner validation remained blocked.
That validation debt remains active and is not represented as passing.

## Locked scope

Phase 3 may:

- establish client-compatible API success, error and pagination contracts;
- establish server-only Route Handler response, validation, correlation and error mapping;
- establish reusable API authentication and permission adapters over the current auth boundary;
- establish a typed browser `fetch` client that preserves cancellation;
- create `/api/v1/**` as the machine-readable API namespace;
- create the smallest useful module proving shared schema, server query and browser client
  boundaries;
- define intentional admin QueryClient defaults and cache/invalidation rules;
- add colocated unit, Route Handler and runtime HTTP smoke coverage;
- preserve existing compatibility endpoints while consumers have not migrated;
- update migration documentation and machine-readable guards.

Phase 3 must not:

- migrate product or inventory reads, writes, policies or Prisma ownership;
- replace existing admin inventory API consumers;
- remove the exact Phase 4 TanStack-to-Server-Action exception;
- migrate auth ownership, checkout, payments, orders, customers, returns or delivery;
- move or rewrite storefront/admin UI;
- add a repository or service class without a real replaceable boundary;
- route Server Components through internal HTTP;
- call a Server Action from a Route Handler.

## Implemented foundation

### Shared API contract

`src/lib/http/contracts.ts` defines:

```text
Success: { data, meta? }
Error:   { error: { code, message, fieldErrors? } }
Page:    { page, pageSize, total, pageCount }
```

`meta` is optional so single-resource responses match the approved contract. `fieldErrors` maps each
field to one stable human-readable message.

### Server transport and request correlation

`src/lib/http/server.ts` and `src/lib/http/request-context.ts` provide:

- `handleApiRequest` for thin Route Handler adapters;
- standard success and failure envelopes;
- safe incoming or generated `x-request-id` correlation;
- structured unexpected-error logging with request ID, method and pathname;
- stable expected API errors;
- Zod validation mapping to `VALIDATION_ERROR`;
- sanitized unexpected failures using `INTERNAL_ERROR`;
- response headers that preserve caller headers and include the request ID.

### Request validation

`src/lib/http/request.ts` provides:

- JSON content-type enforcement;
- stable malformed-JSON errors;
- schema-driven JSON body parsing;
- scalar and repeated URL search-parameter parsing.

### Authentication and policy adapters

`src/lib/http/auth.ts` provides:

- `requireApiSession()`;
- `requireApiConsumer()`;
- `requireApiStaff(capability)`.

It maps anonymous, suspended, unavailable and missing-capability outcomes to stable HTTP errors while
reusing the current Phase 1 session and capability primitives. Auth ownership itself remains a Phase
7 migration.

`src/lib/http/policy.ts` provides `requireApiPermission()` so domain policies can deny with a stable
`403` or conceal a resource with `404` without importing Next.js response objects.

### Pagination

`src/lib/http/pagination.ts` provides:

- bounded `page` and `pageSize` parsing;
- defaults of page `1` and page size `25`;
- a standard `{ page, pageSize, total, pageCount }` response helper.

### Typed browser client

`src/lib/http/client.ts`:

- requests JSON;
- returns typed success envelopes;
- throws `ApiClientError` for stable API failures;
- maps transport failures to `NETWORK_ERROR`;
- rejects malformed or non-contract responses;
- preserves `AbortError` so TanStack Query cancellation works;
- imports no Prisma, session, server module or Server Action.

### Admin QueryClient defaults

`src/lib/query/admin-query-client.ts` replaces the ambiguous app-wide query-client module. The
existing provider remains scoped under the admin layout and uses intentional defaults documented in
`phase-3-cache-invalidation-contract.md`.

### Module and runtime proof

The minimal `health` module proves the target dependency direction:

```text
src/modules/health/client/api.ts
  -> src/lib/http/client.ts
  -> GET /api/v1/health
  -> src/lib/http/server.ts
  -> src/modules/health/server/queries.ts
```

The route passes its `Request` into the shared adapter, returns `x-request-id`, and is included in the
production-server HTTP smoke suite. The existing `/api/health` endpoint remains unchanged for
compatibility. Product and inventory transport remains legacy until Phase 4.

## Execution checklist

| ID | Approved task | Source status | Evidence |
| --- | --- | --- | --- |
| P3-T01 | Create `src/modules` | Complete | `src/modules/health/**` proves the module contract |
| P3-T02 | Create a typed browser HTTP client | Complete | `src/lib/http/client.ts` |
| P3-T03 | Define standard success and error envelopes | Complete | `src/lib/http/contracts.ts` |
| P3-T04 | Add JSON parsing and malformed-response handling | Complete | browser and request helpers plus tests |
| P3-T05 | Add request validation helpers | Complete | `src/lib/http/request.ts` |
| P3-T06 | Add API authentication helpers | Complete | `src/lib/http/auth.ts` |
| P3-T07 | Add permission-policy helpers | Complete | `src/lib/http/policy.ts` |
| P3-T08 | Add API logging and request correlation | Complete | request context, response header and structured log tests |
| P3-T09 | Define pagination response metadata | Complete | `src/lib/http/pagination.ts` |
| P3-T10 | Define API contract tests | Complete in source; execution pending | colocated HTTP, auth, policy, pagination, query and route tests |
| P3-T11 | Add admin-scoped QueryClient defaults | Complete | `src/lib/query/admin-query-client.ts` |
| P3-T12 | Document cache and invalidation rules | Complete | `phase-3-cache-invalidation-contract.md` |

## Acceptance gate

Phase 3 is complete only when:

1. `pnpm check:architecture` passes, including the complete Phase 3 contract;
2. Biome and TypeScript pass for the changed source;
3. all HTTP, auth, policy, pagination, QueryClient and Route Handler tests pass;
4. a production build proves server/client boundaries compile correctly;
5. React Doctor reports no new changed-scope problem;
6. source-backed runtime smoke proves `/api/v1/health`, its typed envelope and `x-request-id`;
7. expected, validation, authentication, permission and unexpected failures are stable and
   sanitized;
8. browser cancellation reaches `fetch` through `AbortSignal`;
9. no legacy API consumer or public URL regresses;
10. Phase 1 and Phase 2 validation debt remains reported honestly while unresolved.

Required command surface:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
```

The source-backed Playwright workflow also executes the HTTP smoke against the production server and
retains the existing desktop, tablet and mobile UI contract. A queued job, unexecuted test,
unavailable runner or public-deployment-only result is not a pass.

## Rollback

Before merge, close this PR or revert its commits. After a squash merge, revert the Phase 3 squash
commit as one unit. Do not partially keep `/api/v1/health` while removing its shared contract,
validation, auth/policy adapters or request-correlation boundary.
