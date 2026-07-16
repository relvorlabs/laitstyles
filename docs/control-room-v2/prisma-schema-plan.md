# Laitstyle single-store Prisma schema plan

Prisma owns all application tables and migrations. Supabase is limited to authentication identities and sessions.

## Identity and authorization

`profiles` contains contact fields and `role account_role`. Valid roles are `consumer`, `admin` and `manager`. A partial unique constraint permits only one `admin` profile. Permission checks use the typed static matrix in `src/lib/auth/permissions.ts` and are repeated at server mutation boundaries.

## Commerce

The schema supports unique, stocked and variant products; global category, collection and product slugs; stock, holds, carts, orders, returns, customers, reviews and audit events. Rows implicitly belong to the single store and therefore have no store foreign key.

`catalogue_categories.image_url` is the category artwork source. The public projection validates that every category has an image and supplies it to the home-page category cards.

## Settings

`store_settings` is a singleton keyed by `id = 1`. Managers may read settings; only the admin may update them.

## Migration discipline

All changes start in `prisma/schema.prisma`, produce a reviewed Prisma migration and regenerate Prisma Client. The baseline in `prisma/migrations/00000000000000_init` is for fresh databases. An existing database must be reconciled and baselined deliberately before deployment; never mark a migration applied unless its schema is already present.
