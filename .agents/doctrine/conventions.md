# Doctrine: Conventions

Owner of: naming, file discipline, TypeScript style, imports, focus, commits/PRs.
Cited by: every engineering role, reviewer.

## Focus

Change only what the active task requires. No unrelated formatting, dependency, or
architectural changes. No speculative infrastructure or drive-by refactors unless the user
asks or the task cannot be completed safely without them. Preserve existing public component
and domain contracts unless the task requires changing them.

## Files & naming

- One purpose per file; split when a file grows large or mixes concerns.
- Match the naming, comment density, and idioms of the surrounding code.
- Colocate tests as `*.test.ts` beside the unit under test (the repo pattern).
- Keep server-only modules out of anything a client component imports.
- Use `storefront` for the customer-facing feature surface, presentation-specific contracts,
  route/client boundaries, and their symbols.
- Use `commerce` for shared business-domain schemas/types under `src/lib/commerce/**` and
  server-only repositories, policies, and services under `src/server/commerce/**`.
- Never shorten the architecture namespace to `store`, and never use `commerce` as a second name
  for a storefront component or `storefront` as a second name for a shared domain service.
- Prefer domain nouns below the namespace: `CatalogRepository`, `InventoryService`,
  `StorefrontAuthProvider`. Avoid redundant aliases such as `CommerceCatalogRepository`,
  `StoreProvider`, or `CommerceHome`.

## TypeScript

- Model `unique` / `stocked` / `variant` as discriminated unions.
- Use structured validation errors or typed `Result` values for expected failures.
- Use advanced types only where they improve domain safety, readability, or refactor
  confidence. Avoid clever types that make ordinary feature work harder to read.
- Keep domain invariants in domain logic, not only in UI conditions.

## Package manager

This repo uses `pnpm`. Confirm it before running commands or installing packages. Run
components/registry tooling through `pnpm`.

## Commits & pull requests

- Conventional commit and PR titles that describe the actual scope.
- Load and follow the `create-pr` skill only when creating or updating a pull request.
- Keep a PR in draft while required checks, browser evidence, visual review, or merge
  integration remain incomplete.
- A PR body states: implemented scope, explicit exclusions, key architectural decisions,
  verification evidence, screenshots/browser evidence for UI, known blockers, and follow-up
  work intentionally left out of scope.
- Never mark work merge-ready while required validation is failing, missing, or inaccurately
  reported. See [validation-and-reporting](validation-and-reporting.md).
