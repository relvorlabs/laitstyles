# Laitstyle

Laitstyle is a single-store storefront and operations application built with Next.js 16, React 19, Prisma and PostgreSQL. Supabase provides authentication only; Prisma is the sole database schema, migration and client-generation layer.

## Roles

- `consumer`: storefront access, own-account management, own-order access and saved products.
- `admin`: the store owner account, with every operations permission including manager invitations.
- `manager`: inventory, order, hold, sale, return and customer operations without owner-only settings, destructive inventory deletion, audit access or team-management permissions.

Roles live in `profiles.role`. Manager authorization never trusts browser-supplied metadata: the owner invitation flow writes the recipient's `manager` role to the Prisma profile before the invitation is sent.

## Local setup

Requirements: Node 25, pnpm 11 and PostgreSQL.

1. Install dependencies with `pnpm install`.
2. Create `.env.local` with `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` (or the legacy `SUPABASE_SERVICE_ROLE_KEY`) and `AUTH_SITE_URL`.
3. Run `pnpm exec prisma validate` and `pnpm prisma:generate`.
4. For a fresh database, apply committed migrations with `pnpm exec prisma migrate deploy`. Use `pnpm exec prisma migrate dev --name <change>` only for an intentional development schema change.
5. Seed storefront data when required with `pnpm db:seed:storefront`.
6. Start the app with `pnpm dev`.

`AUTH_SITE_URL` must be the public origin only, for example `https://www.laitstyles.com` in production or `http://localhost:3000` locally. Add both of these URLs for each deployed/local origin to the Supabase Auth redirect allow-list:

- `<origin>/auth/callback` for signup confirmation, password recovery and Google OAuth;
- `<origin>/auth/invite/setup` for store-manager invitation acceptance.

Google OAuth is initiated by the browser `@supabase/ssr` client in a popup. This keeps the PKCE verifier in the same browser and cookie store as the callback while leaving the current storefront or staff sign-in page mounted. Do not reintroduce server-initiated Google OAuth from `/auth/google`.

The owner-only `/admin/team` surface sends manager invitations through `supabase.auth.admin.inviteUserByEmail`. The trusted secret key must never be exposed to client code. The recipient follows the invite email to `/auth/invite/setup`, chooses a password, confirms their profile and enters Admin as `manager`, never as `admin`.

Do not use the Supabase CLI for database creation, migrations, resets, schema inspection or database type generation. Database changes begin in `prisma/schema.prisma`, are captured in `prisma/migrations`, and regenerate `prisma/generated/prisma`.

## Bootstrap the admin

The admin creation command accepts only an email address and password:

```powershell
pnpm auth:bootstrap-admin -- --email owner@example.com --password "a-strong-password"
```

It creates or updates the Supabase Auth identity and upserts the matching Prisma profile as `admin`. Consumers use storefront registration. Store managers must be invited by the owner from `/admin/team`; they complete their own password and profile through the Supabase invitation email.

## Verification

Run `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` before delivery.
