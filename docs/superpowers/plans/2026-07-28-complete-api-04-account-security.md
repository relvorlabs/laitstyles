# Supabase Account Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement accurate account email, password, MFA and supported session-management workflows through Supabase Auth without weakening existing authentication boundaries.

**Architecture:** Verify current official Supabase/Auth SDK contracts, add transport-neutral auth-module operations over existing server/browser clients, publish sensitive account APIs, then connect the current security UI. Prisma stores audit facts only; Supabase owns credentials, factors and sessions.

**Tech Stack:** Supabase Auth via `@supabase/supabase-js` 2.110.2 and `@supabase/ssr`, Next.js 16, Prisma audit events, Zod, Vitest, Playwright.

## Global Constraints

- Do not use Supabase CLI. Prisma CLI/migrations remain the only database toolchain.
- Re-check current official Supabase docs/changelog before coding every Auth operation.
- Never use `user_metadata` for authorization, expose service-role keys, or claim unsupported arbitrary session revocation.
- Existing `/auth/**` callback/email/sign-out transports stay intact unless a proven defect requires repair.

---

### Task 1: Lock Current Supabase Auth Contracts

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `docs/architecture-migration/account-security-supabase-contract.md`
- Modify: `src/modules/auth/auth-boundaries.test.ts`

- [ ] **Step 1: Record installed package and official API evidence**

Run: `pnpm why @supabase/supabase-js @supabase/ssr`

Document exact supported signatures for `updateUser`, MFA list/enroll/challenge/verify/unenroll, `signOut({ scope })`, assurance levels and any session-listing/admin operation considered.

- [ ] **Step 2: Decide session semantics from evidence**

If the current consumer SDK cannot list/revoke arbitrary sessions, lock the product contract to current-session metadata plus `signOut({ scope: "others" })`. Do not add a device list backed by fabricated user-agent rows.

- [ ] **Step 3: Extend boundary tests**

Assert client UI cannot import `src/lib/supabase/admin`, and account-security Route Handlers cannot expose trusted admin clients to client modules.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture-migration/account-security-supabase-contract.md src/modules/auth/auth-boundaries.test.ts
git commit -m "docs(auth): lock account security provider contract"
```

### Task 2: Implement Email and Password Operations

**Owner:** Laitstyles domain engineer

**Files:**
- Modify: `src/modules/auth/schema.ts`
- Modify: `src/modules/auth/types.ts`
- Create: `src/modules/auth/server/account-security.ts`
- Create: `src/modules/auth/server/account-security.test.ts`

**Interfaces:**
- Produces `requestAccountEmailChange(identity, input)` and `changeAccountPassword(identity, input)`.

- [ ] **Step 1: Write failing validation/provider tests**

```ts
it("requests email change through the authenticated server client", async () => {
  await requestAccountEmailChange(identity, { email: "new@example.com" });
  expect(auth.updateUser).toHaveBeenCalledWith({ email: "new@example.com" }, expect.anything());
});

it("rejects a password equal to the current submitted password", async () => {
  await expect(changeAccountPassword(identity, { currentPassword: "Same123!", password: "Same123!", confirmPassword: "Same123!" }))
    .rejects.toMatchObject({ code: "PASSWORD_UNCHANGED" });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/auth/server/account-security.test.ts`

- [ ] **Step 3: Implement provider calls and audit facts**

Validate confirmation and password policy. Require a fresh server-authenticated session/re-auth proof before changing password or email. Use the configured request-origin redirect policy for email confirmation. Store no password or email token in Prisma.

- [ ] **Step 4: Verify GREEN and commit**

```bash
pnpm test src/modules/auth/server/account-security.test.ts
pnpm typecheck
git add src/modules/auth
git commit -m "feat(auth): add account credential changes"
```

### Task 3: Implement MFA Lifecycle

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/auth/server/mfa.ts`
- Create: `src/modules/auth/server/mfa.test.ts`
- Modify: `src/modules/auth/schema.ts`
- Modify: `src/modules/auth/types.ts`

**Interfaces:**
- Produces factor list, TOTP enrolment, challenge, verification and unenrolment operations.

- [ ] **Step 1: Write failing lifecycle tests**

```ts
it("does not report a factor verified before challenge verification", async () => {
  mocks.enroll.mockResolvedValue({ data: pendingFactor, error: null });
  await expect(enrollTotp(identity)).resolves.toMatchObject({ status: "unverified" });
});

it("requires AAL2 before removing the last verified factor", async () => {
  mocks.getAuthenticatorAssuranceLevel.mockResolvedValue({ data: { currentLevel: "aal1", nextLevel: "aal2" }, error: null });
  await expect(unenrollFactor(identity, "factor-1"))
    .rejects.toMatchObject({ code: "MFA_CHALLENGE_REQUIRED" });
});
```

- [ ] **Step 2: Verify RED, implement exact SDK calls, verify GREEN**

Run before: `pnpm test src/modules/auth/server/mfa.test.ts` — expected FAIL.

Implement only the documented installed SDK calls, map provider errors to stable codes and audit verified enrolment/removal.

Run the same command after implementation; expected result is PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth
git commit -m "feat(auth): add verified MFA lifecycle"
```

### Task 4: Implement Supported Session Management

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/auth/server/account-sessions.ts`
- Create: `src/modules/auth/server/account-sessions.test.ts`

**Interfaces:**
- Produces `getAccountSessionSummary(identity)` and `signOutOtherSessions(identity)`.

- [ ] **Step 1: Write failing truthful-semantics tests**

```ts
it("signs out other sessions without ending the current session", async () => {
  await signOutOtherSessions(identity);
  expect(auth.signOut).toHaveBeenCalledWith({ scope: "others" });
});

it("never fabricates device rows when the provider cannot list sessions", async () => {
  await expect(getAccountSessionSummary(identity)).resolves.toEqual({
    current: expect.objectContaining({ sessionId: identity.sessionId }),
    otherSessions: { kind: "count-unavailable" },
  });
});
```

- [ ] **Step 2: Implement and verify**

Use JWT/session data only for the current session. Return the provider-supported summary contract from Task 1. Audit successful global/other-session sign-out.

Run: `pnpm test src/modules/auth/server/account-sessions.test.ts`; expected result is PASS after implementation.

- [ ] **Step 3: Commit**

```bash
git add src/modules/auth
git commit -m "feat(auth): add truthful session controls"
```

### Task 5: Publish Security Routes and Browser Hooks

**Owner:** Laitstyles domain engineer

**Files:**
- Create every account-security Route Handler/test listed in the index.
- Create: `src/modules/auth/client/account-security-api.ts`
- Create: `src/modules/auth/client/account-security-hooks.ts`
- Create: `src/modules/auth/client/account-security-keys.ts`

- [ ] **Step 1: Write failing route tests**

Cover unauthenticated access, malformed input, fresh-session/AAL challenge, factor ownership, sign-out-others semantics, stable envelopes and request IDs.

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/app/api/v1/account/security`

- [ ] **Step 3: Implement thin routes and typed clients**

Routes call only auth domain operations. Do not import Server Actions. Set private/no-store headers on factors/sessions. Mutations invalidate only security/session keys and the shared app session when required.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test src/app/api/v1/account/security src/modules/auth
pnpm check:architecture
pnpm typecheck
git add src/app/api/v1/account/security src/modules/auth/client
git commit -m "feat(auth): expose account security APIs"
```

### Task 6: Cut Over Security UI

**Owner:** Laitstyles UI engineer

**Files:**
- Move: `src/features/storefront/account/sections/security-section.tsx` to `src/modules/auth/ui/account-security-section.tsx`
- Move relevant email/password/MFA/session modals from `account-modals.tsx` into focused auth UI files.
- Modify account security page and modal host imports.

- [ ] **Step 1: Write failing interaction tests**

Cover email confirmation pending, password validation/provider errors, QR/secret enrolment pending, TOTP challenge failure/success, unenrol confirmation and sign-out-other-sessions.

- [ ] **Step 2: Move markup and connect hooks**

Preserve visual classes. Remove hard-coded Chrome/Safari sessions and fake security history. Render provider-supported session semantics exactly.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/modules/auth
pnpm check:architecture
pnpm typecheck
git add src/app/(storefront)/account/security src/modules/auth/ui src/features/storefront/account
git commit -m "refactor(auth): connect account security workspace"
```

### Task 7: Security Reviewer and Live Gate

**Owner:** Laitstyles reviewer

- [ ] Run focused auth tests, architecture, Biome, typecheck, build and React Doctor.
- [ ] Run `pnpm test:auth:e2e` against the configured Supabase Auth/mail environment.
- [ ] Browser-test email, password, MFA and sessions at required viewports/themes.
- [ ] Report unavailable Supabase/mail/provider evidence as blocked; never mark the security plan fully accepted without live execution.
