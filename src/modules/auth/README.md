# Auth module

`src/modules/auth/**` is the canonical owner of Laitstyle authentication.

## Ownership

- `errors.ts` — client-safe allow-listed authentication error codes and user-facing messages.
- `schema.ts` — shared form and transport validation.
- `types.ts` — account and staff role contracts.
- `permissions.ts` — client-safe capability checks.
- `server/session.ts` — current session resolution and staff access.
- `server/account-provisioning.ts` — Prisma profile, profile-detail and customer provisioning.
- `server/authenticate.ts` — password auth, email delivery requests, Google OAuth, callback completion, recovery-session verification and sign-out.
- `server/redirects.ts` — safe success paths, originating error surfaces and deterministic callback-origin resolution.
- `server/diagnostics.ts` — server-only provider error mapping and structured diagnostics.
- `ui/**` — storefront dialog plus the shared standalone auth-page system.

Browser routes under `src/app/auth/**` remain because they are Next.js transport adapters. They may parse requests, call this module and return redirects, but they must not create Supabase clients or duplicate provider orchestration.

## Interaction contract

- Validation, provider and email-delivery failures remain in the currently mounted form or storefront dialog.
- Password-reset requests, confirmation resends and confirmation-required signup success update inline.
- OAuth start and callback failures return to the originating staff page, signup page or storefront dialog with an allow-listed error code.
- Navigation is reserved for successful sign-in, completed OAuth and explicit user choices after success.
- The storefront dialog must not call `router.refresh()` until its success state has been shown and dismissed.
- Transport query parameters are removed with browser history replacement so opening the dialog does not rebuild the route.

Authentication email and OAuth callback URLs prefer `AUTH_SITE_URL`, then `NEXT_PUBLIC_APP_URL`, then `NEXT_PUBLIC_SITE_URL`, and finally the current request origin. The selected public origin must have `/auth/callback` in the Supabase redirect allow-list.

The authoritative implementation ledger remains `docs/architecture-migration/phase-7-auth-status.md`.
