# Prisma and Supabase Auth architecture

## Ownership boundary

Prisma is the only database management layer. It owns `prisma/schema.prisma`, `prisma/migrations`, database access through Prisma Client, schema validation and generated application database types.

Supabase is limited to authentication identities, passwords, OAuth and sessions. The project does not use Supabase database commands, migration files or generated database types.

## Single-store model

All commerce data belongs to the one Laitstyle store. Business rows have no store or tenant foreign key. `store_settings` is a singleton. Category artwork is stored in `catalogue_categories.image_url`.

Authorization comes from `profiles.role`:

- `consumer` for storefront end users;
- `admin` for the one store owner;
- `manager` for operational staff.

Server guards use the static typed capability map. Client controls mirror those capabilities but never replace server authorization.

## Database workflow

1. Change `prisma/schema.prisma`.
2. Run `pnpm exec prisma format` and `pnpm exec prisma validate`.
3. Create a migration with Prisma in a development database, or use `prisma migrate diff` for a review-only SQL diff.
4. Review the migration and run `pnpm prisma:generate`.
5. Apply committed migrations with `pnpm exec prisma migrate deploy`.

The baseline migration represents the current schema for fresh databases. Existing databases require an explicit baseline/reconciliation step before deployment; do not mark the baseline applied unless the schema already matches.

## Authentication flow

Consumers may register through the storefront and receive a consumer profile. Staff cannot self-register. The one admin is created with `pnpm auth:bootstrap-admin -- --email <email> --password <password>`; managers are provisioned through an owner-controlled backend process.
