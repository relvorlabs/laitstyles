# Cart, Checkout, Paystack, and Overlay Recovery Design

**Date:** 2026-07-31  
**PR:** #64  
**Status:** Approved by the user request; implementation and executable acceptance remain open.

## Problem

The current storefront combines cart presentation, checkout orchestration, payment recovery, and an external Paystack popup inside one modal side sheet. Cart lines are enriched from the storefront catalogue before they can render. When the catalogue temporarily fails, valid local or server cart intent is projected against an empty product list and committed as an empty hydrated cart. Holds are stored independently, so the reservation alert can remain visible while the cart sheet says the bag is empty.

The cart redesign also replaced familiar commerce language with decorative copy and oversized nested cards. The primary action says “Arrange delivery & payment” rather than clearly stating the next action and amount.

Admin side sheets and their child dialogs do not share an overlay layer contract. Sheets render at `z-[100]`, while AlertDialog renders at `z-50`. Destructive confirmation dialogs therefore appear behind the sheet and its backdrop; interacting with the backdrop closes the sheet and unmounts the child dialog.

Paystack is launched while the internal Base UI modal sheet remains open. The Paystack loader also caches one mutable popup instance and permanently caches a rejected import promise. These choices can block the external popup, poison all later attempts after one load failure, and discard useful failure information.

## Chosen approach

Use separate, explicit surfaces with one owner each:

1. **Canonical cart intent** is preserved independently of catalogue projection.
2. **Cart Sheet** presents and edits the bag only.
3. **Checkout Dialog** owns contact, address, coupon, order creation, recovery, and payment state.
4. **External payment handoff** closes the internal modal before Paystack opens, then restores checkout on cancellation or safe failure.
5. **Overlay primitives** use one semantic layer scale so nested dialogs always render above parent sheets.

This is preferred over a patch-only approach because the current bugs come from ownership coupling, not isolated styling mistakes. A dedicated checkout route was rejected for this PR because it would expand routing and account-navigation scope without being necessary to restore a reliable flow.

## User experience

### Cart Sheet

The cart remains a right-side Sheet, full width on small screens and approximately 480–520px on desktop.

Header:

- Title: `Your cart`
- Item count beside the title
- No “private edit”, “atelier”, numbered editorial sections, or decorative nationwide badge

Each line contains:

- stable product image area with a real local fallback
- product name
- selected size/colour/variant
- line price
- accessible quantity controls where applicable
- `Save for later` and `Remove`

The cart does not include a recommendations gallery. Recommendations remain on product and catalogue surfaces where discovery belongs.

Sticky footer:

- `Subtotal`
- `Delivery calculated at checkout`
- primary action: `Checkout · ₦<subtotal>`
- secondary action: `Continue shopping`

When product projection is temporarily unavailable but cart intent exists, the cart must not render an empty state. It shows a bounded recovery state such as `We could not load your cart details. Retry` while preserving the intent.

### Checkout Dialog

Checkout is a sibling Dialog, not an alternate view inside the cart Sheet.

Opening checkout closes the cart Sheet first and then opens the Dialog. Payment recovery alerts open the Checkout Dialog directly even when current cart projection is unavailable, because an active persisted order is sufficient to resume payment.

The checkout hierarchy is deliberately plain:

1. Contact
2. Delivery address
3. Promo code
4. Order summary

The fixed primary action is:

- `Pay ₦<total>` for a new payment
- `Resume payment · ₦<total>` for a resumable checkout
- a clear loading label for creating, opening, or verifying payment

A single visible blocker explains why payment is unavailable. Internal provider or database details never render.

### Payment handoff

The customer click remains the start of the payment operation. The application may create or resume the server checkout while the Dialog is open. Before calling Paystack:

1. persist the active checkout in client query/state
2. close the Checkout Dialog
3. wait for the internal modal exit to complete
4. construct a fresh Paystack instance and call `resumeTransaction(accessCode)`

On cancellation or safe popup failure, reopen the Checkout Dialog with the same active checkout. On provider success, verify on the server before clearing cart state or navigating to confirmation.

The Paystack module cache stores only the imported constructor/module. It creates a new popup instance for every launch and resets the import promise after a rejected import so retries are possible.

## Cart data contract

Cart intent and rendered cart lines are distinct concepts.

A projection operation returns:

```ts
export type CartProjectionResult = {
  lines: readonly CartLine[];
  unresolved: readonly StorefrontCartIntent[];
};
```

Rules:

- `availability === "temporarily-unavailable"` is never valid projection input.
- A signed-in server snapshot is not marked confirmed while any intent is unresolved.
- Existing browser or in-memory cart lines remain intact during a temporary catalogue failure.
- When a ready catalogue arrives, unresolved intent is reprojected automatically.
- Only a ready catalogue that definitively cannot resolve an item may drop that item, and that decision must be test-covered.
- Persisted holds do not substitute for cart lines and do not determine whether the cart is empty.

## Overlay contract

Overlay stacking is defined centrally in UI primitives; feature files must not add arbitrary z-index values.

Semantic order:

| Layer | Backdrop | Content |
| --- | ---: | ---: |
| Sheet / Drawer | 60 | 70 |
| Dialog / AlertDialog | 80 | 90 |
| Popover / Select / Dropdown / Command | — | 100 |
| Toast / external status | — | 110 |

A child Dialog or AlertDialog opened from a Sheet must remain visible, focused, and interactive. Closing the child must not close the parent. Closing the parent deliberately may close its descendants.

All modal primitives keep accessible titles, descriptions where needed, focus return, Escape behaviour, and 44px minimum primary touch targets.

## Component boundaries

- `cart-projection.ts`: pure cart-intent projection and unresolved-intent reporting.
- `storefront-state-hydrator.tsx`: identity transitions, persistence, retry, and confirmation only.
- `storefront-cart-sheet.tsx`: cart presentation and cart actions only.
- `storefront-checkout-dialog.tsx`: modal ownership and payment handoff boundary.
- `checkout-panel.tsx` or the existing checkout component: contact/address/coupon/summary content without owning the parent overlay.
- `paystack-popup.ts`: constructor loading and fresh-instance external popup adapter.
- UI primitives: semantic overlay layers.

## Error handling

- Catalogue unavailable: preserve cart intent, show retry state, do not claim empty.
- Cart API unavailable: retain browser intent and show non-destructive sync status.
- Checkout context unavailable: Dialog shows retry and remains closable.
- Paystack module load failure: reset loader cache and allow retry.
- Paystack cancellation: retain order and reopen checkout.
- Verification pending: show recoverable active checkout and bottom reminder.
- Verification success: clear cart only after server-confirmed settlement.

## Testing

Required automated coverage:

- unavailable catalogue cannot convert non-empty intent into confirmed empty cart
- ready catalogue reprojects previously unresolved intent
- cart recovery state differs from empty-cart state
- cart CTA opens checkout after closing cart Sheet
- recovery alert opens checkout without requiring current cart views
- AlertDialog renders above Sheet and dismissing it does not close the Sheet
- Paystack loader retries after rejected import
- every Paystack launch uses a fresh instance
- checkout closes its internal Dialog before external popup launch
- cancellation reopens checkout with the active checkout preserved
- button copy includes `Checkout` and `Pay` plus the formatted amount

Required browser coverage at 375×812, 768×1024, and 1280×800:

- guest and signed-in cart hydration
- temporary catalogue failure and recovery
- cart quantity/save/remove
- default and alternate address
- promo valid/invalid/expired
- Paystack open, cancel, retry, pending, verified success
- nested admin destructive confirmation above order/customer/inventory/hold/return sheets
- keyboard focus, Escape, focus return, touch targets, and no background interaction through modal layers

## Explicit exclusions

- No new UI library.
- No checkout route migration.
- No simulated Paystack success.
- No redesign of product, catalogue, account, or admin pages outside the overlay primitives they consume.
- No clearing of cart intent merely because catalogue enrichment is temporarily unavailable.
