# Provider Centralization Design

**Status:** Approved design for implementation planning

**Date:** 2026-07-27

**Controlling requirement:** Direct user instruction (this conversation), recorded here as an
explicit, narrow override of the Phase 7 exclusion in
`docs/superpowers/specs/2026-07-26-phase-1-6-full-acceptance-design.md`. See "Recorded override"
below.

**Repository branch:** `main`

## Objective

Root layout, admin layout, and the storefront route boundary each independently wire up a subset
of theme, auth, and TanStack Query providers today. Theme is already root-shared; TanStack Query
and auth session data are not — admin mounts its own `QueryProvider`, storefront mounts its own
`StorefrontQueryProvider` and `StorefrontAuthProvider`, with different cache policies and separate
session resolution. The user asked for one shared provider that carries theme, auth (session
data), and TanStack Query for everything admin, account, and storefront have in common, replacing
the three-way split, without changing any visible layout or UI.

Separately, the user reported pages rendering with no Tailwind styling applied. Investigation in
this session found the CSS/Tailwind pipeline itself produces a correct, complete bundle (verified
via a clean production build: the compiled CSS contains the full utility set plus custom brand
tokens). That symptom is not addressed by a source change in this spec — it is treated as a
side effect of an in-progress, unrelated hand-edit to `src/app/layout.tsx` made during this same
session, which this spec's implementation supersedes by replacing that file's content entirely.

## Recorded override

`docs/superpowers/specs/2026-07-26-phase-1-6-full-acceptance-design.md` lists "merge auth
providers" under Phase 7 authentication consolidation, explicitly excluded from Phase 1–6
remediation. The user directly instructed a shared auth-session provider across admin, account,
and storefront. Per this repository's own authority order (explicit user instruction outranks an
active feature spec), this proceeds — narrowly:

- **In scope of this override:** one client-side `SessionProvider` exposing read-only session data
  (`signedIn`, `email`, `displayName`, `role`) to any client component under root, replacing the
  storefront-only `StorefrontAuthProvider`'s session half.
- **Explicitly not touched, still Phase 7 scope:** `src/server/auth/**` internals stay in place
  (only `getCurrentSession` gains a `cache()` wrapper — no logic change); no auth route or sign-in
  /sign-up form is redesigned; no Supabase sign-in semantic changes; no auth compatibility edge
  documented in `phase-1-legacy-exceptions.md` is removed or expanded.

## Current state (as verified this session)

```text
RootLayout
  -> AppProvider (ThemeProvider, Toaster only)
     -> children

AdminLayout
  -> getStaffAccess() [server, redirect gate]
  -> QueryProvider (own QueryClient: 30s stale, no retry)
     -> AdminShell(role)

(storefront)/layout.tsx
  -> StorefrontRouteBoundary
     -> loadStorefrontShellCatalogue() + getCurrentSession() [server, parallel promises]
     -> StorefrontClientBoundary
        -> StorefrontQueryProvider (own QueryClient: 5min stale, retry 1; seeds catalogue)
           -> StorefrontStateHydrator (cart/saved/hold Zustand hydration)
              -> StorefrontAuthProvider (takes authSession prop; dialog actions + session read)
                 -> SiteChrome(children)
                 -> StorefrontAuthDialogHost
```

Two separate `getCurrentSession()` calls already happen per admin request in effect: root has none
today, but `getStaffAccess()` (admin) calls it once, and `StorefrontRouteBoundary` calls it again
independently for storefront routes. Once root also calls it, `getCurrentSession` needs the
`cache()` wrapper regardless, so admin's `getStaffAccess()` and root's call dedupe within one
request (`server-cache-react` rule).

## Target architecture

```text
RootLayout (server)
  -> getCurrentSession() [cached; read only signedIn/email/displayName/role]
  -> AppProvider(session)
     -> ThemeProvider
     -> Toaster
     -> QueryClientProvider (one shared client, one cache policy)
     -> SessionProvider(session)
        -> children

AdminLayout (server)
  -> getStaffAccess() [unchanged redirect gate; dedupes with root's getCurrentSession via cache()]
  -> AdminShell(role){children}   [no query/session provider of its own]

(storefront)/layout.tsx
  -> StorefrontRouteBoundary
     -> loadStorefrontShellCatalogue() [server, Suspense]
     -> StorefrontClientBoundary
        -> seeds catalogue into the already-mounted shared QueryClient
        -> StorefrontStateHydrator (cart/saved/hold Zustand hydration, unchanged)
           -> StorefrontAuthProvider (narrowed: dialog open/authenticate/sign-out only;
              reads session data from SessionProvider via useSession() instead of a prop)
              -> SiteChrome(children)
              -> StorefrontAuthDialogHost
```

Admin and account routes now get theme, query, and session context purely by being under root —
no route-specific provider mounts either. Storefront keeps exactly what only storefront needs:
catalogue prefetch/seeding and cart/saved/hold state.

## Component changes

**One shared QueryClient.** `src/lib/query/app-query-client.ts` (new) exports `APP_QUERY_DEFAULTS`
(`staleTime: 5 * 60_000, gcTime: 30 * 60_000, retry: 1, refetchOnWindowFocus: false,
refetchOnReconnect: true` — **the storefront's current values, per explicit user decision**,
superseding this design's original recommendation of the admin values), `makeAppQueryClient()`,
and `getAppQueryClient()` using the existing `isServer` singleton pattern from
`admin-query-client.ts`. `create-query-client.ts` is unchanged — it's already the shared factory
both old clients used. `admin-query-client.ts`, `admin-query-client.test.ts`, and
`storefront-query-client.ts` are deleted; their three non-provider consumers
(`storefront-catalogue.ts`, and the two providers being deleted) are updated. This is a real,
accepted behavior change in the other direction from the original recommendation: **admin queries
move from 30 s stale / no retry to 5 min stale / 1 retry.** Admin data (inventory, orders, holds)
will now be treated as fresh for up to 5 minutes client-side and will retry once on a transient
failure, instead of refetching every 30 s with no retry. Any admin screen that assumed near-live
data via the 30 s default should invalidate its query explicitly after a mutation rather than rely
on the shorter global staleTime — existing mutation flows already do authoritative
replacement/targeted invalidation per the Phase 3 cache contract, so this is expected to be safe,
but it is the one place this spec changes admin behavior rather than just wiring.

**One shared session provider.** `src/providers/session-provider.tsx` (new) defines `AppSession`
(`{ signedIn: boolean; email: string | null; displayName: string | null; role: StaffRole | null }`)
and a `SessionProvider`/`useSession()` pair, mounted once at root. `getCurrentSession()` gains a
`cache()` wrapper (`server-cache-react`); root layout derives only the four fields above from its
result before passing them down (`server-serialization` — never pass the full `CurrentSession`
discriminated union, which carries fields like `customerId` the client doesn't need).

**Storefront auth narrows to actions only.** `storefront-auth-provider.tsx` stops taking an
`authSession` prop and stops rendering session state; it reads `useSession()` for `signedIn` /
`email` / `displayName` and keeps exactly its current action surface (`openSignin`, `openSignup`,
`authenticate`, `signOut`) untouched. Its consumers (`site-header.tsx`, `storefront-account-menu.tsx`,
etc.) are unaffected — same hook name, same returned shape.

**Admin and storefront route boundaries shrink.** `admin/layout.tsx` drops its `QueryProvider`
wrap. `storefront-client-boundary.tsx` drops `StorefrontQueryProvider`; the catalogue payload is
seeded into the shared client via `useQueryClient().setQueryData(...)` inside
`StorefrontStateHydrator` (which already runs at the right point in the tree and already receives
the catalogue), instead of constructing a second, pre-seeded client. `storefront-route-boundary.tsx`
no longer resolves `getCurrentSession()` itself — that now happens once at root.

## Explicitly unchanged

No visual output changes. `SiteChrome`, `AdminShell`, `AccountShell`, `ThemeToggle`, and all other
component internals/JSX/classNames are untouched. `theme-provider.tsx` (`ThemeProvider`/`useTheme`)
keeps its exact current implementation — it was already root-scoped and already correct; only
where it's mounted from changes (still root, just alongside the new shared providers instead of
alone). `storefront-state-hydrator.tsx`'s cart/saved/hold hydration logic is untouched. No Prisma,
schema, HTTP contract, or Phase 8 checkout change is part of this spec.

## Testing and verification

- `scripts/checks/layout-provider-contract.mjs` updates its assertions: exactly one
  `QueryClientProvider`-yielding mount at root, zero in admin layout, zero constructing a second
  client in the storefront boundary; admin/storefront/account each resolve `useSession()` /
  `useTheme()` /`useQueryClient()` from the same root provider tree.
- `src/lib/boundaries/app-provider-boundary.test.ts` and `storefront-state-boundary.test.ts` get
  updated characterization cases for the new shape.
- `pnpm check:architecture`, `pnpm typecheck`, `pnpm build` must pass on the same candidate.
- Targeted Vitest: `app-query-client.test.ts` (replacing `admin-query-client.test.ts`),
  `session-provider` if a colocated test is warranted, `storefront-auth-provider` consumer tests.
  Full `pnpm exec vitest run` re-run to catch any consumer of the deleted files.
  Note: 6 pre-existing, unrelated Vitest failures were already documented in
  `migration-tracker.md`'s 2026-07-26 reconciliation entry (Products/Inventory/Settings
  module-boundary and HTTP-status mismatches) — these are not part of this spec's scope and should
  not be conflated with any new failure this change introduces.
- Browser verification: theme toggle on an admin page and a storefront page, confirm session data
  renders correctly signed-in/signed-out on both, confirm storefront cart/saved/hold state and
  catalogue still hydrate correctly, light/dark parity, no hydration warnings.

## Explicit exclusions

- Phase 7 auth consolidation beyond the narrow, recorded override above: no move of
  `src/server/auth/**`, no sign-in/sign-up form or route redesign, no Supabase semantic change.
- Phase 8 checkout/payment scope: untouched.
- No UI redesign — this is a provider-wiring change only.
- No dependency/framework version change.
- The 6 pre-existing Vitest failures and the Prisma-import-path fix from earlier in this session
  are separate, already-resolved/already-tracked items, not part of this spec.

## Risks and rollback

- **Cache-policy change for admin queries** (30 s/no-retry → 5 min/1-retry, matching storefront's
  prior values per explicit user decision) is the one behavior change beyond pure wiring. If any
  admin screen shows stale data longer than acceptable, the fix is a targeted, explicit
  invalidation/refetch at that screen's mutation site — not reverting to two separate configs,
  which would recreate the split this spec removes. If the trade-off proves wrong globally,
  rollback is to revert this spec's commit as a unit.
- **Session provider narrows the storefront auth context's public shape.** Any consumer relying on
  `StorefrontAuthProvider` accepting an `authSession` prop directly (rather than reading
  `useSession()`) breaks at that call site; the file list above is the complete set of call sites
  found via `grep` in this session and should be re-verified at implementation time.
- Rollback is one commit revert; no schema/migration/database change is involved, so no data
  rollback is needed.
