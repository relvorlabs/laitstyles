# Storefront current-state audit

Updated 2026-07-15.

## Data and catalog

- Prisma is the only application database management layer.
- `prisma/schema.prisma` contains the single-store commerce model.
- `prisma/migrations/00000000000000_init/migration.sql` is the fresh-database baseline.
- PostgreSQL is the canonical storefront catalogue, read through the Prisma catalogue repository.
- `scripts/seed/storefront-catalog-snapshot.json` is retained only as one-time migration input; it is not a public or runtime data source.
- Categories have their own `image_url`; home category cards consume that field rather than borrowing product imagery.
- Product, collection, category and asset identifiers are globally unique because there is one store.

## Authentication and authorization

- Supabase Auth owns identities, passwords, OAuth and sessions.
- Prisma `profiles.role` owns application authorization.
- Valid roles are `consumer`, `admin` and `manager`.
- The admin is the one store owner; the database permits only one admin profile.
- Managers have operational capabilities without owner-only settings, audit or destructive inventory deletion.
- Consumers access only storefront and owned customer data.
- Server guards are authoritative; client controls mirror the same typed capability map.

## Tooling

- Database workflow: Prisma format, validate, migrate and generate.
- Admin bootstrap: `pnpm auth:bootstrap-admin -- --email <email> --password <password>`.
- The bootstrap accepts no name, profile, store or setup fields.
- Supabase tooling is not used for application database management.

## Honest boundaries

The storefront now reads catalogue records through Prisma. Production catalogue population, full OAuth browser completion, and production integration checks remain separate explicit gates; a successful development import is not evidence that production is populated.
