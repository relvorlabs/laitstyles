-- Dedicated least-privilege application runtime role for Prisma, separate from
-- the migration/owner role (ADR-05 §4.1 #7, docs/storefront-v2/04). The app
-- connects as this role (DATABASE_URL); migrations use the owner role (DIRECT_URL).
--
-- DEPLOY-TIME OPS STEP — not an auto-applied migration, and not runnable from
-- the app. Run once per environment as an admin/superuser connection, then:
--   1. set a password out-of-band (never commit it):
--        alter role app_runtime with password '<generated>';
--   2. point DATABASE_URL at this role via the Supabase pooler:
--        postgresql://app_runtime.<project-ref>:<pw>@<region>.pooler.supabase.com:6543/postgres?pgbouncer=true
--
-- CAVEAT (Supabase): granting BYPASSRLS requires a superuser role. Supabase's
-- default `postgres` role may not be able to create a BYPASSRLS role — provision
-- via the dashboard SQL editor as a privileged role, or (interim) keep using the
-- privileged pooler role which already bypasses RLS. Either way, RLS stays
-- ENABLED as defense-in-depth (ADR-05 §4.1 #8) and app-layer authz is the guard.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_runtime') then
    create role app_runtime with login bypassrls noinherit;
  end if;
end
$$;

-- Least privilege: DML on public commerce tables + sequences, execute on the
-- security-definer helpers, and read of auth.users (FK / identity joins).
grant usage on schema public to app_runtime;
grant select, insert, update, delete on all tables in schema public to app_runtime;
grant usage, select on all sequences in schema public to app_runtime;
alter default privileges in schema public
  grant select, insert, update, delete on tables to app_runtime;
alter default privileges in schema public
  grant usage, select on sequences to app_runtime;

grant usage on schema auth to app_runtime;
grant select on auth.users to app_runtime;

grant usage on schema private to app_runtime;
grant execute on all functions in schema private to app_runtime;

-- Intentionally NOT granted: schema/DDL ownership, role management, or access to
-- Supabase internal schemas. Migrations run as the owner role, not this one.
