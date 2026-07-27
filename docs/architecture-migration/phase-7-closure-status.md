# Phase 7 closure — Auth ownership, email delivery and UI

**PR:** #53  
**Branch:** `agent/phase-7-auth-closure-ui`  
**Base:** `main` at `27835e8a53c6407747d8d133a606e2b4dabfa3c3`  
**Status:** Source and interaction closure implemented; exact-head automated and live-auth acceptance still required.

## Why this closure exists

Merged PR #52 established the canonical auth module but left six real gaps:

1. browser, Playwright and live Supabase acceptance had not executed;
2. the URL-driven sign-in Playwright assertion expected signup password copy while exercising sign-in mode;
3. `/auth/google`, `/auth/callback` and `/auth/sign-out` still duplicated Supabase provider orchestration;
4. standalone auth pages and the staff sign-in surface remained visually basic, with thin inputs and implementation-facing copy;
5. page actions redirected validation and provider errors to new routes, losing local form state;
6. the storefront dialog refreshed or navigated while its own state was changing, rebuilding the route and interrupting feedback.

## Source closure delivered

- [x] Google OAuth initiation is owned by `modules/auth/server/authenticate.ts`.
- [x] OAuth callback exchange, user resolution and account provisioning are module-owned.
- [x] `/auth/google` and `/auth/callback` are thin request/redirect adapters.
- [x] `/auth/sign-out` calls the canonical `endSession()` operation and remains POST-only.
- [x] Reset-page recovery-session verification is module-owned.
- [x] Signup confirmation, confirmation resend and password recovery use one deterministic callback-origin policy.
- [x] `AUTH_SITE_URL` is documented as the preferred deployed origin.
- [x] The stale empty-password Playwright expectation now matches sign-in validation.
- [x] Auth ownership tests prohibit direct Supabase provider access under `src/app/auth/**`.
- [x] Client auth UI is prevented from importing server-only auth modules.
- [x] Dedicated sign-in, signup, email-workflow and password-replacement client forms exist.
- [x] Staff sign-in, signup, recovery, confirmation, reset and direct-error fallback pages share one responsive visual system.
- [x] Storefront auth dialog inputs, labels, hierarchy, spacing and responsive presentation are redesigned.
- [x] Technical provider/cookie explanations were removed from user-facing authentication copy.

## Interaction closure delivered

- [x] Validation and provider failures return structured action state instead of redirecting.
- [x] Safe email/name values remain in their existing controls after a failed submission; passwords are never returned.
- [x] Confirmation-required signup success is shown on the mounted signup form.
- [x] Password-reset and confirmation-resend requests show success or failure on the mounted page.
- [x] Password replacement errors and success remain on `/auth/reset-password`.
- [x] Missing or expired recovery sessions render on the reset page rather than `/auth/error`.
- [x] OAuth start/callback failures return to the originating staff page, signup page or storefront dialog.
- [x] Storefront password recovery and confirmation resend run inside the open dialog.
- [x] Storefront transport parameters are removed with `history.replaceState`, not Next.js route navigation.
- [x] Storefront authentication no longer calls `router.refresh()` before the success state is displayed and dismissed.
- [x] The storefront auth provider exposes a stable action object so dialog state changes do not retrigger route effects.
- [x] Immediate navigation is reserved for completed sign-in/OAuth or an explicit user choice after success.

## Supabase email contract

The application triggers only the email workflows it currently exposes:

- signup confirmation through `supabase.auth.signUp`;
- confirmation resend through `supabase.auth.resend({ type: "signup" })`;
- password recovery through `supabase.auth.resetPasswordForEmail`.

All three callback URLs resolve from the first valid origin below:

1. `AUTH_SITE_URL`;
2. `NEXT_PUBLIC_APP_URL`;
3. `NEXT_PUBLIC_SITE_URL`;
4. current forwarded/request host;
5. local fallback.

Each callback also carries a safe internal `returnTo` surface. Provider failures add only an allow-listed error code to that surface; raw provider messages are neither logged nor exposed to the browser.

The selected origin must include `/auth/callback` in the Supabase Auth redirect allow-list. Supabase dashboard SMTP/template configuration remains external infrastructure; this PR makes application invocation, callback configuration and browser handling deterministic and testable but does not claim dashboard delivery without executing the live-auth suite.

## Acceptance coverage added

- Unit tests prove page-action failures return state without invoking `redirect()`.
- Unit tests prove only completed password sign-in redirects immediately.
- Provider tests prove OAuth cancellation/start failure returns to the originating surface.
- Redirect tests prove external `returnTo` values are rejected.
- Browser tests count document loads and verify invalid page/dialog submissions remain mounted.
- Browser tests verify storefront auth transport parameters are cleaned without a route rebuild.
- Live-auth tests cover signup confirmation, profile/customer provisioning, inline staff sign-in failure, storefront-dialog recovery email, standalone recovery, password replacement and invalid recovery state.

## Acceptance still required on the exact final SHA

- [ ] `pnpm check:architecture`.
- [ ] `pnpm biome` or the repository's static suite.
- [ ] `pnpm typecheck`.
- [ ] focused auth Vitest suites, including `auth-boundaries.test.ts`, `redirects.test.ts`, `authenticate-provider.test.ts` and `actions.test.ts`.
- [ ] production build and React Doctor.
- [ ] desktop, tablet and mobile Playwright contracts.
- [ ] URL-driven storefront auth-dialog and standalone inline-state tests.
- [ ] `pnpm test:auth:e2e` against local/test Supabase Auth, PostgreSQL and the mail inbox.
- [ ] signup confirmation email received and callback provisions profile/customer data.
- [ ] storefront-dialog password reset email received without route navigation.
- [ ] password reset email received and replacement password works.
- [ ] confirmation resend email received without leaking account existence.
- [ ] Google OAuth initiation/callback or the configured dedicated test-provider journey.

Do not change the original Phase 7 status to fully accepted until these checks execute against the same final commit and their evidence is recorded.
