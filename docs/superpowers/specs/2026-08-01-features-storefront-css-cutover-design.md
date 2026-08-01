# Legacy Storefront CSS Ownership Cutover Design

**Date:** 2026-08-01  
**Status:** Approved by the user; implementation and executable acceptance remain open.  
**Migration scope:** Phase 9, first independently reviewable `src/features/**` removal slice.

## Context

The architecture migration is retiring ambiguous production ownership under `src/features/**` in
favour of domain modules. The shared storefront stylesheet is still located at
`src/features/storefront/shared/storefront.css`, although its responsibility is the presentation of
the customer-facing application shell and storefront surfaces. The target architecture assigns that
responsibility to `src/modules/storefront-shell/ui/**`.

The current stylesheet is a 40,382-byte presentation asset with SHA-256
`84BB5007594FF3413B96B6F1ECDBE07D1F3B59DF106AB0A357298D5D23E9F279`. It contains the scoped
storefront component styles, global keyframes, overlay scroll locking, responsive rules, dark-theme
rules and reduced-motion rules inherited from the Phase 0 visual baseline. Its current production
consumers are exactly:

- `src/app/theme-entry.css`, which loads `globals.css` first and the scoped storefront stylesheet
  second for the whole application;
- `src/app/(storefront)/products/[slug]/error.tsx`;
- `src/app/(storefront)/products/[slug]/loading.tsx`;
- `src/app/(storefront)/products/[slug]/not-found.tsx`.

The three product-detail route boundaries explicitly import the stylesheet in addition to the root
theme entry. This slice preserves that composition as-is. Deciding whether those imports can be
removed is a separate concern and is not required to correct ownership.

The active branch is `agent/storefront-checkout-delivery-promotions-redesign` and already contains
unrelated work. Implementation must preserve those changes and keep this cutover isolated.

## Goals

- Transfer ownership of the existing shared storefront stylesheet from legacy
  `src/features/**` composition to the canonical `storefront-shell` module.
- Cut all four current production consumers over to the canonical module path.
- Delete the legacy stylesheet path only after every known consumer has moved.
- Preserve stylesheet bytes, cascade order, import coverage, selectors, tokens, keyframes,
  themes, responsive behaviour, reduced-motion behaviour and rendered output.
- Deliver a small migration unit that the UI engineer can implement and the reviewer can validate
  independently.

## Architecture and ownership

This change maps onto two target layers:

| Layer | Responsibility in this slice |
| --- | --- |
| `src/modules/storefront-shell/ui/**` | Own the customer-facing shell and shared storefront presentation stylesheet. |
| `src/app/**` | Continue composing global and route-boundary CSS through thin imports. |

`storefront-shell` is the correct owner because the stylesheet provides cross-route customer-facing
presentation, including site chrome and storefront surface behaviour. It is not a reusable,
business-free UI primitive, so it does not belong in `src/components/ui/**`. It contains no
business rules, data access or state ownership, so this slice does not touch any module `server/**`,
`client/**`, schema, store, provider, Prisma or Supabase layer.

Dependency direction remains:

```text
src/app/**
  -> src/modules/storefront-shell/ui/storefront.css
  -> existing global tokens from src/app/globals.css through established cascade order
```

The root entrypoint must continue importing `globals.css` before `storefront.css`. The move changes
physical ownership only; it does not establish a new theme foundation or change which routes receive
the stylesheet.

## Exact file scope

### Move without content changes

```text
src/features/storefront/shared/storefront.css
  -> src/modules/storefront-shell/ui/storefront.css
```

The destination file must be byte-for-byte identical to the source file as it exists immediately
before the move. The current baseline SHA-256 is recorded above so the reviewer can detect accidental
formatting, line-ending, encoding or content changes.

### Update imports only

| File | Required import cutover |
| --- | --- |
| `src/app/theme-entry.css` | Replace `@import "../features/storefront/shared/storefront.css";` with `@import "../modules/storefront-shell/ui/storefront.css";`. Keep it after `@import "./globals.css";`. |
| `src/app/(storefront)/products/[slug]/error.tsx` | Replace `@/features/storefront/shared/storefront.css` with `@/modules/storefront-shell/ui/storefront.css`. |
| `src/app/(storefront)/products/[slug]/loading.tsx` | Replace `@/features/storefront/shared/storefront.css` with `@/modules/storefront-shell/ui/storefront.css`. |
| `src/app/(storefront)/products/[slug]/not-found.tsx` | Replace `@/features/storefront/shared/storefront.css` with `@/modules/storefront-shell/ui/storefront.css`. |

No other line in these four consumer files changes. After all imports resolve to the destination,
delete `src/features/storefront/shared/storefront.css`. The old file must not remain as a copy,
re-export, forwarding import or compatibility layer.

## Ordered implementation

1. Record the source stylesheet hash and confirm the four-consumer import graph before editing.
2. Copy the stylesheet bytes to `src/modules/storefront-shell/ui/storefront.css` without running a
   formatter or changing line endings.
3. Update the root CSS entrypoint while preserving the existing `globals.css`-then-storefront cascade.
4. Update the error, loading and not-found product boundary imports to the module-owned path.
5. Search production source for the old path and stop if any consumer remains.
6. Remove the legacy source file only after the old-path search is empty.
7. Compare the destination hash with the recorded source hash, inspect the focused diff and run the
   reviewer gates below.

## No-behaviour and no-visual-change contract

This is a relocation, not a stylesheet revision. Implementation must not change:

- any byte within the stylesheet, including comments, whitespace, line endings or encoding;
- CSS import order, cascade order or route coverage;
- selectors, class names, specificity, custom properties or token values;
- light- or dark-theme presentation;
- keyframes, transitions, overlay locking or reduced-motion behaviour;
- breakpoints, responsive layout, typography, colours, spacing, borders, shadows or image sizing;
- product error, loading or not-found JSX, copy, component imports or interaction behaviour;
- global theme ownership in `src/app/globals.css`.

Any unexplained screenshot, computed-style or interaction difference is a regression and blocks
acceptance. A formatter must not rewrite the moved stylesheet.

## Validation and acceptance

### Structural checks

- Confirm the destination exists and its SHA-256 equals the pre-move source hash. Against the current
  baseline, the expected hash is
  `84BB5007594FF3413B96B6F1ECDBE07D1F3B59DF106AB0A357298D5D23E9F279`.
- Confirm `src/features/storefront/shared/storefront.css` no longer exists.
- Search `src/**` and relevant checks for `features/storefront/shared/storefront.css`; acceptance
  requires no remaining import or path reference.
- Confirm the only consumer changes are the four import-path replacements defined in this spec.
- Inspect the diff as a rename with import updates and no stylesheet-content diff.

### Repository gates

Run the repository-owned commands with `pnpm@11.13.0` on Node 25.x:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test:styles:e2e
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
pnpm validate:browser
```

The focused non-admin style smoke must continue proving that storefront variables reach the rendered
page and that the shared header receives the stylesheet. The full and browser suites remain required
because the file controls broad storefront presentation. A failure may be classified as pre-existing
only with evidence from the unchanged baseline; no failure introduced by this cutover is waivable.

### Browser and visual review

Review the storefront home, catalogue and a valid product detail page, plus the product detail
loading, not-found and error boundaries where the harness can exercise them. At minimum, compare:

- desktop, tablet and mobile viewports;
- light and dark themes;
- shared header and footer presentation;
- overlay scroll locking and representative motion;
- reduced-motion behaviour;
- browser console, failed stylesheet requests and production server logs.

Generate and inspect screenshots against the Phase 0 presentation contract. Missing browser evidence,
an unavailable private runner or an unexercised route boundary must be reported as blocked or skipped,
never as passing.

## Rollback

Rollback is source-only and requires no data or state migration:

1. Restore the identical stylesheet at `src/features/storefront/shared/storefront.css`.
2. Restore all four consumer imports to the legacy path, keeping the root import order unchanged.
3. Remove `src/modules/storefront-shell/ui/storefront.css` after the consumers are restored.
4. Re-run the structural, style-smoke and browser checks to confirm the original composition.

A partial rollback that leaves consumers split between old and new paths is not acceptable because it
can load duplicate global keyframes and scoped rules.

## Workflow and handoff

Execution follows the repository fleet in this order:

1. **Planner:** freeze this exact file scope, architecture mapping, preservation contract and
   acceptance evidence.
2. **UI engineer:** perform the byte-preserving move and the four import-only cutovers; make no
   domain, state or visual changes.
3. **Reviewer:** inspect the final diff for scope drift and apply the structural, static, runtime,
   responsive, theme, accessibility and visual gates. The reviewer records all executed, skipped and
   blocked evidence explicitly.

No data engineer or domain engineer is required because this slice changes presentation ownership
only.

## Explicit exclusions

- No other `src/features/**` migration or deletion.
- No storefront component, hook, store, provider, font or overlay relocation.
- No removal or deduplication of the three product route-boundary CSS imports.
- No change to `src/app/globals.css`, theme tokens, Tailwind, PostCSS, shadcn configuration or package
  dependencies.
- No selector cleanup, CSS-module conversion, stylesheet splitting, minification or formatting.
- No JSX, copy, route, metadata, loading-state, error-state or not-found-state change.
- No redesign, accessibility remediation, responsive adjustment, performance optimization or motion
  tuning unless a separate evidenced defect receives its own scope.
- No architecture-guard expansion, test rewrite or migration-tracker update in this slice.
- No checkout, orders, products, promotions, delivery, authentication, API, server, Prisma or
  Supabase work.
- No changes to unrelated modified or untracked files already present on the active branch.

