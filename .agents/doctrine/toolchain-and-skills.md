# Doctrine: Toolchain and mandatory skills

Owner of: repository commands, skill selection, dependency-version awareness and tool honesty.
Cited by: every role.

## Repository authority

Inspect `package.json`, `pnpm-lock.yaml`, TypeScript/Biome/Playwright/Vitest configuration,
`components.json`, Prisma configuration and current framework versions before acting.

Use pnpm and repository scripts. Do not substitute remembered commands when an authoritative
script exists.

Current major stack includes Next.js 16, React 19, TypeScript, Zod 4, Prisma 7 with PostgreSQL
adapter, Supabase SSR/Auth, TanStack Query 5, shadcn/Base UI, Tailwind CSS 4, Biome, Vitest and
Playwright. `package.json` remains the source of truth as versions change.

## Server-side skills

For current Next.js server-side implementation, load and apply as relevant:

- `next-best-practices`;
- `error-handling-patterns`;
- repository-local `.agents/skills/supabase` for Supabase Auth/client behavior;
- repository-local `.agents/skills/supabase-postgres-best-practices` for PostgreSQL/Supabase
  operational work;
- `typescript-advanced-types` for complex contract/state modeling;
- `tanstack` when browser cache/transport behavior is affected;
- `systematic-debugging` for defects.

Do not load every skill for every task. Local skill copies win over remote copies of the same
skill.

## Frontend skills

For every frontend implementation or frontend review, load and actively apply:

- `next-best-practices`;
- `vercel-react-best-practices`;
- `vercel-composition-patterns`;
- `shadcn`.

Use the repository's `react-doctor` command for material component work, risky refactors and
bugfix/final self-review.

Skills refine the Laitstyles visual system; they do not replace it.

## NestJS backend skills

Only when the backend engineer is legitimately active, load:

- `nestjs-patterns`;
- `nestjs-best-practices`;
- `nestjs-code-review` for final self-review.

Translate generic guidance to the selected Laitstyles runtime contracts, Prisma and Supabase Auth
rather than importing class-validator, hand-written JWT or repository-for-every-model patterns.

## Version-aware use

Check installed versions before applying examples, especially for Next.js App Router/async request
APIs, React 19, shadcn Base UI, Tailwind 4, Supabase SSR, Prisma 7 and TanStack Query 5.
Use current official documentation when behavior is uncertain.

## Tool honesty

Do not claim a skill, browser, database, migration, auth, payment, extension or provider check was
used when it was not executed.
