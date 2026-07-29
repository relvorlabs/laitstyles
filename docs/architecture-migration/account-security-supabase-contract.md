# Account security — Supabase Auth provider contract

**Plan:** `docs/superpowers/plans/2026-07-28-complete-api-04-account-security.md` (Task 1)
**Installed packages:** `@supabase/supabase-js@2.110.2` (pins `@supabase/auth-js@2.110.2`),
`@supabase/ssr@0.12.0` — confirmed via `pnpm why @supabase/supabase-js @supabase/ssr`.
**Evidence sources:** installed type declarations at
`node_modules/.pnpm/@supabase+auth-js@2.110.2/node_modules/@supabase/auth-js/dist/module/{GoTrueClient,GoTrueAdminApi,lib/types}.d.ts`,
cross-checked against the current public docs at supabase.com/docs/reference/javascript for
`auth-updateuser`, `auth-signout`, `auth-mfa-*`, `auth-reauthenticate` (fetched 2026-07-29).

This document locks the exact operations this plan implements against. Any Route Handler, domain
function or test built for Task 2–5 must map to a signature recorded here, not to a remembered or
assumed API shape.

## 1. `updateUser` — email and password changes

```ts
updateUser(attributes: UserAttributes, options?: { emailRedirectTo?: string }): Promise<UserResponse>
```

`UserAttributes` relevant fields: `email?: string`, `password?: string`, `data?: object`,
`nonce?: string`. Confirmed present in the installed `.d.ts`.

- Calling `updateUser({ email })` starts the provider's email-change confirmation flow. The
  installed SDK sends the confirmation link to the *new* address (single-recipient by default;
  double-opt-in requires an unrelated Dashboard "Secure email change" toggle we do not control from
  code). Our server passes `options.emailRedirectTo` computed from the current request origin via
  `getAuthRedirectUrl()`, reusing the existing `/auth/callback` adapter — no new callback route is
  required because `exchangeCodeForSession` already handles the email-change confirmation type
  generically.
- Calling `updateUser({ password })` changes the password immediately for a session GoTrue
  considers recent. Per the installed `reauthenticate()` doc comment: *"A user is only required to
  reauthenticate before updating their password if **Secure password change** is enabled and the
  user hasn't recently signed in. A user is deemed recently signed in if the session was created in
  the last 24 hours."* This is a project Dashboard setting we do not control or assume is on.
- **Decision:** this plan does not build a nonce/`reauthenticate()` UI (out of the Task 2 interface;
  not requested by the design). Instead, `changeAccountPassword` performs its own fresh-proof step
  by calling `supabase.auth.signInWithPassword({ email, password: currentPassword })` first. A
  failure there is mapped to `INVALID_CURRENT_PASSWORD` before any `updateUser` call is attempted.
  If a project later enables "Secure password change" and GoTrue additionally demands a nonce, the
  provider's `error.code` for that case (`reauthentication_needed`) is mapped to a new stable
  `REAUTHENTICATION_REQUIRED` code rather than silently retried — this plan does not fabricate a
  nonce flow it cannot complete.

## 2. `signOut` — session termination

```ts
signOut(options?: { scope?: 'global' | 'local' | 'others' }): Promise<{ error: AuthError | null }>
```

`SIGN_OUT_SCOPES = ['global', 'local', 'others']` (installed `.d.ts`). Confirmed meanings:

- `global` (default): every session/device for the user.
- `local`: only the session tied to the current client's stored tokens.
- `others`: every session *except* the one calling `signOut`, without firing `SIGNED_OUT` for the
  caller.

`signOutOtherSessions` uses exactly `supabase.auth.signOut({ scope: "others" })` against the
request's authenticated server client. This is the only server-side session-plural operation the
installed SDK supports for a normal (non-admin) session.

## 3. MFA lifecycle (`supabase.auth.mfa`)

Confirmed methods on `GoTrueMFAApi` (installed `.d.ts`, `GoTrueClient.d.ts` line 17,
`lib/types.d.ts` lines 999–1412):

```ts
enroll(params: MFAEnrollTOTPParams): Promise<AuthMFAEnrollTOTPResponse>
challenge(params: MFAChallengeTOTPParams): Promise<AuthMFAChallengeTOTPResponse>
verify(params: MFAVerifyTOTPParams): Promise<AuthMFAVerifyResponse>
challengeAndVerify(params: MFAChallengeAndVerifyParams): Promise<AuthMFAVerifyResponse>
unenroll(params: MFAUnenrollParams): Promise<AuthMFAUnenrollResponse>
listFactors(): Promise<AuthMFAListFactorsResponse>
getAuthenticatorAssuranceLevel(jwt?: string): Promise<AuthMFAGetAuthenticatorAssuranceLevelResponse>
```

- `MFAEnrollTOTPParams = { factorType: 'totp', friendlyName?: string }`. Response includes
  `id` (unverified factor id) plus `totp: { qr_code, secret, uri }`.
- `MFAUnenrollParams = { factorId: string }`. `MFAVerifyTOTPParams = { factorId, challengeId, code }`.
- `Factor` shape: `{ id, friendly_name?, factor_type, status: 'verified' | 'unverified' }`.
- The SDK also declares `phone` and `webauthn` factor types/params. **This plan implements TOTP
  only** — the plan's Task 3 interface list ("TOTP enrolment, challenge, verification and
  unenrolment") does not request phone/WebAuthn, and adding them would be undocumented scope the
  design never approved.
- `getAuthenticatorAssuranceLevel()` returns `{ currentLevel, nextLevel }` from
  `AuthMFAGetAuthenticatorAssuranceLevelResponse`. `AuthenticatorAssuranceLevels = 'aal1' | 'aal2'`.
  There is no dedicated "require AAL2" gate in the SDK — enforcement is an application decision.
  **Decision:** before `unenrollFactor` removes what would become the account's last verified TOTP
  factor, the domain layer calls `getAuthenticatorAssuranceLevel()` and requires
  `currentLevel === 'aal2'` (i.e. the caller has already completed an MFA challenge in the current
  session), rejecting with `MFA_CHALLENGE_REQUIRED` otherwise. Removing a non-last factor uses the
  same guard call but does not require `aal2` — the rule is keyed off "would this leave zero
  verified factors", not "is this the alphabetically first factor."
- No recovery-codes feature exists in this SDK version; only the single TOTP secret is issued. No
  recovery-codes UI is invented here.

## 4. Session claims (`getClaims`)

Confirmed on the installed `JwtPayload`/`RequiredClaims` (`lib/types.d.ts` lines 1622–1652):
every access token carries `sub`, `session_id`, `aal`, `iat`, `exp`, and optionally `amr`
(`AMREntry[] | string[]`). `getCurrentSession`'s existing `getVerifiedIdentity()` already reads
`claims.sub`/`claims.email`; this plan extends that same `getClaims()` call site (via a new
`getAccountSecurityIdentity()` helper, not a second competing session reader) to also read
`claims.session_id`, `claims.aal` and `claims.iat`.

## 5. Session listing/revocation — locked decision (Task 1, Step 2)

`GoTrueAdminApi` (installed `.d.ts`) exposes exactly one session-plural admin operation:
`admin.signOut(jwt: string, scope?: SignOutScope)` — revoke-by-JWT, which requires already holding
the target JWT (not "list this user's sessions"). **There is no `listUserSessions`, `getSessions`,
or any other enumerate-devices API in the installed consumer or admin SDK surface.**

**Locked contract:** this plan does **not** add a device/session list. Per the plan's own Step 2
instruction, the product contract is:

- `getAccountSessionSummary(identity)` returns the **current session only**
  (`sessionId`, `authenticatedAt` derived from `iat`, `assuranceLevel` from `aal`) plus
  `otherSessions: { kind: "count-unavailable" }` — an explicit, honest "we cannot see this" state,
  never a fabricated count or fake user-agent/device row.
- `signOutOtherSessions(identity)` calls `signOut({ scope: "others" })` and reports success/failure
  only; it cannot report *what* was revoked because the SDK does not expose that.
- The admin client (`src/lib/supabase/admin.ts`, secret-key-backed) is **not used anywhere in this
  plan**. Every account-security operation runs against the request's own authenticated server
  client (`@/lib/supabase/server`), scoped to the caller's own session by construction. This is
  stricter than the plan's minimum ask ("Route Handlers cannot expose trusted admin clients to
  client modules") — there is no trusted-admin-client code path in this feature at all, so there is
  nothing to leak.

## 6. Error-code mapping added by this plan

New stable `AccountSecurityErrorCode` values (module-local, distinct from the existing
`AuthFlowErrorCode` allow-list used by the sign-in/sign-up flows, because these are account-settings
failures, not auth-flow failures):

| Code | Meaning | HTTP status (Route Handler) |
| --- | --- | --- |
| `PASSWORD_UNCHANGED` | new password equals the submitted current password | 422 |
| `INVALID_CURRENT_PASSWORD` | `signInWithPassword` re-proof failed | 422 |
| `REAUTHENTICATION_REQUIRED` | provider demands a reauthentication nonce we don't collect | 409 |
| `EMAIL_UNCHANGED` | requested email equals the current session email | 422 |
| `MFA_FACTOR_NOT_FOUND` | factor id does not belong to an unverified/verified factor for this call | 404 |
| `MFA_CHALLENGE_REQUIRED` | AAL2 required before this mutation, caller is at AAL1 | 401 |
| `MFA_CHALLENGE_EXPIRED_OR_INVALID` | verify/challenge rejected by the provider | 422 |
| `RESOURCE_NOT_OWNED` | reused per the suite-wide error contract (spec §10) | 403 |
| `PROVIDER_UNAVAILABLE` | any unmapped Supabase error | 502 |

These are distinct from — and do not replace — the existing `AuthFlowErrorCode` codes used by
`src/modules/auth/server/authenticate.ts`, which remain scoped to sign-in/sign-up/reset flows.

## 7. Boundary assertions added to `auth-boundaries.test.ts` (Task 1, Step 3)

- Client (`"use client"`) auth UI must not import the trusted Supabase admin client
  (`@/lib/supabase/admin`) — already covered repo-wide by the existing "keeps the trusted Supabase
  admin client server-only" test; re-asserted narrowly for `src/modules/auth/ui/**` for this task.
- No file under `src/app/api/v1/account/security/**` may import `@/lib/supabase/admin` at all (this
  plan never needs it — see §5), which is a stricter, feature-scoped version of the suite's generic
  admin-boundary rule.
