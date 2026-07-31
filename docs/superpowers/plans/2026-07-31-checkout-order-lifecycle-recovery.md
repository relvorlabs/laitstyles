# Checkout and Order Lifecycle Recovery Implementation Plan

> Required workflow: `using-superpowers` -> systematic diagnosis -> planner -> domain/UI owners -> reviewer.

**Goal:** Make order cancellation authoritative across recovery, idempotency, Paystack, stock, alerts, and checkout UI while preserving real server verification.

**Owners:**

- Orchestrator: scope and handoffs
- Planner: this plan and exclusions
- Domain engineer: lifecycle policy, checkout reads, idempotency, cancellation and settlement safety
- UI engineer: Base UI semantics, checkout remount/recovery state, responsive alert and Paystack handoff
- Data engineer: review only; no migration expected
- Reviewer: source review and executable gates

## Task 1 — Centralize checkout lifecycle policy

**Files**

- Create `src/modules/checkout/lifecycle.ts`
- Create `src/modules/checkout/lifecycle.test.ts`
- Modify `src/modules/checkout/schema.ts`

**Steps**

- [ ] Add the derived public `cancelled` checkout status.
- [ ] Define aggregate order/payment inputs and pure helpers for derived status and resumability.
- [ ] Cover cancelled, paid, review-required, initialized, pending, failed, abandoned and missing-access-code cases.

## Task 2 — Make aggregate order state authoritative in reads

**Files**

- Modify `src/modules/checkout/server/get-checkout-context.ts`
- Modify `src/modules/checkout/server/get-checkout-context.test.ts`
- Modify `src/modules/checkout/server/get-checkout.ts`

**Steps**

- [ ] Query only pending/processing, unfulfilled storefront orders.
- [ ] Select only initialized/pending attempts with a non-null access code for recovery.
- [ ] Derive checkout detail status from aggregate order state before payment-attempt state.
- [ ] Assert the Prisma where-clause excludes cancelled orders and closed attempts.

## Task 3 — Stop replaying closed checkout sessions

**Files**

- Modify `src/modules/checkout/server/create-checkout.ts`
- Extend existing checkout tests

**Steps**

- [ ] Revalidate an idempotency snapshot against its order and payment before replay.
- [ ] Return a typed closed-session error for cancelled/paid/review/fulfilled sessions.
- [ ] Preserve replay for the same still-active initialized/pending checkout.

## Task 4 — Reconcile client checkout identity

**Files**

- Modify `src/modules/checkout/client/hooks.ts`
- Modify `src/modules/checkout/ui/storefront/storefront-checkout-dialog.tsx`
- Modify focused UI tests

**Steps**

- [ ] Poll checkout context only while an active checkout exists.
- [ ] Key the checkout surface by cart fingerprint and active checkout identity so clearing/replacing a cart creates a fresh browser checkout session.
- [ ] Remount when cancellation removes the active checkout, clearing stale local order and idempotency state.
- [ ] Keep one active recovery target while all historical orders remain in account history.

## Task 5 — Fix Base UI native semantics and recovery presentation

**Files**

- Modify `src/components/ui/button.tsx`
- Modify `src/modules/storefront-shell/ui/storefront-feedback.tsx`
- Modify focused component tests

**Steps**

- [ ] Infer `nativeButton=false` when the Base UI Button render target is not a native button, while preserving explicit caller values.
- [ ] Make the recovery alert mobile-safe, semantic, and specific to one resumable order.
- [ ] Use `Continue payment` copy; never render the recovery control for cancelled or closed attempts.

## Task 6 — Preserve user activation for Paystack

**Files**

- Modify `src/modules/payments/client/paystack-popup.ts`
- Modify `src/modules/payments/client/paystack-popup.test.ts`
- Keep `src/modules/checkout/ui/storefront/storefront-checkout-dialog.tsx` aligned with handoff events

**Steps**

- [ ] Call `resumeTransaction` immediately in the button action.
- [ ] Close the internal dialog from Paystack `onLoad`, not before the SDK call and not after a fixed timeout.
- [ ] Reopen checkout after provider cancel/error only when Paystack actually loaded.
- [ ] Test call ordering, fresh SDK instance, success, cancellation, error and synchronous SDK failure.

## Task 7 — Prevent cancelled-order resurrection on settlement

**Files**

- Modify `src/modules/checkout/server/settle-payment.ts`
- Modify settlement tests
- Review `src/modules/orders/server/payment-settlement.ts`

**Steps**

- [ ] Detect cancelled aggregate state before stock/payment success transitions.
- [ ] Record a late success as review-required and preserve cancelled fulfilment.
- [ ] Do not commit stock, convert holds, consume cart lines, or mark the order paid.
- [ ] Add a defensive paid-order update condition in the shared success recorder if required.

## Task 8 — Align admin and customer cancellation cleanup

**Files**

- Modify `src/modules/orders/server/transition-order.ts`
- Modify `src/modules/orders/server/account-orders.ts`
- Add/extend cancellation tests

**Steps**

- [ ] Release inventory exactly once through existing operational stock mutations.
- [ ] Close active holds attached to the order.
- [ ] Clear Paystack access codes on non-success attempts while retaining audit rows.
- [ ] Record cancellation metadata consistently for admin and customer paths.

## Task 9 — Reviewer gates

Use Node 25.x and the configured database.

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm check:architecture
pnpm check:storefront-production
pnpm audit:buttons
pnpm biome
pnpm typecheck
pnpm exec vitest run \
  src/modules/checkout/lifecycle.test.ts \
  src/modules/checkout/server/get-checkout-context.test.ts \
  src/modules/checkout/server/checkout.test.ts \
  src/modules/payments/client/paystack-popup.test.ts \
  src/modules/checkout/ui/storefront/checkout-sheet.test.tsx \
  src/modules/storefront-shell/ui/storefront-cart-sheet.test.tsx \
  src/modules/orders/server/account-orders.test.ts
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:browser
```

Browser acceptance:

- admin cancellation removes recovery UI
- customer cancellation removes recovery UI
- cancelled checkout cannot reopen Paystack
- same product after cart clear creates a new order/reference
- Paystack opens, cancels, retries, verifies success and handles pending
- 375x812, 768x1024 and 1280x800 checkout/cart checks
- keyboard focus, Escape and screen-reader titles

## Completion rule

Keep PR #64 draft until every executable gate is recorded. Source inspection or connector writes are not substitutes for local runtime, database, browser, or real Paystack evidence.