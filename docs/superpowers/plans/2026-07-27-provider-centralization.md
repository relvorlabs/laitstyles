# Provider Centralization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the three-way provider split (root theme/toaster, admin's own `QueryProvider`, storefront's own `StorefrontQueryProvider`/`StorefrontAuthProvider`) with one shared root provider tree carrying theme, session (auth), and a single TanStack QueryClient, without changing any visible layout or UI.

**Architecture:** Root layout resolves session once (cached) and passes it to one `AppProvider` that mounts `ThemeProvider`, `Toaster`, one shared `QueryClientProvider`, and a new `SessionProvider`. Admin and storefront/account routes get all of that by virtue of being under root; storefront keeps only what's genuinely storefront-specific (catalogue prefetch/seed, cart/saved/hold hydration, its auth dialog actions).

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TanStack Query 5.101.2, next-themes, Zod, Vitest 4.1.10, Biome 2.5.3.

## Global Constraints

- Controlling spec: `docs/superpowers/specs/2026-07-27-provider-centralization-design.md`. Follow it exactly; this plan implements it task-by-task.
- Unified TanStack Query defaults: `staleTime: 5 * 60_000, gcTime: 30 * 60_000, retry: 1, refetchOnWindowFocus: false, refetchOnReconnect: true` (the storefront's prior values, per explicit user decision — NOT the admin values originally recommended).
- No visual/JSX/className change anywhere. `SiteChrome`, `AdminShell`, `AccountShell`, `ThemeToggle` are untouched.
- `src/server/auth/**` internals, sign-in/sign-up forms, and Supabase semantics are untouched except wrapping `getCurrentSession` in `React.cache()` — no logic change.
- This is a recorded, narrow override of the Phase 7 "no auth-provider merge" exclusion. Do not expand it — no move of `src/server/auth/**`, no route/form redesign.
- Small commits, one per task. Do not combine two tasks' file changes into one commit.
- Use `pnpm`. Run `pnpm check:architecture`, `pnpm typecheck` after each task that touches guarded paths.

## Implementation deviation recorded during execution (Task 7)

Task 4/5 as originally written had `AppProvider({ session, children })` mount `SessionProvider`
directly, with root layout `await`-ing `resolveAppSession()` in `RootLayout` itself before
returning JSX. Task 7's implementer found this fails `pnpm build`: this repo has
`cacheComponents: true` (Next.js 16 Cache Components), which requires any uncached per-request
read to sit behind a `<Suspense>` boundary that covers every route rendering under it — routes
with no Suspense boundary of their own (`/auth/error`, and by the same mechanism potentially
`/admin/**`) failed to prerender with "Uncached data was accessed outside of `<Suspense>`".
Neither Task 4 nor Task 5's original text anticipated this, since `cacheComponents` wasn't
exercised by a full `pnpm build` until Task 7.

Fixed in a dedicated commit (`33c8a5d`, after Task 6 and interleaved with Task 7's own commit) by
moving session resolution into a new async `SessionSlot` component wrapped in
`<Suspense fallback={<AppShellFallback />}>` inside root layout — `AppShellFallback` is the
existing, already-in-use neutral fallback the storefront boundary already relies on for the same
kind of async-read-behind-Suspense pattern, not a new UI element. `AppProvider`'s signature
changed from `{ session, children }` to `{ children }` — it no longer takes or mounts session at
all; `SessionProvider` is mounted by `SessionSlot`, one level below `AppProvider`, inside the new
Suspense boundary. Any later task or reviewer referencing `AppProvider`'s old signature (as
written in Tasks 4/5's original text below) should treat this note as authoritative over that
text.
---

## Task 1: Unify the QueryClient

**Files:**
- Create: `src/lib/query/app-query-client.ts`
- Create: `src/lib/query/app-query-client.test.ts`
- Delete: `src/lib/query/admin-query-client.ts`
- Delete: `src/lib/query/admin-query-client.test.ts`
- Delete: `src/lib/query/storefront-query-client.ts`
- Modify: `src/modules/products/client/storefront-catalogue.ts`

**Interfaces:**
- Consumes: `createQueryClient(options)` from `src/lib/query/create-query-client.ts` (unchanged).
- Produces: `APP_QUERY_DEFAULTS`, `makeAppQueryClient(): QueryClient`, `getAppQueryClient(): QueryClient`, `useSeedStorefrontCatalogue(initialCatalogue): void` — consumed by Task 4 (providers.tsx) and Task 7 (storefront-client-boundary.tsx).

- [ ] **Step 1: Write the failing test for the unified client**

Create `src/lib/query/app-query-client.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { APP_QUERY_DEFAULTS, makeAppQueryClient } from "@/lib/query/app-query-client";

describe("app QueryClient defaults", () => {
  it("configures the shared admin/storefront cache behaviour intentionally", () => {
    const client = makeAppQueryClient();

    expect(client.getDefaultOptions().queries).toMatchObject(APP_QUERY_DEFAULTS);
    expect(APP_QUERY_DEFAULTS).toEqual({
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/query/app-query-client.test.ts --reporter=verbose`
Expected: FAIL — `Cannot find module '@/lib/query/app-query-client'`.

- [ ] **Step 3: Create the unified client module**

Create `src/lib/query/app-query-client.ts`:

```typescript
import type { QueryClient } from "@tanstack/react-query";
import { defaultShouldDehydrateQuery, isServer } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/create-query-client";

export const APP_QUERY_DEFAULTS = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
} as const;

export function makeAppQueryClient(): QueryClient {
  return createQueryClient({
    ...APP_QUERY_DEFAULTS,
    shouldDehydrateQuery: (query) =>
      defaultShouldDehydrateQuery(query) || query.state.status === "pending",
  });
}

let browserQueryClient: QueryClient | undefined;

export function getAppQueryClient(): QueryClient {
  if (isServer) {
    return makeAppQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeAppQueryClient();
  }

  return browserQueryClient;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/query/app-query-client.test.ts --reporter=verbose`
Expected: PASS.

- [ ] **Step 5: Delete the two superseded client modules**

```powershell
Remove-Item src/lib/query/admin-query-client.ts, src/lib/query/admin-query-client.test.ts, src/lib/query/storefront-query-client.ts
```

- [ ] **Step 6: Update the catalogue hook to use the unified client and add the seed hook**

Replace the full content of `src/modules/products/client/storefront-catalogue.ts`:

```typescript
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/http/client";
import { APP_QUERY_DEFAULTS } from "@/lib/query/app-query-client";
import type { StorefrontShellCataloguePayload } from "@/modules/products/storefront/catalogue-contract";

export const storefrontCatalogueQueryKey = ["products", "public", "shell"] as const;

export async function fetchStorefrontShellCatalogue(
  signal?: AbortSignal,
): Promise<StorefrontShellCataloguePayload> {
  const response = await apiRequest<StorefrontShellCataloguePayload>("/api/v1/products", {
    method: "GET",
    signal,
  });
  return response.data;
}

export function useStorefrontCatalogue() {
  return useQuery({
    queryKey: storefrontCatalogueQueryKey,
    queryFn: ({ signal }) => fetchStorefrontShellCatalogue(signal),
    ...APP_QUERY_DEFAULTS,
  });
}

/**
 * Seeds the shared QueryClient with server-fetched catalogue data exactly once
 * per mount, so `useStorefrontCatalogue()` reads it without an extra client-side
 * fetch. Must be called before any descendant calls `useStorefrontCatalogue()`.
 */
export function useSeedStorefrontCatalogue(initialCatalogue: StorefrontShellCataloguePayload) {
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setQueryData(storefrontCatalogueQueryKey, initialCatalogue);
    return null;
  });
}
```

- [ ] **Step 7: Run focused tests and the architecture guard**

Run:

```powershell
pnpm exec vitest run src/lib/query/app-query-client.test.ts --reporter=verbose
pnpm check:architecture
```

Expected: test passes; guard still passes (this task doesn't touch guarded provider files yet, so `layout-provider-contract` is unaffected).

- [ ] **Step 8: Commit**

```powershell
git add src/lib/query/app-query-client.ts src/lib/query/app-query-client.test.ts src/modules/products/client/storefront-catalogue.ts
git rm src/lib/query/admin-query-client.ts src/lib/query/admin-query-client.test.ts src/lib/query/storefront-query-client.ts
git commit -m "refactor(query): unify admin and storefront QueryClient into one shared client"
```

---

## Task 2: Deduplicate session resolution with React.cache()

**Files:**
- Modify: `src/server/auth/session.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: `getCurrentSession()` keeps its exact existing signature and return type (`Promise<CurrentSession>`); only gains per-request memoization. `getStaffAccess()` (which calls `getCurrentSession()` internally) and the new root layout call (Task 5) now dedupe within one request.

- [ ] **Step 1: Add the cache import and wrap the function**

In `src/server/auth/session.ts`, add `cache` to the imports and wrap the existing function body without changing any of its logic:

```typescript
import "server-only";

import { cache } from "react";
import type { AuthDeniedReason } from "@/lib/auth/auth-errors";
```

Change:

```typescript
export async function getCurrentSession(): Promise<CurrentSession> {
```

to:

```typescript
export const getCurrentSession = cache(async (): Promise<CurrentSession> => {
```

and change the function's closing `}` (the one that currently ends `getCurrentSession`) to `});`. Do not change anything inside the function body.

- [ ] **Step 2: Run the existing session tests to verify cache() doesn't break per-test mock isolation**

Run: `pnpm exec vitest run src/server/auth/session.test.ts --reporter=verbose`

Expected: PASS, identically to before the change. `React.cache()` scopes its memoization to a single render/request context; called directly from Vitest (outside any React render), each `it()` block's direct call is not part of a shared render pass, so each test's distinct mock setup should still produce a fresh result. If this fails instead, STOP — do not proceed to Task 5 assuming cache() works; report the exact failure before continuing, since Task 5 depends on this behaving as expected.

- [ ] **Step 3: Run the architecture and HTTP guards**

Run:

```powershell
pnpm check:architecture
pnpm exec vitest run src/lib/http --reporter=verbose
```

Expected: both pass — `getStaffAccess()` and any HTTP auth adapter calling `getCurrentSession()` are unaffected by the wrapper's return type or signature.

- [ ] **Step 4: Commit**

```powershell
git add src/server/auth/session.ts
git commit -m "perf(auth): dedupe getCurrentSession within one request via React.cache"
```

---

## Task 3: Create the shared SessionProvider

**Files:**
- Create: `src/providers/session-provider.tsx`
- Create: `src/providers/session-provider.test.tsx`

**Interfaces:**
- Consumes: `StaffRole` from `@/lib/auth/roles`.
- Produces: `AppSession` type (`{ signedIn: boolean; email: string | null; displayName: string | null; role: StaffRole | null }`), `SessionProvider({ session, children })`, `useSession(): AppSession` — consumed by Task 4 (`AppProvider`) and Task 6 (`StorefrontAuthProvider`).

- [ ] **Step 1: Write the failing test**

Create `src/providers/session-provider.test.tsx`. Note the `@vitest-environment jsdom` pragma —
this project's Vitest defaults to `environment: "node"`, so any test using `render()` needs this
override (see `src/modules/storefront-shell/client/storefront-hold-clock.test.tsx` for the
existing convention). This project also does not register jest-dom matchers, so assert on
`.textContent`, not `toBeInTheDocument()`:

```tsx
// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "@/providers/session-provider";

afterEach(() => {
  cleanup();
});

function Consumer() {
  const session = useSession();
  return (
    <span data-testid="session">
      {session.signedIn ? "signed-in" : "signed-out"}:{session.displayName ?? "none"}:
      {session.role ?? "no-role"}
    </span>
  );
}

describe("SessionProvider", () => {
  it("exposes the provided session to descendants", () => {
    render(
      <SessionProvider
        session={{ signedIn: true, email: "a@b.com", displayName: "Ada", role: "admin" }}
      >
        <Consumer />
      </SessionProvider>,
    );

    expect(screen.getByTestId("session").textContent).toBe("signed-in:Ada:admin");
  });

  it("throws when useSession is called outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow("useSession must be used within SessionProvider");
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/providers/session-provider.test.tsx --reporter=verbose`
Expected: FAIL — `Cannot find module '@/providers/session-provider'`.

- [ ] **Step 3: Create the provider**

Create `src/providers/session-provider.tsx`:

```tsx
"use client";

import { createContext, type ReactNode, use } from "react";
import type { StaffRole } from "@/lib/auth/roles";

export type AppSession = {
  signedIn: boolean;
  email: string | null;
  displayName: string | null;
  role: StaffRole | null;
};

export const ANONYMOUS_APP_SESSION: AppSession = {
  signedIn: false,
  email: null,
  displayName: null,
  role: null,
};

const SessionContext = createContext<AppSession | null>(null);

export function SessionProvider({
  session,
  children,
}: {
  session: AppSession;
  children: ReactNode;
}) {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
}

export function useSession(): AppSession {
  const context = use(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return context;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/providers/session-provider.test.tsx --reporter=verbose`
Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/providers/session-provider.tsx src/providers/session-provider.test.tsx
git commit -m "feat(providers): add shared SessionProvider for session data"
```

---

## Task 4: Mount the shared providers in AppProvider

**Files:**
- Modify: `src/providers/providers.tsx`
- Delete: `src/providers/query-provider.tsx`
- Delete: `src/providers/storefront-query-provider.tsx`

**Interfaces:**
- Consumes: `ThemeProvider` (unchanged, `@/providers/theme-provider`), `getAppQueryClient()` (Task 1), `SessionProvider`/`AppSession` (Task 3).
- Produces: `AppProvider({ session, children })` — consumed by Task 5 (`src/app/layout.tsx`).

- [ ] **Step 1: Replace providers.tsx content**

Replace the full content of `src/providers/providers.tsx`:

```tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { getAppQueryClient } from "@/lib/query/app-query-client";
import { type AppSession, SessionProvider } from "@/providers/session-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProvider({
  session,
  children,
}: {
  session: AppSession;
  children: ReactNode;
}) {
  const queryClient = getAppQueryClient();

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider session={session}>{children}</SessionProvider>
      </QueryClientProvider>
      <Toaster
        position="bottom-right"
        style={
          {
            "--normal-bg": "var(--brand-ink)",
            "--normal-text": "var(--brand-bone)",
            "--normal-border": "var(--border-strong)",
            "--border-radius": "5px",
          } as CSSProperties
        }
      />
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Delete the two superseded provider files**

```powershell
Remove-Item src/providers/query-provider.tsx, src/providers/storefront-query-provider.tsx
```

- [ ] **Step 3: Verify no other file still imports the deleted providers**

Run:

```powershell
git grep -n "providers/query-provider\|providers/storefront-query-provider" -- src
```

Expected: exit code 1 (no matches). If any file still imports them, note it — it will be fixed in Task 5 or 7 below; do not proceed past Task 7 with a dangling import.

- [ ] **Step 4: Commit**

```powershell
git add src/providers/providers.tsx
git rm src/providers/query-provider.tsx src/providers/storefront-query-provider.tsx
git commit -m "refactor(providers): mount shared QueryClientProvider and SessionProvider in AppProvider"
```

Note: `pnpm check:architecture` will fail after this commit until Task 5 updates the layouts that still reference the deleted `QueryProvider` — that's expected and fixed in the next task, not a regression to chase now.

---

## Task 5: Wire root and admin layouts to the shared providers

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/admin/layout.tsx`
- Modify: `scripts/checks/architecture-legacy-exceptions.mjs`
- Modify: `docs/architecture-migration/phase-1-legacy-exceptions.md`

**Interfaces:**
- Consumes: `getCurrentSession()` (Task 2, cached), `AppSession`/`ANONYMOUS_APP_SESSION` (Task 3), `AppProvider` (Task 4).
- Produces: every route under root now has theme, query, and session context without its own provider mount.

**Important:** this task makes `src/app/layout.tsx` import `@/server/auth/session` directly for
the first time. `scripts/checks/architecture-legacy-exceptions.mjs` only allows declared importers
to use that path — an undeclared new importer fails `pnpm check:architecture` with "Undocumented
compatibility edge", not silently. Step 4 below adds the declaration in the same commit that
introduces the import, per the project's removal/addition discipline in
`phase-1-legacy-exceptions.md`.

- [ ] **Step 1: Replace src/app/layout.tsx**

Replace the full content of `src/app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { storefrontFontClassName } from "@/modules/storefront-shell/ui/storefront-fonts";
import { type AppSession, ANONYMOUS_APP_SESSION } from "@/providers/session-provider";
import { AppProvider } from "@/providers/providers";
import { getCurrentSession } from "@/server/auth/session";
import "./theme-entry.css";

export const metadata: Metadata = {
  title: "Laitstyle",
  description: "One-of-one second-hand pieces from Lagos.",
  icons: {
    icon: "/brand/laitstyle-symbol.svg",
    shortcut: "/brand/laitstyle-symbol.svg",
  },
};

async function resolveAppSession(): Promise<AppSession> {
  const session = await getCurrentSession();
  if (session.kind === "consumer" || session.kind === "staff") {
    return {
      signedIn: true,
      email: session.email,
      displayName: session.displayName,
      role: session.kind === "staff" ? session.role : null,
    };
  }
  return ANONYMOUS_APP_SESSION;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await resolveAppSession();

  return (
    <html
      className={cn("h-full antialiased font-sans", storefrontFontClassName)}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <AppProvider session={session}>{children}</AppProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Restore the storefront layout file (undo the in-progress local edit that deleted it)**

Create `src/app/(storefront)/layout.tsx` with its original content — this file is unaffected by this refactor; only what's inside `storefront-route-boundary.tsx`/`storefront-client-boundary.tsx` changes, in Task 7:

```tsx
import type { ReactNode } from "react";
import { StorefrontRouteBoundary } from "@/app/storefront-route-boundary";

export default function StorefrontLayout({ children }: { children: ReactNode }) {
  return <StorefrontRouteBoundary>{children}</StorefrontRouteBoundary>;
}
```

- [ ] **Step 3: Remove the QueryProvider wrap from admin layout**

In `src/app/admin/layout.tsx`, remove the import and the wrapping element. Change:

```tsx
import { AdminAccessDenied } from "@/features/admin/shell/admin-access-denied";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { QueryProvider } from "@/providers/query-provider";
import { getStaffAccess } from "@/server/auth/session";
```

to:

```tsx
import { AdminAccessDenied } from "@/features/admin/shell/admin-access-denied";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { getStaffAccess } from "@/server/auth/session";
```

and change:

```tsx
  return (
    <QueryProvider>
      <AdminShell role={access.role}>{children}</AdminShell>
    </QueryProvider>
  );
```

to:

```tsx
  return <AdminShell role={access.role}>{children}</AdminShell>;
```

- [ ] **Step 4: Declare the new src/app/layout.tsx auth compatibility edge**

In `scripts/checks/architecture-legacy-exceptions.mjs`, add `"src/app/layout.tsx"` as an entry in
the `phase7SessionImporters` array (the array of importer paths that get mapped into
`@/server/auth/session` exception objects) — add it anywhere in that array, e.g. alongside
`"src/app/storefront-route-boundary.tsx"`. Do not add a new object literal by hand; the array
entry is mapped into the full exception shape automatically by the existing
`phase7SessionImporters.map(...)` code.

In `docs/architecture-migration/phase-1-legacy-exceptions.md`, add a row to the Phase 7 table:

```markdown
| `src/app/layout.tsx` | `@/server/auth/session` |
```

- [ ] **Step 5: Run architecture, typecheck, and build**

Run:

```powershell
pnpm check:architecture
pnpm typecheck
pnpm build
```

Expected: `check:architecture` still reports the `layout-provider-contract` failures expected from Task 4 (fixed in Task 8, not here), but does NOT report an undocumented-compatibility-edge error for `src/app/layout.tsx` — that's what Step 4 just prevented. Everything else passes. `pnpm build` succeeds (no Prisma-gap regression; that was already fixed in an earlier session).

- [ ] **Step 6: Commit**

```powershell
git add "src/app/layout.tsx" "src/app/(storefront)/layout.tsx" src/app/admin/layout.tsx scripts/checks/architecture-legacy-exceptions.mjs docs/architecture-migration/phase-1-legacy-exceptions.md
git commit -m "refactor(layout): resolve session once at root and drop admin's own QueryProvider"
```

---

## Task 6: Narrow StorefrontAuthProvider to actions-only

**Files:**
- Modify: `src/features/storefront/shared/storefront-auth-provider.tsx`
- Delete: `src/features/storefront/shared/storefront-auth-session.ts`

**Interfaces:**
- Consumes: `useSession()` (Task 3).
- Produces: `StorefrontAuthProvider({ children })` — no longer takes `authSession` prop. `useStorefrontAuth()` keeps its exact existing return shape (`{ state: { authReady, signedIn, userEmail, userName }, actions: { openSignin, openSignup, authenticate, signOut } }`) — no consumer of `useStorefrontAuth()` needs to change.

- [ ] **Step 1: Update the provider to read session from context**

In `src/features/storefront/shared/storefront-auth-provider.tsx`, change the imports from:

```tsx
import { openAuthDialog } from "@/modules/storefront-shell/client/storefront-overlay-events";
import type { StorefrontAuthForm, StorefrontAuthMode } from "./storefront-auth-dialog";
import type { StorefrontAuthSession } from "./storefront-auth-session";
```

to:

```tsx
import { openAuthDialog } from "@/modules/storefront-shell/client/storefront-overlay-events";
import { useSession } from "@/providers/session-provider";
import type { StorefrontAuthForm, StorefrontAuthMode } from "./storefront-auth-dialog";
```

Change the component signature and body's session read. Replace:

```tsx
export function StorefrontAuthProvider({
  authSession,
  children,
}: {
  authSession: StorefrontAuthSession;
  children: ReactNode;
}) {
  const router = useRouter();
```

with:

```tsx
export function StorefrontAuthProvider({ children }: { children: ReactNode }) {
  const authSession = useSession();
  const router = useRouter();
```

The rest of the function body is unchanged — `authSession.displayName`, `authSession.email`, and `authSession.signedIn` all still exist on `AppSession` with the same names and types, so the `displayName`/`value`/`useMemo` block below needs no edits.

- [ ] **Step 2: Delete the now-unused session type file**

```powershell
Remove-Item src/features/storefront/shared/storefront-auth-session.ts
```

- [ ] **Step 3: Run typecheck to catch any remaining reference**

Run: `pnpm typecheck`
Expected: errors only in `storefront-client-boundary.tsx` and `storefront-route-boundary.tsx` (still passing `authSession`/importing the deleted type) — those are fixed in Task 7, not here. If any error appears outside those two files, stop and investigate before continuing.

- [ ] **Step 4: Commit**

```powershell
git add src/features/storefront/shared/storefront-auth-provider.tsx
git rm src/features/storefront/shared/storefront-auth-session.ts
git commit -m "refactor(storefront): read session from SessionProvider instead of a prop"
```

---

## Task 7: Collapse the storefront route/client boundaries

**Files:**
- Modify: `src/app/storefront-route-boundary.tsx`
- Modify: `src/app/storefront-client-boundary.tsx`
- Modify: `scripts/checks/architecture-legacy-exceptions.mjs`
- Modify: `docs/architecture-migration/phase-1-legacy-exceptions.md`

**Interfaces:**
- Consumes: `useSeedStorefrontCatalogue` (Task 1), narrowed `StorefrontAuthProvider` (Task 6).
- Produces: `StorefrontRouteBoundary({ children })` and `StorefrontClientBoundary({ cataloguePromise, children })` — `authSessionPromise` prop removed from both.

**Important:** this task removes the last two production imports of `@/server/auth/session`
(via `storefront-route-boundary.tsx`) and `@/features/storefront/shared/storefront-auth-session`
(via both boundary files). Three declared exception entries in
`scripts/checks/architecture-legacy-exceptions.mjs` become stale the moment these imports are
removed, and the guard fails closed on a stale entry (`architecture-guard.mjs` checks both
directions: undeclared edges AND declared edges that no longer exist in source). Step 3 below
removes them in this same commit, per the project's removal discipline in
`phase-1-legacy-exceptions.md` ("remove the legacy edge and its exact machine-readable entry in
the same commit").

- [ ] **Step 1: Simplify storefront-route-boundary.tsx**

Replace the full content of `src/app/storefront-route-boundary.tsx`:

```tsx
import type { ReactNode } from "react";
import { Suspense } from "react";
import { AppShellFallback } from "@/app/app-shell-fallback";
import { StorefrontClientBoundary } from "@/app/storefront-client-boundary";
import { loadStorefrontShellCatalogue } from "@/modules/products/server/storefront/catalogue-loader";

export function StorefrontRouteBoundary({ children }: { children: ReactNode }) {
  const cataloguePromise = loadStorefrontShellCatalogue();

  return (
    <Suspense fallback={<AppShellFallback />}>
      <StorefrontClientBoundary cataloguePromise={cataloguePromise}>
        {children}
      </StorefrontClientBoundary>
    </Suspense>
  );
}
```

- [ ] **Step 2: Simplify storefront-client-boundary.tsx**

Replace the full content of `src/app/storefront-client-boundary.tsx`:

```tsx
"use client";

import { type ReactNode, use } from "react";
import { StorefrontAuthDialogHost } from "@/features/storefront/shared/storefront-auth-dialog-host";
import { StorefrontAuthProvider } from "@/features/storefront/shared/storefront-auth-provider";
import { useSeedStorefrontCatalogue } from "@/modules/products/client/storefront-catalogue";
import type { StorefrontShellCataloguePayload } from "@/modules/products/storefront/catalogue-contract";
import { SiteChrome } from "@/modules/storefront-shell/ui/site-chrome";
import { StorefrontStateHydrator } from "@/providers/storefront-state-hydrator";

export function StorefrontClientBoundary({
  cataloguePromise,
  children,
}: {
  cataloguePromise: Promise<StorefrontShellCataloguePayload>;
  children: ReactNode;
}) {
  const catalogue = use(cataloguePromise);
  useSeedStorefrontCatalogue(catalogue);

  return (
    <StorefrontStateHydrator>
      <StorefrontAuthProvider>
        <SiteChrome>{children}</SiteChrome>
        <StorefrontAuthDialogHost />
      </StorefrontAuthProvider>
    </StorefrontStateHydrator>
  );
}
```

- [ ] **Step 3: Remove the three now-stale legacy exception entries**

In `scripts/checks/architecture-legacy-exceptions.mjs`:

1. Remove `"src/app/storefront-route-boundary.tsx"` from the `phase7SessionImporters` array (line 2)
   — this file no longer imports `@/server/auth/session` after Step 1 above.
2. Replace the `phase7StorefrontAuthCompositionEdges` array (currently three entries) with just the
   one edge that's still real:

```javascript
const phase7StorefrontAuthCompositionEdges = [
  {
    importer: "src/app/storefront-client-boundary.tsx",
    imported: "@/features/storefront/shared/storefront-auth-dialog-host",
  },
];
```

This removes the two `@/features/storefront/shared/storefront-auth-session` entries (for
`storefront-client-boundary.tsx` and `storefront-route-boundary.tsx`) — that module was deleted in
Task 6.

In `docs/architecture-migration/phase-1-legacy-exceptions.md`, remove the
`src/app/storefront-route-boundary.tsx` → `@/server/auth/session` row from the session table, and
remove both `@/features/storefront/shared/storefront-auth-session` rows from the Phase 7 table.
Add a line under "Removal discipline" recording that these three edges were removed 2026-07-27 as
part of the provider-centralization change (session resolution moved to root layout; storefront
auth narrowed to actions-only), per
`docs/superpowers/specs/2026-07-27-provider-centralization-design.md`.

- [ ] **Step 4: Run architecture guard, typecheck, build**

Run:

```powershell
pnpm check:architecture
pnpm typecheck
pnpm build
```

Expected: `check:architecture` still fails on `layout-provider-contract` only (that script itself
hasn't been updated yet — Task 8). The legacy-exception checks now pass cleanly (Step 3 just fixed
them) — if a stale-entry or undocumented-edge error still appears, re-check Step 3 before moving
on. `pnpm typecheck` and `pnpm build` pass cleanly — no file anywhere still imports the deleted
`StorefrontAuthSession` type, `StorefrontQueryProvider`, or passes `authSessionPromise`.

- [ ] **Step 5: Commit**

```powershell
git add src/app/storefront-route-boundary.tsx src/app/storefront-client-boundary.tsx scripts/checks/architecture-legacy-exceptions.mjs docs/architecture-migration/phase-1-legacy-exceptions.md
git commit -m "refactor(storefront): drop the storefront-only QueryClientProvider and auth-session resolution"
```

---

## Task 8: Update guards for the new provider shape

**Files:**
- Modify: `scripts/checks/layout-provider-contract.mjs`
- Modify: `src/lib/boundaries/app-provider-boundary.test.ts`
- Modify: `src/lib/boundaries/storefront-state-boundary.test.ts`

**Interfaces:**
- Consumes: nothing new. (The legacy-exception edits for the edges this refactor adds/removes were
  already made where each edge actually changed — Task 5 added the new `src/app/layout.tsx` entry,
  Task 7 removed the three stale ones. This task is only the provider-shape guard script and its
  characterization tests.)
- Produces: `pnpm check:architecture` passing with 0 errors against the new provider shape.

- [ ] **Step 1: Rewrite the layout/provider contract script**

Replace the full content of `scripts/checks/layout-provider-contract.mjs`:

```javascript
#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const violations = [];

const rootProvidersPath = "src/providers/providers.tsx";
const rootLayoutPath = "src/app/layout.tsx";
const adminLayoutPath = "src/app/admin/layout.tsx";
const storefrontLayoutPath = "src/app/(storefront)/layout.tsx";
const accountLayoutPath = "src/app/(storefront)/account/layout.tsx";
const storefrontClientBoundaryPath = "src/app/storefront-client-boundary.tsx";
const retiredQueryProviderImports = [
  "@/providers/query-provider",
  "@/providers/storefront-query-provider",
];

const requiredStorefrontPaths = [
  "src/app/(storefront)/(home)/page.tsx",
  "src/app/(storefront)/products/page.tsx",
  "src/app/(storefront)/products/[slug]/page.tsx",
  "src/app/(storefront)/products/[slug]/loading.tsx",
  "src/app/(storefront)/products/[slug]/error.tsx",
  "src/app/(storefront)/products/[slug]/not-found.tsx",
  "src/app/(storefront)/collections/[slug]/page.tsx",
  "src/app/(storefront)/cart/page.tsx",
  "src/app/(storefront)/checkout/page.tsx",
  "src/app/(storefront)/order-confirmation/page.tsx",
  accountLayoutPath,
  "src/app/(storefront)/account/page.tsx",
  "src/app/(storefront)/account/orders/page.tsx",
  "src/app/(storefront)/account/profile/page.tsx",
];

const removedLegacyPaths = [
  "src/app/(home)",
  "src/app/products",
  "src/app/collections",
  "src/app/cart",
  "src/app/checkout",
  "src/app/order-confirmation",
  "src/app/account",
  "src/app/storefront-layout.tsx",
];

const rootProviders = readRequired(rootProvidersPath);
const rootLayout = readRequired(rootLayoutPath);
const adminLayout = readRequired(adminLayoutPath);
const storefrontLayout = readRequired(storefrontLayoutPath);
const storefrontClientBoundary = readRequired(storefrontClientBoundaryPath);
const accountLayout = readRequired(accountLayoutPath);

if (!rootProviders.includes("QueryClientProvider")) {
  violations.push(`${rootProvidersPath} must mount the shared QueryClientProvider.`);
}

if (!rootProviders.includes("SessionProvider")) {
  violations.push(`${rootProvidersPath} must mount the shared SessionProvider.`);
}

if (!rootLayout.includes("getCurrentSession")) {
  violations.push(`${rootLayoutPath} must resolve the session once for AppProvider.`);
}

for (const retiredImport of retiredQueryProviderImports) {
  if (adminLayout.includes(retiredImport)) {
    violations.push(`${adminLayoutPath} must not import the retired ${retiredImport}.`);
  }
  if (storefrontClientBoundary.includes(retiredImport)) {
    violations.push(`${storefrontClientBoundaryPath} must not import the retired ${retiredImport}.`);
  }
}

if (adminLayout.includes("QueryClientProvider")) {
  violations.push(
    `${adminLayoutPath} must not mount its own QueryClientProvider; theme/query/session now come from root.`,
  );
}

if (storefrontClientBoundary.includes("QueryClientProvider")) {
  violations.push(
    `${storefrontClientBoundaryPath} must not mount its own QueryClientProvider; it seeds the shared client instead.`,
  );
}

if (
  !storefrontLayout.includes("StorefrontRouteBoundary") ||
  !storefrontLayout.includes("<StorefrontRouteBoundary>")
) {
  violations.push(
    `${storefrontLayoutPath} must remain the shared storefront route boundary without rewriting presentation.`,
  );
}

if (!accountLayout.includes("AccountShell") || !accountLayout.includes("<AccountShell>")) {
  violations.push(`${accountLayoutPath} must preserve the account presentation shell.`);
}

if (accountLayout.includes("StorefrontRouteBoundary")) {
  violations.push(
    `${accountLayoutPath} must not remount StorefrontRouteBoundary beneath ${storefrontLayoutPath}.`,
  );
}

for (const requiredPath of requiredStorefrontPaths) {
  if (!existsSync(resolve(root, requiredPath))) {
    violations.push(`Required consolidated storefront route is missing: ${requiredPath}`);
  }
}

for (const removedPath of removedLegacyPaths) {
  if (existsSync(resolve(root, removedPath))) {
    violations.push(`${removedPath} must not exist after the Phase 2 storefront route consolidation.`);
  }
}

for (const retiredImport of retiredQueryProviderImports) {
  const consumers = walk(resolve(root, "src"))
    .filter((path) => /\.[cm]?[jt]sx?$/.test(path))
    .filter((path) => !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path))
    .filter((path) => readFileSync(path, "utf8").includes(retiredImport))
    .map((path) => normalize(relative(root, path)));

  if (consumers.length > 0) {
    violations.push(`Retired import ${retiredImport} must not be used; found in: ${consumers.join(", ")}`);
  }
}

if (violations.length > 0) {
  console.error("Layout/provider contract failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Layout/provider contract passed.");

function readRequired(path) {
  const absolutePath = resolve(root, path);
  if (!existsSync(absolutePath)) {
    violations.push(`Required file is missing: ${path}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function walk(directory) {
  if (!existsSync(directory)) return [];

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
```

- [ ] **Step 2: Update the app-provider and storefront-state boundary characterization tests**

In `src/lib/boundaries/app-provider-boundary.test.ts`, replace the full content:

```typescript
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootLayoutSource = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
const appProviderSource = readFileSync(
  resolve(process.cwd(), "src/providers/providers.tsx"),
  "utf8",
);
const adminLayoutSource = readFileSync(resolve(process.cwd(), "src/app/admin/layout.tsx"), "utf8");

describe("application provider ownership", () => {
  it("resolves session once at root and delegates provider ownership to AppProvider", () => {
    expect(rootLayoutSource).toContain("getCurrentSession");
    expect(rootLayoutSource).toContain("<AppProvider session={session}>{children}</AppProvider>");
  });

  it("mounts theme, query, and session ownership in the shared provider", () => {
    expect(appProviderSource).toContain("<ThemeProvider>");
    expect(appProviderSource).toContain("<Toaster");
    expect(appProviderSource).toContain("QueryClientProvider");
    expect(appProviderSource).toContain("SessionProvider");
  });

  it("does not let admin mount its own query or session provider", () => {
    expect(adminLayoutSource).not.toContain("QueryProvider");
    expect(adminLayoutSource).not.toContain("QueryClientProvider");
    expect(adminLayoutSource).not.toContain("SessionProvider");
  });
});
```

In `src/lib/boundaries/storefront-state-boundary.test.ts`, replace the test block found at the `it("mounts the storefront query, hydration and auth boundaries...")` description with:

```typescript
  it("keeps only storefront-specific state in the storefront client boundary", () => {
    const appProvider = readFileSync(join(root, "src/providers/providers.tsx"), "utf8");
    const clientBoundary = readFileSync(
      join(root, "src/app/storefront-client-boundary.tsx"),
      "utf8",
    );
    const routeBoundary = readFileSync(join(root, "src/app/storefront-route-boundary.tsx"), "utf8");

    expect(appProvider).not.toContain("StorefrontStateHydrator");
    expect(appProvider).not.toContain("StorefrontAuthProvider");
    expect(clientBoundary).toContain("StorefrontStateHydrator");
    expect(clientBoundary).toContain("StorefrontAuthProvider");
    expect(clientBoundary).not.toContain("StorefrontClientStateProvider");
    expect(clientBoundary).not.toContain("StorefrontProvider");
    expect(clientBoundary).not.toContain("QueryClientProvider");
    expect(routeBoundary).toContain("loadStorefrontShellCatalogue");
    expect(routeBoundary).not.toContain("getCurrentSession");
    expect(routeBoundary).not.toMatch(/\bloadStorefrontCatalogue\b/);
  });
```

- [ ] **Step 3: Run the full guard suite and focused tests**

Run:

```powershell
pnpm check:architecture
pnpm exec vitest run src/lib/boundaries scripts/checks/storefront-server-boundary.test.ts --reporter=verbose
```

Expected: all five guards report 0 errors; all boundary tests pass.

- [ ] **Step 4: Commit**

```powershell
git add scripts/checks/layout-provider-contract.mjs src/lib/boundaries/app-provider-boundary.test.ts src/lib/boundaries/storefront-state-boundary.test.ts
git commit -m "test(architecture): update guards for the centralized provider tree"
```

---

## Task 9: Full verification and documentation reconciliation

**Files:**
- Modify: `docs/architecture-migration/phase-2-layout-provider-status.md`
- Modify: `docs/architecture-migration/phase-1-6-full-acceptance.md`
- Modify: `docs/architecture-migration/migration-tracker.md`

**Interfaces:**
- Consumes: passing state from Tasks 1–8.
- Produces: reconciled documentation reflecting the new provider tree as current, replacing the superseding notices added before implementation.

- [ ] **Step 1: Run the complete static and test suite**

Run:

```powershell
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm exec vitest run --reporter=dot
pnpm build
```

Expected: architecture guards 0 errors; Biome 0 errors; typecheck 0 errors; build succeeds. The Vitest run should show the same 6 pre-existing, unrelated failures documented in `migration-tracker.md`'s 2026-07-26 reconciliation entry (Products/Inventory/Settings module-boundary and HTTP-status mismatches) and no new failures. If any new failure appears, stop and fix it before continuing — do not fold an unrelated fix into this task's commit; open a new task-scoped commit for it.

- [ ] **Step 2: Manually verify in the browser**

With the dev server running, check:
- An admin page and a storefront page both toggle theme correctly and stay in sync (same `resolvedTheme` since it's one `ThemeProvider`).
- Signed-in state renders correctly on both an admin page (topbar) and a storefront page (account menu/header).
- Storefront cart/saved-item/hold state still hydrates and persists across a reload.
- No hydration warnings in the console on any of the three route types (admin, storefront, account).

- [ ] **Step 3: Rewrite the Phase 2 status doc's superseding notice into current state**

In `docs/architecture-migration/phase-2-layout-provider-status.md`, replace the `> **2026-07-27 superseding notice:** ...` blockquote added before implementation with a short paragraph stating the shared provider tree is now implemented, linking to `docs/superpowers/specs/2026-07-27-provider-centralization-design.md`, and noting the P2-T06/P2-T07 rows below are historical (describe the pre-2026-07-27 shape).

- [ ] **Step 4: Rewrite the WS2a row in phase-1-6-full-acceptance.md**

Replace the WS2a row (marked "superseded 2026-07-27") with a row describing the actual new shape verified in Step 1 above: one shared `QueryClientProvider`/`SessionProvider` at root, admin/storefront mount neither, `layout-provider-contract` passes, exact commands and results from Step 1.

- [ ] **Step 5: Rewrite the migration-tracker.md active-change notice into a completed entry**

Replace the "## Active cross-cutting change: provider centralization (2026-07-27)" section's framing from in-progress to completed, keeping the file list and cache-policy note (still accurate) but changing the language from "is being collapsed" / "do not treat as current" to "was collapsed on 2026-07-27; see the spec and this session's Vitest/build results for verification evidence."

- [ ] **Step 6: Commit**

```powershell
git add docs/architecture-migration/phase-2-layout-provider-status.md docs/architecture-migration/phase-1-6-full-acceptance.md docs/architecture-migration/migration-tracker.md
git commit -m "docs(architecture): reconcile provider centralization as implemented"
```

---

## Rollback

Each task is one commit; revert in reverse order (Task 9 → Task 1) if a later task exposes a problem in an earlier one. Because Task 4 deletes files that Task 5 and Task 7 depend on, do not revert Task 4 alone without also reverting Tasks 5–8 — revert the full range together, then re-plan. No database/migration change is involved anywhere in this plan, so no data rollback is needed.

## Explicit Exclusions

- No visual/JSX/className/token change anywhere in this plan.
- No change to `src/server/auth/**` logic, sign-in/sign-up forms, or Supabase semantics beyond the `cache()` wrapper in Task 2.
- No Phase 8 checkout/payment change.
- The 6 pre-existing Vitest failures documented in `migration-tracker.md`'s 2026-07-26 entry are not this plan's scope — verify they're unchanged in Task 9, don't fix them here.
