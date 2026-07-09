# Control Room V2 — Phase 4B Orders acceptance

## Status

**Accepted.** Batch 4B is complete. Batch 4C Holds is active.

## Implemented scope

- `/admin/orders`
- Saved status views
- Search, channel and payment filters
- Newest/oldest and total sorting
- Connected summary metrics
- Desktop operational table
- Responsive order cards
- Deep-linkable order detail sheet
- Customer, product-line, payment, delivery, notes and timeline context
- Only domain-permitted status actions
- Cancellation and refund confirmation
- Recoverable transition errors and success feedback
- Loading, empty and route error states
- Desktop and mobile Sales navigation
- Full-width mobile detail with safe-area handling

## Accepted evidence

GitHub Actions run `29046530809` passed on application head `2dd8442898703354d34e292361e0f5f70064ebdc`.

- ESLint: passed
- TypeScript: passed
- Vitest: 52 tests passed across 9 files
- Next.js production build: passed
- Required browser viewport and interaction checks: passed
- React Doctor: 100/100, no issues found
- Parity run `29046530866`: passed
- Screenshot and log artifacts uploaded

## Browser-proven flow

1. Orders is visible in desktop Sales navigation.
2. Orders is visible in the mobile navigation sheet.
3. Search for `sage tomi` resolves to `LS-20480`.
4. Order detail preserves the selected identity.
5. `LS-20480` moves from Payment confirmed to Preparing.
6. Cancelling `LS-20481` requires confirmation.
7. Dismissing confirmation leaves the order unchanged.
8. Confirming cancellation updates the order and restores pre-dispatch stock through the connected action.
9. Mobile order detail occupies the full 375 × 812 viewport.
10. The complete Phase 3 editor and Intake interaction suite still passes.

## Prototype truth

- Order changes remain session-only.
- Payment and courier sections are explicit internal boundaries.
- No payment gateway, bank, courier, messaging service or backend persistence is claimed.
