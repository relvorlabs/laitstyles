# Auth module

`src/modules/auth/**` is the canonical owner of Laitstyle authentication.

## Ownership

- `errors.ts` — client-safe allow-listed authentication error codes and user-facing messages.
- `schema.ts` — shared sign-in, signup, email-workflow and password-replacement validation.
- `types.ts` — account, staff-role and manager-list contracts.
- `permissions.ts` — client-safe capability checks, including owner-only team management.
- `server/session.ts` — current session resolution and staff access.
- `server/account-provisioning.ts` — Prisma profile, profile-detail and customer provisioning.
- `server/authenticate.ts` — password auth, email delivery requests, OAuth callback completion, recovery-session verification and sign-out.
- `server/staff-invitations.ts` — owner authorization, Supabase manager invitations, manager setup and audit records.
- `server/redirects.ts` — safe success paths, originating error surfaces and deterministic callback-origin resolution.
- `server/diagnostics.ts` — server-only provider error mapping and structured diagnostics.
- `ui/google-oauth-popup.ts` — browser-owned Google PKCE initiation and popup completion transport.
- `ui/**` — storefront dialog plus the shared standalone auth-page system.
- `providers/session-provider.tsx` — shared client session snapshot plus local sign-in/sign-out synchronization.

Browser routes under `src/app/auth/**` remain Next.js transport adapters. They may parse requests, call this module and return redirects or JSON, but they must not create server Supabase clients or duplicate provider orchestration. Browser-only invite and OAuth completion pages may use the public browser client to consume the session established for that browser.

## Create-account contract

The standalone page and storefront dialog submit the same required fields:

- `first` and `last`, mapped to Supabase metadata keys `first_name` and `last_name`;
- `email` and `password`, passed to `supabase.auth.signUp`;
- `confirmPassword`, validated by the shared server schema and never sent to Supabase;
- accepted terms;
- safe `next` and `returnTo` paths.

Supabase also receives `full_name`. When signup returns an immediate session, `ensureConsumerAccount()` provisions the Prisma profile, profile details and customer before success is reported. Confirmation-required signup is provisioned by the callback, with the session reader retaining its repair path for partial accounts.

## Store-manager invitation contract

Only an active `admin` profile has `team:read` and `team:invite`. Managers do not receive either capability.

The owner sends an invitation from `/admin/team`. The server uses the trusted Supabase admin client to call `inviteUserByEmail`, then establishes the matching Prisma profile as `manager`, removes any consumer customer row created by the Auth trigger and writes an audit event. If the Prisma transaction fails, the invited Supabase Auth identity is deleted so an invitation cannot survive without the manager authorization record.

The invite email returns to `/auth/invite/setup`. The recipient browser consumes the invite session, chooses a password and confirms their name. Finalization verifies the existing server-side profile is still an active `manager` before changing any profile data. The setup form cannot promote the account to `admin`.

## Google OAuth contract

Google OAuth must start with the browser `createBrowserClient`, not a server route. The browser client writes the PKCE verifier into the same browser cookie store used by `/auth/callback`. A synchronously opened popup receives the Google navigation while the storefront or standalone auth page stays mounted.

The callback exchanges the code on the server, provisions the consumer account and sends only a safe target back through `/auth/oauth-complete`. The opener then synchronizes its session in memory. The retired `/auth/google` endpoint does not initiate OAuth; stale callers receive an allow-listed inline start error.

## Interaction contract

- Validation and provider failures remain in the currently mounted form or storefront dialog.
- **Forgot password** and **Send another link** first switch the dialog to dedicated email-only screens.
- Dialog email requests use `POST /auth/email`, a JSON adapter, rather than invoking a Next server action from client state.
- Password-reset and confirmation-resend success display dedicated check-email states without route navigation or an RSC rebuild.
- Email callback failures can reopen the originating recovery or confirmation dialog using a safe `support` state.
- Google OAuth uses a popup; the storefront remains mounted while the popup completes.
- Password and Google sign-in update the shared client session directly; the storefront must not call `router.refresh()`.
- The dialog displays its success state before any navigation. **Go to my account** and an explicit protected return path are user-authorized success navigations.
- Successful sign-out clears the shared session and replaces the current route with `/` so protected account content is not left visible.
- Transport query parameters are removed with browser history replacement so opening the dialog does not rebuild the route.

## Guest state continuity

Cart, saved-item and hold state are owned by `StorefrontStateHydrator` and the storefront Zustand stores, not the auth session. The minimal canonical snapshot uses `laitstyles-storefront:v3:client-state`: `sessionStorage` is preferred for the current tab, and `localStorage` carries the same snapshot as a fallback when an email confirmation or recovery link opens a new tab. Login, signup, confirmation callbacks and account navigation must not clear or replace that snapshot.

Authentication email and OAuth callback URLs prefer the current request's forwarded host/origin, then `AUTH_SITE_URL`, then `NEXT_PUBLIC_APP_URL`, then `NEXT_PUBLIC_SITE_URL` as a fallback for header-less contexts. Every configured origin must allow `/auth/callback`; manager invitations additionally require `/auth/invite/setup` in the Supabase Auth redirect allow-list.

Outstanding live-auth and browser acceptance work is tracked in `docs/architecture-migration/migration-tracker.md`.
