# Google One Tap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-out storefront visitors with an active Google session sign in via Google's floating One Tap account picker, as a second entry point alongside the existing "Continue with Google" popup — never replacing it.

**Architecture:** A client component loads Google Identity Services (GIS), calls `google.accounts.id.prompt()`, and on credential selection uses Supabase's `signInWithIdToken` to establish a session directly (no popup, no `/auth/callback` redirect). A new server function + JSON route then runs the same `ensureConsumerAccount()` provisioning the existing OAuth callback already uses, and the client syncs the existing Zustand-style session store.

**Tech Stack:** Next.js App Router, `@supabase/ssr` (`signInWithIdToken`), Google Identity Services (`https://accounts.google.com/gsi/client`), Vitest + Testing Library, `next/script`.

## Global Constraints

- Never render or initialize on any `/admin/**` route.
- Never render while the visitor is already signed in, or while the storefront sign-in/signup dialog is open.
- No app-level dismiss/cooldown/suppression logic — rely entirely on Google/Chrome's own FedCM cooldown.
- Do not touch the existing `/auth/callback`, `/auth/google`, `/auth/sign-out` routes or the popup-based `google-oauth-popup.ts` flow — this is purely additive.
- Reuse the existing Google OAuth Client ID already configured for Supabase's provider; do not create a second Google OAuth client.
- Errors from GIS/FedCM itself are silent (no toast) since the visitor never asked for the prompt; errors from `signInWithIdToken` or provisioning show a toast with a generic retry message (never a raw provider error).

Spec: [`docs/superpowers/specs/2026-07-28-google-one-tap-design.md`](../specs/2026-07-28-google-one-tap-design.md)

---

### Task 1: Server — provision the Prisma account after a One Tap session is established

**Files:**
- Modify: `src/modules/auth/server/diagnostics.ts:76-87` (add `"one-tap-sign-in"` to `AuthProviderOperation`)
- Modify: `src/modules/auth/server/authenticate.ts` (add `completeOneTapSignIn`, after `completeOAuthCallback` which ends at line 211)
- Test: `src/modules/auth/server/authenticate-provider.test.ts` (add cases to the existing file)

**Interfaces:**
- Consumes: `createClient` from `@/lib/supabase/server` (`supabase.auth.getUser()`), `ensureConsumerAccount` from `@/modules/auth/server/account-provisioning`, `ok`/`err` from `@/lib/errors`, `authFlowFailure`/`mapAuthProviderError`/`logAuthProviderFailure` from `@/modules/auth/server/diagnostics`.
- Produces: `export async function completeOneTapSignIn(): Promise<Result<{ status: "signed-in" }, AuthFlowFailure>>` — the next task's route handler calls this directly.

- [ ] **Step 1: Write the failing tests**

Open `src/modules/auth/server/authenticate-provider.test.ts`. Add `completeOneTapSignIn` to the existing import from `@/modules/auth/server/authenticate`:

```ts
import {
  completeOAuthCallback,
  completeOneTapSignIn,
  registerWithPassword,
  startGoogleOAuth,
} from "@/modules/auth/server/authenticate";
```

Add these two `it` blocks inside the existing `describe("auth provider orchestration", ...)` block, after the `"maps provider cancellation back to the originating storefront dialog"` test:

```ts
  it("provisions the Prisma consumer account for an established One Tap session", async () => {
    await expect(completeOneTapSignIn()).resolves.toEqual({
      ok: true,
      value: { status: "signed-in" },
    });

    expect(mocks.ensureConsumerAccount).toHaveBeenCalledWith({
      id: "auth-user-a",
      email: "shopper@example.com",
      userMetadata: { full_name: "Ada Lovelace" },
    });
  });

  it("reports an error when no session has been established yet", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    await expect(completeOneTapSignIn()).resolves.toEqual({
      ok: false,
      error: {
        code: "oauth-callback-invalid",
        message: "The sign-in link is incomplete or has expired. Please try again.",
      },
    });
    expect(mocks.ensureConsumerAccount).not.toHaveBeenCalled();
  });
```

(The existing `beforeEach` in that file already mocks `mocks.getUser` to resolve a signed-in `auth-user-a` with `full_name: "Ada Lovelace"` and mocks `mocks.ensureConsumerAccount` — no new mocks needed.)

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm vitest run src/modules/auth/server/authenticate-provider.test.ts`
Expected: FAIL — `completeOneTapSignIn is not a function` (or a TypeScript import error).

- [ ] **Step 3: Add `"one-tap-sign-in"` to the provider-operation type**

In `src/modules/auth/server/diagnostics.ts`, change:

```ts
export type AuthProviderOperation =
  | "password-sign-in"
  | "password-sign-up"
  | "password-recovery-request"
  | "password-recovery-session"
  | "password-recovery-update"
  | "password-recovery-sign-out"
  | "signup-confirmation-resend"
  | "sign-out"
  | "oauth-start"
  | "oauth-callback"
  | "oauth-callback-user";
```

to:

```ts
export type AuthProviderOperation =
  | "password-sign-in"
  | "password-sign-up"
  | "password-recovery-request"
  | "password-recovery-session"
  | "password-recovery-update"
  | "password-recovery-sign-out"
  | "signup-confirmation-resend"
  | "sign-out"
  | "oauth-start"
  | "oauth-callback"
  | "oauth-callback-user"
  | "one-tap-sign-in";
```

- [ ] **Step 4: Implement `completeOneTapSignIn`**

In `src/modules/auth/server/authenticate.ts`, insert this function immediately after `completeOAuthCallback` (which currently ends at line 211, right before `export async function hasRecoverySession()`):

```ts
export async function completeOneTapSignIn(): Promise<
  Result<{ status: "signed-in" }, AuthFlowFailure>
> {
  const supabase = await createClient();
  const { data, error: userError } = await supabase.auth.getUser();
  if (userError || !data.user) {
    logAuthProviderFailure("one-tap-sign-in", userError ?? { name: "MissingOneTapSessionUser" });
    const failure = userError
      ? mapAuthProviderError(userError, "oauth-callback-invalid")
      : authFlowFailure("oauth-callback-invalid");
    return err(failure);
  }

  try {
    await ensureConsumerAccount({
      id: data.user.id,
      email: data.user.email ?? null,
      userMetadata: data.user.user_metadata,
    });
  } catch {
    logAuthProviderFailure("one-tap-sign-in", { name: "AccountProvisioningError" });
    return err(authFlowFailure("provider-unavailable"));
  }

  return ok({ status: "signed-in" });
}
```

All of `createClient`, `ensureConsumerAccount`, `err`, `ok`, `Result`, `authFlowFailure`, `logAuthProviderFailure`, `mapAuthProviderError`, and `AuthFlowFailure` are already imported at the top of `authenticate.ts` (used by `completeOAuthCallback` directly above) — no new imports needed.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm vitest run src/modules/auth/server/authenticate-provider.test.ts`
Expected: PASS, all tests in the file green.

- [ ] **Step 6: Commit**

```bash
git add src/modules/auth/server/authenticate.ts src/modules/auth/server/authenticate-provider.test.ts src/modules/auth/server/diagnostics.ts
git commit -m "feat(auth): provision the Prisma account after a Google One Tap session"
```

---

### Task 2: Server — `POST /auth/one-tap` JSON route

**Files:**
- Create: `src/app/auth/one-tap/route.ts`
- Test: `src/app/auth/one-tap/route.test.ts`

**Interfaces:**
- Consumes: `completeOneTapSignIn` from `@/modules/auth/server/authenticate` (produced by Task 1).
- Produces: `POST /auth/one-tap` → `{ ok: true, value: { status: "signed-in" } }` (200) or `{ ok: false, error: { code, message } }` (400). Task 3's client component calls this endpoint with `fetch("/auth/one-tap", { method: "POST" })`.

- [ ] **Step 1: Write the failing test**

Create `src/app/auth/one-tap/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeOneTapSignIn: vi.fn(),
}));

vi.mock("@/modules/auth/server/authenticate", () => ({
  completeOneTapSignIn: mocks.completeOneTapSignIn,
}));

import { POST } from "@/app/auth/one-tap/route";

describe("POST /auth/one-tap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("provisions the account and returns success", async () => {
    mocks.completeOneTapSignIn.mockResolvedValue({
      ok: true,
      value: { status: "signed-in" },
    });

    const response = await POST();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      value: { status: "signed-in" },
    });
  });

  it("returns a 400 with the mapped failure when provisioning fails", async () => {
    mocks.completeOneTapSignIn.mockResolvedValue({
      ok: false,
      error: {
        code: "provider-unavailable",
        message: "We could not complete that request. Please try again.",
      },
    });

    const response = await POST();

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "provider-unavailable",
        message: "We could not complete that request. Please try again.",
      },
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/app/auth/one-tap/route.test.ts`
Expected: FAIL — cannot find module `@/app/auth/one-tap/route`.

- [ ] **Step 3: Implement the route**

Create `src/app/auth/one-tap/route.ts`:

```ts
import { NextResponse } from "next/server";
import { completeOneTapSignIn } from "@/modules/auth/server/authenticate";

export async function POST() {
  const result = await completeOneTapSignIn();
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm vitest run src/app/auth/one-tap/route.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/auth/one-tap/route.ts src/app/auth/one-tap/route.test.ts
git commit -m "feat(auth): add POST /auth/one-tap provisioning route"
```

---

### Task 3: Client — `GoogleOneTap` component and its render gate

**Files:**
- Create: `src/types/google-identity-services.d.ts`
- Create: `src/modules/auth/ui/google-one-tap.tsx`
- Test: `src/modules/auth/ui/google-one-tap.test.tsx`

**Interfaces:**
- Consumes: `useStorefrontAuth` from `./storefront-auth-provider` (existing, `state.signedIn: boolean`, `state.dialog.open: boolean`), `useSessionActions` from `@/providers/session-provider` (existing, `setSession(session: AppSession)`), `createClient` from `@/lib/supabase/client` (existing), `usePathname` from `next/navigation`, `POST /auth/one-tap` (produced by Task 2), `process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- Produces: `export function isGoogleOneTapEligible(state: { signedIn: boolean; dialog: { open: boolean } }, pathname: string, clientId: string | undefined): boolean` (pure, unit-tested directly) and `export function GoogleOneTap(): JSX.Element | null` — Task 4 mounts `<GoogleOneTap />`.

- [ ] **Step 1: Write the failing test**

Create `src/modules/auth/ui/google-one-tap.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { isGoogleOneTapEligible } from "@/modules/auth/ui/google-one-tap";

describe("isGoogleOneTapEligible", () => {
  const signedOutState = { signedIn: false, dialog: { open: false } };

  it("is eligible for a signed-out storefront visitor with a configured client id", () => {
    expect(isGoogleOneTapEligible(signedOutState, "/", "client-id")).toBe(true);
  });

  it("is not eligible without a configured Google client id", () => {
    expect(isGoogleOneTapEligible(signedOutState, "/", undefined)).toBe(false);
  });

  it("is not eligible for a signed-in visitor", () => {
    expect(
      isGoogleOneTapEligible({ signedIn: true, dialog: { open: false } }, "/", "client-id"),
    ).toBe(false);
  });

  it("is not eligible while the sign-in dialog is open", () => {
    expect(
      isGoogleOneTapEligible({ signedIn: false, dialog: { open: true } }, "/", "client-id"),
    ).toBe(false);
  });

  it("is not eligible on admin routes", () => {
    expect(isGoogleOneTapEligible(signedOutState, "/admin/team", "client-id")).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm vitest run src/modules/auth/ui/google-one-tap.test.tsx`
Expected: FAIL — cannot find module `@/modules/auth/ui/google-one-tap`.

- [ ] **Step 3: Add the Google Identity Services ambient types**

Create `src/types/google-identity-services.d.ts`:

```ts
export {};

declare global {
  interface GoogleIdentityCredentialResponse {
    credential: string;
    select_by?: string;
  }

  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: GoogleIdentityCredentialResponse) => void;
            use_fedcm_for_prompt?: boolean;
            itp_support?: boolean;
          }): void;
          prompt(): void;
          cancel(): void;
        };
      };
    };
  }
}
```

- [ ] **Step 4: Implement the component**

Create `src/modules/auth/ui/google-one-tap.tsx`:

```tsx
"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useSessionActions } from "@/providers/session-provider";
import { useStorefrontAuth } from "./storefront-auth-provider";

const GOOGLE_IDENTITY_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

export function isGoogleOneTapEligible(
  state: { signedIn: boolean; dialog: { open: boolean } },
  pathname: string,
  clientId: string | undefined,
) {
  return (
    Boolean(clientId) && !state.signedIn && !state.dialog.open && !pathname.startsWith("/admin")
  );
}

export function GoogleOneTap() {
  const pathname = usePathname();
  const { state } = useStorefrontAuth();
  const { setSession } = useSessionActions();
  const initialized = useRef(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
      });

      if (error || !data.user) {
        toast.error(
          "Google sign-in finished, but the session could not be verified. Please try again.",
        );
        return;
      }

      const provisionResponse = await fetch("/auth/one-tap", { method: "POST" });
      const provisionResult = (await provisionResponse.json()) as
        | { ok: true; value: { status: "signed-in" } }
        | { ok: false; error: { message: string } };

      if (!provisionResult.ok) {
        toast.error(provisionResult.error.message);
        return;
      }

      const metadata = data.user.user_metadata ?? {};
      const displayName =
        (typeof metadata.full_name === "string" && metadata.full_name.trim()) ||
        (typeof metadata.name === "string" && metadata.name.trim()) ||
        data.user.email?.split("@")[0] ||
        null;

      setSession({ signedIn: true, email: data.user.email ?? null, displayName, role: null });
      toast.success("Signed in with Google.");
    },
    [setSession],
  );

  const onScriptReady = useCallback(() => {
    if (!clientId || !window.google || initialized.current) return;

    initialized.current = true;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
      use_fedcm_for_prompt: true,
      itp_support: true,
    });
    window.google.accounts.id.prompt();
  }, [clientId, handleCredential]);

  if (!isGoogleOneTapEligible(state, pathname, clientId)) return null;

  return (
    <Script src={GOOGLE_IDENTITY_SCRIPT_SRC} strategy="afterInteractive" onReady={onScriptReady} />
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm vitest run src/modules/auth/ui/google-one-tap.test.tsx`
Expected: PASS.

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit -p tsconfig.json`
Expected: no new errors referencing `google-one-tap.tsx`, `google-identity-services.d.ts`, or `authenticate.ts`/`one-tap/route.ts` from Tasks 1–2. (If `signInWithIdToken` is not recognized on the Supabase auth client type, check the installed `@supabase/ssr`/`@supabase/supabase-js` version with `pnpm ls @supabase/supabase-js` — it has shipped `signInWithIdToken` since `2.31.0`; upgrading is out of scope for this plan and should be reported back rather than silently worked around.)

- [ ] **Step 7: Commit**

```bash
git add src/types/google-identity-services.d.ts src/modules/auth/ui/google-one-tap.tsx src/modules/auth/ui/google-one-tap.test.tsx
git commit -m "feat(auth): add Google One Tap component with an isolated eligibility gate"
```

---

### Task 4: Wire it up — env var, mount point, docs, live verification

**Files:**
- Modify: `src/app/storefront-client-boundary.tsx`
- Modify: `src/modules/auth/README.md`
- Modify: `docs/storefront-v2/08-integrations-and-environments.md:100-114` (env var registry table)
- Modify (manual, not committed): `.env.local` — add `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

**Interfaces:**
- Consumes: `GoogleOneTap` from `@/modules/auth/ui/google-one-tap` (produced by Task 3).
- Produces: nothing further consumed by later tasks — this is the last task.

- [ ] **Step 1: Mount the component in the storefront boundary**

In `src/app/storefront-client-boundary.tsx`, add the import and render it alongside the existing dialog host:

```tsx
import { StorefrontAuthDialogHost } from "@/modules/auth/ui/auth-dialog-host";
import { GoogleOneTap } from "@/modules/auth/ui/google-one-tap";
import { StorefrontAuthProvider } from "@/modules/auth/ui/storefront-auth-provider";
```

```tsx
  return (
    <StorefrontStateHydrator>
      <StorefrontAuthProvider>
        <SiteChrome>{children}</SiteChrome>
        <StorefrontAuthDialogHost />
        <GoogleOneTap />
      </StorefrontAuthProvider>
    </StorefrontStateHydrator>
  );
```

This file is only reached by the storefront route tree (`src/app/storefront-route-boundary.tsx`), never by `/admin` — confirmed by `grep -r "StorefrontClientBoundary" src`.

- [ ] **Step 2: Document the new env var**

In `src/modules/auth/README.md`, after the existing "Google OAuth contract" section, add:

```markdown
## Google One Tap

`GoogleOneTap` (`ui/google-one-tap.tsx`) is a second, additive sign-in entry point for signed-out
storefront visitors — never `/admin`, never while signed in, never while the manual sign-in dialog
is open. It uses Google Identity Services directly (`signInWithIdToken`), not the popup/PKCE flow,
and provisions the Prisma account through `POST /auth/one-tap` → `completeOneTapSignIn()`. It
requires `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (the same Google OAuth Client ID already configured for
Supabase's Google provider — client IDs are public, not secret); it renders nothing and stays
silent if that variable is unset.
```

In `docs/storefront-v2/08-integrations-and-environments.md`, add a row to the "Environment variable registry" table (§6, after the `NEXT_PUBLIC_SITE_URL` row):

```markdown
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | **public** | Google One Tap client-side prompt; same Client ID as Supabase's Google provider |
```

- [ ] **Step 3: Add the env var locally (manual — you do this, not a commit)**

In `.env.local`, add a line with the same Google OAuth Client ID already configured in the Supabase dashboard for the Google provider (Supabase Dashboard → Authentication → Providers → Google → Client ID):

```
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<the same client id Supabase's Google provider uses>
```

Restart `pnpm dev` afterward so Next.js picks up the new env var. Also add the same variable (same value) to each Vercel environment (Preview, Production) where you want One Tap enabled.

- [ ] **Step 4: Run the full auth suite**

Run: `pnpm vitest run src/modules/auth src/app/auth`
Expected: all tests pass (pre-existing unrelated failures in `src/modules/auth/schema.test.ts`, if still present, are out of scope for this plan).

- [ ] **Step 5: Live verification in the browser**

This step needs the real `laitstyle.localhost` origin (via `portless`) and a Google account with an active browser session — it cannot be scripted. With `pnpm dev` running and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` set:
1. Open `https://laitstyle.localhost/` signed out, in a Chrome profile with an active Google session. Confirm the One Tap card appears in the corner without clicking anything.
2. Pick an account. Confirm the storefront header updates to the signed-in state without a full page reload.
3. Sign out, then open the manual "Sign in" dialog and confirm One Tap does not also appear while the dialog is open.
4. Navigate to `/admin` (as a staff/admin account) and confirm One Tap never appears there.

- [ ] **Step 6: Commit**

```bash
git add src/app/storefront-client-boundary.tsx src/modules/auth/README.md docs/storefront-v2/08-integrations-and-environments.md
git commit -m "feat(auth): mount Google One Tap on the storefront and document the new env var"
```

---

## Self-review

**Spec coverage:** every approved spec item maps to a task — additive One Tap entry point (Task 3–4), reuse of `ensureConsumerAccount` provisioning (Task 1), no change to the existing OAuth popup/callback/sign-out routes (untouched by any task), the three render-gate conditions (Task 3's `isGoogleOneTapEligible`), reused Google Client ID via a new public env var (Task 4), silent GIS-level failures vs. toast on `signInWithIdToken`/provisioning failures (Task 3), and the manual-verification note for the parts that can't be scripted (Task 4 Step 5).

**Placeholder scan:** no TODOs; every step has literal file paths and complete code.

**Type consistency:** `completeOneTapSignIn()`'s return shape (`{ ok: true, value: { status: "signed-in" } } | { ok: false, error: AuthFlowFailure }`) is used identically in Task 1's test, Task 2's route and test, and Task 3's `handleCredential`. `isGoogleOneTapEligible`'s parameter shape (`{ signedIn, dialog: { open } }`) matches `StorefrontAuthContextValue["state"]`'s actual shape from `storefront-auth-provider.tsx`.
