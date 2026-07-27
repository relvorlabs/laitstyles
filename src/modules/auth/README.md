# Auth module

`src/modules/auth/**` is the canonical owner of Laitstyle authentication.

## Ownership

- `errors.ts` — client-safe allow-listed authentication error codes and user-facing messages.
- `schema.ts` — shared sign-in, signup, email-workflow and password-replacement validation.
- `types.ts` — account and staff role contracts.
- `permissions.ts` — client-safe capability checks.
- `server/session.ts` — current session resolution and staff access.
- `server/account-provisioning.ts` — Prisma profile, profile-detail and customer provisioning.
- `server/authenticate.ts` — password auth, email delivery requests, Google OAuth, callback completion, recovery-session verification and sign-out.
- `server/redirects.ts` — safe success paths, originating error surfaces and deterministic callback-origin resolution.
- `server/diagnostics.ts` — server-only provider error mapping and structured diagnostics.
- `ui/**` — storefront dialog plus the shared standalone auth-page system.
- `providers/session-provider.tsx` — shared client session snapshot plus local sign-in/sign-out synchronization.

Browser routes under `src/app/auth/**` remain because they are Next.js transport adapters. They may parse requests, call this module and return redirects or JSON, but they must not create Supabase clients or duplicate provider orchestration.

## Create-account contract

The standalone page and storefront dialog submit the same required fields:

- `first` and `last`, mapped to Supabase metadata keys `first_name` and `last_name`;
- `email` and `password`, passed to `supabase.auth.signUp`;
- `confirmPassword`, validated by the shared server schema and never sent to Supabase;
- accepted terms;
- safe `next` and `returnTo` paths.

Supabase also receives `full_name`. When signup returns an immediate session, `ensureConsumerAccount()` provisions the Prisma profile, profile details and customer before success is reported. Confirmation-required signup is provisioned by the callback, with the session reader retaining its repair path for partial accounts.

## Interaction contract

- Validation and provider failures remain in the currently mounted form or storefront dialog.
- **Forgot password** and **Send another link** first switch the dialog to dedicated email-only screens.
- Dialog email requests use `POST /auth/email`, a JSON adapter, rather than invoking a Next server action from client state.
- Password-reset and confirmation-resend success display dedicated check-email states without route navigation or an RSC rebuild.
- Email callback failures can reopen the originating recovery or confirmation dialog using a safe `support` state.
- OAuth start and callback failures return to the originating staff page, signup page or storefront dialog with an allow-listed error code.
- Password sign-in updates the shared client session directly; it must not call `router.refresh()` or rebuild the current route.
- The dialog displays its success state before any navigation. **Go to my account** and an explicit protected return path are user-authorized success navigations.
- Successful sign-out clears the shared session and replaces the current route with `/` so protected account content is not left visible.
- Transport query parameters are removed with browser history replacement so opening the dialog does not rebuild the route.

## Guest state continuity

Cart, saved-item and hold state are owned by `StorefrontStateHydrator` and the storefront Zustand stores, not the auth session. The canonical snapshot remains in `sessionStorage` under `laitstyles-storefront:v3:client-state`. Login, signup, confirmation callbacks and account navigation must not clear or replace that snapshot.

Authentication email and OAuth callback URLs prefer `AUTH_SITE_URL`, then `NEXT_PUBLIC_APP_URL`, then `NEXT_PUBLIC_SITE_URL`, and finally the current request origin. The selected public origin must have `/auth/callback` in the Supabase redirect allow-list.

The authoritative implementation ledger remains `docs/architecture-migration/phase-7-auth-status.md`.
