# Doctrine: Supabase Auth, authorization and security

Owner of: Supabase clients, sessions, identity/profile mapping, authorization, browser security,
secrets and abuse controls.
Cited by: server-side engineer, frontend engineer, backend engineer when migration is active and
reviewer.

## Authentication standard

Supabase Auth is the identity and session system. Do not add a parallel custom JWT, password table,
session cookie or auth protocol.

### Browser client

`src/lib/supabase/client.ts` provides the singleton browser client. Use it for Supabase Auth browser
operations such as sign-up, sign-in, OAuth, verification, reset and sign-out.

Do not use it as the default application-data client.

### Server client

`src/lib/supabase/server.ts` creates a request-scoped server client from Next.js cookies. Server
Components, Route Handlers and Server Actions use server auth/session helpers rather than decoding
cookies themselves.

### Session refresh

The Next.js proxy uses `src/lib/supabase/proxy.ts` to refresh existing cookie sessions with a
bounded auth timeout. Public requests without an auth cookie must not incur unnecessary auth calls.
The proxy is not the authorization layer.

## Current session model

`modules/auth/server/session.ts` is the current server identity seam:

1. verify Supabase claims/user;
2. resolve or repair the related Prisma profile/customer invariant;
3. return a discriminated session state (`anonymous`, `consumer`, `staff`, `suspended`,
   `unavailable`);
4. enforce route/service policy with server helpers.

Do not duplicate session resolution across routes. Do not expose raw Supabase or Prisma auth
records to the browser.

## Authorization

Authentication establishes identity. Server authorization determines permission.

- Route Handlers use the established `requireApiSession`, `requireApiConsumer` or
  capability-aware staff helper.
- Server Components use server session/policy helpers and fail closed.
- Resource ownership and lifecycle authorization live in the domain server operation/query.
- Client-supplied user, customer, profile, role or capability values are never authoritative.
- Hiding a control is not authorization.

System staff roles and commerce customer ownership are different concepts.

## Account lifecycle

Email verification, password reset, OAuth callback, invitation and account provisioning flows must
use real Supabase behavior and real profile/customer invariants. Responses must avoid account
enumeration and tokens must never be logged.

The service-role/admin Supabase client is server-only and used only for capabilities that require
it. Never expose its key or object to client code.

## Browser and HTTP security

- Validate environment variables at startup/use boundaries.
- Use exact trusted origins and redirect allowlists.
- Keep secure cookie and HTTPS policy correct for production.
- Do not assume CORS alone prevents CSRF.
- State-changing browser routes must reject untrusted origins according to the established HTTP
  security mechanism.
- Apply Helmet/security headers through the current Next.js configuration/middleware strategy.
- Bound body and upload sizes.
- Rate-limit and concurrency-limit auth, checkout, payment, upload and expensive public operations.

## Logging and secrets

Never log cookies, passwords, authorization headers, access/refresh/reset/verification tokens,
service-role keys, full payment authorization values, database URLs or sensitive provider
payloads.

Unexpected client responses are generic and correlated by request ID. Detailed redacted context
belongs in structured server logs.
