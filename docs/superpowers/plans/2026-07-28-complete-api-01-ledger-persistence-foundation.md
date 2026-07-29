# API Ledger and Persistence Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Freeze the exact API/consumer ledger and add the shared Prisma persistence, idempotency, webhook-inbox and outbox foundations required by every later account and finance slice.

**Architecture:** Inventory existing behavior before schema edits, then add focused Prisma models and raw constraint/RLS SQL through Prisma migrations. Shared primitives expose server-only operations; business-specific commands remain in later domain plans.

**Tech Stack:** Prisma 7.8, PostgreSQL, Next.js 16 Route Handlers, TypeScript, Zod, Vitest, pnpm 11.13.0.

## Global Constraints

- Follow the index global constraints in `2026-07-28-complete-api-account-paystack-index.md`.
- Use `pnpm prisma:*` repository scripts and Prisma migrations only. Do not invoke Supabase CLI.
- Do not edit active account/returns/products UI files in this plan.
- New exposed `public` tables require reviewed RLS SQL in the Prisma migration, but request-time application writes still use Prisma and server policies.

---

### Task 1: Freeze the Endpoint and Prototype Ledger

**Owner:** Laitstyles planner

**Files:**
- Create: `docs/architecture-migration/complete-api-endpoint-ledger.md`
- Modify: `docs/architecture-migration/migration-tracker.md`

**Interfaces:**
- Produces one row per endpoint/interaction with method, consumer, domain owner, auth capability, persistence source, current state, target plan and deletion gate.

- [ ] **Step 1: Capture the exact route/method baseline**

Run:

```powershell
Get-ChildItem -Recurse -File src\app\api\v1 -Filter route.ts |
  ForEach-Object { $_.FullName }
rg -n "^export async function (GET|POST|PATCH|PUT|DELETE)" src/app/api/v1
```

Expected: every existing `/api/v1` Route Handler and exported HTTP method is visible. Record the output date and branch head in the ledger.

- [ ] **Step 2: Capture every prototype interaction**

Run:

```powershell
rg -n "demo modal|toast\(|not available yet|setTimeout\(|Promise\.resolve|sessionStorage|paystack\.shop" src/features src/app src/modules
```

For every production match, add a ledger row with one of `real`, `prototype`, `transport-gap`, `provider-gap`, `browser-owned`, or `server-direct`.

- [ ] **Step 3: Record the ledger schema and rows**

Use this exact table header:

```markdown
| ID | Surface | Method/path or interaction | Consumer | Domain owner | Auth/capability | Current source | Target plan | Deletion gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
```

Include every endpoint from the index, every account section/modal, storefront checkout, admin offline sale, refund transitions and finance capability.

- [ ] **Step 4: Validate completeness mechanically**

Run a second route/method scan and account-section file scan. Expected: every output path has a fully specified ledger row with no unresolved fields or deferred wording.

- [ ] **Step 5: Commit**

```bash
git add docs/architecture-migration/complete-api-endpoint-ledger.md docs/architecture-migration/migration-tracker.md
git commit -m "docs(architecture): freeze complete API endpoint ledger"
```

### Task 2: Add Account Persistence Models

**Owner:** Laitstyles data engineer

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/account-preferences.prisma`
- Create: `prisma/account-support.prisma`
- Create: `prisma/account-lifecycle.prisma`
- Create: `prisma/migrations/<prisma-generated-name>/migration.sql`
- Test: `src/modules/account-persistence-boundary.test.ts`

**Interfaces:**
- Produces generated delegates for `customer_preferences`, `notification_preferences`, `notifications`, `privacy_consents`, `support_tickets`, `support_messages`, `support_attachments`, `data_export_jobs`, and `account_deletion_requests`.

- [ ] **Step 1: Write the failing generated-client boundary test**

```ts
import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("account persistence boundary", () => {
  it("exposes every approved account delegate", () => {
    expect(prisma.customer_preferences).toBeDefined();
    expect(prisma.notification_preferences).toBeDefined();
    expect(prisma.notifications).toBeDefined();
    expect(prisma.support_tickets).toBeDefined();
    expect(prisma.data_export_jobs).toBeDefined();
    expect(prisma.account_deletion_requests).toBeDefined();
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/account-persistence-boundary.test.ts`

Expected: FAIL because the delegates do not exist.

- [ ] **Step 3: Define focused models and enums**

Use UUID primary keys, `customer_id` ownership, timestamps, explicit enums and relations. Enforce one preference row per customer and one active deletion request per customer. Store notification payloads as bounded JSON only when event-specific columns would create a sparse table; never store authorization decisions in JSON.

Required lifecycle literals:

```prisma
enum data_export_status {
  queued
  processing
  ready
  failed
  expired
}

enum account_deletion_status {
  requested
  blocked
  cancelled
  scheduled
  completed
}
```

- [ ] **Step 4: Generate the Prisma migration**

Run: `pnpm prisma:migrate:dev --name complete_account_foundation`

Expected: Prisma creates a migration and regenerates the client. If no configured development database is reachable, do not invent a timestamped migration; record the command failure and stop this task as blocked.

- [ ] **Step 5: Add reviewed constraints and RLS SQL to the generated migration**

Add partial uniqueness for active deletion requests, non-negative retry counts, export expiry after creation, and ownership indexes. Enable RLS on new `public` tables and add authenticated ownership policies using `(select auth.uid())` joined through the owning customer/profile relation. Include both `USING` and `WITH CHECK` for updates.

- [ ] **Step 6: Verify GREEN**

```bash
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
pnpm test src/modules/account-persistence-boundary.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add prisma src/modules/account-persistence-boundary.test.ts
git commit -m "feat(account): add persistent account records"
```

### Task 3: Add Payment, Refund and Finance Persistence

**Owner:** Laitstyles data engineer

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/payment-operations.prisma`
- Create: `prisma/payout-finance.prisma`
- Create: `prisma/migrations/<prisma-generated-name>/migration.sql`
- Test: `src/modules/payment-persistence-boundary.test.ts`

**Interfaces:**
- Produces delegates for payment authorizations/refunds, provider events, disputes, payout recipients/transfers/events, settlements/mappings, idempotency records and outbox messages.

- [ ] **Step 1: Write the failing delegate and relation test**

```ts
it("exposes idempotent payment and payout records", () => {
  expect(prisma.payment_authorizations).toBeDefined();
  expect(prisma.payment_refunds).toBeDefined();
  expect(prisma.provider_webhook_events).toBeDefined();
  expect(prisma.payment_disputes).toBeDefined();
  expect(prisma.payout_recipients).toBeDefined();
  expect(prisma.payout_transfers).toBeDefined();
  expect(prisma.provider_settlements).toBeDefined();
  expect(prisma.idempotency_records).toBeDefined();
  expect(prisma.outbox_messages).toBeDefined();
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/payment-persistence-boundary.test.ts`

Expected: FAIL for missing delegates.

- [ ] **Step 3: Define financial models**

Model money as `Decimal(12,2)` locally and convert only at provider boundaries. Provider numeric IDs are strings in application contracts. Add unique constraints for provider/reference, customer/provider/signature, provider event dedupe key, operation scope/idempotency key, recipient code and transfer reference.

Extend `payments` with authorization/customer mapping, verification time/source and safe failure fields. Do not expose `raw_response` through public types.

- [ ] **Step 4: Generate and harden the migration**

Run: `pnpm prisma:migrate:dev --name payment_finance_foundation`

Add SQL checks for positive payment/refund/transfer amounts, processed refund not exceeding requested amount, one active default authorization per customer, and terminal-state timestamps. Enable RLS with no consumer policies on owner-only payout/settlement tables.

- [ ] **Step 5: Verify migration and generated client**

```bash
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:status
pnpm test src/modules/payment-persistence-boundary.test.ts
```

Expected: PASS against the configured development database.

- [ ] **Step 6: Commit**

```bash
git add prisma src/modules/payment-persistence-boundary.test.ts
git commit -m "feat(payments): add financial operation records"
```

### Task 4: Implement Shared Idempotency, Webhook Inbox and Outbox Operations

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/operations/types.ts`
- Create: `src/modules/operations/server/idempotency.ts`
- Create: `src/modules/operations/server/idempotency.test.ts`
- Create: `src/modules/operations/server/provider-events.ts`
- Create: `src/modules/operations/server/provider-events.test.ts`
- Create: `src/modules/operations/server/outbox.ts`
- Create: `src/modules/operations/server/outbox.test.ts`

**Interfaces:**
- Produces `claimIdempotency(scope, key, actorId, inputHash)` and `completeIdempotency(recordId, response)`.
- Produces `receiveProviderEvent(input)` returning `new | duplicate | conflict`.
- Produces `enqueueOutbox(tx, message)` for use inside business transactions.

- [ ] **Step 1: Write failing concurrency and conflict tests**

```ts
it("returns the completed response for an identical replay", async () => {
  const first = await claimIdempotency("checkout", "key-1", "customer-1", "hash-a");
  await completeIdempotency(first.id, { checkoutId: "checkout-1" });
  await expect(claimIdempotency("checkout", "key-1", "customer-1", "hash-a"))
    .resolves.toMatchObject({ state: "completed", response: { checkoutId: "checkout-1" } });
});

it("rejects reuse with a different payload hash", async () => {
  await claimIdempotency("refund", "key-2", "admin-1", "hash-a");
  await expect(claimIdempotency("refund", "key-2", "admin-1", "hash-b"))
    .rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/operations/server`

Expected: FAIL because operations modules do not exist.

- [ ] **Step 3: Implement unique-constraint claim semantics**

Use Prisma transactions and the unique `(scope, key)` constraint. On unique collision, reload the row, compare actor/input hash and return in-progress/completed state. Never run the business command twice after a completed response.

- [ ] **Step 4: Implement provider-event receipt and outbox enqueue**

`receiveProviderEvent` persists provider, dedupe key, event type, payload hash and validated payload before dispatch. `enqueueOutbox` accepts a transaction client so the business fact and notification request commit together.

- [ ] **Step 5: Verify GREEN and boundaries**

```bash
pnpm test src/modules/operations/server
pnpm check:architecture
pnpm typecheck
```

Expected: PASS; no operations module imports app routes, UI, client code or Server Actions.

- [ ] **Step 6: Commit**

```bash
git add src/modules/operations
git commit -m "feat(operations): add durable idempotency and outbox"
```

### Task 5: Foundation Reviewer Gate

**Owner:** Laitstyles reviewer

- [ ] **Step 1: Inspect migration safety**

Confirm every new relation has an index, every destructive cascade is intentional, financial amounts have checks, RLS is enabled on exposed tables, and no policy grants `authenticated` without ownership.

- [ ] **Step 2: Run authoritative focused gates**

```bash
pnpm prisma:format
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:status
pnpm test src/modules/account-persistence-boundary.test.ts src/modules/payment-persistence-boundary.test.ts src/modules/operations
pnpm check:architecture
pnpm biome
pnpm typecheck
```

Expected: PASS. Missing database connectivity or migration evidence blocks Plans 2-7.

- [ ] **Step 3: Commit evidence-only documentation changes**

```bash
git add docs/architecture-migration
git commit -m "docs(architecture): record API foundation evidence"
```
