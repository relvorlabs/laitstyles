# Phase 7 closure — Auth ownership, email delivery and UI

**PR:** #53  
**Branch:** `agent/phase-7-auth-closure-ui`  
**Base:** `main` at `27835e8a53c6407747d8d133a606e2b4dabfa3c3`  
**Status:** Source and interaction closure implemented; exact-head automated and live-auth acceptance still required.

## Why this closure exists

Merged PR #52 established the canonical auth module but left real ownership, runtime and presentation gaps:

1. browser, Playwright and live Supabase acceptance had not executed;
2. the URL-driven sign-in Playwright assertion expected signup password copy while exercising sign-in mode;
3. `/auth/google`, `/auth/callback` and `/auth/sign-out` still duplicated Supabase provider orchestration;
4. standalone auth pages and the staff sign-in surface remained visually basic;
5. page actions redirected validation and provider errors to new routes, losing local form state;
6. the storefront dialog refreshed or navigated while its own state was changing;
7. dialog password recovery and confirmation resend invoked server actions directly and never displayed dedicated support screens;
8. signup UI and backend validation did not require one identical confirmation-password contract;
9. cart continuity across login, signup and email-callback tabs had not been explicitly guaranteed;
10. Google OAuth was initiated on the server, so the callback browser could not reliably recover the PKCE verifier;
11. the application had no owner-controlled Supabase invitation lifecycle for store managers.

## Source closure delivered

- [x] Password auth, signup, email requests, OAuth callback completion, recovery verification and sign-out are module-owned.
- [x] `/auth/callback`, `/auth/email`, `/auth/invite/finalize` and `/auth/sign-out` are thin transport adapters.
- [x] `/auth/google` is retired as an OAuth initiator and returns a safe inline start error for stale callers.
- [x] No server app-route adapter creates a Supabase client or calls `supabase.auth` directly.
- [x] Reset-page recovery-session verification is module-owned.
- [x] Signup confirmation, confirmation resend and password recovery use one deterministic callback-origin policy.
- [x] `AUTH_SITE_URL` is documented as the preferred deployed origin.
- [x] Client auth UI cannot import server-only auth modules or the trusted Supabase admin client.
- [x] Staff sign-in, signup, recovery, confirmation, reset, manager setup and direct-error fallback pages share the auth visual system.
- [x] Storefront auth dialog inputs, labels, hierarchy, spacing and responsive presentation are redesigned.
- [x] Technical provider/cookie explanations and the non-functional remember-session control were removed.

## Dialog interaction closure delivered

- [x] **Forgot password** switches to a dedicated email-only recovery screen before any request is sent.
- [x] **Send another link** switches to a dedicated confirmation-resend screen before any request is sent.
- [x] Dialog email workflows use `POST /auth/email` with JSON instead of invoking a Next server action from client state.
- [x] Recovery and confirmation requests show dedicated pending, error and check-email states inside the same dialog.
- [x] The JSON adapter carries a safe originating `returnTo` surface.
- [x] Malformed or expired email callbacks can reopen the matching recovery or confirmation screen with an allow-listed error.
- [x] Storefront transport parameters are removed with `history.replaceState`, not Next.js navigation.
- [x] Password sign-in updates the shared client session without `router.refresh()`.
- [x] The auth provider exposes a stable action object so dialog state changes do not retrigger route effects.
- [x] Sign-in success remains mounted until **Go to my account** or another explicit protected return action executes.
- [x] Successful sign-out clears the session and replaces the route with `/` so protected content is not left visible.

## Google OAuth PKCE closure

- [x] Google OAuth starts with the browser `@supabase/ssr` client so the PKCE verifier is written in the callback browser's cookie store.
- [x] A blank popup opens synchronously from the user gesture before the Supabase request, avoiding popup-blocker races.
- [x] The popup receives the Google/provider navigation while the original storefront or staff page remains mounted.
- [x] `/auth/callback` exchanges the code on the server and sends a safe target to `/auth/oauth-complete` for same-origin `postMessage` delivery.
- [x] Storefront Google success synchronizes the shared session in memory and shows the existing success panel without rebuilding the route.
- [x] Popup closure, timeout, provider cancellation and callback errors render inline on the originating auth surface.

## Store-manager invitation closure

- [x] `team:read` and `team:invite` are owner-only capabilities; managers have neither.
- [x] `/admin/team` is visible and accessible only to an active `admin` profile.
- [x] The owner submits the recipient's first name, last name and work email from the Admin UI.
- [x] The server calls `supabase.auth.admin.inviteUserByEmail` using a secret/service-role client.
- [x] Before success is returned, Prisma fixes the invited profile role as `manager`, removes any trigger-created consumer customer record and writes an audit event.
- [x] A failed Prisma authorization transaction deletes the invited Supabase Auth identity so the invitation cannot survive without manager access.
- [x] The invite email returns to `/auth/invite/setup`, where the recipient consumes the invitation session, chooses a password and confirms their profile.
- [x] Finalization verifies the server-side profile is still an active `manager`; the setup form cannot promote the user to `admin`.
- [x] After setup, the recipient can enter Admin but is redirected away from owner-only `/admin/team`.

## Create-account contract

The standalone signup page and storefront dialog now use the same server-validated payload:

- [x] first name;
- [x] last name;
- [x] email;
- [x] password;
- [x] confirmation password;
- [x] accepted terms;
- [x] safe `next` and `returnTo` paths.

Supabase receives `email`, `password` and metadata keys `first_name`, `last_name` and `full_name`. `confirmPassword` is validated by the shared schema and is never sent to Supabase. If Supabase returns an immediate session, `ensureConsumerAccount()` provisions the Prisma profile, profile details and customer before signup success is returned. Confirmation-required accounts are provisioned by the callback, while the session reader retains its repair path for partial accounts.

## Supabase email contract

The application triggers the exposed email workflows through:

- signup confirmation — `supabase.auth.signUp`;
- confirmation resend — `supabase.auth.resend({ type: "signup" })`;
- password recovery — `supabase.auth.resetPasswordForEmail`;
- store-manager invitation — `supabase.auth.admin.inviteUserByEmail`.

All callback URLs resolve from the first valid origin below (fixed 2026-07-28: the request host must win over env vars, otherwise a stale/misscoped `AUTH_SITE_URL` silently hijacks redirects to the wrong environment — see `redirects.test.ts`):

1. current forwarded/request host (`x-forwarded-host`/`host` header);
2. `AUTH_SITE_URL`;
3. `NEXT_PUBLIC_APP_URL`;
4. `NEXT_PUBLIC_SITE_URL`;
5. local fallback.

Each callback carries a safe internal surface. Provider failures add only an allow-listed error code; raw provider messages are not exposed to the browser. Every public/local origin must include `/auth/callback` in the Supabase Auth redirect allow-list, and manager invitations additionally require `/auth/invite/setup`.

## Guest cart and saved-state continuity

- [x] Auth session updates do not reset the cart, saved-items or holds stores.
- [x] The minimal canonical snapshot uses `laitstyles-storefront:v3:client-state`.
- [x] `sessionStorage` remains authoritative for the current tab.
- [x] The same minimal snapshot is written to `localStorage` as a fallback when confirmation or recovery links open a new tab.
- [x] A new callback tab restores the local fallback only when it has no valid current-tab snapshot.
- [x] Login success preserves the same cart snapshot before and after account navigation.
- [x] Confirmation-required signup preserves the same cart snapshot while waiting for email and after the confirmation callback reaches `/account`.
- [x] Dialog recovery and confirmation views do not alter storefront state.

## Acceptance coverage added

- Unit tests prove signup confirmation-password validation and metadata mapping.
- Provider tests prove immediate-session signup provisions Prisma records before success.
- Route tests cover email delivery and owner-only manager invitation adapters.
- Boundary tests cover invite setup/finalization, browser PKCE files and trusted-admin-client isolation.
- Manager-invitation tests prove owner authorization, manager metadata/profile assignment and rollback after Prisma failure.
- Browser-PKCE tests prove the popup opens synchronously, uses the browser client and returns through a same-origin message.
- Storefront-state tests prove the canonical snapshot is written to both stores, restored in a new callback tab and still prefers the current tab.
- Non-live Playwright tests prove recovery/resend screens appear, submit without navigation, and do not cause another document load.
- Live Google coverage expects the provider to open in a popup while the original page stays mounted.
- `pnpm test:auth:e2e` now includes the manager invitation email, recipient setup and database-role journey.
- Live invitation coverage asserts the recipient finishes as `manager`, has no customer record and cannot open `/admin/team`.

## Acceptance still required on the exact final SHA

- [ ] `pnpm check:architecture`.
- [ ] `pnpm biome` or the repository's static suite.
- [ ] `pnpm typecheck`.
- [ ] focused auth, manager-invitation and storefront-state Vitest suites.
- [ ] production build and React Doctor.
- [ ] desktop, tablet and mobile Playwright contracts.
- [ ] `pnpm test:auth:e2e` against local/test Supabase Auth, PostgreSQL and the mail inbox.
- [ ] signup confirmation email received and callback provisions profile/customer data.
- [ ] store-manager invitation email received, setup completed and manager-only role proven.
- [ ] storefront password sign-in shown without a document rebuild and without cart loss.
- [ ] storefront signup confirmation completed without cart loss, including a callback opened in a new browser tab.
- [ ] storefront-dialog password reset and confirmation-resend emails received without route navigation.
- [ ] password replacement works and other sessions are closed.
- [ ] Google OAuth popup initiation/callback against the configured dedicated provider journey.

Do not change the original Phase 7 status to fully accepted until these checks execute against the same final commit and their evidence is recorded.
