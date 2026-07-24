# Doctrine: Conventions

Owner of: naming, file discipline, TypeScript style, imports, focus, commits/PRs.
Cited by: every engineering role, reviewer.

## Focus

Change only what the active task requires. No unrelated formatting, dependency, visual, or
architectural changes. No speculative infrastructure or drive-by refactors unless the active
phase requires them or the task cannot be completed safely without them.

During the architecture migration, obey the active phase boundary. A later-phase improvement is
not permission to implement it early.

## Files and ownership

- One purpose per file; split when a file mixes responsibilities.
- Match the naming, comment density, and idioms of the surrounding code.
- Colocate tests as `*.test.ts` or `*.test.tsx` beside the unit under test.
- New business code belongs under `src/modules/<domain>/**`.
- `src/features/**` is legacy for new production code. Existing files may be repaired or moved,
  but do not create a new business feature there.
- Top-level `src/server/**` is legacy for new business modules. New domain queries, commands,
  policies, and mappers belong under the owning module's `server/**`.
- Keep server-only modules out of every Client Component dependency chain.
- Do not create broad barrels that expose a module's internal server, client, and UI files
  through one ambiguous entry point.

## Naming

Use the domain language contract in
[`architecture.md`](architecture.md):

- `product` — canonical sellable-item domain;
- `inventory` — stock and availability;
- `catalogue` — public read model or UI term;
- `storefront` — customer-facing surface;
- `admin` — staff-facing surface;
- `commerce` — conceptual umbrella, not a permanent folder layer.

Use British spelling `catalogue`. Do not add new `catalog` filenames, imports, identifiers, or
domain names. Existing American-spelled identifiers are legacy debt and must not increase when a
file changes.

Do not create product CRUD names under catalogue, for example
`createCatalogueProduct` or `deleteCatalogueProduct`. Those are product commands.

Use `repository` only for a real replaceable persistence/integration boundary. Prefer
`queries`, `commands`, `api`, `policy`, or `mappers` for direct responsibilities.

## Imports

- Prefer the `@/` alias for cross-folder imports.
- Client code must not import `@/server/**`, `@/modules/*/server/**`, Prisma, server-only
  Supabase clients, or `"use server"` modules.
- Route Handlers must not import Server Actions.
- Production `src/**` code must not import from test fixtures, factories, stories fixtures,
  development fixtures, or seed scripts.
- Domain UI may import the owning domain's client API/hooks and shared UI primitives, but not
  server internals.
- Domain server code must not import app routes, providers, stores, or domain UI.

## TypeScript

- Model `unique` / `stocked` / `variant` as discriminated unions.
- Use structured validation errors or typed `Result` values for expected failures.
- Use advanced types only where they improve domain safety, readability, or refactor
  confidence.
- Keep domain invariants in domain logic, not only in UI conditions.

## Package manager

This repository uses `pnpm@11.13.0`. Confirm the repository scripts before running commands or
installing packages.

## Commits and pull requests

- Use conventional commit and PR titles that describe the actual phase scope.
- Keep a PR in draft while required checks, browser evidence, visual review, or merge
  integration remain incomplete.
- The PR body states implemented scope, explicit exclusions, architecture decisions,
  verification evidence, known blockers, and follow-up work deliberately left to later phases.
- Never report a planned, billing-blocked, or unexecuted check as passing.
