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
- `providers/session-provider.tsx` — shared client session snapshot plus local sign-in/sign-out synchronization.

Browser routes under `src/app/auth/**` remain because they are Next.js transport adapters. They may parse requests, call this module and return redirects, but they must not create Supabase clients or duplicate provider orchestration.

## Interaction contract

- Validation, provider and email-delivery failures remain in the currently mounted form or storefront dialog.
- Password-reset requests, confirmation resends and confirmation-required signup success update inline.
- OAuth start and callback failures return to the originating staff page, signup page or storefront dialog with an allow-listed error code.
- Password sign-in updates the shared client session directly; it must not call `router.refresh()` or rebuild the current route.
- The dialog displays its success state before any navigation. **Go to my account** and an explicit protected return path are user-authorized success navigations.
- Successful sign-out clears the shared session and replaces the current route with `/` so protected account content is not left visible.
- Transport query parameters are removed with browser history replacement so opening the dialog does not rebuild the route.

Authentication email and OAuth callback URLs prefer `AUTH_SITE_URL`, then `NEXT_PUBLIC_APP_URL`, then `NEXT_PUBLIC_SITE_URL`, and finally the current request origin. The selected public origin must have `/auth/callback` in the Supabase redirect allow-list.

The authoritative implementation ledger remains `docs/architecture-migration/phase-7-auth-status.md`.
