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
9. cart continuity across login, signup and email-callback tabs had not been explicitly guaranteed.

## Source closure delivered

- [x] Password auth, signup, email requests, OAuth, callback completion, recovery verification and sign-out are module-owned.
- [x] `/auth/google`, `/auth/callback`, `/auth/email` and `/auth/sign-out` are thin transport adapters.
- [x] No `src/app/auth/**` route creates a Supabase client or calls `supabase.auth` directly.
- [x] Reset-page recovery-session verification is module-owned.
- [x] Signup confirmation, confirmation resend and password recovery use one deterministic callback-origin policy.
- [x] `AUTH_SITE_URL` is documented as the preferred deployed origin.
- [x] Client auth UI cannot import server-only auth modules.
- [x] Staff sign-in, signup, recovery, confirmation, reset and direct-error fallback pages share one responsive visual system.
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
- password recovery — `supabase.auth.resetPasswordForEmail`.

All callback URLs resolve from the first valid origin below:

1. `AUTH_SITE_URL`;
2. `NEXT_PUBLIC_APP_URL`;
3. `NEXT_PUBLIC_SITE_URL`;
4. current forwarded/request host;
5. local fallback.

Each callback carries a safe internal `returnTo` surface. Provider failures add only an allow-listed error code; raw provider messages are not exposed to the browser. The selected public origin must include `/auth/callback` in the Supabase Auth redirect allow-list.

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
- Route tests prove the JSON email adapter invokes recovery/resend module operations with the originating dialog surface.
- Boundary tests cover the new `/auth/email` adapter.
- Storefront-state tests prove the canonical snapshot is written to both stores, restored in a new callback tab and still prefers the current tab.
- Non-live Playwright tests prove recovery/resend screens appear, submit without navigation, and do not cause another document load.
- Callback tests prove email errors reopen the correct support screen.
- Live-auth tests cover signup confirmation, profile/customer provisioning, confirmation resend, password recovery and password replacement.
- Live-auth tests compare the canonical cart snapshot through login and confirmation-required signup.

## Acceptance still required on the exact final SHA

- [ ] `pnpm check:architecture`.
- [ ] `pnpm biome` or the repository's static suite.
- [ ] `pnpm typecheck`.
- [ ] focused auth and storefront-state Vitest suites.
- [ ] production build and React Doctor.
- [ ] desktop, tablet and mobile Playwright contracts.
- [ ] `pnpm test:auth:e2e` against local/test Supabase Auth, PostgreSQL and the mail inbox.
- [ ] signup confirmation email received and callback provisions profile/customer data.
- [ ] storefront password sign-in shown without a document rebuild and without cart loss.
- [ ] storefront signup confirmation completed without cart loss, including a callback opened in a new browser tab.
- [ ] storefront-dialog password reset and confirmation-resend emails received without route navigation.
- [ ] password replacement works and other sessions are closed.
- [ ] Google OAuth initiation/callback or the configured dedicated test-provider journey.

Do not change the original Phase 7 status to fully accepted until these checks execute against the same final commit and their evidence is recorded.
