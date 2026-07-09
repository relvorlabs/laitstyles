<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Laitstyle repository implementation contract

These rules apply to every agent working in this repository. Direct user instructions take precedence, followed by this file, the active feature specification, loaded skills and then general model knowledge.

## 1. Required process before implementation

Before changing code:

1. Identify the active task and branch.
2. Read the relevant specification, plan and progress tracker.
3. Load `using-superpowers` first.
4. Load every relevant skill from `relvorlabs/agent-controller/tree/main/skills`; do not rely on memory because skills change.
5. Use `find-skills` when a requested capability is not found under the expected name.
6. Record missing skills or tools honestly. Never claim a skill, MCP or validation tool was applied when it was not actually loaded or run.
7. Inspect the current repository conventions, package manager, Next.js version, shadcn configuration and existing components before implementation.

For Control Room V2, always read in this order:

1. `docs/control-room-v2/spec.md`
2. `docs/control-room-v2/implementation-plan.md`
3. `docs/control-room-v2/progress.md`
4. This `AGENTS.md`

## 2. Mandatory skills for Control Room V2

Load the current versions of these skills before the phase where they apply:

### Process and delivery

- `using-superpowers`
- `find-skills`
- `create-pr`

### Product and experience

- `product-designer`
- `ui-ux-pro-max`
- `frontend-design`
- `web-design-guidelines`
- `web-artifacts-builder`

### Next.js, React and architecture

- `next-best-practices`
- `next-cache-components`
- `vercel-react-best-practices`
- `vercel-composition-patterns`
- `react-doctor`

### Components, types and resilience

- `shadcn`
- `typescript-advanced-types`
- `error-handling-patterns`

### Skill adaptation rules

- `web-artifacts-builder` is used for multi-component design thinking and anti-generic UI guidance. Do not initialize a separate Vite artifact inside this existing Next.js repository.
- `next-cache-components` does not mean Cache Components must be enabled. Enable or use caching only when the active phase has a real freshness and invalidation requirement.
- The controller currently has no dedicated TanStack/React Query skill under the searched names. Do not invent one. Follow the Control Room specification and official package patterns if a phase-approved TanStack dependency is introduced.
- `react-doctor` is a completion check, not a substitute for lint, TypeScript, tests, build or browser validation.
- `web-design-guidelines` requires fetching the latest guideline source when reviewing changed UI files.

## 3. Control Room phase gate

Control Room V2 is implemented one phase at a time on `feat/control-room-v2` and its dedicated draft PR.

- Only the phase marked active in `docs/control-room-v2/progress.md` may receive feature code.
- A later-phase route, button, sidebar item or workflow must not be exposed before it is complete.
- Do not begin the next phase while the current phase has failing checks, broken responsive behaviour, dead actions, incomplete states or unresolved changed-scope React Doctor errors.
- Update the progress tracker and PR description after every completed phase.
- Keep the PR in draft until the final integration and browser-validation phase is complete.

## 4. Control Room architecture rules

The existing `src/app/admin/[[...section]]/page.tsx` is a legacy monolith. Do not add new Control Room behaviour to it.

Use route-level pages and feature folders:

```text
src/app/admin/
src/features/control-room/
src/lib/control-room/
```

Rules:

- Route files compose features; they do not own seed data, domain models or large interaction state.
- Keep domain types, seed records, selectors, typed actions and Result utilities under `src/lib/control-room/`.
- Keep feature components under focused folders such as `shell`, `overview`, `inventory`, `product-editor`, `sales`, `customers` and `settings`.
- Split a component when it accumulates unrelated responsibilities. Roughly 200–250 lines is a review signal, not permission to create several arbitrary fragments.
- Do not replace the old monolith with one universal dashboard component.
- Avoid boolean-prop proliferation. Prefer explicit variants, compound composition and feature-specific components.
- Client Component boundaries must be as narrow as practical.
- Do not duplicate derived values in component state. Compute them through selectors.
- Connected actions such as offline sales must update inventory, sales, customers and activity through one typed action boundary.

## 5. Product truth and scope rules

Control Room V2 supports:

- Unique one-of-one pieces
- Stocked products with quantities
- Products with variants

Do not preserve the old “every item has quantity one” assumption.

Until real integrations exist:

- Use typed seed data and explicit adapters.
- Do not claim production persistence, payments, courier updates, uploads, authentication or inventory locking.
- Do not add random timers, random state transitions or fake network delays as normal product behaviour.
- Do not expand into supplier management, accounting, multi-store, warehouses, marketing automation or technical platform administration unless the user explicitly changes the specification.

## 6. Next.js and React rules

The repository uses Next.js 16 and React 19.

- Read the current Next.js docs in `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Prefer Server Components for route composition and static boundaries.
- Use Client Components only for browser APIs, interaction state and form workflows.
- Respect async `params`, `searchParams`, cookies and headers conventions.
- Add meaningful `loading.tsx`, `error.tsx` and not-found boundaries when a route requires them.
- Avoid page-wide client rendering when only a subsection is interactive.
- Avoid waterfalls; start independent work together and stream meaningful sections with Suspense when real async data exists.
- Do not enable Cache Components or add `use cache` for static prototype seed data.
- Use `next/image` with accurate `sizes` for product imagery.
- Dynamically load heavy editors, charts or drawers only when the bundle benefit is real.

## 7. shadcn and design-system rules

The project configuration is:

- shadcn style: `base-mira`
- primitives: Base UI
- icon library: HugeIcons
- Tailwind CSS 4
- aliases from `components.json`

Before adding or modifying a shadcn component:

1. Inspect `components.json`.
2. Inspect installed components.
3. Use the project package runner, which is pnpm.
4. Read current component docs/examples.
5. Prefer existing components and composition over custom primitives.

Control Room rules:

- Use HugeIcons in rebuilt Control Room components. Do not introduce new Lucide usage there.
- Dialog, Sheet and Drawer require accessible titles.
- Use Field/FieldGroup and semantic validation patterns for forms.
- Use Alert, Empty, Skeleton, Badge, Separator and other existing primitives rather than recreating them as styled divs.
- Use semantic design tokens for functional colours.
- Maintain one clear primary action per context.
- Do not use generic purple gradients, excessive glass effects, decorative charts or uniform card grids that ignore operational hierarchy.

## 8. Forms, errors and type safety

- Use React Hook Form and Zod for multi-step or consequential forms.
- Use discriminated unions for unique, stocked and variant products.
- Use structured validation errors or typed Result values for expected failures such as invalid quantity, insufficient stock or invalid status transition.
- Use route error boundaries for unexpected failures.
- Show user-facing errors beside the relevant field or action in plain business language.
- Disable repeated submissions and show progress for asynchronous operations.
- Preserve entered values when moving backward in a stepper.
- Confirm before discarding dirty multi-step work or performing destructive actions.
- Use advanced TypeScript only where it improves domain safety; do not add type-level complexity for its own sake.

## 9. TanStack rule

No TanStack dependency is currently installed.

- Evaluate `@tanstack/react-table` only during the Inventory phase.
- Add it only when the required sorting, filtering, selection and column-visibility behaviour would otherwise require meaningful custom infrastructure.
- Do not add TanStack Query until real asynchronous server state exists.
- Record any TanStack dependency decision in `docs/control-room-v2/decisions.md` and the PR body.

## 10. Responsive and accessibility requirements

Every completed UI phase must be reviewed at:

- 375 × 812
- 768 × 1024
- 1280 × 800

Requirements:

- Mobile adapts task structure; it does not merely shrink desktop tables.
- No horizontal page overflow.
- Primary controls have comfortable touch targets.
- Keyboard navigation and focus order match the visual flow.
- Icon-only controls have accessible names.
- Status is not communicated by colour alone.
- Text and controls meet WCAG AA contrast.
- Reduced motion is respected.
- Dialogs and sheets have predictable close, focus and Escape behaviour.

If browser or Chrome DevTools MCP validation is unavailable, mark the check blocked. Do not claim it passed.

## 11. Required completion checks

Before marking a phase complete:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec vitest run --passWithNoTests
pnpm build
pnpm dlx react-doctor@latest . --verbose --diff
```

Also:

- Review changed UI files with the latest Web Interface Guidelines.
- Validate the required viewports when browser tooling is available.
- Inspect the PR diff for scope drift, dead navigation, incomplete interactions and oversized files.
- Resolve changed-scope failures before starting another phase.

## 12. Pull request rules

Use the `create-pr` skill and a conventional title:

```text
feat(control-room): Rebuild the operations workspace
```

The PR body must contain:

- Current phase and status
- Implemented scope
- Explicit exclusions
- Verification evidence
- Screenshots or browser evidence for completed UI phases
- Known blockers
- Next-phase gate

Do not mark the PR ready for review while the progress tracker says a phase is incomplete or live browser validation remains required and unwaived.
