# Doctrine: Runtime contracts and API seam

Owner of: Zod request/response schemas, API envelope, compatibility, browser parsing and OpenAPI.
Cited by: server-side engineer, frontend engineer, planner and reviewer.

## Ownership

The server-side engineer owns module runtime contracts because it produces and validates the
server behavior. The frontend engineer is the primary consumer and must state consumer needs
precisely. There is no separate contracts role.

Contracts live with the owning module, normally in `schema.ts` or `contracts.ts`, and are safe to
import from both server and client code.

## Runtime-schema-first

Use Zod for application-controlled:

- request body;
- route params and query;
- response data;
- field-error details;
- webhook/provider payloads;
- browser storage or extension messages when applicable.

Infer TypeScript types from schemas. Do not define a second matching interface.

Request objects are strict unless an open object is intentionally required. Use `z.unknown()` and
narrowing rather than `z.any()`.

## Current API envelope

Laitstyles Route Handlers use:

```ts
// success
{ data: TData, meta?: TMeta }

// failure
{ error: { code: string, message: string, fieldErrors?: Record<string, string> } }
```

The request correlation ID is returned through `X-Request-Id`.

Do not introduce a competing `{ ok: ... }` envelope inside an individual endpoint. Protocol-owned
responses such as verified webhooks, files or redirects may use their required transport shape.

## Response validation

A generic TypeScript parameter does not validate JSON.

For every new or materially changed endpoint:

- define a response-data Zod schema;
- map database/provider values explicitly;
- parse the server result before returning it;
- parse the full browser response through the same module contract before exposing data to hooks.

Existing basic envelope guards may remain, but they do not replace domain response validation.

A server-generated response that fails its schema is an internal defect. Log diagnostics with the
request ID and return a generic 500 response.

## Compatibility

Classify a change as:

- compatible additive;
- conditionally compatible, such as a new union/enum state;
- breaking, such as removed/renamed fields or changed status semantics.

Prefer additive changes. When producer and consumer cannot deploy atomically, use a deliberate
versioned route or migration window approved by the user. Do not retain compatibility code without
an explicit need.

## OpenAPI

OpenAPI is a secondary artifact generated from Zod contracts and route metadata, never a parallel
source of truth.

When the repository's OpenAPI generator is present or an API task requires public documentation:

- register route, method, auth, request schema, success data and stable errors;
- generate and verify the artifact;
- fail checks when a committed artifact is stale.

Do not hand-write a separate Swagger DTO hierarchy. Do not add OpenAPI infrastructure as unrelated
cleanup.

## Consumer seam

The browser API function:

- sends credentials where required;
- accepts an abort signal;
- parses JSON defensively;
- parses the envelope and domain data at runtime;
- converts failures into stable typed frontend errors;
- preserves `X-Request-Id` for diagnostics.

Components never parse transport data directly.
