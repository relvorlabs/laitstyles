# Control Room V2 — Phase 3 acceptance

## Status

**Accepted — Phase 3 is complete at 10/10.**

Phase 4 is not started.

## Implemented scope

- Seven-step product editor
- Unique, stocked and variant branches
- React Hook Form and Zod validation
- Step-local errors and final publication summary
- Back/Next value preservation
- Session-only image previews with cover, defect, alt text and ordering controls
- Save draft, Publish now and Schedule actions
- Dirty-close confirmation
- Large desktop dialog and full-viewport mobile editor
- Existing-product editing
- Connected Intake queue and adjacent stage transitions
- Same product identity throughout Intake
- Committed-stock edit guards
- Explicit subscribed catalogue store
- Live Inventory updates after editor commits

## Fixed acceptance blocker

The original client provider relied on provider re-render propagation through the Admin route tree. The editor action returned success, but Inventory did not reliably observe the updated catalogue snapshot in the same browser session.

The fix introduced a dedicated `ControlRoomStore` with `subscribe`, `getSnapshot` and typed actions. `useControlRoom` now consumes that store through `useSyncExternalStore`, so Inventory is notified directly whenever a product or Intake action commits.

A regression test now proves that saving a draft:

- notifies subscribers,
- changes the catalogue snapshot from 13 to 14 products,
- and exposes the new draft immediately.

## Accepted evidence

GitHub Actions run `29035766157` passed on application head `ba05d413d62154f1b41a415e5d31003bdf2c20f1`.

- ESLint: passed
- TypeScript: passed
- Vitest: 30 tests passed across 6 files
- Next.js production build: passed
- Static Playwright viewport matrix: passed
- Real Phase 3 Playwright interactions: passed
- React Doctor: 100/100, no issues found
- Laitstyle parity checks: passed
- Log and screenshot artifacts uploaded

## Browser-proven flow

1. Open Add product on desktop.
2. Change the product mode.
3. Enter identity data.
4. Verify dirty-close confirmation with Escape.
5. Move Back and Continue without losing values.
6. Save a draft.
7. Confirm the draft appears in the live Inventory result set.
8. Open the Intake saved view.
9. Move Ivory Linen Wrap Skirt from Details required to Pricing review.
10. Reopen the same Intake product in the editor.
11. Open Add product on a 375 × 812 viewport.
12. Confirm the mobile editor occupies the full viewport from its first frame.

## Prototype truth

All product and Intake changes remain session-only. Refreshing restores deterministic seed data. No backend persistence, real upload storage or background scheduler is claimed.
