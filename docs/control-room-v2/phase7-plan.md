# Laitstyle Control Room V2 — Phase 7 Integration, Brand and Visual QA Plan

## Status

**Phase 7 implementation complete — executable acceptance and merge integration blocked.**

Phase 7 was completed under the user’s explicit override while Phase 4, Phase 5 and Phase 6 remained implemented but unaccepted. The required private-repository workflows still fail before checkout with zero steps and no job logs. GitHub also reports PR #4 as non-mergeable because the feature branch is 31 commits behind `main` and has diverged from it.

The override permitted implementation. It does not mark any blocked phase, check or merge state as passing.

## Final implementation head

`02f442ed017281f27932dff35096b3b4f7358ae3`

Documentation and blocker records may follow this implementation head without changing the implemented application scope.

## Goal

Finish the revamp as one coherent Laitstyle system: integrate the approved woven L/S identity, establish dependable token-based light and dark themes, harden every important surface for contrast and readability, correct the Inventory grid composition, and add a useful product-media viewing workflow before final legacy removal and review readiness.

## Brand direction

The approved direction is the interwoven **L + S** symbol from Concept Option 3.

- **L** communicates label and ownership.
- **S** communicates style and second life.
- The combined woven form communicates one-of-one fashion worn again.
- The core palette is **Ink**, **Bone** and **Sage**.
- The symbol geometry remains recognisable at full lockup, sidebar, favicon and micro-mark sizes.
- The ink ribbon becomes the high-contrast foreground token in dark mode; the sage ribbon retains the brand accent.

Source assets supplied for this phase:

- `laitstyle.svg` — approved standalone symbol geometry
- `lait l and s v3.png` — Concept Option 3 identity board and visual reference

## Locked scope

### In scope

- Add the approved Laitstyle symbol as a repository brand asset.
- Replace temporary and generic marks in public and Control Room chrome.
- Add favicon and metadata references supported by the current Next.js app.
- Define semantic Laitstyle theme tokens for Ink, Bone, Sage, surfaces, borders, focus, success, warning and destructive states.
- Remove inline hardcoded theme colours from Admin, Control Room, shared chrome and shared UI primitives.
- Add a root theme provider with `light`, `dark` and `system` modes.
- Add a shadcn-composed theme toggle to public and Control Room navigation.
- Preserve the selected theme across navigation and refresh.
- Confirm readable text, icons, fields, cards, overlays, charts, dialogs and feedback in both light and dark modes.
- Correct the Inventory desktop grid to show five products at standard desktop width and six at wide desktop width when space allows.
- Redesign Inventory cards for the denser grid without losing operational meaning.
- Make product images directly clickable without opening the product record accidentally.
- Add a responsive image viewer dialog with:
  - next and previous media navigation
  - thumbnails
  - zoom in, zoom out and reset
  - pannable enlarged canvas
  - keyboard arrow and zoom navigation
  - open-original action
  - copy-image-link feedback and recoverable failure guidance
- Reuse the same media viewer from the Inventory grid, mobile cards and product Media tab.
- Preserve product-detail and selection actions as separate, labelled controls.
- Confirm the superseded catch-all Admin route remains removed.
- Resolve remaining theme-critical fixed palettes and duplicate presentation boundaries.
- Add static token and hardcoded-colour checks for the scoped source tree.
- Add light and dark browser screenshots and interaction checks at 375 × 812, 768 × 1024 and 1280 × 800.
- Add Inventory density, media-dialog, zoom, keyboard and overflow checks.
- Add a full light and dark route matrix for every primary Admin destination.

### Out of scope

- Recreating every lockup shown on the concept board as editable design-software layers.
- Production image upload, crop, replacement or deletion.
- Persisting a selected cover image to a backend.
- Editing image colour, exposure or metadata.
- A new design-system package or Storybook installation.
- Backend, payment, courier, messaging or authentication integration.
- A hidden redesign of the legacy public catalogue body beyond the shared themed chrome and brand integration.

## Product and implementation rules

- Theme values are expressed through semantic tokens; scoped feature components do not introduce raw hex, RGB, OKLCH or named neutral colour literals.
- Brand asset geometry may contain SVG path data, but rendered colour comes from current colour or brand theme variables inside the app.
- Light and dark mode are both first-class states. Dark mode is not a simple colour inversion.
- The theme control is keyboard accessible, has an explicit accessible name and exposes Light, Dark and System choices.
- Theme-dependent UI is initialized before hydration to avoid an unreadable flash or hydration mismatch.
- Inventory density adapts to available width rather than forcing six unusably narrow cards.
- At 1280px viewport width the desktop Inventory grid target is five columns; at wide desktop it expands to six.
- Mobile keeps task-focused cards rather than shrinking the desktop grid.
- Clicking an image opens media viewing. Clicking the product name or explicit open control opens product detail.
- Media actions remain non-destructive and truthful about prototype limits.
- Media state, stage rendering and action presentation remain split into focused components.

## Batches

### Batch 7A — brand assets and theme tokens — implemented

- [x] Approved standalone symbol asset added.
- [x] Theme-aware woven symbol component preserves all four original ribbon paths.
- [x] Generic public and Control Room marks replaced.
- [x] Favicon and metadata references added.
- [x] Global semantic tokens rebuilt around Ink, Bone and Sage.
- [x] Store identity defaults and preview use the approved symbol.

### Batch 7B — theme provider, toggle and contrast hardening — implemented

- [x] Root Light, Dark and System provider.
- [x] Pre-hydration boot script separated from the client provider.
- [x] Persistent theme preference.
- [x] Shadcn-composed theme toggle in public and Control Room chrome.
- [x] Mobile Control Room theme access through the navigation drawer.
- [x] Dialog, sheet and confirmation overlays use one semantic overlay token.
- [x] Control Room shell, Overview, Inventory, order and hold status surfaces use semantic tokens.
- [x] Source-level non-token colour audit encoded.

### Batch 7C — Inventory density and media experience — implemented

- [x] Five-column Inventory grid at 1280px.
- [x] Six-column Inventory grid at wide desktop.
- [x] Compact operational product cards.
- [x] Separate image and product-record actions.
- [x] Shared media viewer used by desktop grid, mobile list and Product Media tab.
- [x] Thumbnail, previous, next and keyboard navigation.
- [x] Zoom, reset and pannable enlarged canvas.
- [x] Open-original and copy-link actions.
- [x] Recoverable clipboard failure guidance.
- [x] Full-viewport mobile media target.

### Batch 7D — integration hardening and legacy removal — implemented

- [x] Primary Admin route structure re-confirmed.
- [x] Superseded catch-all Admin route confirmed removed.
- [x] Approved brand propagated into shared chrome and Store Settings.
- [x] Media viewer split into state, stage and sidebar responsibilities.
- [x] Existing light-only status, feedback, empty and Overview palettes converted to semantic tokens.
- [x] Theme audit expanded across Admin, shared UI primitives and Control Room source.
- [x] Architecture decision record updated.

### Batch 7E — consolidated acceptance — coverage encoded, execution blocked

- [x] Static token and hardcoded-colour audit script.
- [x] Light and dark Inventory screenshots.
- [x] Five and six-column computed-style assertions.
- [x] Image-click versus product-record regression.
- [x] Zoom, next-image, reset, copy-link and open-original checks.
- [x] Mobile full-viewport media and horizontal-overflow checks.
- [x] Theme toggle and persistence checks.
- [x] Public shared-chrome brand and dark-theme smoke check.
- [x] Light and dark route matrix for Overview, Inventory, Orders, Holds, Returns, Customers and Settings.
- [x] Heading and primary-surface contrast assertions encoded.
- [x] Required responsive screenshots wired into the workflow.
- [ ] ESLint executed on the final implementation head.
- [ ] TypeScript executed on the final implementation head.
- [ ] Full Vitest suite executed on the final implementation head.
- [ ] Static theme audit executed on the final implementation head.
- [ ] Production build executed on the final implementation head.
- [ ] React Doctor executed on the final implementation head.
- [ ] Browser interactions executed on the final implementation head.
- [ ] Screenshot review completed.
- [ ] Upstream `main` integrated without losing either side’s changes.
- [ ] PR returns to a mergeable state.
- [ ] Phase 7 marked accepted.

## Acceptance criteria status

- [x] The approved woven L/S mark appears consistently in public and Control Room chrome.
- [x] The original symbol geometry is preserved.
- [x] Light, Dark and System controls are implemented and designed to persist.
- [x] No scoped Phase 7 source file intentionally relies on inline hardcoded theme colours.
- [x] Key surfaces use semantic foreground, background, status and overlay tokens.
- [x] Inventory uses five cards at the 1280px target and six at wide desktop in the encoded browser contract.
- [x] Inventory image and product-record actions are separate.
- [x] Media navigation, zoom, reset, open-original and copy-link behavior are implemented.
- [x] Mobile Inventory remains task-focused.
- [x] The old catch-all Admin implementation is absent.
- [ ] The complete executable phase gate passes.
- [ ] The feature branch is reconciled with the 31 upstream commits from `main`.

## Gate decision

- Phase 7 implementation complete: **Yes**
- Phase 7 accepted: **No**
- Pull request mergeable: **No**
- Pull request ready for review: **No**

Phase 7 cannot be accepted until an executable environment runs the complete gate and the feature branch is reconciled with upstream `main` without silently discarding either side’s work.