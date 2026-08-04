# Doctrine: UI, component system and visual quality

Owner of: shadcn/Base UI, Tailwind CSS, themes, component intent, responsive design, forms and
accessibility.
Cited by: frontend engineer and reviewer.

## Product visual standard

Laitstyles should feel premium, editorial and fashion-specific on the storefront, while remaining
clear, dense and operational in admin. Visual decisions support product discovery, garment detail,
trust, checkout completion and staff accuracy. Do not produce a generic SaaS dashboard or a grid of
indistinguishable cards.

Before building a material component, define the user task, content hierarchy, primary action,
states, mobile transformation, accessibility contract and backend data it represents.

## Local component system

The repository configuration is authoritative:

- shadcn style: `base-mira`;
- primitive base: Base UI;
- Tailwind CSS 4 with CSS variables;
- HugeIcons;
- aliases from `components.json`.

Inspect `components.json` and `src/components/ui/**` before adding/updating a component. Use pnpm
and preview shadcn registry changes before overwriting locally modified source.

## shadcn-first rule

Feature code uses local primitives for established concepts:

- `Button` for actions;
- `Input`, `Textarea`, `InputGroup` for text entry;
- `Select`, `Combobox`, `Checkbox`, `RadioGroup`, `Switch`, `ToggleGroup` for choices;
- `Field`, `FieldGroup`, labels/descriptions/errors for forms;
- `Dialog`, `AlertDialog`, `Sheet`, `Drawer` for overlays;
- `DropdownMenu`, `Tabs`, `Breadcrumb`, `Pagination`, `Sidebar` for navigation/action structure;
- `Alert`, `Badge`, `Empty`, `Skeleton`, `Spinner`, `Progress`, `Separator`, `Table`, `ScrollArea`,
  `Tooltip` and `sonner` for their established concepts.

Do not recreate an available primitive with raw interactive elements or clickable divs/spans. When
touched code contains such a reimplementation, correct it within the changed scope.

Semantic structural HTML remains required: `main`, `nav`, `header`, `footer`, `section`, `article`,
headings, paragraphs and lists express document meaning. A plain `div`/`span` is acceptable only as
a non-interactive layout/text wrapper when no semantic element or primitive fits.

Custom product components compose shadcn primitives and represent Laitstyles concepts such as
`ProductCard`, `VariantPicker`, `HoldCountdown`, `OrderStatus`, `CheckoutSummary` or
`InventoryTable`. Do not fork primitive behavior or create generic visual wrappers.

## Tailwind and tokens

Feature styling uses Tailwind utilities and semantic tokens only.

Do not create:

- CSS Modules or component `.css` files;
- styled-jsx/CSS-in-JS;
- inline `style` props or hand-authored `<style>` tags;
- raw hex/RGB/HSL values;
- raw palette classes for product semantics;
- one-off dark-mode colour repairs when a semantic token should exist.

The existing global Tailwind/theme file may define reusable semantic tokens and approved global
keyframes. Do not create a new stylesheet for a feature.

Use `cn()` for conditional classes, `gap-*` instead of `space-*`, `size-*` for equal dimensions and
semantic variants through the repository's variant mechanism.

## Theme and contrast

Light and dark themes are independently designed states. Verify text, muted content, surfaces,
borders, focus, selected/pressed/destructive/disabled states, product imagery framing and data
visualizations in both themes.

Meet WCAG AA at minimum: 4.5:1 normal text, 3:1 large text and 3:1 meaningful non-text boundaries
and focus indicators. Status is never color-only.

## Responsive behavior

Verify at least:

- 320×568;
- 375×812;
- 768×1024;
- 1280×800;
- a short desktop viewport for overlays.

No page-level horizontal overflow. Product media preserves intentional aspect ratios. Tables scroll
inside named containers. Mobile reorganizes the task instead of shrinking desktop. Primary actions
remain reachable and touch targets are usable.

## Forms and interaction

Use React Hook Form + Zod for consequential/multi-step forms and local shadcn field composition.
Every field has an accessible label/error relationship. Prevent duplicate submission, preserve
intentional drafts, confirm destructive operations and focus the first invalid field where useful.

Every control is keyboard reachable with visible focus. Overlays have correct title/description,
focus trap/restoration and Escape behavior. Async/error/success state is announced appropriately.
Respect reduced motion. Hover is never the only access path.

## Required states

Implement every relevant loading, slow-loading, empty, partial, success, validation, conflict,
unauthorized, forbidden, offline/unavailable, mutation-pending, recovery, long-text, large-value and
missing-optional-data state.

A screenshot of one happy path is not completion.
