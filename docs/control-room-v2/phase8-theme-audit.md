# Phase 8A — Theme Role and Token Audit

**Status:** Implementation in progress  
**Branch:** `feat/control-room-v2`  
**Scope:** semantic colour roles, paired light/dark surfaces, elevation, shared primitive colour behaviour and source guards

## Confirmed implementation problems

- Dark mode promotes Bone to the generic primary surface, producing bright controls and selected states that compete with content.
- Sidebar selection uses the same near-white role in both themes, then nests another accent surface inside it.
- The existing token set exposes palette names and broad shadcn roles, but does not distinguish canvas, standard panel, raised panel, sunken panel, interactive surface, selected state and inverse content.
- Shared controls use component-level `dark:` colour patches for inputs, buttons, badges, tabs, toggles, fields, checkboxes and menus.
- The Phase 7 source guard rejects raw colour literals but does not reject manual dark-mode colour patches or require role-token definitions.

## Locked role model

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

## Source inventory

### Theme source

- `src/app/globals.css`

### Shared primitives with manual mode-specific colour patches

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

### High-risk consumers

- Control Room sidebar selected navigation
- top-bar and command/search controls
- cards, sheets and popovers
- Inventory grid/table controls
- destructive, warning and success feedback

## Implementation rules

- Palette tokens describe brand ingredients; application components consume role tokens.
- Dark mode is authored as a paired system, not as local component overrides.
- `primary` means the main action, not a generic white surface.
- `accent` means selected/focused intent, not decorative Sage wash.
- `card`, `popover`, `muted`, `secondary` and control surfaces must remain visually distinct in both themes.
- Functional status colours remain separate from Sage.
- No component may use raw hex, RGB, HSL, OKLCH or named neutral utility colours in scoped Admin/shared source.
- No scoped component may add manual `dark:` colour utilities where role tokens can represent the state.

## Verification state

- [x] Current role conflicts documented
- [x] Manual dark-patch source inventory documented
- [ ] Role tokens implemented
- [ ] Shared primitives migrated to role tokens
- [ ] Source guard upgraded
- [ ] Static audit executed
- [ ] Browser contrast/elevation review executed

Executable and visual checks remain blocked until an environment actually runs them. No check is represented as passing merely because its source has been encoded.
