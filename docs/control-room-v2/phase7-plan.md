# Laitstyle Control Room V2 — Phase 7 Integration, Brand and Visual QA Plan

## Status

**Phase 7 started by explicit user override.**

Phase 4, Phase 5 and Phase 6 remain implemented but unaccepted because the required private-repository workflows still fail before checkout with zero steps and no job logs. The override permits Phase 7 implementation; it does not mark any earlier phase or blocked check as passing.

## Goal

Finish the revamp as one coherent Laitstyle system: integrate the approved woven L/S identity, establish dependable token-based light and dark themes, harden every important surface for contrast and readability, correct the Inventory grid composition, and add a useful product-media viewing workflow before final legacy removal and review readiness.

## Brand direction

The approved direction is the interwoven **L + S** symbol from Concept Option 3.

- **L** communicates label and ownership.
- **S** communicates style and second life.
- The combined woven form communicates one-of-one fashion worn again.
- The core palette is **Ink**, **Bone** and **Sage**.
- The symbol geometry must remain recognisable at full lockup, sidebar, favicon and micro-mark sizes.
- The ink ribbon becomes the high-contrast foreground token in dark mode; the sage ribbon retains the brand accent.

Source assets supplied for this phase:

- `laitstyle.svg` — approved standalone symbol geometry
- `lait l and s v3.png` — Concept Option 3 identity board and visual reference

## Locked scope

### In scope

- Add the approved Laitstyle symbol as a repository brand asset.
- Replace temporary/generic marks in public and Control Room chrome.
- Add favicon and metadata references where supported by the current Next.js app.
- Define semantic Laitstyle theme tokens for Ink, Bone, Sage, surfaces, borders, focus, success, warning and destructive states.
- Remove inline hardcoded theme colours from changed and Control Room-critical components.
- Add a root theme provider with `light`, `dark` and `system` modes.
- Add a shadcn-composed theme toggle to public and Control Room navigation.
- Preserve the selected theme across navigation and refresh.
- Confirm readable text, icons, fields, cards, overlays, charts, dialogs and feedback in both light and dark modes.
- Correct the Inventory desktop grid to show five products at standard desktop width and six at wide desktop width when space allows.
- Redesign Inventory cards for the denser grid without losing operational meaning.
- Make product images directly clickable without opening the product record accidentally.
- Add a responsive image viewer dialog with:
  - next/previous media navigation
  - thumbnails
  - zoom in, zoom out and reset
  - keyboard arrow navigation
  - open-original action
  - copy-image-link feedback
- Reuse the same media viewer from the Inventory grid and product Media tab.
- Preserve product-detail and selection actions as separate, labelled controls.
- Remove the superseded catch-all Admin route after route parity is re-confirmed.
- Resolve remaining dead files, duplicate boundaries and unused generic branding.
- Add static token/hardcoded-colour checks for theme-critical source files.
- Add light/dark browser screenshots and interaction checks at 375 × 812, 768 × 1024 and 1280 × 800.
- Add Inventory density, media-dialog, zoom, keyboard and overflow checks.

### Out of scope

- Recreating every lockup shown on the concept board as editable design software layers.
- Production image upload, crop, replacement or deletion.
- Persisting a selected cover image to a backend.
- Editing image colour, exposure or metadata.
- A new design-system package or Storybook installation.
- Backend, payment, courier, messaging or authentication integration.
- Rebranding product copy beyond the approved Laitstyle identity and necessary contrast fixes.

## Product and implementation rules

- Theme values must be expressed through semantic tokens; feature components must not introduce raw hex, RGB or OKLCH colour literals.
- Brand asset geometry may contain SVG path data, but rendered colour must come from current colour or brand theme variables where the asset appears inside the app.
- Light and dark mode are both first-class states. Dark mode is not a simple colour inversion.
- The theme control must be keyboard accessible, have an explicit accessible name and expose Light, Dark and System choices.
- The UI must not render theme-dependent content before the client knows the active mode in a way that causes hydration mismatch or unreadable flashes.
- Inventory density must adapt to available width rather than forcing six unusably narrow cards.
- At 1280px viewport width the desktop Inventory grid target is five columns; at wide desktop it may expand to six.
- Mobile keeps task-focused cards rather than shrinking the desktop grid.
- Clicking an image opens media viewing. Clicking the product name or explicit open control opens product detail.
- Media actions must remain non-destructive and truthful about prototype limits.
- No media viewer component may become a product-editing monolith.

## Batches

### Batch 7A — brand assets and theme tokens

- Add the approved symbol asset.
- Add a theme-aware Laitstyle symbol/wordmark component.
- Replace generic public and Control Room marks.
- Add favicon/metadata references.
- Rebuild global light/dark semantic tokens around Ink, Bone and Sage.
- Replace global hardcoded placeholder, selection and shadow colours with tokens.

### Batch 7B — theme provider, toggle and contrast hardening

- Add root light/dark/system theme provider.
- Add shadcn-composed theme toggle to public Header and Control Room top bar.
- Persist and restore selected mode.
- Remove raw theme colours from Control Room shell, sidebar and changed feedback surfaces.
- Confirm form, overlay, navigation and text visibility in both modes.
- Add static hardcoded-theme audit coverage.

### Batch 7C — Inventory density and media experience

- Move the desktop grid to five columns at 1280px and six on wide desktop.
- Recompose product cards for compact density.
- Keep stock, state, price and selection readable.
- Add the shared product-media viewer dialog.
- Add zoom, navigation, thumbnails, open-original and copy-link actions.
- Connect grid images and Product Media tab images to the viewer.
- Preserve explicit product-detail actions.

### Batch 7D — integration hardening and legacy removal

- Re-confirm every Control Room route and deep link.
- Remove `src/app/admin/[[...section]]/page.tsx` only after route parity is proven in the branch.
- Remove superseded generic brand fragments and dead components.
- Review feature sizes and split unrelated responsibilities.
- Re-run accessibility, keyboard, focus and responsive audits in changed scope.

### Batch 7E — consolidated acceptance

- ESLint.
- TypeScript.
- Full Vitest suite.
- Production build.
- React Doctor changed-scope review.
- Static hardcoded-theme scan.
- Light and dark browser matrix.
- Inventory five/six-column assertions.
- Media viewer interaction and keyboard checks.
- Contrast/readability spot checks for every required route.
- Screenshot review.
- Tracker, decisions and PR description update.

## Acceptance criteria

- The approved woven L/S mark appears consistently in public and Control Room chrome.
- The original symbol geometry is preserved.
- Light, Dark and System controls work and persist.
- No theme-critical component added or changed in Phase 7 uses inline hardcoded colours.
- Key text, icons, fields, cards, overlays and feedback remain visible in both modes.
- Focus rings and destructive/success states remain distinguishable in both modes.
- Inventory displays five cards per row at the 1280px desktop target and six when a wide viewport provides enough usable width.
- Inventory cards remain readable and do not overflow.
- Clicking a product image opens the media dialog rather than the product-detail sheet.
- Media navigation, zoom, reset, open-original and copy-link actions work.
- Product detail remains available through an explicit labelled action.
- Mobile Inventory remains task-focused and has no horizontal overflow.
- No old catch-all Admin implementation remains after parity is re-confirmed.
- Phase 4, Phase 5 and Phase 6 remain truthfully unaccepted until executable checks pass.
- The pull request remains draft until the complete Phase 7 gate passes.

## Gate decision

Phase 7 may proceed under the explicit override. It is complete only when implementation is finished and all executable checks pass. When the repository execution environment continues to return jobs with no steps, implementation may be recorded as complete but Phase 7 must remain unaccepted and the pull request must remain draft.