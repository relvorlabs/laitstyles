# Doctrine: Validation and completion reporting

Owner of: evidence required before completion and the final implementation report.
Cited by: every role and workflow.

## Principle

The implementing engineer writes and runs tests for its work. The reviewer independently inspects
the diff and reruns or samples critical gates. Match evidence to behavior: typecheck does not prove
a cookie flow, migration, payment webhook, responsive page or accessible interaction.

## Repository command surface

Use the actual scripts. Applicable commands include:

```bash
pnpm biome
pnpm typecheck
pnpm test
pnpm check:architecture
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:status
pnpm test:persistence
pnpm test:auth:e2e
pnpm test:authorization
pnpm build
pnpm react-doctor
pnpm validate
pnpm validate:full
pnpm validate:browser
```

Do not invent results. Do not bypass gates with suppressions, skipped tests, unsafe casts or relaxed
configuration.

## Server-side gates

As applicable:

- Zod request and response tests;
- server operation unit tests;
- Route Handler tests and real HTTP requests;
- auth and authorization states;
- Prisma schema validation/generation;
- migration creation, SQL review and isolated PostgreSQL application;
- transaction, idempotency and concurrency tests;
- cache invalidation behavior;
- webhook/provider success, invalid signature, timeout and retry behavior;
- structured safe error response and request ID;
- production build and server logs.

## Frontend gates

As applicable:

- Biome/lint and typecheck;
- unit/component/browser tests;
- production build and React Doctor;
- real API integration and runtime parsing;
- Query key/invalidation/mutation behavior;
- Supabase auth browser flow when affected;
- loading, empty, partial, success, error, auth and unavailable states;
- light/dark themes;
- 320×568, 375×812, 768×1024, 1280×800 and short-height overlays;
- keyboard, focus, names, labels, announcements, contrast and reduced motion;
- browser console/network and hydration health;
- no raw interactive reimplementation, component stylesheet or inline style introduced.

## Auth gates

When auth changes, exercise real paths as applicable: sign-up, verification, sign-in, cookie
session, protected server/API access, authorization, sign-out/revocation, password reset, OAuth
callback, suspended/unavailable behavior and trusted-origin rejection.

Do not call auth complete after inserting fake profile/session records only.

## Reviewer verdict

- **Pass**: applicable behavior and gates are evidenced with no blocking finding.
- **Pass with evidenced pre-existing issues**: current change is sound and unrelated existing
  failures are clearly proven.
- **Block**: a new defect, security/data issue, contract mismatch, missing required implementation
  or unverified critical path remains.

Critical/Warning findings include file/line evidence and concrete remediation. Personal preference
is not a blocker.

## Completion report

State:

- what changed and why;
- important files and ownership surfaces;
- rendering/transport/state decisions;
- contracts, migration, auth and security implications;
- exact commands run and results;
- runtime/browser/database behavior actually exercised;
- blockers or unverified paths;
- material doctrine/skill translation or user override.

Do not add generic future improvements.
