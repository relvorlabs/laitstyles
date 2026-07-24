# Phase 3 — Typed HTTP and Module Foundation

**Branch:** `refactor/phase-3-http-module-foundation`  
**Base commit:** `558e34852f38f0982c7ce9d7c32422f09bbf8775`  
**Status:** In progress  
**Goal:** Prove the approved typed browser transport and domain-module contract without migrating a Phase 4 business domain or changing presentation.

## Authority and predecessor debt

This phase is controlled by `decision-and-migration-review.md`, especially the approved browser flow:

```text
Client Component
  -> typed browser API client
  -> /api/v1 Route Handler
  -> domain operation
  -> persistence when the domain requires it
```

Phase 2 was squash-merged by explicit repository-owner direction as
`558e34852f38f0982c7ce9d7c32422f09bbf8775` while its trusted-runner validation remained blocked.
That validation debt remains active and is not represented as passing.

## Locked scope

Phase 3 may:

- establish client-compatible API envelope types;
- establish server-only Route Handler response and error mapping;
- establish a typed browser `fetch` client;
- create `/api/v1/**` as the machine-readable API namespace;
- create the smallest useful module proving shared schema, server query and browser client boundaries;
- add colocated unit and Route Handler tests;
- add machine checks for the transport and dependency contract;
- preserve existing compatibility endpoints while consumers have not migrated;
- update migration documentation.

Phase 3 must not:

- migrate product or inventory reads, writes, policies or Prisma ownership;
- replace existing admin inventory API consumers;
- remove the exact Phase 4 TanStack-to-Server-Action exception;
- migrate auth, checkout, payment, order, customer, return or delivery domains;
- move or rewrite storefront/admin UI;
- add a repository or service class without a real replaceable boundary;
- route Server Components through internal HTTP;
- call a Server Action from a Route Handler.

## Implemented source slice

### Shared HTTP contract

`src/lib/http/contracts.ts` defines:

```text
ApiSuccess<TData, TMeta> = { data, meta }
ApiFailure = { error: { code, message, fieldErrors? } }
```

The contract includes runtime guards used by the browser client. It does not replace the canonical
business `Result` type in `src/lib/errors/index.ts`.

### Server transport adapter

`src/lib/http/server.ts` is server-only and provides:

- `handleApiRequest` for thin Route Handler adapters;
- standard success envelopes;
- stable expected API errors;
- Zod validation mapping to `VALIDATION_ERROR` with field errors;
- sanitized unexpected failures using `INTERNAL_ERROR`;
- structured server logging without returning raw exception details.

`src/lib/errors/api-error.ts` owns the transport-specific `ApiError`. Reusable domain failures may
be mapped into it at the Route Handler boundary; domain logic does not depend on Next.js responses.

### Browser transport adapter

`src/lib/http/client.ts` provides a generic typed `apiRequest` function that:

- requests JSON;
- returns typed success envelopes;
- throws `ApiClientError` for stable API failures;
- rejects malformed JSON and non-contract payloads;
- imports no Prisma, session, server module or Server Action.

### Module and route proof

The minimal `health` module proves the target dependency direction:

```text
src/modules/health/schema.ts
src/modules/health/server/queries.ts
src/modules/health/client/api.ts
src/app/api/v1/health/route.ts
```

Resulting flow:

```text
fetchHealthStatus
  -> apiRequest("/api/v1/health")
  -> GET route
  -> handleApiRequest
  -> getHealthStatus
```

The existing `/api/health` endpoint remains unchanged as a compatibility endpoint. Product and
inventory transport remains legacy until Phase 4.

### Contract tests and guard

Tests are authored for:

- success envelopes;
- expected stable API errors;
- Zod field validation errors;
- sanitized unexpected failures;
- browser success/error/malformed-response handling;
- the real `/api/v1/health` response and schema.

`scripts/checks/http-module-contract.mjs` is part of `pnpm check:architecture`. It rejects:

- missing Phase 3 foundation files;
- a non-server-only server HTTP adapter or health query;
- client imports of server modules or persistence infrastructure;
- `/api/v1/**` routes that bypass `handleApiRequest` with ad hoc `NextResponse.json` payloads;
- Route Handler imports that appear to target Server Actions;
- removal of the existing `/api/health` compatibility endpoint during this phase.

## Execution checklist

| ID | Task | Status | Evidence |
| --- | --- | --- | --- |
| P3-T01 | Add typed success and error envelopes | Complete | `src/lib/http/contracts.ts` |
| P3-T02 | Add stable server error mapping and sanitized fallback | Complete | `src/lib/errors/api-error.ts`, `src/lib/http/server.ts` |
| P3-T03 | Add typed browser API client | Complete | `src/lib/http/client.ts` |
| P3-T04 | Establish `/api/v1/**` with a thin proof Route Handler | Complete | `src/app/api/v1/health/route.ts` |
| P3-T05 | Prove the target module dependency direction | Complete | `src/modules/health/**` |
| P3-T06 | Add unit and route contract coverage | Implemented; not executed | Three colocated Vitest files |
| P3-T07 | Add machine-readable architecture guard | Complete | `scripts/checks/http-module-contract.mjs` and `package.json` |
| P3-T08 | Preserve existing compatibility transport until consumer migration | Complete | `/api/health` retained; legacy inventory routes untouched |
| P3-T09 | Execute architecture, Biome, TypeScript, Vitest, build and React Doctor | Blocked | Trusted `laitstyles-ci` runner remains unavailable |
| P3-T10 | Prove runtime `/api/v1/health` response and review final diff | Blocked | Requires executable source environment or trusted runner |

## Acceptance gate

Phase 3 is complete only when:

1. `pnpm check:architecture` passes, including the HTTP/module contract;
2. Biome and TypeScript pass for the new files;
3. all HTTP, module and Route Handler Vitest tests pass;
4. a production build proves server/client boundaries compile correctly;
5. React Doctor reports no new changed-scope problem;
6. `/api/v1/health` returns the documented success envelope at runtime;
7. expected, validation and unexpected error tests prove stable sanitized responses;
8. no legacy API consumer or public URL regresses;
9. Phase 2 validation debt remains reported honestly while unresolved.

Required command surface:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
```

A queued job, unexecuted test file, unavailable runner or public-deployment-only result is not a pass.

## Rollback

Before merge, close the Phase 3 PR or revert its commits. After a squash merge, revert the Phase 3
squash commit as one unit. Do not partially keep `/api/v1/health` while removing its shared contract,
server adapter or module query, because that would leave an unsupported transport path.
