# Doctrine: Next.js server-side architecture

Owner of: current server rendering, Route Handlers, Server Actions, domain operations, errors,
caching and external integrations.
Cited by: server-side engineer, frontend engineer, planner and reviewer.

## Active runtime

The active backend is Next.js server-side code. Use the installed Next.js version and current App
Router APIs. Do not implement ordinary current work in NestJS.

## Rendering and transport decision

### Server Component read — default for initial rendering

```text
Server Component → module server query → Prisma → serializable view data
```

Use for initial page data, SEO-relevant catalogue content and request-scoped authenticated reads.
Do not call the application's internal `/api/**` from a Server Component.

### Browser read or mutation

```text
Client Component → TanStack Query → module client API function
→ /api/v1 Route Handler → module server operation → Prisma/provider
```

Use when the browser needs refetch, mutation, polling, optimistic interaction or client-owned
controls.

### Server Action

```text
form/client adapter → thin Server Action → module server command
```

Use only when action semantics, progressive enhancement, redirect or route revalidation make it
simpler than a browser API. A Server Action validates transport input and delegates. It does not
own reusable business logic.

### Webhook

```text
Route Handler → signature verification → idempotent domain command → transaction
```

## Server module design

A domain server module owns:

- queries and commands;
- resource authorization and lifecycle rules;
- transactions and idempotency;
- persistence/provider mapping;
- cache tags and invalidation;
- safe application errors.

Keep Route Handlers thin. They authenticate/authorize, parse input, call one operation and return
through the shared HTTP wrapper.

Simple Prisma access may remain in the operation. Extract a repository or query object only when
complexity, reuse or testability justifies it. Do not create base repositories or generic CRUD
services.

## Contracts and serialization

Use the Zod schemas defined by the owning module. Parse body, query, params and provider output.
Before crossing into client code, map Prisma rows to explicit serializable contract data:

- `Date` → ISO string;
- `Decimal` → deliberate string/number representation;
- `BigInt` → string or safe number;
- enum/database names → stable product vocabulary.

Never return a Prisma row or provider SDK object directly.

## API errors

Use the shared API error and `handleApiRequest` infrastructure.

Classify failures as:

1. validation/client input;
2. authentication/authorization/not-found/conflict/state/limit (`4xx`);
3. legitimate successful business outcome modeled in data;
4. dependency unavailable/timeout or unknown defect (`5xx`).

Do not return success for a database, auth, payment or provider outage. Do not expose unknown error
messages, stack traces, SQL, tokens or provider payloads.

Map Prisma/provider errors where the operation knows the business meaning. Otherwise let the
central error mapper log once with the request ID.

## Caching

Use Next.js caching only with a defined freshness and invalidation strategy.

- Private authenticated data is not shared across users.
- Writes invalidate or update every affected cache/read model.
- Do not cache local arrays or incomplete prototype data.
- Do not add `unstable_cache`, tags or memoization by habit.
- React `cache()` may deduplicate a request-scoped identity/query operation where semantics are
  correct; it is not persistent application caching.

## External providers

Paystack, Cloudinary, couriers, email and other providers are untrusted boundaries.

- validate provider input/output;
- define finite timeouts;
- retry only bounded transient idempotent operations;
- verify webhooks before trusting fields;
- protect state-changing operations with idempotency;
- redact sensitive logs;
- keep provider types inside adapters;
- release manually acquired resources in `finally`.

Do not perform slow network operations inside a Prisma transaction.

## Background work

Use a durable job only when the operation must survive disconnects, exceed safe request duration or
requires controlled retry/concurrency. Implement the complete job lifecycle when required; do not
leave a queue TODO or add a queue to a bounded request.
