-- ---------------------------------------------------------------------------
-- Fixes a foundation-review BLOCKED finding on Plan 01 / Task 5: the browser
-- Supabase client (src/lib/supabase/client.ts) uses the anon/publishable key,
-- and no prior migration revoked PostgREST's default grants on `public`
-- tables, so `payment_authorizations` and `payment_refunds` -- both
-- customer-visible payment records -- were queryable directly by any
-- authenticated session because they had zero RLS enabled (left out of
-- 20260729060000_payment_finance_foundation as out of that task's scope).
--
-- This migration enables RLS on both tables with SELECT-only, owner-scoped
-- policies for the `authenticated` role -- no insert/update/delete consumer
-- policies. All writes to these tables stay server-only via Prisma's
-- service-role connection, which bypasses RLS entirely; that is the whole
-- reason no mutation policy is added here, matching the "no consumer
-- policies" pattern Task 3 used for the payout/settlement tables, just
-- paired with read visibility because these two tables ARE customer-facing.
--
-- Ownership paths:
--   payment_authorizations.customer_id -> customers.id directly.
--   payment_refunds.payment_id -> payments.id -> payments.order_id ->
--     orders.id -> orders.customer_id -> customers.id. Both payments.order_id
--     and orders.customer_id are non-nullable columns (see prisma/schema.prisma),
--     so this join chain has no ambiguity.
--
-- Guarded the same way as 20260724121500_supabase_auth_profile_bridge and
-- 20260728205817_complete_account_foundation (policy creation requires
-- `auth.uid()` and the `authenticated` role to exist) so `prisma migrate
-- reset`/CI against a bare PostgreSQL database still succeeds. Enabling RLS
-- itself does not require those to exist, but is kept inside the same guard
-- for symmetry with the policy statements that immediately follow it.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('auth.uid()') is not null
     and exists (select 1 from pg_roles where rolname = 'authenticated') then

    alter table public.payment_authorizations enable row level security;
    alter table public.payment_refunds enable row level security;

    -- payment_authorizations: owner reads their own saved payment methods.
    -- Only the server (a privileged, RLS-bypassing connection) creates,
    -- verifies, or deactivates an authorization.
    drop policy if exists payment_authorizations_select_owner on public.payment_authorizations;
    execute $policy$
      create policy payment_authorizations_select_owner
      on public.payment_authorizations
      for select
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = payment_authorizations.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    -- payment_refunds: owner reads refunds against their own orders' payments.
    -- Ownership is derived through payment_refunds -> payments -> orders ->
    -- customers, since payment_refunds has no direct customer_id column.
    -- Only the server creates/transitions a refund.
    drop policy if exists payment_refunds_select_owner on public.payment_refunds;
    execute $policy$
      create policy payment_refunds_select_owner
      on public.payment_refunds
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.payments p
          join public.orders o on o.id = p.order_id
          join public.customers c on c.id = o.customer_id
          where p.id = payment_refunds.payment_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

  end if;
end
$$;
