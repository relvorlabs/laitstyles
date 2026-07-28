# Google One Tap sign-in

**Date:** 2026-07-28
**Status:** Approved for implementation pending written-spec review
**Surface:** Storefront only (never `/admin`); additive to the existing Google OAuth popup flow

## Objective

Let signed-out storefront visitors who already have an active Google session in their browser see
Google's native floating account picker ("One Tap") and sign in with a single click, without
opening the existing popup flow. This is a second, lighter entry point alongside the existing
"Continue with Google" button/dialog — it does not replace it, since One Tap is unavailable or
silently skipped in many browsers/contexts (no active Google session, browser without FedCM
support, prior dismissal cooldown, private/incognito windows).

## Recorded user decisions

- The prompt is offered on every storefront page for signed-out visitors, not just high-intent
  pages (e.g. checkout/account). It must never render on `/admin/**`.
- Dismissal behaviour relies entirely on Google/Chrome's own built-in FedCM cooldown after a
  visitor dismisses or repeatedly ignores the prompt. No additional app-level suppression,
  cooldown storage, or "don't show again" mechanism is added.

## Approach

Use Google Identity Services (GIS) with Supabase's `signInWithIdToken`, entirely client-initiated,
additive to the existing popup flow:

1. A new client component mounts the GIS script and calls `google.accounts.id.prompt()`.
2. On credential selection, the browser Supabase client exchanges the Google ID token for a
   Supabase session directly (`signInWithIdToken`) — no popup window, no `/auth/callback` redirect
   round-trip.
3. A small JSON route provisions the Prisma profile/customer for the now-authenticated user, reusing
   the exact `ensureConsumerAccount()` call the existing OAuth callback already makes.
4. The client syncs its session store, matching the existing `syncOAuthSession()` success path used
   after the popup flow completes.

**Rejected alternatives:**
- *Auto-opening the existing OAuth popup on page load.* A real popup window appearing without a
  click is frequently blocked by popup blockers and is not the lightweight floating-card UX One Tap
  is meant to deliver — it is a fundamentally different mechanism, not an implementation detail.
- *A server-driven flow via a hidden auto-submitting form.* Would work, but bypasses the
  client-owned Zustand session store the rest of the storefront auth UI already relies on, and
  doesn't match this codebase's UI/domain split: the UI layer owns interaction state, the server
  layer owns provisioning ([conventions](../../../.agents/doctrine/conventions.md)).

## Components

New files, following the auth module's existing ownership split
([`src/modules/auth/README.md`](../../../src/modules/auth/README.md)):

- `src/modules/auth/ui/google-one-tap.tsx` — client component. Loads
  `https://accounts.google.com/gsi/client` via `next/script` (`strategy="afterInteractive"`),
  calls `google.accounts.id.initialize({ client_id, callback, use_fedcm_for_prompt: true,
  itp_support: true })`, then `google.accounts.id.prompt()`. Renders no visible markup of its own —
  Google draws the floating UI. Unmounts/no-ops cleanly if the GIS script fails to load (unsupported
  browser, network-blocked) since no button depends on it.
- Mount point: the storefront root layout (`src/app/(storefront)/layout.tsx`), rendered only when
  all of the following hold:
  - the visitor is signed out (`!authSession.signedIn` from the existing session store);
  - the route is not under `/admin`;
  - the storefront sign-in/signup dialog is not currently open (avoid two competing sign-in
    surfaces on screen at once).

## Server

`src/modules/auth/server/authenticate.ts` gains `completeOneTapSignIn()`, mirroring the tail of the
existing `completeOAuthCallback()` (reads the session already established via cookies, calls
`ensureConsumerAccount()`, returns `ok`/`err` — no code exchange step, since `signInWithIdToken`
already established the session before this runs).

A new route, `POST /auth/one-tap` (`src/app/auth/one-tap/route.ts`), is a thin JSON transport
adapter over `completeOneTapSignIn()`, following the same shape as the existing
`POST /auth/email` adapter — parses no body (the session is read from cookies), returns
`{ ok: true }` or an allow-listed error code.

## Data flow

```text
GIS prompt shown → visitor picks a Google account
  → Google returns an ID token to the client callback
  → browser Supabase client: signInWithIdToken({ provider: "google", token }) — sets session cookies
  → client: POST /auth/one-tap → server: ensureConsumerAccount() (Prisma profile/customer)
  → client: sync Zustand session store (same shape as syncOAuthSession() today)
```

## Configuration

Reuses the existing Google OAuth Client ID already configured for Supabase's provider
(`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` in `supabase/config.toml`) — exposed to the browser as a
new public env var, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. OAuth client IDs are not secret (only the client
secret is); Supabase's own secret stays server-only and unchanged. Every deployment env
(local/preview/production) sets this to the same value already used for the Google provider in that
env's Supabase project.

## Error handling

- GIS/FedCM-level failures (unsupported browser, no active Google session, user dismissed, cooldown
  active) surface no error UI — the visitor never explicitly asked for this prompt, so a failure to
  show it is silent, matching how the browser's own account chooser behaves elsewhere on the web.
- A failure in `signInWithIdToken()` or in `POST /auth/one-tap` (network error, provisioning
  failure) shows a toast with a generic retry message, matching the existing sign-out failure
  pattern (`storefront-auth-provider.tsx`) — never a raw provider error message.

## Scope and boundaries

In scope:
- The One Tap client component, its storefront-layout mount/gating, the new server function and
  route, the new public env var, and focused unit tests.

Out of scope:
- Any change to the existing "Continue with Google" popup flow, `/auth/callback`, or
  `/auth/google`.
- Admin/staff sign-in surfaces.
- App-level dismissal/cooldown/suppression logic beyond Google's own FedCM behaviour.
- Any other identity provider.

## Testing

- `authenticate.test.ts` (or an addition to `authenticate-provider.test.ts`): `completeOneTapSignIn()`
  provisions the Prisma profile via `ensureConsumerAccount()` when a session exists, and returns a
  mapped provider error when it does not.
- `src/app/auth/one-tap/route.test.ts`: mirrors `src/app/auth/email/route.test.ts` — success shape,
  failure shape, no direct Supabase/Prisma calls in the route itself.
- A component-level test for `google-one-tap.tsx` asserting the render gate: absent when signed in,
  absent on `/admin` routes, absent while the auth dialog is open.
- Manual/live verification: since GIS requires a real Google session and cannot be driven by an
  automated test double, live confirmation that the prompt appears and completes sign-in is recorded
  as manual acceptance evidence, not an automated assertion.

## Self-review

- No placeholders or TODOs remain.
- The rejected-alternatives section keeps the chosen approach's rationale explicit for future
  readers.
- Scope is confined to a new, additive sign-in entry point; the existing OAuth popup, callback, and
  sign-out routes (already fixed for the proxied-origin redirect bug) are untouched.
