# Laitstyle Control Room V2 — Phase 11 Prisma Database Foundation

## Objective

Use Prisma as the only database management layer for the single Laitstyle store. Supabase remains the authentication provider and does not manage the application schema.

## Source of truth

- `prisma/schema.prisma` defines the application database.
- `prisma/migrations` contains migration history.
- `prisma/generated/prisma` is the generated database client.
- `profiles.role` is the authorization field.
- `catalogue_categories.image_url` stores storefront category artwork.
- `store_settings` is a singleton row.

The schema has no tenant, store, membership, invitation, platform-admin or database capability models. Business rows implicitly belong to the single store and therefore have no store foreign key.

## Workflow

1. Edit `prisma/schema.prisma`.
2. Run `pnpm exec prisma format` and `pnpm exec prisma validate`.
3. Create a development migration with `pnpm exec prisma migrate dev --name <change>`, or generate a review-only diff with `pnpm exec prisma migrate diff`.
4. Run `pnpm prisma:generate`.
5. Apply committed migrations in deployment with `pnpm exec prisma migrate deploy`.

Never use the Supabase CLI for database operations or generated database types.

## Acceptance

- The Prisma schema validates and Prisma Client generates.
- The committed baseline represents the current single-store schema.
- Category image URLs exist in Prisma, seed data and the public catalog projection.
- Backend guards and client controls agree on the three-role capability matrix.
- The admin bootstrap accepts only email and password.
