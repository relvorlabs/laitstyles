# Checkout and Order Lifecycle Recovery Design

Status: approved corrective specification for draft PR #64.

## Problem

The storefront currently treats a recoverable Paystack attempt as the authority for whether an order can be resumed. Order cancellation updates the aggregate order state, but the recovery query, checkout detail response, cached client checkout, and Paystack handoff continue to use the old payment attempt. This produces four user-visible failures:

1. A cancelled order remains in the bottom `Resume checkout` alert.
2. Reopening checkout still shows the cancelled order number and old payment result.
3. Clearing the cart and adding the same product can replay the old order through a reused idempotency key.
4. Paystack is called only after the internal dialog closes and a fixed delay elapses, so the SDK is no longer launched directly from the user action.

The same split authority creates a serious late-settlement edge case: a successful Paystack event can arrive after cancellation and currently move the cancelled order back to paid.

## Product contract

### One active checkout, many orders

A customer may have any number of historical orders. Only one order is exposed as the active resumable checkout at a time. The active checkout is identified by both `checkoutId` and `orderNumber`; historical, cancelled, paid, refunded, fulfilled, or review-only orders never enter storefront recovery.

### Source of truth

The aggregate order state is authoritative for lifecycle eligibility. A payment attempt is resumable only inside an eligible order.

An order is resumable when all of the following are true:

- `orders.source = storefront-checkout`
- `orders.payment_status` is `pending` or `processing`
- `orders.fulfilment_status = unfulfilled`
- the selected payment attempt has an access code
- the selected payment attempt status is `initialized` or `pending`

`initializing` is not resumable because it has no usable provider handoff yet. `failed`, `abandoned`, and `reversed` are closed attempts, not permission to reuse an old access code. `review_required` is an operational state and must direct the customer to support/order details rather than reopen Paystack. `cancelled` is final for the checkout session.

### Derived storefront status

Public checkout responses derive status from the aggregate order before using the latest payment attempt:

- cancelled order -> `cancelled`
- paid order -> `success`
- review-required order -> `review_required`
- otherwise -> latest payment-attempt status

This derived status is a client contract; it does not require adding `cancelled` to the provider payment-attempt enum.

### Cancellation

Admin and customer cancellation must produce the same business outcome:

- aggregate payment and fulfilment states become cancelled
- reserved or committed stock is released exactly once
- active holds are closed
- the application no longer exposes the Paystack access code
- recovery queries stop returning the order
- cached checkout state is invalidated/refetched
- a new cart checkout receives a new idempotency key and a new order number

The original payment and timeline records remain as audit history.

### Late provider success

A provider success received after order cancellation must never reactivate fulfilment or recommit stock. It is recorded as `review_required`, leaves fulfilment cancelled, and raises payment-review attention for an operator to refund or reconcile.

### Idempotency

An idempotency key represents one checkout session, not one product combination forever.

- The browser generates a new key when the cart session changes or the active checkout identity changes.
- Server replay revalidates the stored order and payment state before returning a snapshot.
- A closed/cancelled session is never replayed, even when the cart payload hash is identical.

### Paystack handoff

Paystack InlineJS is invoked synchronously from the payment button action with `resumeTransaction(accessCode, callbacks)`. The internal checkout dialog closes only after Paystack reports `onLoad`, not before the SDK call and not after an arbitrary delay. Cancellation/error reopens checkout; success proceeds to server verification.

### Cart and checkout UX

The cart remains a familiar side sheet and checkout remains a focused dialog. Required UX rules:

- native links retain link semantics; Base UI buttons rendering links declare non-native-button behaviour
- one primary action per surface
- minimum 44px interactive targets
- semantic component tokens and existing shadcn/Base UI primitives
- mobile layout must not depend on a single-line floating pill
- recovery copy says `Continue payment` only for a genuinely resumable order
- cancelled/failed/review states use distinct, accurate copy
- order number is shown as the identity of the specific recovery target, not as a global checkout label

## State transitions

```text
cart
  -> checkout initializing
  -> initialized (resumable)
  -> pending (resumable / polling)
  -> success (paid, terminal)

initialized|pending
  -> customer closes Paystack (same initialized/pending attempt remains resumable)
  -> failed|abandoned|reversed (attempt terminal; no old-access-code resume)
  -> review_required (operator review; no Paystack resume)
  -> cancelled (order terminal; new checkout session required)

cancelled + late provider success
  -> review_required payment incident
  -> fulfilment remains cancelled
  -> no stock commit and no cart consumption
```

## Acceptance criteria

1. Cancelling an unpaid order in admin removes its storefront recovery alert after query refresh.
2. Customer cancellation produces the same recovery result.
3. A cancelled order detail returns `cancelled`, never the stale payment-attempt status.
4. Clearing/replacing the cart and checking out creates a new order number and payment reference.
5. Identical cart contents cannot replay a cancelled idempotency snapshot.
6. Paystack `resumeTransaction` is called before any asynchronous delay; checkout closes on SDK `onLoad`.
7. A late successful provider event for a cancelled order becomes review-required without changing fulfilment or stock.
8. Base UI emits no `nativeButton` warning for link-rendered checkout actions.
9. Biome, typecheck, focused Vitest, build, and browser acceptance are recorded before merge.

## Explicit exclusions

- No simulated payment success.
- No conversion of provider payment history into mutable order history.
- No arbitrary feature-level z-index patches.
- No migration unless implementation proves the current aggregate and attempt enums cannot express the contract.
- No claim that browser or real Paystack verification passed without executable evidence.