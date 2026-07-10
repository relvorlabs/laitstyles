<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Laitstyle repository implementation contract

These rules apply to every agent working in this repository. Direct user instructions take precedence, followed by this file, the active feature specification, loaded skills and then general model knowledge.

## 1. Required process before implementation

Before changing code:

1. Identify the active task and branch.
2. Read the relevant specification, implementation plan, active phase plan and progress tracker.
3. Load `using-superpowers` first.
4. Load every relevant current skill from `relvorlabs/agent-controller/tree/main/skills`; do not rely on memory because skills change.
5. Use `find-skills` when a requested capability is not found under the expected name.
6. Record missing skills or tools honestly. Never claim a skill, MCP or validation tool was applied when it was not actually loaded or run.
7. Inspect the repository package manager, Next.js version, shadcn configuration, primitive base and existing component contracts before implementation.
8. Fetch current official documentation for any dependency whose API or recommended architecture may have changed.

For Control Room V2, read in this order:

1. `docs/control-room-v2/spec.md`
2. `docs/control-room-v2/implementation-plan.md`
3. the active `docs/control-room-v2/phaseN-plan.md`
4. `docs/control-room-v2/progress.md`
5. this `AGENTS.md`

## 2. Mandatory skills and tools for Control Room V2

Load the current versions of these skills before the phase where they apply.

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
- `supabase-postgres-best-practices`
- `supabase`

### Components, types and resilience

- `shadcn`
- `typescript-advanced-types`
- `error-handling-patterns`

### Browser and performance validation

- `chrome-devtools`
- `web-perf`
- repository Playwright acceptance scripts

### Skill and MCP adaptation rules

- `web-artifacts-builder` is used for multi-component design thinking and anti-generic UI guidance. Do not initialize a separate Vite artifact inside this Next.js repository.
- `next-cache-components` does not mean Cache Components must be enabled. Enable or use caching only when the active phase has a real freshness and invalidation requirement.
- The controller has no dedicated TanStack/React Query skill under the searched names. Do not invent one. During Phase 12, use official TanStack Query React documentation plus the repository’s Next.js, React, TypeScript and testing contracts.
- The shadcn MCP may be used for current registry search, component examples and audit checklists. Project aliases, Tailwind version and primitive base must still be confirmed from repository configuration.
- Chrome DevTools MCP availability must be verified before relying on it. If it is unavailable, browser checks remain blocked rather than being represented as passing.
- `react-doctor` is a completion check, not a substitute for lint, TypeScript, tests, build or browser validation.
- `web-design-guidelines` requires fetching the latest guideline source when reviewing changed UI files.

## 3. Control Room phase gate

Control Room V2 is implemented one phase at a time on `feat/control-room-v2` and its dedicated draft PR.

- Only the phase marked active in `docs/control-room-v2/progress.md` may receive feature code.
- A later-phase route, button, dependency or architecture must not enter an earlier active phase.
- Do not begin the next phase while the current phase has failing checks, broken responsive behavior, dead actions, incomplete states or unresolved changed-scope React Doctor findings.
- A direct user override may permit planning or implementation of a later phase, but it never reclassifies an earlier blocked gate as passing.
- Update the tracker, decisions and PR description after every completed phase.
- Keep the PR draft until the final executable, visual and merge-integration gates pass.

## 4. Control Room architecture rules

The legacy `src/app/admin/[[...section]]/page.tsx` must not receive new Control Room behavior. Its version on `main` may be inspected as an information-architecture reference, but it must not be restored as a monolith.

Use route-level pages and focused feature folders:

```text
src/app/admin/
src/features/control-room/
src/lib/control-room/
```

Rules:

- Route files compose features; they do not own seed data, repository implementations, domain models or large interaction state.
- Keep domain types, deterministic records, selectors, typed actions and Result utilities under `src/lib/control-room/` until a domain-specific data boundary is introduced.
- Phase 9 reviews and fixes codebase structure for Supabase readiness. Phase 10 owns Supabase Auth, Google OAuth and organization permissions. Phase 11 owns Supabase schema, storage, RLS and generated types. Phase 12 owns TanStack Query repository interfaces and adapters under a clear data boundary, not inside page components.
- Keep feature components in focused folders such as `shell`, `overview`, `inventory`, `product-editor`, `orders`, `holds`, `returns`, `record-sale`, `customers` and `settings`.
- Split a component when it accumulates unrelated responsibilities. Roughly 200–250 lines is a review signal, not permission to create arbitrary fragments.
- Do not replace the old monolith with one universal dashboard, query or provider file.
- Avoid boolean-prop proliferation. Prefer explicit variants, compound composition and feature-specific components.
- Client Component boundaries must be as narrow as practical.
- Do not duplicate derived values in component state.
- Connected actions must preserve cross-domain inventory, sales, customer and activity invariants through one typed domain boundary.

## 5. Product truth and scope rules

Control Room V2 supports:

- unique one-of-one pieces
- stocked products with quantities
- products with variants

Do not restore the old “every item has quantity one” assumption.

Until real integrations exist:

- use typed deterministic data and explicit adapters
- do not claim production persistence, payments, courier updates, uploads, authentication or inventory locking
- do not add random timers, random state transitions, fake network delays or fake background jobs as normal product behavior
- keep user-facing prototype boundaries explicit
- do not expand into supplier management, accounting, multi-store, warehouses, marketing automation or technical platform administration unless the user explicitly changes the specification

## 6. Next.js and React rules

The repository uses Next.js 16 and React 19.

- Read the current Next.js docs in `node_modules/next/dist/docs/` before using unfamiliar APIs.
- Prefer Server Components for route composition and static boundaries.
- Use Client Components only for browser APIs, interaction state, query hooks and form workflows.
- Respect async `params`, `searchParams`, cookies and headers conventions.
- Add meaningful `loading.tsx`, `error.tsx` and not-found boundaries when a route requires them.
- Avoid page-wide client rendering when only a subsection is interactive.
- Avoid waterfalls; start independent work together and stream meaningful sections with Suspense when real async data exists.
- Do not enable Cache Components or add `use cache` for static prototype seed data.
- Use `next/image` with accurate `sizes` for product imagery.
- Dynamically load heavy editors, charts or drawers only when the bundle benefit is real.
- If Phase 12 adds Query hydration, use a per-request server QueryClient and a stable browser QueryClient. Do not reuse a server cache across requests.
- Do not use Server Actions as TanStack Query query functions. Future client queries require a browser-safe API/RPC adapter; Server Actions may be evaluated for mutations where appropriate.

## 7. shadcn, Base UI and design-system rules

The project configuration is:

- shadcn style: `base-mira`
- primitives: Base UI
- icon library: HugeIcons
- Tailwind CSS 4
- aliases from `components.json`

Before adding or modifying a shadcn component:

1. Inspect `components.json`.
2. Inspect installed components.
3. Use pnpm as the package runner.
4. Read current component docs and examples.
5. Prefer existing components and composition over custom primitives.
6. Confirm whether the component uses Base UI or Radix APIs before changing trigger or group composition.

Control Room rules:

- Use HugeIcons in rebuilt Control Room components. Do not introduce new Lucide usage there.
- Base UI menu labels and menu items must live inside the required `Menu.Group`, `Menu.RadioGroup` or corresponding context.
- Dialog, Sheet and Drawer require accessible titles.
- Use Field/FieldGroup and semantic validation patterns for forms.
- Use Alert, Empty, Skeleton, Badge, Separator and other existing primitives instead of recreating them as styled divs.
- Use semantic role tokens for surfaces, foregrounds, borders, focus and functional colors.
- Do not use raw colors or one-off manual dark-mode patches where a role token applies.
- Design Light and Dark as paired systems; do not invert one theme mechanically.
- Maintain one clear primary action per context.
- Do not use generic purple gradients, excessive glass effects, decorative charts or uniform card grids that ignore operational hierarchy.
- In Phase 8, inventory, sidebar, command search and Overview must express a premium editorial fashion-operations character rather than generic SaaS styling.

## 8. Forms, errors and type safety

- Use React Hook Form and Zod for multi-step or consequential forms.
- Use discriminated unions for unique, stocked and variant products.
- Use structured validation errors or typed Result values for expected failures such as invalid quantity, insufficient stock or invalid status transition.
- Use route error boundaries for unexpected failures.
- Show errors beside the relevant field or action in plain business language.
- Disable repeated submissions and show progress for asynchronous operations.
- Preserve entered values when moving backward in a stepper.
- Confirm before discarding dirty work or performing destructive actions.
- Use advanced TypeScript only where it improves domain safety.

## 9. TanStack Query rule

TanStack Query is approved only for Phase 12 or a later explicit user-approved scope. Phase 9 through Phase 11 must complete the codebase readiness, Supabase Auth/Google OAuth, organization permissions, database schema, storage, RLS and generated type foundations before TanStack Query runtime work resumes.

### Packages

- Add `@tanstack/react-query` with pnpm.
- Add `@tanstack/eslint-plugin-query` and apply the relevant recommended rules.
- Add Query Devtools only when development-only and excluded from the production bundle; otherwise leave it out.

### Data ownership

- TanStack Query owns server-like resource state after a domain migrates.
- Local UI state owns dialogs, tabs, forms, unsaved values, theme preference and other ephemeral interaction state.
- Do not copy query data into a global provider, reducer or Zustand-like store.
- Do not use the query cache as a replacement for arbitrary client state.

### Repository and adapter boundary

- Define typed repository interfaces by domain capability.
- Use deterministic Promise-based in-memory adapters until a real backend exists.
- Do not create fake API routes around local data.
- Do not add random latency or random failures.
- Test errors and stale behavior through injected deterministic test adapters.
- Feature components must not import seed arrays directly after their domain migrates.

### Query architecture

- Use typed array query keys.
- Include every data-affecting filter, sort, saved-view, pagination or ID input in the key.
- Define one key factory per domain.
- Colocate query keys, query options, functions and mutations with their domain data folder.
- Configure stale time, retry and refetch intentionally by domain.
- Distinguish initial pending, error, empty, stale and background-refetch states.
- Keep usable cached data visible during background refetch.

### Mutations

Use the least risky strategy:

1. exact cache replacement from the authoritative mutation result
2. targeted invalidation
3. optimistic update only for reversible low-conflict actions

Every optimistic update requires:

- query cancellation
- previous-cache snapshot
- deterministic optimistic value
- rollback on error
- reconciliation or targeted invalidation on settlement

Do not optimistically finalise sales, payment, order fulfilment, stock release, returns, refunds or unique-item ownership unless concurrency and rollback safety are proven.

Record every TanStack dependency and architecture decision in `docs/control-room-v2/decisions.md`, the active phase plan and the PR body.

## 10. Responsive and accessibility requirements

Every completed UI phase must be reviewed at:

- 375 × 812
- 768 × 1024
- 1280 × 800
- any additional phase-specific wide or short-height target

Requirements:

- Mobile adapts task structure; it does not merely shrink desktop tables.
- No horizontal page overflow.
- Sidebar and nested regions do not hide content at short viewport heights.
- Primary controls have comfortable touch targets.
- Keyboard navigation and focus order match visual flow.
- Icon-only controls have accessible names.
- Status is not communicated by color alone.
- Text and controls meet WCAG AA contrast.
- Reduced motion is respected.
- Dialogs and sheets have predictable close, focus and Escape behavior.

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

- review changed UI files with the latest Web Interface Guidelines
- validate required viewports and interactions with browser tooling
- inspect console and network errors for changed workflows
- generate and visually review screenshots for UI phases
- inspect the PR diff for scope drift, dead navigation, incomplete interactions and oversized files
- resolve changed-scope failures before starting the next phase

## 12. Pull request rules

Use the `create-pr` skill and the conventional title:

```text
feat(control-room): Rebuild the operations workspace
```

The PR body must contain:

- current phase and status
- implemented scope
- explicit exclusions
- verification evidence
- screenshots or browser evidence for completed UI phases
- known blockers
- next-phase gate

Do not mark the PR ready while the tracker says a phase is incomplete, executable checks are missing, visual review remains required or the branch is non-mergeable.
