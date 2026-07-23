# Doctrine: UI & design system

Owner of: shadcn/Base UI usage, tokens, forms, accessibility, responsive gates, visual bar.
Cited by: ui-engineer, reviewer.

## Configuration (from `components.json`)

- shadcn style: `base-mira`
- primitive base: **Base UI**
- icon library: **HugeIcons**
- Tailwind CSS 4
- aliases defined by `components.json`

## Before adding or modifying a design-system component

1. Inspect `components.json`.
2. Inspect installed components and existing variants.
3. Run component tooling through `pnpm`.
4. Read current component documentation and examples.
5. Confirm whether the component uses Base UI or Radix APIs.
6. Prefer composition of existing components over new custom primitives.

Load the `shadcn` skill for registry/component work (see [toolchain-and-skills](toolchain-and-skills.md)).

## UI rules

- Use HugeIcons for new UI; no other icon library without approval.
- Keep Base UI labels, items, radio items, and grouped elements inside their required
  contexts. Dialogs, Sheets, Drawers, and equivalent overlays require accessible titles.
- Use `Field`, `FieldGroup`, and semantic validation patterns for forms.
- Prefer existing primitives (Alert, Empty, Skeleton, Badge, Separator, Tooltip, Dialog,
  Sheet, Drawer, Menu) over styled `div` recreations.
- Use semantic role tokens for surfaces, foregrounds, borders, focus, and functional colours.
  No raw colours or one-off dark-mode patches when a token applies.
- Design Light and Dark as paired systems; do not mechanically invert one theme.
- One clear primary action per context.
- Avoid generic purple gradients, excessive glass, decorative charts, uniform card grids, and
  empty visual filler. The interface should feel premium, editorial, fashion-specific, and
  operational — not a generic SaaS template. Never sacrifice clarity, hierarchy, or
  accessibility for novelty.
- Link/button anchors need `data-slot="button"` — the unlayered anchor reset erases
  `buttonVariants` text colour on `<a>`/`<Link>` without it.

## Forms

- React Hook Form + Zod for multi-step, consequential, or validation-heavy forms.
- Show errors beside the relevant field/action in plain business language.
- Preserve entered values when navigating backward in a stepper.
- Disable duplicate submissions; show progress for async work.
- Confirm before discarding dirty work or performing destructive actions.
- State ownership for form/interaction values follows [state-and-data](state-and-data.md).

## Responsive & accessibility gates

Review every completed UI workflow at 375×812, 768×1024, 1280×800, plus any workflow-specific
wide or short-height target.

- Mobile adapts task structure, not just shrinks desktop tables. No horizontal page overflow.
- Sidebars, sheets, dialogs, and nested regions stay usable at short viewport heights.
- Comfortable touch targets on primary controls. Keyboard order matches visual flow.
- Icon-only controls have accessible names. Status is never colour-only.
- Text and controls meet WCAG AA contrast. Respect reduced-motion.
- Overlays have predictable focus, Escape, and close behaviour.
- Loading, empty, error, disabled, and unavailable states are explicit.
