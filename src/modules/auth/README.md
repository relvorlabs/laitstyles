# Auth module

Phase 7 consolidates authentication ownership here without changing existing browser URLs, redirects, cookies, role checks or visual behaviour.

## Baseline

This branch is based on the merged Phase 5–6 architecture repair at `fe6616ecee79c11c856f3165cc46c63d68ad1e37`.

The Auth module must integrate with the current domain architecture rather than recreate legacy `features/**` or top-level business `server/**` ownership.

## Intended server ownership

- `server/session.ts` — current-session and staff-access resolution;
- `server/authenticate.ts` — password and provider authentication orchestration;
- `server/account-provisioning.ts` — consumer profile/customer invariants;
- `server/permissions.ts` — auth-domain capability orchestration;
- `server/redirects.ts` — validated post-auth destinations;
- `server/diagnostics.ts` — auth health and diagnostic operations.

## Intended shared contracts

- `schema.ts` — auth transport/input validation;
- `types.ts` — client-safe auth and session contracts.

## Intended presentation ownership

- `ui/sign-in-form.tsx`;
- `ui/sign-up-form.tsx`;
- `ui/auth-dialog.tsx`.

The existing storefront auth presentation must move here without changing JSX structure, classes, copy, typography, spacing, responsive behaviour or interaction contracts.

## Adapter rule

Files under `src/app/auth/**` remain browser-flow and Next.js transport adapters. They may read route input, set transport responses, redirect and call module operations, but reusable Supabase, Prisma, provisioning, permission and session logic belongs in this module.

OAuth initiation, callback and POST-only sign-out routes remain under their existing `/auth/**` URLs.

## Compatibility removal rule

Phase 7 owns removal of:

- `src/features/storefront/shared/catalogue-data.ts`, after the auth dialog imports its Product contract directly from canonical Products ownership.

Phase 7 does not own removal of:

- `src/features/storefront/shared/storefront-runtime.ts`, which remains an exact Phase 8 checkout compatibility edge.

No new wildcard re-export or additional feature-path consumer may be introduced.

## Non-scope

This module must not own checkout, payments, Paystack settlement, cart state, catalogue data, inventory settlement or broad legacy deletion.
