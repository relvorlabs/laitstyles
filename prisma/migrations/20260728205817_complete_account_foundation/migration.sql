-- CreateEnum
CREATE TYPE "privacy_consent_key" AS ENUM ('analytics', 'personalization', 'marketing_email', 'marketing_sms');

-- CreateEnum
CREATE TYPE "data_export_status" AS ENUM ('queued', 'processing', 'ready', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "account_deletion_status" AS ENUM ('requested', 'blocked', 'cancelled', 'scheduled', 'completed');

-- CreateEnum
CREATE TYPE "contact_channel" AS ENUM ('email', 'sms', 'whatsapp', 'none');

-- CreateEnum
CREATE TYPE "sizing_unit_system" AS ENUM ('metric', 'imperial');

-- CreateEnum
CREATE TYPE "notification_category" AS ENUM ('order_updates', 'promotions', 'support', 'security');

-- CreateEnum
CREATE TYPE "support_ticket_category" AS ENUM ('order', 'payment', 'product', 'account', 'other');

-- CreateEnum
CREATE TYPE "support_ticket_status" AS ENUM ('open', 'pending_customer', 'pending_staff', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "support_message_author_kind" AS ENUM ('customer', 'staff');

-- CreateTable
CREATE TABLE "privacy_consents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "consent_key" "privacy_consent_key" NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "policy_version" TEXT NOT NULL,
    "effective_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "privacy_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_export_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "status" "data_export_status" NOT NULL DEFAULT 'queued',
    "storage_key" TEXT,
    "error" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "data_export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_deletion_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "status" "account_deletion_status" NOT NULL DEFAULT 'requested',
    "reason" TEXT,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_for" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "account_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_preferences" (
    "customer_id" UUID NOT NULL,
    "contact_channel" "contact_channel" NOT NULL DEFAULT 'email',
    "sizing_unit" "sizing_unit_system" NOT NULL DEFAULT 'metric',
    "marketing_opt_in" BOOLEAN NOT NULL DEFAULT false,
    "personalization_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_preferences_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "category" "notification_category" NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "category" "notification_category" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "data" JSONB NOT NULL DEFAULT '{}',
    "event_key" TEXT,
    "read_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "category" "support_ticket_category" NOT NULL DEFAULT 'other',
    "status" "support_ticket_status" NOT NULL DEFAULT 'open',
    "last_message_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticket_id" UUID NOT NULL,
    "author_kind" "support_message_author_kind" NOT NULL,
    "author_profile_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "message_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "privacy_consents_customer_key_effective_idx" ON "privacy_consents"("customer_id", "consent_key", "effective_at" DESC);

-- CreateIndex
CREATE INDEX "data_export_jobs_customer_created_idx" ON "data_export_jobs"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "data_export_jobs_status_expires_idx" ON "data_export_jobs"("status", "expires_at");

-- CreateIndex
CREATE INDEX "account_deletion_requests_customer_created_idx" ON "account_deletion_requests"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "account_deletion_requests_status_scheduled_idx" ON "account_deletion_requests"("status", "scheduled_for");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_customer_category_unique" ON "notification_preferences"("customer_id", "category");

-- CreateIndex
CREATE INDEX "notifications_customer_created_idx" ON "notifications"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_customer_unread_idx" ON "notifications"("customer_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_event_key_unique" ON "notifications"("event_key") WHERE (event_key IS NOT NULL);

-- CreateIndex
CREATE INDEX "support_tickets_customer_created_idx" ON "support_tickets"("customer_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "support_tickets_status_updated_idx" ON "support_tickets"("status", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "support_messages_ticket_created_idx" ON "support_messages"("ticket_id", "created_at" ASC);

-- CreateIndex
CREATE INDEX "support_attachments_message_idx" ON "support_attachments"("message_id");

-- AddForeignKey
ALTER TABLE "privacy_consents" ADD CONSTRAINT "privacy_consents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "data_export_jobs" ADD CONSTRAINT "data_export_jobs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account_deletion_requests" ADD CONSTRAINT "account_deletion_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customer_preferences" ADD CONSTRAINT "customer_preferences_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_author_profile_id_fkey" FOREIGN KEY ("author_profile_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "support_attachments" ADD CONSTRAINT "support_attachments_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "support_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "support_attachments" ADD CONSTRAINT "support_attachments_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "cloudinary_assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- ---------------------------------------------------------------------------
-- Reviewed constraints (hand-written, appended to the generated DDL above).
-- All new tables are empty at creation time in this same migration, so no
-- CHECK constraint below needs NOT VALID.
-- ---------------------------------------------------------------------------

-- At most one active (non-terminal) deletion request per customer.
create unique index account_deletion_requests_active_customer_unique
  on public.account_deletion_requests (customer_id)
  where (status not in ('cancelled', 'completed'));

-- An export only carries an expiry once it becomes ready, and it must be
-- after the job was created.
alter table public.data_export_jobs
  add constraint data_export_jobs_expiry_after_creation
  check (expires_at is null or expires_at > created_at);

-- A support message authored by staff must record the staff profile; a
-- customer-authored message must not impersonate a staff author.
alter table public.support_messages
  add constraint support_messages_author_kind_matches_profile
  check (
    (author_kind = 'staff' and author_profile_id is not null)
    or (author_kind = 'customer' and author_profile_id is null)
  );

-- An attachment cannot describe an empty or negative-size file.
alter table public.support_attachments
  add constraint support_attachments_size_positive
  check (size_bytes > 0);

-- ---------------------------------------------------------------------------
-- Row level security. Every policy derives ownership from the owning
-- customer's `profile_id`, joined from `(select auth.uid())` — never from a
-- client-supplied customer id. Guarded so `prisma migrate reset`/CI against a
-- bare PostgreSQL database (no `auth.uid()`/`authenticated` role) still
-- succeeds, matching the existing pattern in
-- 20260724121500_supabase_auth_profile_bridge/migration.sql.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('auth.uid()') is not null
     and exists (select 1 from pg_roles where rolname = 'authenticated') then

    alter table public.customer_preferences enable row level security;
    alter table public.notification_preferences enable row level security;
    alter table public.notifications enable row level security;
    alter table public.privacy_consents enable row level security;
    alter table public.support_tickets enable row level security;
    alter table public.support_messages enable row level security;
    alter table public.support_attachments enable row level security;
    alter table public.data_export_jobs enable row level security;
    alter table public.account_deletion_requests enable row level security;

    -- customer_preferences: one row per customer, owner-only.
    drop policy if exists customer_preferences_select_owner on public.customer_preferences;
    execute $policy$
      create policy customer_preferences_select_owner
      on public.customer_preferences
      for select
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = customer_preferences.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists customer_preferences_insert_owner on public.customer_preferences;
    execute $policy$
      create policy customer_preferences_insert_owner
      on public.customer_preferences
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.customers c
          where c.id = customer_preferences.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists customer_preferences_update_owner on public.customer_preferences;
    execute $policy$
      create policy customer_preferences_update_owner
      on public.customer_preferences
      for update
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = customer_preferences.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.customers c
          where c.id = customer_preferences.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    -- notification_preferences: owner-only.
    drop policy if exists notification_preferences_select_owner on public.notification_preferences;
    execute $policy$
      create policy notification_preferences_select_owner
      on public.notification_preferences
      for select
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = notification_preferences.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists notification_preferences_insert_owner on public.notification_preferences;
    execute $policy$
      create policy notification_preferences_insert_owner
      on public.notification_preferences
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.customers c
          where c.id = notification_preferences.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists notification_preferences_update_owner on public.notification_preferences;
    execute $policy$
      create policy notification_preferences_update_owner
      on public.notification_preferences
      for update
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = notification_preferences.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.customers c
          where c.id = notification_preferences.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    -- notifications: owner reads their own feed and may mark rows read; only
    -- the server (a privileged, RLS-bypassing connection) creates rows.
    drop policy if exists notifications_select_owner on public.notifications;
    execute $policy$
      create policy notifications_select_owner
      on public.notifications
      for select
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = notifications.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists notifications_update_owner on public.notifications;
    execute $policy$
      create policy notifications_update_owner
      on public.notifications
      for update
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = notifications.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.customers c
          where c.id = notifications.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    -- privacy_consents: append-only audit log. Owner may read and append a
    -- new consent record; no update/delete policy exists, so past consent
    -- decisions stay immutable even for the owning customer.
    drop policy if exists privacy_consents_select_owner on public.privacy_consents;
    execute $policy$
      create policy privacy_consents_select_owner
      on public.privacy_consents
      for select
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = privacy_consents.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists privacy_consents_insert_owner on public.privacy_consents;
    execute $policy$
      create policy privacy_consents_insert_owner
      on public.privacy_consents
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.customers c
          where c.id = privacy_consents.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    -- support_tickets: owner-only create/read/update. Status transitions are
    -- still enforced by the domain command layer, not by this policy alone.
    drop policy if exists support_tickets_select_owner on public.support_tickets;
    execute $policy$
      create policy support_tickets_select_owner
      on public.support_tickets
      for select
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = support_tickets.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists support_tickets_insert_owner on public.support_tickets;
    execute $policy$
      create policy support_tickets_insert_owner
      on public.support_tickets
      for insert
      to authenticated
      with check (
        exists (
          select 1 from public.customers c
          where c.id = support_tickets.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists support_tickets_update_owner on public.support_tickets;
    execute $policy$
      create policy support_tickets_update_owner
      on public.support_tickets
      for update
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = support_tickets.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
      with check (
        exists (
          select 1 from public.customers c
          where c.id = support_tickets.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    -- support_messages: ownership is derived through the owning ticket. A
    -- customer may only insert a message authored as themselves; the check
    -- constraint above additionally guarantees a customer-authored row can
    -- never carry a staff profile id.
    drop policy if exists support_messages_select_owner on public.support_messages;
    execute $policy$
      create policy support_messages_select_owner
      on public.support_messages
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.support_tickets t
          join public.customers c on c.id = t.customer_id
          where t.id = support_messages.ticket_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists support_messages_insert_owner on public.support_messages;
    execute $policy$
      create policy support_messages_insert_owner
      on public.support_messages
      for insert
      to authenticated
      with check (
        author_kind = 'customer'::public.support_message_author_kind
        and exists (
          select 1
          from public.support_tickets t
          join public.customers c on c.id = t.customer_id
          where t.id = support_messages.ticket_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    -- support_attachments: ownership derived through support_messages ->
    -- support_tickets -> customers.
    drop policy if exists support_attachments_select_owner on public.support_attachments;
    execute $policy$
      create policy support_attachments_select_owner
      on public.support_attachments
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.support_messages m
          join public.support_tickets t on t.id = m.ticket_id
          join public.customers c on c.id = t.customer_id
          where m.id = support_attachments.message_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists support_attachments_insert_owner on public.support_attachments;
    execute $policy$
      create policy support_attachments_insert_owner
      on public.support_attachments
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.support_messages m
          join public.support_tickets t on t.id = m.ticket_id
          join public.customers c on c.id = t.customer_id
          where m.id = support_attachments.message_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    -- data_export_jobs: the customer may only read their own export job
    -- status/history. Jobs are created and transitioned by the server using
    -- a privileged connection, not the authenticated browser role, so there
    -- is no insert/update policy here.
    drop policy if exists data_export_jobs_select_owner on public.data_export_jobs;
    execute $policy$
      create policy data_export_jobs_select_owner
      on public.data_export_jobs
      for select
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = data_export_jobs.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    -- account_deletion_requests: the customer may read their own request,
    -- open a new one, and cancel it; only the server may schedule/complete
    -- one (no authenticated policy allows setting those states directly).
    drop policy if exists account_deletion_requests_select_owner on public.account_deletion_requests;
    execute $policy$
      create policy account_deletion_requests_select_owner
      on public.account_deletion_requests
      for select
      to authenticated
      using (
        exists (
          select 1 from public.customers c
          where c.id = account_deletion_requests.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists account_deletion_requests_insert_owner on public.account_deletion_requests;
    execute $policy$
      create policy account_deletion_requests_insert_owner
      on public.account_deletion_requests
      for insert
      to authenticated
      with check (
        status = 'requested'::public.account_deletion_status
        and cancelled_at is null
        and completed_at is null
        and exists (
          select 1 from public.customers c
          where c.id = account_deletion_requests.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

    drop policy if exists account_deletion_requests_cancel_owner on public.account_deletion_requests;
    execute $policy$
      create policy account_deletion_requests_cancel_owner
      on public.account_deletion_requests
      for update
      to authenticated
      using (
        status in ('requested'::public.account_deletion_status, 'blocked'::public.account_deletion_status)
        and exists (
          select 1 from public.customers c
          where c.id = account_deletion_requests.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
      with check (
        status = 'cancelled'::public.account_deletion_status
        and exists (
          select 1 from public.customers c
          where c.id = account_deletion_requests.customer_id
            and c.profile_id = (select auth.uid())
        )
      )
    $policy$;

  end if;
end
$$;

