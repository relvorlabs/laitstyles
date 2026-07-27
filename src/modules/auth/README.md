# Auth module

`src/modules/auth/**` is the canonical owner of Laitstyle authentication.

## Ownership

- `schema.ts` — shared form and transport validation.
- `types.ts` — account and staff role contracts.
- `permissions.ts` — client-safe capability checks.
- `server/session.ts` — current session resolution and staff access.
- `server/account-provisioning.ts` — Prisma profile, profile-detail and customer provisioning.
- `server/authenticate.ts` — password auth, email delivery requests, Google OAuth, callback completion, recovery-session verification and sign-out.
- `server/redirects.ts` — safe return paths and deterministic callback-origin resolution.
- `server/diagnostics.ts` — allow-listed user errors and structured provider diagnostics.
- `ui/**` — storefront dialog plus the shared standalone auth-page system.

Browser routes under `src/app/auth/**` remain because they are Next.js transport adapters. They may parse requests, call this module and return redirects, but they must not create Supabase clients or duplicate provider orchestration.

Authentication email and OAuth callback URLs prefer `AUTH_SITE_URL`, then `NEXT_PUBLIC_APP_URL`, then `NEXT_PUBLIC_SITE_URL`, and finally the current request origin. The selected public origin must have `/auth/callback` in the Supabase redirect allow-list.

The authoritative implementation ledger remains `docs/architecture-migration/phase-7-auth-status.md`.
