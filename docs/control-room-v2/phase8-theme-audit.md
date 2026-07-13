# Phase 8A — Theme Role and Token Audit

**Status:** Implementation complete; executable and visual acceptance blocked  
**Branch:** `feat/control-room-v2`  
**Scope:** semantic colour roles, paired light/dark surfaces, elevation, shared primitive colour behaviour and source guards

## Confirmed implementation problems

- Dark mode promoted Bone to the generic primary surface, producing bright controls and selected states that competed with content.
- Sidebar selection used the same near-white role in both themes, then nested another accent surface inside it.
- The existing token set exposed palette names and broad shadcn roles, but did not distinguish canvas, standard panel, raised panel, sunken panel, interactive surface, selected state and inverse content.
- Shared controls used component-level `dark:` colour patches for inputs, buttons, badges, tabs, toggles, fields, checkboxes and menus.
- The Phase 7 source guard rejected raw colour literals but did not reject manual dark-mode colour patches or require paired role-token definitions.

## Implemented role model

| Role | Light intent | Dark intent |
| --- | --- | --- |
| Canvas | Warm Bone editorial workspace | Deep Ink workspace |
| Standard panel | Quiet warm panel | Distinct Ink panel |
| Raised panel | Floating sheet, popover and command surface | Lighter Ink elevation |
| Sunken surface | Grouping and low-emphasis regions | Deeper inset region |
| Interactive surface | Inputs, quiet buttons and selectable rows | Visible neutral interaction layer |
| Selected state | Sage-led selected intent | Deep Sage selection with Bone text |
| Primary action | Ink with Bone text | Sage with Ink text |
| Inverse surface | Ink with Bone text | Bone with Ink text only where explicitly inverse |
| Sidebar selected | Sage, not white | Sage, not white |
| Focus | Strong Sage ring | Lighter Sage ring |

## Implementation summary

### Theme source

`src/app/globals.css` now defines paired light/dark roles for:

- canvas and foreground
- standard, raised and sunken panels
- interactive, hover and selected surfaces
- inverse content
- primary and secondary actions
- controls and control hover
- subtle and strong borders
- focus treatment
- success, warning and destructive surfaces
- sidebar selection
- three elevation/shadow levels

The existing shadcn-compatible names now map onto these roles instead of defining a second visual system.

### Shared primitives migrated

The following shared primitives no longer depend on local dark-mode colour patches:

- `src/components/ui/button.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/ui/toggle.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/checkbox.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/input-group.tsx`
- `src/components/ui/field.tsx`
- `src/components/ui/card.tsx`

Inputs, selects and grouped controls now consume `control` roles. Tabs, toggles and selected fields consume selected-surface roles. Destructive controls use explicit destructive surface/foreground pairs. Cards, popovers and menus use the panel/elevation roles.

### Sidebar colour correction

`src/features/control-room/shell/control-room-sidebar.tsx` now consumes sidebar-selected roles. The active route is Sage-led rather than white, and its nested icon no longer creates a second conflicting bright surface. Store status and account markers also consume sidebar roles rather than raw brand palette utilities.

The short-height scrolling structure remains Phase 8B scope.

### Source guard

`scripts/control-room-phase7-theme-audit.mjs` was upgraded in place because the workflow already executes it. It now:

- retains raw colour and named-neutral checks
- rejects manual `dark:` colour utilities in scoped Admin/shared source
- requires the Phase 8 role tokens to have paired light and dark declarations
- reports the result as the Phase 8A theme audit

## Design rules retained

- Palette tokens describe brand ingredients; application components consume role tokens.
- Dark mode is authored as a paired system, not as local component overrides.
- `primary` means the main action, not a generic white surface.
- `accent` means selected/focused intent, not decorative Sage wash.
- `card`, `popover`, `muted`, `secondary` and control surfaces remain visually distinct.
- Functional status colours remain separate from Sage.
- No component may use raw hex, RGB, HSL, OKLCH or named neutral utility colours in scoped Admin/shared source.
- No scoped component may add manual `dark:` colour utilities where role tokens can represent the state.

## Verification state

- [x] Current role conflicts documented
- [x] Manual dark-patch source inventory documented
- [x] Paired role tokens implemented
- [x] Shared high-risk primitives migrated to role tokens
- [x] Primary, selected, interactive and elevated-state mapping corrected
- [x] Sidebar selected-state palette corrected
- [x] Source guard upgraded
- [ ] Static audit executed on the final Phase 8A head
- [ ] TypeScript and production build executed on the final Phase 8A head
- [ ] Browser contrast/elevation review executed
- [ ] Light/dark screenshot review completed

Executable and visual checks remain blocked until an environment actually runs them. No check is represented as passing merely because its source has been encoded.
