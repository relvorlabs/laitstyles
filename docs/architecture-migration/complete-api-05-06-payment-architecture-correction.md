# Complete API Plans 05/06 — Payment Architecture Correction

**Branch:** `codex/plan-06-refunds-disputes`  
**Scope:** Plan 05 checkout/payment methods and Plan 06 refunds/disputes  
**Reviewer verdict:** **IMPLEMENTED BY SOURCE REVIEW; EXECUTION GATE BLOCKED**

## Six-role execution record

1. **Orchestrator** classified this as a cross-layer Plan 05/06 correction and sequenced planner → data → domain → UI → reviewer.
2. **Planner** mapped the work onto transport, domain, provider, persistence and UI boundaries and excluded unrelated payment/banking modules.
3. **Data engineer** confirmed that the correction does not require another schema migration; existing payment, hold, authorization, refund and dispute constraints remain authoritative.
4. **Domain engineer** removed duplicated Paystack transaction initialization, published grouped server boundaries and retained provider-authoritative checkout/refund/dispute/payment-method operations.
5. **UI engineer** made the cart drawer the only storefront checkout entry point and composed one account-backed checkout sheet.
6. **Reviewer** inspected source ownership, mutation security, type contracts and focused tests. No validation command or live-provider gate is reported as passed.

## Corrected architecture

### Thin Route Handlers

Route Handlers authenticate, validate transport input, apply origin/idempotency policy and delegate. They do not own Prisma workflows or Paystack lifecycle orchestration.

- `src/app/api/v1/payments/webhooks/paystack/route.ts` delegates to `src/modules/payments/server/webhooks/index.ts`.
- Checkout is exposed only under `src/app/api/v1/payments/checkout/**`.
- Refund routes use `src/modules/payments/server/refunds/index.ts`.
- Dispute routes use `src/modules/payments/server/disputes/index.ts`.
- Payment-method routes use `src/modules/payments/server/payment-methods/index.ts`.
- Admin payment reads use `src/modules/payments/server/admin/index.ts`.

The explicit `/index` imports are intentional because legacy flat implementation files currently share the same basename. This prevents TypeScript resolution from bypassing the grouped boundary.

### One checkout path

Removed:

- `src/app/(storefront)/checkout/page.tsx`
- `src/app/api/v1/checkout/**`
- page-only checkout/recovery components under `src/modules/checkout/ui/**`

Canonical storefront flow:

1. The cart drawer owns bag lines and quantities.
2. `StorefrontCheckoutSheet` loads the authenticated account profile, saved addresses and delivery zones.
3. The default address and matching delivery zone are selected automatically.
4. Missing profile/address data is added inline and persisted through account APIs.
5. Delivery is displayed as an estimate until the delivery subsystem is complete.
6. The browser sends product/variant IDs and quantities only.
7. The server re-reads products, prices, address ownership and delivery fee, then creates the pending order/payment/holds transactionally.
8. Paystack opens using the server-created access code.
9. Popup completion triggers server verification; it is not treated as proof of payment.

### Paystack ownership

- `src/modules/payments/server/paystack/transactions.ts` is the single transaction initialization/verification implementation.
- `src/modules/payments/server/paystack.ts` is a provider facade only; it contains no duplicate fetch or checkout implementation.
- Refund creation/status reconciliation calls the Paystack refund adapter.
- Dispute refresh, update, evidence, accept and decline call the Paystack dispute adapter.
- Payment-method setup, verification, setup refund and authorization deactivation call Paystack adapters.
- Local list/detail APIs intentionally return reconciled local projections instead of making an external provider call on every read.

### Type and error safety

- Checkout request, status and persisted replay snapshots are runtime-validated with Zod.
- Checkout account identity is loaded from the canonical profile and required before order/payment creation.
- JSON snapshots are converted to Prisma JSON through typed recursive conversion rather than `any`.
- Checkout lifecycle tests no longer erase APIs or transaction clients to `any`.
- Multipart evidence parsing uses `unknown` catches and safe `Blob`/`File` narrowing.
- Payment-method provider failures are normalized at the grouped domain boundary; Paystack deactivation failure does not tombstone the local method.
- Financial mutations use trusted-origin checks; refund/dispute commands retain explicit idempotency requirements.

## Focused coverage added or corrected

- Checkout server pricing, ownership, profile completeness, holds, idempotency and settlement replay tests.
- Checkout sheet default-address/delivery-estimate and no-address tests.
- Payment-method grouped provider-failure tests.
- Dispute workspace fixture typing and locale-stable deadline assertion.

## Deliberate Plan 05 path correction

The original Plan 05 document names `/api/v1/checkout/**`. The active architecture correction places those transports under `/api/v1/payments/checkout/**` because checkout creation is the payment-attempt boundary and the user explicitly selected the payment API family. Domain ownership remains in `src/modules/checkout/**`; transport ownership is grouped under payments.

## Reviewer gate still required

The branch has no workflow run or commit-status evidence. Before integration, run from a Node 25 checkout with dependencies and configured test services:

```bash
fnm use 25
pnpm install --frozen-lockfile
pnpm prisma:validate
pnpm prisma:migrate:status
pnpm test \
  src/modules/checkout \
  src/modules/payments/server/paystack \
  src/modules/payments/server/payment-methods.test.ts \
  src/modules/payments/server/payment-method-boundary.test.ts \
  src/modules/payments/server/refunds.test.ts \
  src/modules/payments/server/refund-retry.test.ts \
  src/modules/payments/server/refund-webhooks.test.ts \
  src/modules/payments/server/disputes.test.ts \
  src/modules/payments/server/dispute-order-state.test.ts \
  src/modules/payments/ui \
  src/app/api/v1/payments \
  src/app/api/v1/account/payment-methods \
  src/app/api/v1/admin/payments \
  src/app/api/v1/admin/refunds \
  src/app/api/v1/admin/disputes
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm build
pnpm react-doctor
```

Also required:

- real-DB concurrent checkout/refund claims and webhook replay;
- keyboard-only and responsive checks at 375×812, 768×1024 and 1280×800 in both themes;
- Paystack test-mode initialize/verify/webhook/setup-refund/refund/dispute/evidence operations.

Until those commands and live checks produce evidence, Plans 05 and 06 are **not validation-complete and must not be described as merged-ready**.
