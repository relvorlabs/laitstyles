# Extended Customer Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace local-only preferences, notifications, privacy, support, export and deletion simulations with persistent, customer-owned workflows.

**Architecture:** Build four focused modules over Plan 1 persistence, publish customer-owned API resources, then move existing account presentation into module UI and connect server truth. Export/deletion policy is explicit and tested rather than hidden in modal copy.

**Tech Stack:** Next.js 16, React 19, Prisma, TanStack Query, Zod, Cloudinary signed assets where attachments require storage, Vitest, Playwright.

## Global Constraints

- Plans 1 and core customer identity from Plan 2 must pass first.
- Seven-day export expiry and 14-day deletion cancellation are product rules from the approved spec.
- Active orders, returns, refunds, disputes or payouts block deletion execution.
- Do not claim legal erasure of retained transactional/audit facts; anonymize according to the approved policy.

---

### Task 1: Implement Preferences and Privacy Domains

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/preferences/{schema.ts,types.ts}`
- Create: `src/modules/preferences/server/{queries,commands,policy}.ts`
- Create: `src/modules/preferences/server/commands.test.ts`
- Create: `src/modules/preferences/client/{api,hooks,keys}.ts`
- Create: `src/modules/privacy/{schema.ts,types.ts}`
- Create: `src/modules/privacy/server/{queries,commands,policy}.ts`
- Create: `src/modules/privacy/server/commands.test.ts`
- Create: `src/modules/privacy/client/{api,hooks,keys}.ts`

**Interfaces:**
- Produces typed `CustomerPreferences` and versioned `PrivacyPreferences` projections.
- Produces update commands that always derive customer ownership from the authenticated identity.

- [ ] **Step 1: Write failing default/upsert and consent-history tests**

```ts
it("creates deterministic defaults for a customer without a row", async () => {
  await expect(getCustomerPreferences(identity)).resolves.toEqual(DEFAULT_CUSTOMER_PREFERENCES);
});

it("appends consent history only when the value changes", async () => {
  await updatePrivacyPreferences(identity, { analytics: false, personalization: true });
  expect(tx.privacy_consents.createMany).toHaveBeenCalledWith({
    data: expect.arrayContaining([expect.objectContaining({ consent_key: "analytics", granted: false })]),
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/preferences src/modules/privacy`

- [ ] **Step 3: Implement Zod contracts and transaction-neutral policies**

Use exact enums for contact channel, sizing units and personalization flags. Required transactional/security messages cannot be disabled through preference input. Consent versions include policy version and effective timestamp.

- [ ] **Step 4: Verify GREEN and commit**

```bash
pnpm test src/modules/preferences src/modules/privacy
pnpm typecheck
git add src/modules/preferences src/modules/privacy
git commit -m "feat(account): persist preferences and privacy consent"
```

### Task 2: Implement Stored Notifications

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/notifications/{schema.ts,types.ts}`
- Create: `src/modules/notifications/server/{queries,commands,policy,projectors}.ts`
- Create: `src/modules/notifications/server/commands.test.ts`
- Create: `src/modules/notifications/client/{api,hooks,keys}.ts`

**Interfaces:**
- Produces paginated customer notifications, unread count, single mark-read, mark-all-read and notification preference updates.
- Consumes Plan 1 outbox messages through idempotent projectors.

- [ ] **Step 1: Write failing ownership, unread and dedupe tests**

```ts
it("marks only the authenticated customer's notification", async () => {
  await markNotificationRead(identity, "notification-1");
  expect(prisma.notifications.updateMany).toHaveBeenCalledWith({
    where: { id: "notification-1", customer_id: identity.customerId, read_at: null },
    data: { read_at: expect.any(Date) },
  });
});

it("deduplicates the same outbox event", async () => {
  await projectNotification(event);
  await projectNotification(event);
  expect(prisma.notifications.create).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Verify RED, implement and verify GREEN**

Run before implementation: `pnpm test src/modules/notifications` — expected FAIL.

Implement cursor/page reads ordered by `created_at desc`, targeted updateMany ownership and unique event-key projection.

Run after implementation: `pnpm test src/modules/notifications` — expected PASS.

- [ ] **Step 3: Commit**

```bash
git add src/modules/notifications
git commit -m "feat(notifications): add customer notification records"
```

### Task 3: Implement Support Tickets, Replies and Attachment Metadata

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/support/{schema.ts,types.ts}`
- Create: `src/modules/support/server/{queries,commands,policy,attachments}.ts`
- Create: `src/modules/support/server/commands.test.ts`
- Create: `src/modules/support/client/{api,hooks,keys}.ts`

**Interfaces:**
- Produces ticket list/detail, create ticket and append customer reply.
- Attachment command accepts only a completed signed asset descriptor already owned by the customer upload session.

- [ ] **Step 1: Write failing lifecycle and attachment tests**

```ts
it("reopens a resolved ticket when the customer replies", async () => {
  await replyToTicket(identity, "ticket-1", { body: "The issue remains." });
  expect(tx.support_tickets.update).toHaveBeenCalledWith(expect.objectContaining({
    data: expect.objectContaining({ status: "open" }),
  }));
});

it("rejects an attachment not owned by the ticket customer", async () => {
  await expect(attachTicketAsset(identity, "ticket-1", foreignAsset))
    .rejects.toMatchObject({ code: "SUPPORT_ATTACHMENT_NOT_OWNED" });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/support`

- [ ] **Step 3: Implement transactional create/reply operations**

Create ticket and first message together. Append immutable messages, update ticket status/timestamps, enqueue staff/customer notifications and constrain attachment MIME/size from the validated signed-upload result.

- [ ] **Step 4: Verify GREEN and commit**

```bash
pnpm test src/modules/support
pnpm typecheck
git add src/modules/support
git commit -m "feat(support): persist customer ticket conversations"
```

### Task 4: Implement Export and Account Deletion Lifecycle

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/account-lifecycle/{schema.ts,types.ts}`
- Create: `src/modules/account-lifecycle/server/{exports,deletion,policy,anonymize}.ts`
- Create: `src/modules/account-lifecycle/server/exports.test.ts`
- Create: `src/modules/account-lifecycle/server/deletion.test.ts`
- Create: `src/modules/account-lifecycle/client/{api,hooks,keys}.ts`

**Interfaces:**
- Produces `requestAccountExport`, `getAccountExport`, `streamAccountExport`.
- Produces `requestAccountDeletion`, `cancelAccountDeletion`, `executeScheduledDeletion`.

- [ ] **Step 1: Write failing export ownership/expiry tests**

```ts
it("refuses an expired export download", async () => {
  mocks.exportRow.expires_at = new Date("2026-07-01T00:00:00Z");
  await expect(streamAccountExport(identity, mocks.exportRow.id, now))
    .rejects.toMatchObject({ code: "EXPORT_EXPIRED" });
});
```

- [ ] **Step 2: Write failing deletion blocker/anonymization tests**

```ts
it.each(["active-order", "open-return", "pending-refund", "open-dispute", "pending-payout"])(
  "blocks deletion for %s",
  async (fixture) => {
    seedBlocker(fixture);
    await expect(requestAccountDeletion(identity, now))
      .rejects.toMatchObject({ code: "ACCOUNT_DELETION_BLOCKED" });
  },
);
```

- [ ] **Step 3: Implement deterministic export projection**

Export JSON with profile, addresses, preferences, notifications, saved products, orders, returns, reviews, support and consent history. Exclude provider secrets, authorization codes, internal staff notes and other customers' data. Compute `expires_at = created_at + 7 days`.

- [ ] **Step 4: Implement request/cancel/execute deletion**

Set `scheduled_for = requested_at + 14 days`; cancellation is allowed before execution. Execution runs in a transaction, anonymizes/removes approved customer-owned data, preserves required transaction/audit facts and records completion.

- [ ] **Step 5: Verify GREEN and commit**

```bash
pnpm test src/modules/account-lifecycle
pnpm typecheck
git add src/modules/account-lifecycle
git commit -m "feat(account): add export and deletion lifecycle"
```

### Task 5: Publish Extended Account Routes

**Owner:** Laitstyles domain engineer

**Files:**
- Create Route Handlers and colocated tests for every extended-account endpoint in the index.
- Reuse each owning module's `client/{api,hooks,keys}.ts`.

**Interfaces:**
- All routes require `requireApiConsumer()` and never accept a customer ID from the browser.

- [ ] **Step 1: Write representative failing route tests for every family**

Cover malformed preference input, notification ownership, support ticket ownership, expired export, deletion cancellation and standard request IDs/error envelopes.

- [ ] **Step 2: Verify RED**

```bash
pnpm test src/app/api/v1/account/preferences src/app/api/v1/account/notifications src/app/api/v1/account/support-tickets src/app/api/v1/account/privacy-preferences src/app/api/v1/account/data-exports src/app/api/v1/account/deletion-requests
```

- [ ] **Step 3: Implement collection/resource handlers**

Keep state transitions explicit only where semantics differ from CRUD. Stream export downloads with private/no-store headers and safe filename. Support attachment signing reuses the existing asset boundary with an account-scoped folder and ownership token.

- [ ] **Step 4: Verify GREEN and commit**

```bash
pnpm test src/app/api/v1/account src/modules/preferences src/modules/notifications src/modules/support src/modules/privacy src/modules/account-lifecycle
pnpm check:architecture
pnpm typecheck
git add src/app/api/v1/account src/modules
git commit -m "feat(account): expose extended account APIs"
```

### Task 6: Cut Over Extended Account UI

**Owner:** Laitstyles UI engineer

**Files:**
- Move legacy preference/notification/privacy/support sections into each owning module's `ui/storefront/**`.
- Modify account pages and modal host imports.
- Delete migrated local-only handlers after consumer scan.

- [ ] **Step 1: Write failing UI tests**

Assert server-backed defaults, pending/error states, mark-all-read, ticket creation/reply, export ready/expired, deletion blocked/cancelled and no optimistic success toast.

- [ ] **Step 2: Move UI mechanically and connect hooks**

Preserve current markup/classes. Replace hard-coded records and local-only submit handlers. Explicitly render loading, empty, error, pending and unavailable-provider states.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/modules/preferences src/modules/notifications src/modules/support src/modules/privacy src/modules/account-lifecycle
pnpm check:architecture
pnpm typecheck
git add src/app/(storefront)/account src/modules src/features/storefront/account
git commit -m "refactor(account): connect extended customer workflows"
```

### Task 7: Extended Account Reviewer Gate

**Owner:** Laitstyles reviewer

- [ ] Run focused tests, `pnpm biome`, `pnpm typecheck`, `pnpm check:architecture`, `pnpm react-doctor`.
- [ ] Browser-test all extended flows at required viewports/themes, including keyboard/focus, console/network errors and screenshots.
- [ ] Confirm exports never contain secrets/internal notes and deletion blockers cover refund/dispute/payout state.
- [ ] Update ledger rows only for executed, consumer-connected behavior.

