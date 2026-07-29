# Paystack Checkout and Payment Methods Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace simulated storefront and admin payment behavior with an authoritative Paystack checkout, verification, webhook and reusable-authorization implementation.

**Architecture:** The browser may open Paystack only with a server-created access code. Orders, holds and pending payments are created transactionally before initialization; verification and signed webhook ingestion converge on one idempotent settlement operation. Reusable cards are stored as masked Paystack authorization metadata, never raw card data.

**Tech Stack:** Next.js 16 Route Handlers, Prisma, Paystack REST/Popup, Zod, TanStack Query, Vitest, Playwright.

## Global Constraints

- Never expose `PAYSTACK_SECRET_KEY`, authorization codes, signatures or full provider payloads to logs or browser bundles.
- Treat browser popup success as a prompt to verify, not proof of payment.
- Amounts are integer minor units and currency is explicit at every boundary.
- Reuse the order, inventory and hold invariants established by the current modules; do not create a second stock-reservation system.
- Setup charges for saved cards use the approved NGN 50 charge followed by a matching Paystack refund. A method is reusable only when Paystack returns `authorization.reusable === true`.

---

### Task 1: Expand the Paystack Provider Adapter

**Owner:** Laitstyles domain engineer

**Files:**
- Replace: `src/modules/payments/server/paystack.ts`
- Create: `src/modules/payments/server/paystack/client.ts`
- Create: `src/modules/payments/server/paystack/schemas.ts`
- Create: `src/modules/payments/server/paystack/transactions.ts`
- Create: `src/modules/payments/server/paystack/authorizations.ts`
- Create: `src/modules/payments/server/paystack/webhooks.ts`
- Create: `src/modules/payments/server/paystack/paystack.test.ts`

**Interfaces:**
- Produces `initializeTransaction`, `verifyTransaction`, `listTransactions`, `fetchTransaction`, `chargeAuthorization`, `deactivateAuthorization` and `verifyWebhookSignature`.

- [ ] **Step 1: Write failing provider-contract tests**

```ts
it("sends amounts to Paystack in minor units", async () => {
  await initializeTransaction({ email: "buyer@example.com", amountMinor: 125_000, reference: "pay_1", callbackUrl });
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/transaction/initialize"), expect.objectContaining({
    body: expect.stringContaining('"amount":125000'),
  }));
});

it("rejects an invalid webhook signature", () => {
  expect(() => verifyWebhookSignature(rawBody, "not-the-hmac")).toThrowError(/signature/i);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/payments/server/paystack/paystack.test.ts`

- [ ] **Step 3: Implement strict request and response schemas**

Use one authenticated fetch client with bounded timeouts, JSON parsing, normalized provider errors and redacted diagnostics. Verify webhook HMAC over the raw request bytes with constant-time comparison.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test src/modules/payments/server/paystack
pnpm typecheck
git add src/modules/payments/server/paystack src/modules/payments/server/paystack.ts
git commit -m "feat(payments): expand Paystack provider adapter"
```

### Task 2: Build the Checkout Draft and Settlement Domain

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/checkout/schema.ts`
- Create: `src/modules/checkout/types.ts`
- Create: `src/modules/checkout/server/create-checkout.ts`
- Create: `src/modules/checkout/server/get-checkout.ts`
- Create: `src/modules/checkout/server/settle-payment.ts`
- Create: `src/modules/checkout/server/verify-payment.ts`
- Create: `src/modules/checkout/server/checkout.test.ts`
- Modify: `src/modules/orders/server/**`
- Modify: `src/modules/inventory/server/**`

**Interfaces:**
- Produces `createCheckout(identity, input)`, `getCheckout(identity, id)`, `verifyCheckoutPayment(identity, paymentId)` and `settlePaystackEvent(event)`.

- [ ] **Step 1: Write failing pricing, authorization and concurrency tests**

Cover server-side price reconstruction, invalid variants, address ownership, expired holds, duplicate references, two concurrent settlement attempts and paid-order replay.

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/checkout/server/checkout.test.ts`

- [ ] **Step 3: Implement one transactional draft path**

In one Prisma transaction, re-read sellable variants/prices, validate customer-owned addresses, create or refresh inventory holds, create the pending order and payment, and allocate the unique Paystack reference/idempotency key. Call Paystack initialization after the transaction and persist the access code/reference result without storing secret material.

- [ ] **Step 4: Implement one idempotent settlement path**

Lock by provider/reference uniqueness, compare amount/currency/customer/order, transition payment and order once, consume holds once, enqueue downstream work once and record reconciliation facts. Verification, webhook and offline-sale completion must call this same operation.

- [ ] **Step 5: Verify and commit**

```bash
pnpm test src/modules/checkout src/modules/orders src/modules/inventory
pnpm check:architecture
pnpm typecheck
git add src/modules/checkout src/modules/orders src/modules/inventory
git commit -m "feat(checkout): add authoritative payment settlement"
```

### Task 3: Publish Checkout, Verification and Webhook APIs

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/app/api/v1/checkout/route.ts`
- Create: `src/app/api/v1/checkout/route.test.ts`
- Create: `src/app/api/v1/checkout/[checkoutId]/route.ts`
- Create: `src/app/api/v1/payments/[paymentId]/verify/route.ts`
- Create: `src/app/api/v1/payments/webhooks/paystack/route.ts`
- Create: `src/app/api/v1/payments/webhooks/paystack/route.test.ts`
- Create: `src/modules/checkout/client/keys.ts`
- Create: `src/modules/checkout/client/http.ts`
- Create: `src/modules/checkout/client/hooks.ts`

- [ ] **Step 1: Write failing transport tests**

Assert unauthenticated checkout rejection, private cache headers, validation envelopes, ownership checks, raw-body signature verification, duplicate webhook acknowledgement and constant HTTP semantics for already-settled payments.

- [ ] **Step 2: Implement thin handlers**

`POST /api/v1/checkout` creates a draft and returns `{ checkoutId, paymentId, reference, accessCode }`. `GET /api/v1/checkout/:id` returns canonical status. Verification accepts no client amount. The webhook reads `request.text()` before JSON parsing, authenticates the signature, stores the event in the inbox and returns quickly after safe processing/enqueue.

- [ ] **Step 3: Implement typed client keys/hooks**

Define checkout detail and payment-status keys. Mutations invalidate cart, checkout, order and account-summary keys only after canonical server status changes.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test src/app/api/v1/checkout src/app/api/v1/payments src/modules/checkout
pnpm check:architecture
pnpm typecheck
git add src/app/api/v1/checkout src/app/api/v1/payments src/modules/checkout/client
git commit -m "feat(api): publish checkout and Paystack settlement routes"
```

### Task 4: Implement Reusable Payment Methods

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/payments/schema.ts`
- Create: `src/modules/payments/types.ts`
- Create: `src/modules/payments/server/payment-methods.ts`
- Create: `src/modules/payments/server/payment-methods.test.ts`
- Create: `src/app/api/v1/account/payment-methods/route.ts`
- Create: `src/app/api/v1/account/payment-methods/[methodId]/route.ts`
- Create: `src/app/api/v1/account/payment-methods/setup/[attemptId]/route.ts`
- Create: `src/app/api/v1/account/payment-methods/setup/[attemptId]/verify/route.ts`
- Create: `src/modules/payments/client/payment-methods.ts`

- [ ] **Step 1: Write failing setup and ownership tests**

Cover NGN 50 enforcement, customer/email correlation, non-reusable authorization rejection, masked-field persistence, one-default-method invariant, cross-account access denial and idempotent provider deactivation.

- [ ] **Step 2: Implement setup and persistence**

Initialize the setup charge on the server. On verified success, persist only authorization code, signature, brand, bank, last four digits, expiry, country, channel, reusable flag and provider customer code; create the matching refund and track its lifecycle. Encrypt provider authorization codes at rest using the application secret contract established in plan 01.

- [ ] **Step 3: Implement list/setup/default/delete routes and typed hooks**

`POST /account/payment-methods` creates the setup attempt and returns its access code. `GET /setup/:attemptId` returns canonical setup state, and `POST /setup/:attemptId/verify` invokes server verification without accepting an amount. `PATCH /:methodId` changes the default flag in a transaction enforcing one default per customer. Deleting a method deactivates the Paystack authorization when supported, then tombstones the local method.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test src/modules/payments src/app/api/v1/account/payment-methods
pnpm check:architecture
pnpm typecheck
git add src/modules/payments src/app/api/v1/account/payment-methods
git commit -m "feat(account): add reusable Paystack payment methods"
```

### Task 5: Cut Over Storefront Checkout and Account Payments UI

**Owner:** Laitstyles UI engineer

**Files:**
- Move: `src/features/storefront/checkout/**` to `src/modules/checkout/ui/**`
- Move the payment-method section/modal from `src/features/storefront/account/**` to `src/modules/payments/ui/**`
- Modify: `src/app/(storefront)/checkout/**`
- Modify: `src/app/(storefront)/account/payment-methods/**`
- Create: `src/modules/payments/client/paystack-popup.ts`
- Create: `src/modules/checkout/ui/checkout-flow.test.tsx`

- [ ] **Step 1: Write failing interaction tests**

Cover draft creation, Popup continuation with the returned access code, popup cancel, popup error, verification pending, successful server confirmation, failed payment retry and method setup/default/delete.

- [ ] **Step 2: Build the browser-only Popup boundary**

Load Paystack Popup only in a client module. Call `resumeTransaction(accessCode)` from a user gesture. Never accept price, final success or receipt content from Popup callbacks.

- [ ] **Step 3: Replace simulated state**

Use TanStack mutations/queries and canonical API status. Remove fixed redirect URLs, client-generated receipts, fake delays and success toasts that do not follow a successful server response. Preserve the approved visual presentation.

- [ ] **Step 4: Verify and commit**

```bash
pnpm test src/modules/checkout src/modules/payments/ui
pnpm check:architecture
pnpm typecheck
git add src/app/(storefront)/checkout src/app/(storefront)/account/payment-methods src/modules/checkout src/modules/payments/ui src/features/storefront/checkout src/features/storefront/account
git commit -m "refactor(storefront): connect Paystack checkout and methods"
```

### Task 6: Converge Offline Sales on Common Settlement

**Owner:** Laitstyles domain engineer

**Files:**
- Modify: `src/modules/orders/server/create-offline-sale.ts`
- Modify: `src/app/api/v1/orders/offline-sales/route.ts`
- Modify: `src/features/admin/orders/**`
- Create: `src/modules/orders/server/create-offline-sale.test.ts`

- [ ] **Step 1: Write failing convergence tests**

Assert Paystack offline sales create pending payments, return access codes only for the intended authenticated staff flow, and settle via the same idempotent operation as storefront payments.

- [ ] **Step 2: Replace divergent completion logic**

Keep cash/manual methods explicit. For Paystack, initialize on the server, resume Popup on the client and poll/verify canonical status. Remove local paid-state mutation.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/modules/orders src/app/api/v1/orders/offline-sales
pnpm check:architecture
pnpm typecheck
git add src/modules/orders src/app/api/v1/orders/offline-sales src/features/admin/orders
git commit -m "refactor(orders): converge offline Paystack settlement"
```

### Task 7: Checkout and Methods Reviewer Gate

**Owner:** Laitstyles reviewer

- [ ] Run focused tests, architecture checks, Biome, typecheck, build and React Doctor.
- [ ] Replay identical verification and webhook events and prove a single order/payment/stock transition.
- [ ] Browser-test Popup success, cancel, failure, refresh recovery and saved-method setup at required viewports/themes.
- [ ] Execute Paystack test-mode initialization, verification, webhook delivery, reusable authorization and setup-refund flows with configured credentials.
- [ ] Mark provider-dependent acceptance blocked if test credentials or webhook delivery are unavailable; unit mocks alone do not satisfy the live gate.
