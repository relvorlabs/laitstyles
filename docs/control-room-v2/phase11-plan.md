# Laitstyle Control Room V2 — Phase 11 Supabase Database, Storage and RLS

## Status

**Planned.**

Phase 11 starts only after Phase 10 has a working authenticated identity and permission model.

## Goal

Create the Supabase database, storage, RLS policies and generated types required for Laitstyle to run Control Room and storefront flows from real authenticated data.

## Source requirements

- Current Supabase changelog checked for database, Data API and Auth/RLS breaking changes.
- Current Supabase RLS docs checked.
- Current Supabase CLI help checked before migration commands.
- Current Supabase storage/security docs checked before bucket policies.

## Migration workflow

- Use Supabase CLI to create migration files. Do not hand-invent migration timestamps.
- Apply migrations to a fresh local database.
- Seed only deterministic development data.
- Generate TypeScript database types after migrations apply.
- Run Supabase advisors or equivalent review when available.
- Add database/RLS tests where local tooling supports them.

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
- storage buckets for product media and brand assets

## RLS principles

- Enable RLS on every table in exposed schemas.
- Use explicit `TO anon` and `TO authenticated` policy targets.
- Public `anon` policies may read only published storefront-visible catalogue data.
- Consumer policies restrict rows to the authenticated profile/customer relationship.
- Staff policies require active store membership and the relevant role/capability.
- Owner-only policies remain owner-only at the database layer.
- RLS predicates use indexed `store_id`, `organization_id`, `profile_id`, `customer_id`, `product_id`, `order_id` and other stable keys.
- Any helper function used by RLS lives outside exposed schemas where possible, has a locked `search_path`, includes an auth check and has carefully granted execute permission.
- Exposed views use `security_invoker = true` when supported or stay outside exposed schemas.

## Storage scope

- `product-media` bucket for catalogue and detail images.
- `store-brand-assets` bucket for logos and brand imagery.
- Public reads only for assets attached to published storefront-visible records.
- Staff writes require store membership and media capability.
- Consumers cannot write product/store media.
- Future upload transforms/cropping remain out of scope unless explicitly added.

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
- Storage policies block unauthorized writes and cross-store media access.
- Generated database types are committed and used by adapters or validation tests.
- Supabase advisors or equivalent review has no unresolved critical findings, or blockers are documented.
- Lint, TypeScript, Vitest, build and relevant database/RLS tests pass.
