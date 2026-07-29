# Owner Finance, Settlements and Transfers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give owners an auditable finance workspace for Paystack balances, transactions, settlements, recipients and deliberate manual transfers while preserving normal automatic settlements.

**Architecture:** Read models normalize Paystack finance data and reconcile it with local payments. Manual payouts are a separate owner-only command workflow: validate bank details, create/select a persisted recipient, create a local transfer intent, invoke Paystack with a unique reference, and complete OTP/final state only through explicit commands and signed events. Automatic Paystack settlements remain visible and are never emulated as transfers.

**Tech Stack:** Next.js 16, Prisma, Paystack Balance/Transaction/Settlement/Transfer APIs, Zod, TanStack Query, Vitest, Playwright.

## Global Constraints

- `finance:read` and `finance:transfer` are server-enforced capabilities; transfer capability defaults to owner only.
- Automatic settlements and manual transfers are distinct entities and UI concepts.
- Never store recipient account numbers in plaintext responses or logs; encrypt at rest and mask in projections.
- Never auto-retry a transfer command with a new reference. Resolve uncertain provider state by reference before any retry decision.
- OTP, disable-OTP and finalize-transfer operations must match the currently documented Paystack contract and configured integration state.

---

### Task 1: Add Finance Capabilities and Boundary Tests

**Owner:** Laitstyles domain engineer

**Files:**
- Modify: `src/modules/auth/server/capabilities.ts`
- Modify: `src/modules/auth/server/authorize.ts`
- Modify: `src/modules/auth/server/authorization.test.ts`
- Modify: `src/modules/auth/types.ts`

- [ ] **Step 1: Write failing capability tests**

```ts
it("allows an owner to initiate transfers", async () => {
  await expect(requireCapability(owner, "finance:transfer")).resolves.toBeUndefined();
});

it("denies non-owners even when they can read finance", async () => {
  await expect(requireCapability(financeStaff, "finance:transfer")).rejects.toMatchObject({ status: 403 });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/auth/server/authorization.test.ts`

- [ ] **Step 3: Implement explicit capability mapping**

Add `finance:read`, `finance:transfer` and `payments:refund`. Preserve deny-by-default behavior and server-owned trusted-role lookup.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test src/modules/auth/server
pnpm check:architecture
pnpm typecheck
git add src/modules/auth
git commit -m "feat(auth): add finance capabilities"
```

### Task 2: Implement Paystack Finance Read Adapters

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/payments/server/paystack/balance.ts`
- Create: `src/modules/payments/server/paystack/ledger.ts`
- Create: `src/modules/payments/server/paystack/settlements.ts`
- Create: `src/modules/payments/server/paystack/finance.test.ts`
- Modify: `src/modules/payments/server/paystack/transactions.ts`
- Modify: `src/modules/payments/server/paystack/schemas.ts`

- [ ] **Step 1: Write failing provider normalization tests**

Cover multi-currency balance rows, transaction filters/pagination/detail, transaction totals/timeline, settlement filters/pagination/detail/transactions and absent/unknown provider fields.

- [ ] **Step 2: Implement strict adapters**

Represent amounts as minor-unit integers and dates as ISO strings at the HTTP boundary. Preserve Paystack cursors/page metadata. Redact authorization details from general transaction list projections.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/modules/payments/server/paystack/finance.test.ts
pnpm typecheck
git add src/modules/payments/server/paystack
git commit -m "feat(payments): add Paystack finance read adapters"
```

### Task 3: Implement Bank, Recipient and Transfer Adapters

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/payments/server/paystack/banks.ts`
- Create: `src/modules/payments/server/paystack/recipients.ts`
- Create: `src/modules/payments/server/paystack/transfers.ts`
- Create: `src/modules/payments/server/paystack/transfers.test.ts`

**Interfaces:**
- Produces `listBanks`, `resolveAccount`, recipient create/update/delete/list, transfer initiate/list/fetch/verify, `finalizeTransferOtp` and transfer-event normalization.

- [ ] **Step 1: Write failing contract tests**

Cover Nigeria/bank filters, account resolution, recipient masking, duplicate recipient identity, transfer minor units, unique reference, OTP-required responses, OTP finalization, failed/reversed states and uncertain network results.

- [ ] **Step 2: Implement provider adapters**

Use current official Paystack request/response fields. Never retry transfer POST automatically. Fetch by reference after timeout/ambiguous errors and return a typed `needs_reconciliation` result if truth cannot be established.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/modules/payments/server/paystack/transfers.test.ts
pnpm typecheck
git add src/modules/payments/server/paystack
git commit -m "feat(payments): add Paystack transfer adapters"
```

### Task 4: Build Finance Queries and Reconciliation

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/payments/server/finance.ts`
- Create: `src/modules/payments/server/finance.test.ts`
- Create: `src/modules/payments/server/reconciliation.ts`
- Create: `src/modules/payments/server/reconciliation.test.ts`

**Interfaces:**
- Produces balance, transaction, transaction-detail, settlement and reconciliation queries.

- [ ] **Step 1: Write failing access/projection/reconciliation tests**

Cover `finance:read`, pagination/filter validation, local-provider transaction matching, amount/currency mismatch, missing local records, duplicate provider references and safe masked projections.

- [ ] **Step 2: Implement read models**

Join provider facts to local payment/order identifiers without making provider availability a requirement for normal order pages. Cache only non-user-specific provider reads for short bounded periods; finance responses are private/no-store at the Route Handler.

- [ ] **Step 3: Implement explicit reconciliation outcomes**

Return `matched`, `provider_only`, `local_only`, `amount_mismatch`, `currency_mismatch` and `status_mismatch` records with actionable identifiers. Do not mutate financial state from a read request.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test src/modules/payments/server/finance.test.ts src/modules/payments/server/reconciliation.test.ts
pnpm check:architecture
pnpm typecheck
git add src/modules/payments/server/finance* src/modules/payments/server/reconciliation*
git commit -m "feat(payments): add finance reconciliation queries"
```

### Task 5: Build Owner-Only Recipient and Transfer Commands

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/payments/server/transfer-recipients.ts`
- Create: `src/modules/payments/server/transfer-recipients.test.ts`
- Create: `src/modules/payments/server/transfers.ts`
- Create: `src/modules/payments/server/transfers.test.ts`
- Modify: `src/modules/payments/server/paystack/webhooks.ts`

**Interfaces:**
- Produces recipient CRUD, account resolution, `initiateTransfer`, `finalizeTransferOtp` and `applyTransferProviderState`.

- [ ] **Step 1: Write failing security and state-machine tests**

Cover owner-only commands, recent-auth requirement, selected active recipient, balance ceiling, currency, reason length, idempotency, double submit, OTP-required/success/failure, timeout reconciliation and signed success/failed/reversed event replay.

- [ ] **Step 2: Implement recipient operations**

Resolve account names through Paystack before recipient creation. Encrypt the account number, persist masked display data and provider recipient code, and tombstone deleted recipients. Prevent deletion while an unresolved transfer references the recipient.

- [ ] **Step 3: Implement transfer intents and events**

Create a local intent/audit event before the provider call. Persist the exact reference and normalized response. Require a second explicit OTP command when requested. Webhooks and fetch-by-reference converge on a compare-and-set transition; reversed funds remain a distinct terminal state.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test src/modules/payments/server/transfer-recipients.test.ts src/modules/payments/server/transfers.test.ts
pnpm check:architecture
pnpm typecheck
git add src/modules/payments/server
git commit -m "feat(payments): add owner transfer workflow"
```

### Task 6: Publish Owner Finance APIs

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/app/api/v1/admin/finance/balance/route.ts`
- Create: `src/app/api/v1/admin/finance/ledger/route.ts`
- Create: `src/app/api/v1/admin/finance/ledger/[transactionId]/route.ts`
- Create: `src/app/api/v1/admin/finance/settlements/route.ts`
- Create: `src/app/api/v1/admin/finance/settlements/[settlementId]/route.ts`
- Create: `src/app/api/v1/admin/finance/settlements/[settlementId]/transactions/route.ts`
- Create: `src/app/api/v1/admin/finance/banks/route.ts`
- Create: `src/app/api/v1/admin/finance/banks/resolve/route.ts`
- Create: `src/app/api/v1/admin/finance/recipients/route.ts`
- Create: `src/app/api/v1/admin/finance/recipients/[recipientId]/route.ts`
- Create: `src/app/api/v1/admin/finance/transfers/route.ts`
- Create: `src/app/api/v1/admin/finance/transfers/[transferId]/route.ts`
- Create: `src/app/api/v1/admin/finance/transfers/[transferId]/finalize/route.ts`
- Create: `src/app/api/v1/admin/finance/transfers/[transferId]/resend-otp/route.ts`
- Create: `src/app/api/v1/admin/finance/reconcile/route.ts`
- Create: `src/app/api/v1/admin/finance/finance-routes.test.ts`
- Create: `src/modules/payments/client/finance.ts`

- [ ] **Step 1: Write failing route tests**

Test read/transfer capability separation, owner-only mutation, recent-auth challenge response, origin/CSRF checks, idempotency-header enforcement, filters, upload-free JSON limits, private caching, encryption redaction and stable error envelopes.

- [ ] **Step 2: Implement thin handlers and typed clients**

Keep reads and commands separated. `POST /transfers` returns the canonical local transfer, including `otp_required` when applicable. `POST /transfers/:id/finalize` accepts only OTP plus idempotency metadata, never amount/recipient overrides. `POST /transfers/:id/resend-otp` uses the existing unresolved transfer and cannot create a second transfer.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/app/api/v1/admin/finance src/modules/payments/client/finance.ts
pnpm check:architecture
pnpm typecheck
git add src/app/api/v1/admin/finance src/modules/payments/client/finance.ts
git commit -m "feat(api): publish owner finance routes"
```

### Task 7: Build the Owner Finance Workspace

**Owner:** Laitstyles UI engineer

**Files:**
- Create: `src/modules/payments/ui/finance/**`
- Create or modify owner finance pages under `src/app/(admin)/**`
- Modify: `src/features/admin/**` only where the current navigation/workspace requires migration.

- [ ] **Step 1: Write failing interaction tests**

Cover balance and transaction filters/detail, settlement list/detail, reconciliation states, bank resolution, recipient create/select/delete, transfer review confirmation, recent-auth interruption, OTP entry and pending/success/failed/reversed outcomes.

- [ ] **Step 2: Implement read workspace**

Clearly label Paystack balance, normal settlement, local order/payment linkage and reconciliation mismatch. Preserve pagination and filters in URL/search state.

- [ ] **Step 3: Implement deliberate transfer workflow**

Use a review step displaying masked recipient, resolved name, amount, fees/currency and reason. Require explicit confirmation and disable duplicate submission while the same intent is pending. Do not optimistically show success.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test src/modules/payments/ui/finance
pnpm check:architecture
pnpm typecheck
git add src/app/(admin) src/modules/payments/ui/finance src/features/admin
git commit -m "feat(admin): add owner Paystack finance workspace"
```

### Task 8: Owner Finance Reviewer and Live Gate

**Owner:** Laitstyles reviewer

- [ ] Run focused tests, architecture, Biome, typecheck, build and React Doctor.
- [ ] Prove non-owner denial for every transfer mutation and secret/account-number redaction from responses/logs.
- [ ] Browser-test read, recipient, transfer-review and OTP flows at required viewports/themes and keyboard-only interaction.
- [ ] Execute configured Paystack test-mode balance, transaction, settlement, bank resolution, recipient and transfer/OTP flows; record features unavailable to the test business.
- [ ] Replay success, failed and reversed transfer events and prove a single canonical transition/audit trail.
