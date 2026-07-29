# Paystack Refunds and Disputes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide auditable refund and dispute lifecycles that reconcile Paystack state with Laitstyles orders, returns and owner/admin operations.

**Architecture:** Refund and dispute requests are commands over persisted local records. Paystack responses and signed events update provider state idempotently; order/return financial state changes only after authoritative provider confirmation. Staff interfaces consume finance-safe APIs and never call Paystack directly.

**Tech Stack:** Next.js 16, Prisma, Paystack Refund/Dispute APIs, Zod, TanStack Query, Vitest, Playwright.

## Global Constraints

- Never equate a submitted refund with a processed refund.
- Sum of successful and pending refund amounts cannot exceed the captured refundable amount.
- Refund, dispute and evidence operations require explicit capabilities and immutable audit events.
- Preserve return merchandise state separately from payment state; neither silently implies the other.

---

### Task 1: Implement the Paystack Refund Adapter

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/payments/server/paystack/refunds.ts`
- Create: `src/modules/payments/server/paystack/refunds.test.ts`
- Modify: `src/modules/payments/server/paystack/schemas.ts`

- [ ] **Step 1: Write failing normalization tests**

Cover create, fetch and list responses; partial amounts; NGN minor units; provider status mapping; pagination; unknown status preservation; and normalized failures with no leaked secret/payload.

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/payments/server/paystack/refunds.test.ts`

- [ ] **Step 3: Implement the adapter and verify**

```bash
pnpm test src/modules/payments/server/paystack
pnpm typecheck
git add src/modules/payments/server/paystack
git commit -m "feat(payments): add Paystack refund adapter"
```

### Task 2: Build Refund Domain Operations

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/payments/server/refunds.ts`
- Create: `src/modules/payments/server/refunds.test.ts`
- Modify: `src/modules/returns/server/**`
- Modify: `src/modules/orders/server/**`

**Interfaces:**
- Produces `requestRefund(actor, input)`, `getRefund(actor, id)`, `listRefunds(actor, query)` and `applyRefundProviderState(event)`.

- [ ] **Step 1: Write failing lifecycle tests**

Cover owner/staff authorization, payment ownership, partial/full ceiling calculations, duplicate idempotency keys, concurrent refund attempts, setup-charge refunds, return-linked refunds and processed/failed provider transitions.

- [ ] **Step 2: Implement local-first command records**

Create the refund request and audit event transactionally before the provider call. Persist provider identifiers/status afterward. A retry with the same key returns the original command. Only a processed provider state changes refunded totals and dependent order/return financial state.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/modules/payments/server/refunds.test.ts src/modules/returns src/modules/orders
pnpm check:architecture
pnpm typecheck
git add src/modules/payments/server/refunds* src/modules/returns src/modules/orders
git commit -m "feat(payments): implement refund lifecycle"
```

### Task 3: Publish Refund APIs and Admin Client Hooks

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/app/api/v1/admin/payments/route.ts`
- Create: `src/app/api/v1/admin/payments/[paymentId]/route.ts`
- Create: `src/app/api/v1/admin/payments/[paymentId]/timeline/route.ts`
- Create: `src/app/api/v1/admin/refunds/route.ts`
- Create: `src/app/api/v1/admin/refunds/route.test.ts`
- Create: `src/app/api/v1/admin/refunds/[refundId]/route.ts`
- Create: `src/app/api/v1/admin/refunds/[refundId]/retry/route.ts`
- Create: `src/modules/payments/client/refunds.ts`

- [ ] **Step 1: Write failing route tests**

Assert capability enforcement, validation/error envelopes, pagination, idempotency-header requirements, private cache headers and redaction of authorization/provider payload fields.

- [ ] **Step 2: Implement thin routes and typed hooks**

The payment list/detail/timeline routes expose safe local/provider reconciliation projections. `GET /api/v1/admin/refunds` lists permitted records; `POST` creates a command; `GET /api/v1/admin/refunds/:id` returns lifecycle/audit-safe detail. Retry is allowed only for a persisted failed or needs-attention command, retains the original idempotency identity and resolves Paystack truth before another provider call. Mutations invalidate refund, payment, order and linked-return keys.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/app/api/v1/admin/payments src/app/api/v1/admin/refunds src/modules/payments/client
pnpm check:architecture
pnpm typecheck
git add src/app/api/v1/admin/payments src/app/api/v1/admin/refunds src/modules/payments/client/refunds.ts
git commit -m "feat(api): publish refund operations"
```

### Task 4: Implement the Paystack Dispute Adapter and Domain

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/payments/server/paystack/disputes.ts`
- Create: `src/modules/payments/server/paystack/disputes.test.ts`
- Create: `src/modules/payments/server/disputes.ts`
- Create: `src/modules/payments/server/disputes.test.ts`
- Modify: `src/modules/payments/server/paystack/webhooks.ts`

**Interfaces:**
- Produces list/fetch/update-evidence/upload/accept/decline provider calls and `applyDisputeProviderState(event)`.

- [ ] **Step 1: Write failing contract and lifecycle tests**

Cover list/fetch pagination, evidence validation, upload limits/content types, accept/decline authorization, due dates, duplicate events, transaction correlation and unknown/new provider states.

- [ ] **Step 2: Implement provider/domain boundaries**

Store normalized dispute facts and evidence metadata. Stream allowed evidence files through the server without buffering unbounded input. Owner decisions create immutable audit events; signed provider events remain authoritative for final state.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/modules/payments/server/paystack/disputes.test.ts src/modules/payments/server/disputes.test.ts
pnpm check:architecture
pnpm typecheck
git add src/modules/payments/server
git commit -m "feat(payments): implement dispute lifecycle"
```

### Task 5: Publish Dispute APIs

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/app/api/v1/admin/disputes/route.ts`
- Create: `src/app/api/v1/admin/disputes/route.test.ts`
- Create: `src/app/api/v1/admin/disputes/[disputeId]/route.ts`
- Create: `src/app/api/v1/admin/disputes/[disputeId]/evidence/route.ts`
- Create: `src/app/api/v1/admin/disputes/[disputeId]/accept/route.ts`
- Create: `src/app/api/v1/admin/disputes/[disputeId]/decline/route.ts`
- Create: `src/modules/payments/client/disputes.ts`

- [ ] **Step 1: Write failing transport/security tests**

Assert staff read vs owner decision capabilities, upload size/type enforcement, malformed multipart rejection, idempotency, CSRF/origin protection where applicable, private caching and safe response projections.

- [ ] **Step 2: Implement routes and hooks**

Handlers authenticate, validate and delegate only. `PATCH /:disputeId` updates allowed dispute metadata. The evidence endpoint accepts the bounded metadata/file input required by Paystack. Evidence updates and decisions require an idempotency key. Query hooks retain prior pages and invalidate the affected dispute/transaction summaries after mutations.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/app/api/v1/admin/disputes src/modules/payments/client/disputes.ts
pnpm check:architecture
pnpm typecheck
git add src/app/api/v1/admin/disputes src/modules/payments/client/disputes.ts
git commit -m "feat(api): publish dispute operations"
```

### Task 6: Build Admin Refund and Dispute Workspaces

**Owner:** Laitstyles UI engineer

**Files:**
- Create: `src/modules/payments/ui/refunds/**`
- Create: `src/modules/payments/ui/disputes/**`
- Create or modify admin route pages under `src/app/(admin)/**`
- Modify: `src/features/admin/orders/**`

- [ ] **Step 1: Write failing interaction tests**

Cover full/partial refund confirmation, over-refund error, submitted-vs-processed status, dispute due date, evidence validation/upload, accept/decline confirmation and failed-provider retry visibility.

- [ ] **Step 2: Implement API-backed workspaces**

Preserve existing order presentation while moving payment UI into the payments module. Render authoritative lifecycle timestamps and actor/audit facts. Do not optimistically display processed financial state.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/modules/payments/ui
pnpm check:architecture
pnpm typecheck
git add src/app/(admin) src/modules/payments/ui src/features/admin/orders
git commit -m "feat(admin): add refund and dispute workspaces"
```

### Task 7: Refund and Dispute Reviewer Gate

**Owner:** Laitstyles reviewer

- [ ] Run focused tests, architecture, Biome, typecheck, build and React Doctor.
- [ ] Prove partial plus full refund ceilings under concurrent requests and event replay.
- [ ] Browser-test refund and dispute tasks at required viewports/themes and keyboard-only interaction.
- [ ] Execute Paystack test-mode refund/list/detail and available dispute/evidence operations; record provider limitations honestly.
- [ ] Confirm order/return financial state changes only after authoritative processed events.
