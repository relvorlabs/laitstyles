# Phase 7 — Authentication Consolidation Design

**Status:** Implementation complete (P7-T02–T13, tasks below). Acceptance gate not yet met —
P7-T14 (`pnpm build`, browser/Playwright verification, `tests/e2e/auth-flows.spec.ts`) is
genuinely blocked by this environment's tooling (no outbound network for `next/font/google`, the
Browser pane dev server won't accept connections, no live Supabase/Postgres/mail-inbox stack for
the e2e suite) — not skipped. See `docs/architecture-migration/phase-7-auth-status.md`'s P7-T14
evidence for exactly what ran, what didn't, and why, before picking this up.
**Date:** 2026-07-27
**Supersedes:** the implicit plan in `docs/architecture-migration/phase-7-auth-status.md` prior
to this restart (see that document's "Why this document was reset" section) and both abandoned
attempts, [PR #50](https://github.com/relvorlabs/laitstyles/pull/50) and the stale
`refactor/phase-7-auth-consolidation` branch — neither moved any code.
**Repository branch:** `refactor/phase-7-auth-consolidation-v2`, from `main` at `dfa5476`
**Controlling requirement:** `docs/update.md` §12 ("Authentication route decision") and §16 Phase 7,
`.agents/doctrine/architecture.md`, `.agents/doctrine/server-and-actions.md`,
`.agents/doctrine/conventions.md`, `.agents/doctrine/state-and-data.md`

## Objective

Authentication ownership is fragmented across four locations with no single domain boundary:
`src/app/auth/**` (Next.js transport), `src/server/auth/**` (session/profile — flagged as legacy
top-level `server/**`), `src/lib/auth/**` (errors, schemas, roles, permissions, redirects,
diagnostics), and `src/features/storefront/shared/storefront-auth-*` (storefront presentation and
context). This spec consolidates all reusable session, provisioning, permission, redirect,
diagnostic, and authentication logic into `src/modules/auth/**`, leaving Next.js route
handlers and Server Actions as thin transport adapters only — with **zero** change to existing
URLs, cookies, redirects, forms, or visual presentation.

This is a **move-and-thin** phase, not a rewrite. Every exported function keeps its current
signature and behaviour unless a specific defect requires a change (none identified in this
spec); files relocate, imports update, and the machine-readable legacy-exception registry shrinks
in lockstep.

## Non-negotiable constraints carried from doctrine

- No Supabase CLI, no local Supabase instance. This phase touches zero Supabase schema or local
  auth-server config; `tests/e2e/auth-flows.spec.ts` and `scripts/auth/setup-local-auth.mjs`'s live
  environment-gated (`AUTH_E2E=1`) suite are **not** run as part of this restart's own validation —
  they require a live Postgres + Supabase + mail-inbox stack this environment does not provision.
  Unit/integration Vitest coverage (mocking `@/lib/supabase/server`) is the primary automated
  verification; the e2e suite is exercised by whoever owns that live stack, per
  `.agents/doctrine/validation-and-reporting.md`'s honesty rule (never claim a check ran that
  didn't).
- Prisma remains the persistence authority for `profiles`/`customers`/`profile_details`; no schema
  or migration change. Prisma CLI usage in this phase is limited to `pnpm prisma:validate` /
  `pnpm exec prisma validate` as a verification step — no `migrate`, no `db push`.
- `getCurrentSession()`'s React `cache()` wrapper, the root `SessionSlot`/`<Suspense>` boundary in
  `src/app/layout.tsx`, and `AppProvider` not importing session code (all landed in the
  provider-centralization change) are **consumed, not reshaped**. Any edit to those three files in
  this phase is limited to updating the *import path* of `getCurrentSession` once it moves — the
  Suspense structure, `SessionSlot` component, and `AppProvider` composition are untouched.
- Route Handlers must not import Server Actions; Server Actions stay thin; Client Components must
  not import Prisma or server modules (`.agents/doctrine/server-and-actions.md`).
- React 19 is in use — new module-owned UI (`sign-in-form.tsx`, `sign-up-form.tsx`,
  `auth-dialog.tsx`) must not introduce `forwardRef`; prefer `ref` as a normal prop and `use()`
  over `useContext()` where a new context read is added (`vercel-composition-patterns:react19-no-forwardref`).

## Current-state inventory (verified against `main` @ `dfa5476`)

This section is ground truth, not aspiration — every file, export, and consumer below was read
directly, not inferred from prior status docs.

### `src/app/auth/**` (11 files, ~1,212 lines) — transport layer, stays but thins

| File | Lines | Role |
|---|---|---|
| `actions.ts` | 230 | All password-auth Server Actions (`"use server"`) |
| `actions.test.ts` | 276 | Vitest coverage |
| `callback/route.ts` | 56 | OAuth/email-link callback, provisions consumer account |
| `error/page.tsx` | 64 | Allow-listed error-code display |
| `forgot-password/page.tsx` | 83 | Form → `requestPasswordResetWithRedirect` |
| `google/route.ts` | 39 | Starts Google OAuth |
| `resend-confirmation/page.tsx` | 85 | Form → `resendSignupConfirmationWithRedirect` |
| `reset-password/page.tsx` | 111 | Form + direct recovery-session gate via `createClient()` |
| `sign-in/page.tsx` | 150 | Staff-only sign-in surface |
| `sign-up/page.tsx` | 102 | Customer sign-up form |
| `sign-out/route.ts` | 16 | POST-only, 303 redirect |

`actions.ts` exports (kept verbatim, only relocating the logic they call):
`PasswordAuthSuccess`, `PasswordAuthActionError`, `PasswordAuthActionResult`,
`AuthEmailActionResult`, `RecoveredPasswordActionResult`, `SignOutActionResult`,
`submitPasswordSignIn`, `submitPasswordSignUp`, `requestPasswordReset`,
`resendSignupConfirmation`, `submitRecoveredPassword`, `signOutStorefrontSession`,
`signInWithPassword`, `signUpWithPassword`, `requestPasswordResetWithRedirect`,
`resendSignupConfirmationWithRedirect`, `submitRecoveredPasswordWithRedirect`.

### `src/server/auth/**` (3 files, ~478 lines) — moves into `modules/auth/server`

- **`profile.ts`** (107 lines, `"server-only"`): `AuthUserMetadata`, `ConsumerIdentityInput`,
  `consumerProfileValues`, `ensureConsumerAccount` (Prisma `$transaction` upserting `profiles` →
  `profile_details` → `customers`), `ensureConsumerProfile` (thin wrapper, explicitly marked
  "Compatibility entry point for callers that only have the verified identity").
- **`session.ts`** (157 lines, `"server-only"`, `getCurrentSession` wrapped in React `cache()`):
  exports types `VerifiedIdentity`, `ConsumerSession`, `StaffSession`, `CurrentSession` (union of
  `anonymous | suspended | unavailable | consumer | staff`), `StaffAccess`; functions
  `getVerifiedIdentity`, `getCurrentSession`, `isAuthenticated`, `getStaffAccess(capability?)`.
  Collapses any non-`"active"` `account_status` (`suspended`, `disabled`) into one `"suspended"`
  session kind — no separate handling of `disabled` today; **out of scope to change** in this
  phase (not a Phase 7 defect, a pre-existing product decision).
- **`session.test.ts`** (214 lines): Vitest, mocks `@/lib/supabase/server`, `@/lib/prisma`,
  `@/server/auth/profile`.

**Consumers today:** `@/server/auth/session` has 24 production/legacy-registered importers plus
test-only references (`src/test/persistence-harness.ts`, two inventory-transaction test files);
`@/server/auth/profile` has exactly 2 (`session.ts` itself, `src/app/auth/callback/route.ts`). Full
list is registered verbatim in `scripts/checks/architecture-legacy-exceptions.mjs` and mirrored in
`docs/architecture-migration/phase-1-legacy-exceptions.md` — treat that file as authoritative over
any list reproduced here; it is machine-checked and this document is not.

### `src/lib/auth/**` (14 files, ~621 lines) — splits between `modules/auth` and staying cross-cutting

| File | Exports | Destination |
|---|---|---|
| `auth-errors.ts` (103) | `AuthDeniedReason`, `AUTH_DENIED_MESSAGES`, `authFlowErrorCodes`, `AuthFlowErrorCode`, `AuthFlowFailure`, `AuthProviderErrorLike`, `getAuthFlowErrorMessage`, `isAuthFlowErrorCode`, `authFlowFailure`, `mapAuthProviderError` | `modules/auth/server/diagnostics.ts` or `modules/auth/types.ts` (see below) |
| `auth-schemas.ts` (94) | `passwordSignInSchema`, `passwordSignUpSchema`, `authEmailSchema`, `recoveredPasswordSchema`, input types, `authFormDataInput`, `authEmailFormDataInput`, `recoveredPasswordFormDataInput`, `authFieldErrors` | `modules/auth/schema.ts` |
| `index.ts` (3) | barrel: `auth-errors`, `permissions`, `roles` only (not `auth-schemas`, not `server/*`) | retire once consumers import submodules directly (see Retirement plan) |
| `permissions.ts` (83) | `STAFF_CAPABILITIES`, `CONSUMER_CAPABILITIES`, `StaffCapability`, `ConsumerCapability`, `AccountCapability`, `ROLE_CAPABILITIES`, `hasCapability`, `getCapabilitiesForRole`, `canAccessAdmin`, `canUpdateSettings` | `modules/auth/permissions.ts` — **module root, not `server/`** (corrected during P7-T05; see the note after this table) |
| `roles.ts` (19) | `ACCOUNT_ROLES`, `STAFF_ROLES`, `AccountRole`, `StaffRole`, `ACCOUNT_ROLE_LABELS`, `isAccountRole`, `isStaffRole` | `modules/auth/types.ts` (pure, no imports — client-safe today, must stay client-safe) |
| `server/auth-provider-diagnostics.ts` (37, `"server-only"`) | `AuthProviderDiagnostic`, `AuthProviderOperation`, `logAuthProviderFailure` | `modules/auth/server/diagnostics.ts` |
| `server/redirects.ts` (32) | `getSafeNextPath`, `withAuthErrorPath`, local `LOCAL_AUTH_ORIGIN` | `modules/auth/server/redirects.ts` |
| `server/request-origin.ts` (15, `"server-only"`) | `LOCAL_AUTH_ORIGIN` (duplicated literal, not shared with `redirects.ts` today), `getRequestOrigin` | `modules/auth/server/redirects.ts` (fold in; dedupe the duplicated `LOCAL_AUTH_ORIGIN` constant as part of the move — this is a same-behaviour cleanup, not a logic change, and must be called out explicitly in the PR body per doctrine) |

`roles.ts` has **zero imports** and is consumed by a client component (`session-provider.tsx`
imports `StaffRole` as a type) — it must land in `modules/auth/types.ts`, not `server/`, so client
code can keep importing it without crossing the client/server boundary
(`.agents/doctrine/conventions.md`: "Client code must not import ... server modules").

**Correction discovered during P7-T05 implementation (not part of the original inventory pass):**
`permissions.ts` has the same client-safety property as `roles.ts` — zero server-only imports, pure
computation over string-literal arrays — and `src/features/admin/shell/admin-access-provider.tsx`
(a `"use client"` component) genuinely needs its *runtime* functions (`getCapabilitiesForRole`,
`hasCapability`), not just types, to build a memoized capability-check context from a `role` prop.
This was missed in the original current-state inventory pass, which listed
`admin-access-provider.tsx` as a permissions consumer but didn't flag it as a client-boundary
concern the way `roles.ts`'s client consumer was flagged. Placing `permissions.ts` under
`modules/auth/server/**` — as this spec originally specified — is unsafe: the architecture guard
correctly rejects it (`client-server-import`, confirmed via `pnpm check:architecture` when this was
first attempted), because everything under `modules/<domain>/server/**` is treated as server-only
by folder convention regardless of actual content. Per `docs/update.md` §1 ("unless repository
evidence discovered during implementation proves that a specific decision is unsafe"),
`permissions.ts` moves to `modules/auth/permissions.ts` instead — a module-root file, sibling to
`schema.ts`/`types.ts`, exactly like those two files isomorphic (safe for both server and client
bundles). The rest of this document's target-tree diagram and task descriptions are corrected
below to match; nothing else in the design changes.

**No consumer imports the bare `@/lib/auth` barrel** (`index.ts`) today — every consumer already
imports the specific submodule. This makes `index.ts` safe to delete outright once its three
re-exported submodules move, rather than needing a compatibility re-export.

### Storefront auth presentation (3 files, ~618 lines) — moves into `modules/auth/ui`

- **`storefront-auth-dialog.tsx`** (352 lines, pure presentational): props-driven, zero direct
  session/auth calls, one type-only import (`Product` from the `catalogue-data.ts` shim — the
  formally registered `legacyProductTypeOnlyEdge`). → `modules/auth/ui/auth-dialog.tsx`.
- **`storefront-auth-dialog-host.tsx`** (148 lines, stateful): owns all form/dialog state, calls
  `actions.authenticate()`, does `window.location.assign('/auth/google?...')` directly for OAuth,
  and duplicates client-side validation that overlaps `auth-schemas.ts`'s server-side Zod rules.
  → splits: dialog-host state/wiring stays with `auth-dialog.tsx`'s consumer
  (`storefront-client-boundary.tsx`'s composition, unchanged), but the two new form components
  (`sign-in-form.tsx`, `sign-up-form.tsx`) extract the sign-in-mode and sign-up-mode halves of this
  host's rendering + local-validation logic (see "New UI decomposition" below).
- **`storefront-auth-provider.tsx`** (118 lines): context provider; imports Server Actions directly
  from `@/app/auth/actions`, reads `useSession()` from the root `SessionProvider`, exposes
  `{state: {authReady, signedIn, userEmail, userName}, actions: {openSignin, openSignup,
  authenticate, signOut}}` via `useStorefrontAuth()`. Consumed by `storefront-auth-dialog-host.tsx`,
  `site-chrome.tsx`, `storefront-account-menu.tsx`. → `modules/auth/ui/auth-dialog.tsx`'s provider
  half, or a sibling `modules/auth/ui/storefront-auth-provider.tsx` if splitting the provider out of
  the dialog file is cleaner at implementation time (planner/domain-engineer judgment call — both
  keep the same public `useStorefrontAuth()` hook name and shape, so no consumer changes).

**Consumers to re-point (exhaustive, from `main`):** `storefront-auth-dialog-host.tsx`,
`site-chrome.tsx`, `storefront-account-menu.tsx` (all import `useStorefrontAuth`);
`storefront-client-boundary.tsx` (mounts the provider + dialog host). All are outside
`src/modules/auth/**` and are legitimate cross-domain consumers of `modules/auth`'s public UI/hook
surface — this is allowed (`.agents/doctrine/architecture.md`: "one domain may consume another
domain's public contract, but not its internal UI or private implementation files").

### `src/modules/auth/README.md` (current placeholder)

States an aspirational structure identical to this spec's target tree, but **no files under it
exist yet**. This spec supersedes the README's prose; the README itself should be deleted or
replaced by this spec + the status document once implementation starts, so there is one
authoritative description, not two.

### Middleware

None exists (`middleware.ts` absent at repo root and under `src/`, confirmed via `git ls-files`).
Auth/session enforcement is per-route today (server layouts/pages calling
`getCurrentSession`/`getStaffAccess`), and this phase does not introduce middleware — that would be
new infrastructure beyond "move and thin."

### Root session wiring (provider-centralization output — read-only context for this phase)

```text
src/app/layout.tsx
  -> getCurrentSession() [from @/server/auth/session, cached]
  -> resolveAppSession(): CurrentSession -> AppSession{signedIn, email, displayName, role}
  -> <AppProvider><Suspense fallback={<AppShellFallback/>}><SessionSlot>{children}</SessionSlot></Suspense></AppProvider>
  -> SessionSlot (async) -> <SessionProvider session={session}>{children}</SessionProvider>

src/providers/providers.tsx (AppProvider)
  -> ThemeProvider -> QueryClientProvider (+ dev-only Devtools) -> Toaster
  -> does NOT import session/auth code (explicit comment, explicit design constraint)

src/providers/session-provider.tsx
  -> AppSession type, ANONYMOUS_APP_SESSION, SessionProvider, useSession()
  -> imports only @/lib/auth/roles (type StaffRole)
```

**The only change this phase makes to these three files:** `src/app/layout.tsx`'s import of
`getCurrentSession` from `@/server/auth/session` becomes an import from
`@/modules/auth/server/session` once that file moves (Task 3 below). `resolveAppSession`,
`SessionSlot`, the `<Suspense>` wrapper, and `AppProvider`'s composition are untouched.
`session-provider.tsx`'s import of `StaffRole` becomes `@/modules/auth/types` once `roles.ts` moves
(Task 2). No other line in these three files changes.

### Legacy exception registry (the machine-readable retirement checklist)

`scripts/checks/architecture-legacy-exceptions.mjs` currently registers exactly **30 edges** this
phase owns retiring, mirrored in `docs/architecture-migration/phase-1-legacy-exceptions.md`:

- 24× `@/server/auth/session` importers (`phase7SessionImporters`)
- 2× `@/server/auth/profile` importers (`phase7ProfileImporters`)
- 3× `@/features/storefront/shared/storefront-auth-provider` importers (`phase7StorefrontAuthProviderImporters`)
- 1× composition edge, `storefront-client-boundary.tsx` → `storefront-auth-dialog-host` (`phase7StorefrontAuthCompositionEdges`)
- 1× type-only shim, `catalogue-data.ts` (`legacyProductTypeOnlyEdge`)

Every one of these 30 entries must be deleted from `architecture-legacy-exceptions.mjs` **and**
`phase-1-legacy-exceptions.md` in the same commit that updates the corresponding importer's import
path — per that file's own stated rule ("This list may only shrink. Removing an edge and its
machine entry happens in one commit."). `architecture-guard.mjs`'s `stale-architecture-exception`
rule will fail CI if an entry is left registered after its edge stops existing, and its
`undocumented-compatibility-edge` rule will fail CI if a new cross-boundary import appears that
isn't registered — so partial migrations (some importers moved, some not) must either keep the
unmoved importers' entries intact or fail the guard. **Do not batch all 30 into one commit** if
that makes the diff unreviewable; batch by consumer domain (e.g. all `modules/products/server/*`
importers in one commit, all `modules/orders/server/*` in another) as Task 6 describes.

### Existing test coverage to preserve

- Unit/Vitest: `actions.test.ts`, `session.test.ts`, `auth-errors.test.ts`, `auth-schemas.test.ts`,
  `permissions.test.ts`, `roles.test.ts`, `auth-provider-diagnostics.test.ts`, `redirects.test.ts` —
  8 files, move with their subject file, update only their import paths and mock targets.
- `src/lib/http/auth.test.ts` — covers `requireApiSession`/`requireApiConsumer`/`requireApiStaff`
  in `src/lib/http/auth.ts` (asserted to exist by `scripts/checks/http-module-contract.mjs`); this
  file is a Phase 3 HTTP-layer consumer of `@/server/auth/session`, not part of the auth domain
  itself — it moves nothing, just updates its import path.
- e2e: `tests/e2e/auth-flows.spec.ts` (232 lines, `AUTH_E2E=1`-gated, requires live Supabase +
  Postgres + mail inbox) covers signup→confirm→land on `/account`, duplicate-signup enumeration
  safety, unconfirmed-login messaging, forgot/reset password round-trip, invalid recovery-session
  redirect, and Google OAuth start/cancel. This phase must not change any assertion in this file —
  it is the acceptance-gate proof that the transport layer's behaviour is unchanged after the move.
- `scripts/checks/error-validation-contract.mjs` asserts exact source substrings across 9 auth
  files (provider-error mapping, Zod schema usage, no raw `error.message` logging/rendering,
  `"server-only"` on diagnostics, allow-listed error-page codes). Every one of those substrings
  must still exist, verbatim, in whichever file the logic lands in after the move — this guard is
  effectively a second acceptance gate for the diagnostics/error-handling contract and must be
  updated to check the new file paths in the same commit that moves the code.

## Target architecture

```text
src/modules/auth/
├── schema.ts                    # passwordSignInSchema, passwordSignUpSchema, authEmailSchema,
│                                 # recoveredPasswordSchema + their input types (from lib/auth/auth-schemas.ts)
├── types.ts                     # AccountRole, StaffRole, ACCOUNT_ROLES, STAFF_ROLES,
│                                 # ACCOUNT_ROLE_LABELS, isAccountRole, isStaffRole (from lib/auth/roles.ts);
│                                 # CurrentSession/ConsumerSession/StaffSession/StaffAccess/VerifiedIdentity
│                                 # type re-exports from server/session.ts for client-safe consumption
├── permissions.ts               # STAFF_CAPABILITIES, CONSUMER_CAPABILITIES, ROLE_CAPABILITIES,
│                                 # hasCapability, getCapabilitiesForRole, canAccessAdmin,
│                                 # canUpdateSettings (from lib/auth/permissions.ts) — module root,
│                                 # not server/: isomorphic, a "use client" admin consumer needs the
│                                 # runtime functions, not just types (see correction note above)
├── server/
│   ├── session.ts                # getVerifiedIdentity, getCurrentSession (cache()-wrapped),
│   │                              # isAuthenticated, getStaffAccess (from server/auth/session.ts)
│   ├── account-provisioning.ts   # ensureConsumerAccount, ensureConsumerProfile,
│   │                              # consumerProfileValues (from server/auth/profile.ts)
│   ├── authenticate.ts           # the reusable core of submitPasswordSignIn/submitPasswordSignUp/
│   │                              # requestPasswordReset/resendSignupConfirmation/
│   │                              # submitRecoveredPassword/signOutStorefrontSession — the domain
│   │                              # operations actions.ts's Server Actions call into
│   ├── redirects.ts               # getSafeNextPath, withAuthErrorPath, getRequestOrigin
│   │                              # (from lib/auth/server/redirects.ts + request-origin.ts, deduped)
│   └── diagnostics.ts             # AuthDeniedReason, AUTH_DENIED_MESSAGES, authFlowErrorCodes,
│                                  # mapAuthProviderError, logAuthProviderFailure, and the
│                                  # AuthProviderDiagnostic/AuthProviderOperation types
│                                  # (from lib/auth/auth-errors.ts + server/auth-provider-diagnostics.ts)
└── ui/
    ├── sign-in-form.tsx           # extracted from storefront-auth-dialog-host.tsx's sign-in branch
    ├── sign-up-form.tsx           # extracted from storefront-auth-dialog-host.tsx's sign-up branch
    └── auth-dialog.tsx            # storefront-auth-dialog.tsx (presentation) + the provider/host
                                   # wiring currently split across storefront-auth-provider.tsx and
                                   # storefront-auth-dialog-host.tsx, composed from the two forms above
```

`src/app/auth/actions.ts` stays, but every exported Server Action becomes a thin wrapper: validate
transport input (`FormData` → schema), call the matching `modules/auth/server/authenticate.ts`
operation, map the result, redirect/revalidate. No Zod schema, Supabase call, or error-mapping
logic remains inline in `actions.ts` after this phase.

`src/app/auth/callback/route.ts`, `google/route.ts`, `sign-out/route.ts` stay under `/auth/**`
unchanged in URL and behaviour, calling `modules/auth/server/*` operations instead of
`@/server/auth/*` / `@/lib/auth/*` directly.

## Why `types.ts` re-exports session types from `server/session.ts`

`CurrentSession` and its member types are defined today in `server/auth/session.ts`, a
`"server-only"` file — but `session-provider.tsx` (client) needs `StaffRole` as a type, and any
future client consumer needing to type-check against `CurrentSession`'s shape must not import the
`"server-only"` file to get a type. `types.ts` is the client-safe type surface; `server/session.ts`
is the server-only runtime. This mirrors the existing pattern (`roles.ts` has zero imports and is
already client-safe) and satisfies `.agents/doctrine/architecture.md`'s
`modules/<domain>/client` rule ("must not import Prisma, server modules, or Server Actions") for
any future client code in this domain.

## New UI decomposition (composition guidance, `vercel-composition-patterns`)

`storefront-auth-dialog-host.tsx`'s 148 lines currently hold one component's `if (mode ===
"signin")`/`if (mode === "signup")` branching plus shared dialog chrome. Per
`architecture-compound-components` and `patterns-explicit-variants`, split into:

- `sign-in-form.tsx` — the sign-in-mode fields, submit handler, and local validation, as its own
  component receiving `onSuccess`/`onSwitchToSignup` callbacks (not a `mode` boolean prop threaded
  through the parent).
- `sign-up-form.tsx` — same for sign-up mode.
- `auth-dialog.tsx` — the dialog chrome (open/close, Google button, terms checkbox, password-reveal
  toggle) that renders whichever form is active, unchanged from the current dialog's visual output.

This is a structural extraction, not a behaviour or visual change: the current dialog's JSX,
classNames, and interaction states must render identically before and after. Local validation logic
duplicated between the dialog host and `auth-schemas.ts`'s Zod schemas is **not** deduplicated in
this phase unless doing so is free — flag it in the PR body as a known duplication if left as-is,
per `.agents/doctrine/conventions.md`'s "no drive-by refactors" rule; consolidating client-side and
server-side validation into one schema source is legitimate future work, not this phase's mandate.

**Deferred at P7-T10 implementation time:** this decomposition was not performed. `auth-dialog.tsx`
and `auth-dialog-host.tsx` moved as straight 1:1 renames of `storefront-auth-dialog.tsx` and
`storefront-auth-dialog-host.tsx`, byte-identical apart from import paths. Rationale: browser
verification for this move was attempted and blocked by an environment/tooling issue (dev server
wouldn't accept connections despite reporting started — see `phase-7-auth-status.md`'s P7-T10
evidence), so there was no way to *prove* zero visual regression for this task's actual scope
(relocation). Adding a genuine structural decomposition on top, unverifiable in the same pass,
would have compounded that risk for a change this design explicitly frames as optional composition
guidance, not a T10 requirement. Splitting into `sign-in-form.tsx`/`sign-up-form.tsx` remains
legitimate future work once browser verification is available to confirm it.

## Server Action / API boundary check (`server-auth-actions`)

`vercel-react-best-practices`' `server-auth-actions` rule ("authenticate server actions like API
routes") is already satisfied structurally: every `src/app/auth/actions.ts` Server Action either
performs its own Supabase auth call (which is itself the authentication event) or, for
`signOutStorefrontSession`, operates on the current request's session cookie. No action in this
file trusts client-supplied identity without a Supabase round-trip. This phase must preserve that
property when actions become thin wrappers around `modules/auth/server/authenticate.ts` — the
domain operation, not the transport wrapper, remains the place Supabase is actually called.

## File-by-file move plan (task-ordered, matches the status document's ledger)

**P7-T02 — create contracts without moving logic.** Add `modules/auth/schema.ts` and
`modules/auth/types.ts` as new files with the target exports, initially re-exporting from the
still-in-place `lib/auth/auth-schemas.ts` / `lib/auth/roles.ts` (temporary internal re-export, not
a new legacy-exception edge since it's within the same phase's own scope, removed by the end of
this task before moving to T03). This proves the target shape typechecks before any consumer
import changes.

**P7-T03 — move session resolution.** Relocate `server/auth/session.ts` →
`modules/auth/server/session.ts` (content unchanged). Update the 24 `phase7SessionImporters` in
batches by domain (products, inventory, orders, customers, holds, returns, settings, storefront
app routes, `lib/http/auth.ts`) — each batch is one commit that updates imports and deletes that
batch's entries from `architecture-legacy-exceptions.mjs` + `phase-1-legacy-exceptions.md`. Update
`src/app/layout.tsx`'s import per the "Root session wiring" section above.

**P7-T04 — move account provisioning.** Relocate `server/auth/profile.ts` →
`modules/auth/server/account-provisioning.ts`. Update the 2 `phase7ProfileImporters`
(`session.ts`'s own import, `callback/route.ts`) and retire those 2 registry entries in the same
commit.

**P7-T05 — move permission orchestration.** Relocate `lib/auth/permissions.ts` →
`modules/auth/permissions.ts` (module root — **not** `server/permissions.ts` as originally
specified; see the correction note above). Update its 12 consumers (policy files across
products/inventory/settings/returns/overview/holds/customers, `lib/http/auth.ts`,
`features/admin/shell/admin-access-provider.tsx`). Not a registered legacy exception today (it's
under `lib/auth`, not the flagged top-level `server/auth`), but still update every import.

**P7-T06 — move redirect + diagnostics.** Relocate `lib/auth/server/redirects.ts` +
`request-origin.ts` → `modules/auth/server/redirects.ts` (dedupe the two copies of
`LOCAL_AUTH_ORIGIN`); relocate `lib/auth/auth-errors.ts` +
`lib/auth/server/auth-provider-diagnostics.ts` → `modules/auth/server/diagnostics.ts`. Update
`scripts/checks/error-validation-contract.mjs`'s file-path assertions in the same commit (its
substring checks must keep passing against the new locations).

**P7-T07 — move schema + roles fully; retire `lib/auth/index.ts`.** Point `modules/auth/schema.ts`
and `modules/auth/types.ts` at the moved content directly (drop the temporary re-export from T02).
Delete `lib/auth/index.ts`, `lib/auth/auth-schemas.ts`, `lib/auth/roles.ts`,
`lib/auth/permissions.ts`, `lib/auth/auth-errors.ts`, `lib/auth/server/**` outright — confirmed
zero remaining consumers of the old paths by this point. Update `session-provider.tsx`'s
`StaffRole` import to `@/modules/auth/types`.

**P7-T08 — thin `src/app/auth/actions.ts`.** Extract each action's Supabase-call-and-mapping body
into `modules/auth/server/authenticate.ts` as a named domain operation; `actions.ts` keeps only
`FormData` parsing, calling the operation, and `redirect()`/result-mapping. Update
`actions.test.ts` to mock `modules/auth/server/authenticate.ts` instead of the current
`@/lib/supabase/server` + diagnostics + redirects mocks (or keep both layers of mocks if the thin
wrapper still needs to assert redirect behaviour — decide at implementation time based on what
each existing test actually asserts).

**P7-T09 — preserve OAuth/callback/sign-out routes.** Update `callback/route.ts`, `google/route.ts`,
`sign-out/route.ts` to call `modules/auth/server/*` instead of `@/server/auth/*`/`@/lib/auth/*`.
No URL, method, or redirect-target change.

**P7-T10 — move storefront auth presentation.** Relocate the 3 storefront auth files into
`modules/auth/ui/**` per the "New UI decomposition" section, updating the 3
`phase7StorefrontAuthProviderImporters` + 1 `phase7StorefrontAuthCompositionEdges` entries. Verify
`storefront-account-menu.tsx`, `site-chrome.tsx`, `storefront-client-boundary.tsx` all still import
`useStorefrontAuth`/the dialog component with the same name and shape — zero call-site changes
beyond the import path.

**Discovered at implementation time:** relocating `storefront-auth-provider.tsx` moves it from
unrestricted `src/features/**` into `src/modules/**`, where `server-client-boundary.test.ts`'s
`LAYER_RULES` check forbids importing `@/app`. The file imports `submitPasswordSignIn`,
`submitPasswordSignUp`, `signOutStorefrontSession` from `@/app/auth/actions` — the
doctrine-sanctioned "Form or Client Component → thin Server Action → domain command" flow, not
technical debt, and predates this phase entirely. Registering it as a Phase 7 legacy exception
would misrepresent permanent architecture as scheduled-for-removal debt and contradict P7-T12's
"zero remaining entries" goal. Fixed at the check level instead: `LAYER_RULES` now permits
`src/modules/**` → `@/app` specifically when every such import resolves to a file starting with
`"use server"`, verified per-specifier rather than loosened blanket-wide. See
`phase-7-auth-status.md`'s P7-T10/T11/T12 evidence for the full resolution.

**P7-T11 — delete the `catalogue-data.ts` shim.** Once `auth-dialog.tsx` lives in
`modules/auth/ui/**`, its `Product` type import can go directly to
`@/modules/products/ui/storefront/catalogue-data` (the canonical source the shim already points
to). Delete `src/features/storefront/shared/catalogue-data.ts` and its
`legacyProductTypeOnlyEdge` registry entry in the same commit.

**P7-T12 — confirm zero remaining registry entries.** After T03–T11, all 30 Phase 7 entries in
`architecture-legacy-exceptions.mjs` and `phase-1-legacy-exceptions.md` should be gone. Run
`pnpm check:architecture` and fix any `stale-architecture-exception` or
`undocumented-compatibility-edge` finding before proceeding.

**P7-T13/T14/T15 — preservation, validation, reconciliation.** Covered by "Validation and
verification" below.

## Explicitly unchanged

No route URL, cookie name, redirect target, HTTP method, form field, dialog JSX, class name, or
button label changes. `src/app/layout.tsx`'s `SessionSlot`/`<Suspense>` structure and
`AppProvider`'s composition (provider-centralization output) are untouched beyond the one import
path noted above. No Prisma schema/migration change. No Supabase Auth configuration change. No
Phase 8 checkout edge (`storefront-runtime.ts`) touched. `tests/e2e/auth-flows.spec.ts`'s
assertions are unchanged — this phase must make the same assertions pass against the moved code,
not rewrite them to fit.

## Validation and verification

Per `.agents/doctrine/validation-and-reporting.md`, run and record on the exact implementation
head, not claimed in advance:

- `pnpm biome` / `pnpm biome:fix`
- `pnpm typecheck`
- `pnpm test` (targeted: every moved file's colocated test, plus `actions.test.ts`,
  `session.test.ts`, `http/auth.test.ts`; full `pnpm exec vitest run` to catch any missed consumer)
- `pnpm check:architecture` (all five guards, especially the legacy-exception registry shrinking
  to zero Phase 7 entries and zero new `undocumented-compatibility-edge` findings)
- `pnpm exec prisma validate` (schema untouched, but confirms no accidental drift)
- `pnpm build` (Cache Components must still prerender `/auth/**`, `/admin/**`, and every route the
  root Suspense boundary covers, with no "Uncached data was accessed outside of `<Suspense>`" error)
- `pnpm react-doctor` (advisory; resolve any new finding touching moved files)
- Browser/Playwright: sign-in, sign-up, Google OAuth initiation, forgot/reset password, POST-only
  sign-out, admin capability gate, auth error page, light/dark parity, no hydration warnings on
  every touched page.
- `tests/e2e/auth-flows.spec.ts` under `AUTH_E2E=1`: run only if a live Supabase + Postgres + mail
  inbox stack is actually available to the implementer; if not available, state that explicitly in
  the completion report rather than silently skipping it unmentioned.

## Risks and rollback

- **Legacy-exception registry drift.** The 30-edge retirement must track exactly with the actual
  moved imports; a partial move that forgets to update
  `architecture-legacy-exceptions.mjs`/`phase-1-legacy-exceptions.md` in the same commit as the
  import-path change will fail `pnpm check:architecture` (`stale-architecture-exception` or
  `undocumented-compatibility-edge`) — treat that failure as the correctness signal it is, not an
  obstacle to bypass.
- **`account_status` collapse.** `session.ts` already collapses `suspended`/`disabled` into one
  `"suspended"` session kind; this is pre-existing behaviour, not introduced or fixed by this
  phase. Do not "fix" it as a drive-by change — if it's a real defect, it is separately scoped work.
- **Duplicated `LOCAL_AUTH_ORIGIN` and client/server validation overlap.** Both are same-behaviour
  cleanups folded into the move (T06, dialog decomposition) because they're free at the point the
  code relocates anyway; if either turns out not to be free (e.g., the two `LOCAL_AUTH_ORIGIN`
  values have actually diverged in a way that matters), stop and flag it rather than silently
  picking one.
- **Batch-commit granularity.** 30 legacy-exception edges across ~24 distinct consumer files is too
  large for one commit; batch by consumer domain as the move plan describes. If review finds a
  batch still too large, split further — this is explicitly not a "migrate everything in one
  commit" phase (`docs/update.md` §21).
- Rollback is per-commit revert; no schema/migration/database change is involved anywhere in this
  phase, so no data rollback is needed at any point.

## Recorded overrides

None. This spec introduces no exception to `.agents/doctrine/**`; it implements Phase 7 exactly as
scoped in `docs/update.md` §12/§16 and the (now-superseded) prior status document, informed by the
provider-centralization override already recorded in that spec — this document does not reopen or
extend that override.
