-- ---------------------------------------------------------------------------
-- Fixes a final-whole-branch-review CRITICAL finding on Plan 01: four
-- server-only operational tables created by 20260729060000_payment_finance_
-- foundation -- `idempotency_records`, `outbox_messages`,
-- `provider_webhook_events`, `payment_disputes` -- had zero RLS enabled,
-- leaving them queryable by any anon/authenticated PostgREST request. Unlike
-- `payment_authorizations`/`payment_refunds` (fixed in
-- 20260729080000_payment_customer_rls with SELECT-only owner policies
-- because those two are customer-visible), these four have no natural
-- per-customer owner: the idempotency ledger, outbox queue, webhook inbox,
-- and disputes are staff/system-managed, exactly like the payout/settlement
-- tables 20260729060000 already enabled RLS on with zero consumer policies.
--
-- This migration enables RLS on all four with no policies at all, matching
-- that same "owner-only" pattern: Prisma connects via the service role and
-- bypasses RLS entirely, so the server's privileged connection is unaffected
-- and only the anon/authenticated PostgREST roles lose access.
--
-- Enabling RLS does not require `auth.uid()`/the `authenticated` role to
-- exist (no policies are created here), so -- matching how
-- 20260729060000_payment_finance_foundation's own RLS-enable lines for the
-- payout/settlement tables are structured -- this is not wrapped in the
-- `auth.uid()`/`authenticated`-role guard used by
-- 20260724121500_supabase_auth_profile_bridge,
-- 20260728205817_complete_account_foundation, and
-- 20260729080000_payment_customer_rls for their policy-creation blocks. It
-- must succeed unguarded against a bare PostgreSQL database used by
-- `prisma migrate reset`/CI.
-- ---------------------------------------------------------------------------
alter table public.idempotency_records enable row level security;
alter table public.outbox_messages enable row level security;
alter table public.provider_webhook_events enable row level security;
alter table public.payment_disputes enable row level security;
