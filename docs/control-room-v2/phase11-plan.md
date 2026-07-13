# Laitstyle Control Room V2 — Phase 11 Supabase Database, Storage and RLS

## Status

**In progress by direct user override on 2026-07-11.**

Phase 10 still has documented browser OAuth and required React Doctor `--diff` blockers. The user
explicitly requested Phase 11 start anyway, with the additional rule that owner/admin accounts are
created only from CLI bootstrap tooling and Supabase never stores uploaded image blobs.

## Goal

Create the Supabase database, Cloudinary-backed asset metadata, RLS policies and generated types
required for Laitstyle to run Control Room and storefront flows from real authenticated data.

## Source requirements

- Current Supabase changelog checked for database, Data API and Auth/RLS breaking changes.
- Current Supabase RLS docs checked.
- Current Supabase CLI help checked before migration commands.
- Current Cloudinary upload docs checked before asset metadata/write contracts.

## Migration workflow

- Use Supabase CLI to create migration files. Do not hand-invent migration timestamps.
- Apply migrations to a fresh local database.
- Seed only deterministic development data.
- Generate TypeScript database types after migrations apply.
- Run Supabase advisors or equivalent review when available.
- Add database/RLS tests where local tooling supports them.
- Owner/admin bootstrap uses `pnpm supabase:bootstrap-owner` and service-role credentials only.
  Browser routes, public sign-up and Google OAuth callbacks must not create owner memberships.

## Schema scope

The detailed table blueprint lives in `docs/control-room-v2/supabase-schema-plan.md`.

Required domains:

- profiles, organizations, stores, memberships, invitations, role capabilities and audit events
- products, variants, media, measurements, categories, collections and channel visibility
- stock levels, stock movements and intake records
- holds, orders, order lines, payment events, fulfilment events and offline sales
- returns, return lines, dispositions and refund tracking
- customer profiles, addresses, preferences, notes and saved products
- product reviews
- store identity, selling preferences, delivery zones, pickup locations, payment preferences and notification preferences
- Cloudinary metadata for product media and brand assets

## RLS principles

- Enable RLS on every table in exposed schemas.
- Use explicit `TO anon` and `TO authenticated` policy targets.
- Public `anon` policies may read only published storefront-visible catalogue data.
- Consumer policies restrict rows to the authenticated profile/customer relationship.
- Staff policies require active store membership and the relevant role/capability.
- Owner-only policies remain owner-only at the database layer.
- Owner memberships require `created_by_cli = true`; authenticated browser clients can add only
  manager/operator memberships through owner-authorized policies.
- RLS predicates use indexed `store_id`, `organization_id`, `profile_id`, `customer_id`, `product_id`, `order_id` and other stable keys.
- Any helper function used by RLS lives outside exposed schemas where possible, has a locked `search_path`, includes an auth check and has carefully granted execute permission.
- Exposed views use `security_invoker = true` when supported or stay outside exposed schemas.

## Asset scope

- Supabase Storage is not used for Laitstyle image uploads in Phase 11.
- Supabase stores `cloudinary_assets`, `product_media` and `store_brand_assets` metadata only.
- `cloudinary_assets.provider` is constrained to `cloudinary` and `resource_type` to `image`.
- Image binary/blob upload to Supabase is forbidden; the migration must not create
  `storage.buckets`, `storage.objects` policies or `bytea` image columns.
- Public reads only expose Cloudinary metadata attached to published storefront-visible records or
  active storefront brand assets.
- Staff writes require store membership and the relevant inventory/settings capability.
- Consumers cannot write product/store media.
- Future signed Cloudinary upload routes or edge functions remain out of scope until a production
  upload UI is explicitly enabled.

## Out of scope

- TanStack Query migration.
- Realtime subscriptions.
- Payment settlement provider integration.
- Courier provider integration.
- Messaging provider integration.
- Analytics warehouse, accounting, tax, supplier or warehouse expansion.

## Acceptance criteria

- Migrations apply cleanly from a fresh local Supabase database.
- RLS is enabled on every exposed table.
- Public reads expose only published storefront-visible catalogue data.
- Staff RLS blocks cross-store access and enforces role/capability boundaries.
- Consumer RLS blocks access to other consumers' data and all staff-only data.
- Supabase image storage stays disabled/unused and Cloudinary metadata policies block unauthorized
  writes and cross-store media access.
- Generated database types are committed and used by adapters or validation tests, or local Docker
  blockers are documented with a schema-aligned interim type surface.
- Supabase advisors or equivalent review has no unresolved critical findings, or blockers are documented.
- Lint, TypeScript, Vitest, build and relevant database/RLS tests pass.
