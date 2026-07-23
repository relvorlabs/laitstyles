# Prisma and Supabase Auth architecture

## Ownership boundary

Prisma is the only database management layer. It owns `prisma/schema.prisma`, `prisma/migrations`, database access through Prisma Client, schema validation and generated application database types.

Supabase is limited to authentication identities, passwords, OAuth and sessions. The project does not use Supabase database commands, migration files or generated database types.

`prisma/schema.prisma`'s datasource declares `schemas = ["public"]` only — `auth` is never added, even though `profiles.id` corresponds 1:1 with a Supabase `auth.users.id`. Supabase's own guidance is explicit: `auth`/`storage` are schemas Supabase evolves independently, and letting Prisma introspect or manage them causes permanent schema drift and has documented cases of `prisma migrate reset` corrupting Supabase Auth (it will try to drop tables like `auth.users` that `storage.buckets` depends on). If a future change needs to read `auth.users` data from a Prisma model, duplicate the needed columns into `public` via a Postgres trigger instead of a live cross-schema foreign key.

## Single-store model

All commerce data belongs to the one Laitstyle store. Business rows have no store or tenant foreign key. `store_settings` is a singleton. Category artwork is stored in `catalogue_categories.image_url`.

Authorization comes from `profiles.role`:

- `consumer` for storefront end users;
- `admin` for the one store owner;
- `manager` for operational staff.

Server guards use the static typed capability map. Client controls mirror those capabilities but never replace server authorization.

## Database workflow

1. Change `prisma/schema.prisma`.
2. Run `pnpm prisma:format` and `pnpm prisma:validate`.
3. Create a migration with `pnpm prisma:migrate:dev --name <change>` in a development database, or use `pnpm prisma:migrate:diff` for a review-only SQL diff against the live datasource.
4. Review the generated migration SQL (RLS, grants and other statements Prisma can't express need hand-editing into the migration file — Prisma only diffs table/column/index/constraint DDL).
5. Run `pnpm prisma:generate`.
6. Apply committed migrations with `pnpm prisma:migrate:deploy` (CI/production) or `pnpm prisma:migrate:dev` (development).

The baseline migration represents the current schema for fresh databases. Existing databases require an explicit baseline/reconciliation step before deployment (`pnpm prisma:migrate:status`, then `pnpm prisma:migrate:resolve --applied <name>` only once the live schema has been verified to already match — never mark a migration applied on faith).

`pnpm prisma:migrate:reset` drops and recreates the database from the migration history, then runs the dev seed. Only ever run it against a database whose data is disposable.

### Introspecting the live database

`prisma db pull` overwrites `schema.prisma` with whatever the live database looks like — no backup, no preview by default. `pnpm prisma:pull` is a safe alias for `prisma db pull --print`, which only prints the introspected schema to stdout. Use `pnpm prisma:pull:write` (`scripts/db/prisma-pull-write.mjs`) when you actually want to overwrite the file — it refuses to run with a dirty `schema.prisma`, writes a timestamped backup first, and prints a diff summary afterward. Never run bare `prisma db pull` directly.

### Row-level security

The baseline migration enables RLS on every `public` table with no policies attached (fail-closed). The app's Prisma connection uses the `app_runtime` role (`scripts/db/runtime-role.sql`), which has `BYPASSRLS`, so this has no effect on normal app queries — it only closes off Supabase's PostgREST Data API (`anon`/`authenticated` Postgres roles), which this project does not use for data access. Per-role policies mirroring `src/lib/auth/permissions.ts` are a deliberate follow-up, not yet written.

## Authentication flow

Consumers may register through the storefront and receive a consumer profile. Staff cannot self-register. The one admin is created with `pnpm auth:create -- --email <email> --password <password>`; managers are provisioned through an owner-controlled backend process.
