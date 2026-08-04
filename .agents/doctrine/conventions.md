# Doctrine: Conventions

Owner of: naming, files, imports, TypeScript, package management and change hygiene.
Cited by: implementing roles and reviewer.

## Files and naming

- Files and directories use `kebab-case` unless a framework convention requires another name.
- React components and classes use `PascalCase`.
- One cohesive responsibility per file.
- Public barrels expose only stable module capabilities.
- Do not create generic `helpers`, `utils`, `services` or component names that hide ownership.

### Module naming

```text
src/modules/<domain>/
├── schema.ts or contracts.ts
├── types.ts                  only for non-duplicated domain/frontend types
├── server/
│   ├── queries.ts
│   ├── commands.ts
│   ├── policy.ts
│   ├── mappers.ts
│   └── <provider>.adapter.ts
├── client/
│   ├── api.ts
│   ├── query-keys.ts
│   ├── queries.ts
│   └── mutations.ts
├── ui/
└── index.ts
```

Create a repository only for a real persistence boundary or substantial query responsibility.
A thin wrapper over Prisma or `fetch` is not automatically a repository.

## Imports

- Client code must not import `server-only`, Prisma, Node-only modules, Supabase admin code or
  `modules/**/server`.
- Server code must not import UI, browser stores or Client Component hooks.
- Route files import public module server operations and shared HTTP infrastructure.
- Avoid broad barrels that conceal server/client boundary mistakes or inflate bundles.
- Keep generated Prisma imports behind `src/lib/prisma`.

## TypeScript

- Keep strict TypeScript enabled.
- Public API functions, hooks, server operations and route wrappers have explicit return types.
- Prefer `satisfies` when validating configuration without losing inference.
- Exhaustively switch discriminated unions.
- Do not duplicate Zod-derived transport types as interfaces.
- Do not make fields optional to silence incomplete state handling.
- Do not throw strings.

## Frontend files

Use product-responsibility names such as `product-editor.tsx`, `cart-summary.tsx` and
`use-checkout.ts`. Avoid `DataCard`, `InfoBox`, `GenericModal`, `ReusableComponent` and universal
page-builder APIs.

Do not create component CSS files or CSS Modules. Styling rules live in the UI doctrine.

## Tooling and commits

The root `packageManager`, lockfile and scripts are authoritative. Use pnpm. Do not introduce a
second formatter, linter, styling system, ORM, auth system or component library.

Keep dependency changes deliberate. Do not commit secrets, local environment files, browser
profiles, logs or database dumps.
