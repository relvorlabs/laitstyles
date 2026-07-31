-- Prisma owns only the public application schema. A real foreign key from
-- public.profiles to Supabase-owned auth.users makes public-only introspection
-- fail with P4002 because Prisma must model every schema referenced by a
-- database constraint.
--
-- Remove the cross-schema constraint from the Prisma-owned table. The companion
-- Supabase migration installs an auth.users delete trigger that preserves
-- deterministic profile cleanup without exposing the auth schema to Prisma.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_auth_user_fk;
