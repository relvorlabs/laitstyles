# Laitstyle

Laitstyle is a single-store storefront and operations application built with Next.js 16, React 19, Prisma and PostgreSQL. Supabase provides authentication only; Prisma is the sole database schema, migration and client-generation layer.

## Roles

- `consumer`: storefront access, own-account management, own-order access and saved products.
- `admin`: the one store owner account, with every operations permission.
- `manager`: inventory, order, hold, sale, return and customer operations without owner-only settings, destructive inventory deletion or audit access.

Roles live in `profiles.role`. There are no tenant models, membership tables, staff invitations, elevated platform roles or additional administrator accounts.

## Local setup

Requirements: Node 25, pnpm 11 and PostgreSQL.

1. Install dependencies with `pnpm install`.
2. Create `.env.local` with `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Run `pnpm exec prisma validate` and `pnpm prisma:generate`.
4. For a fresh database, apply committed migrations with `pnpm exec prisma migrate deploy`. Use `pnpm exec prisma migrate dev --name <change>` only for an intentional development schema change.
5. Seed storefront data when required with `pnpm db:seed:storefront`.
6. Start the app with `pnpm dev`.

Do not use the Supabase CLI for database creation, migrations, resets, schema inspection or database type generation. Database changes begin in `prisma/schema.prisma`, are captured in `prisma/migrations`, and regenerate `prisma/generated/prisma`.

## Bootstrap the admin

The admin creation command accepts only an email address and password:

```powershell
pnpm auth:bootstrap-admin -- --email owner@example.com --password "a-strong-password"
```

It creates or updates the Supabase Auth identity and upserts the matching Prisma profile as `admin`. The database permits only one `admin` profile. Consumers use storefront registration; managers use staff sign-in after an owner-controlled backend process provisions their identity and `manager` profile role.

## Verification

Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` before delivery.
