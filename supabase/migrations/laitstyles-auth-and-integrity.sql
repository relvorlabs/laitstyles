-- Run AFTER the Prisma migration that creates/updates the public tables and enums.
-- Review and backfill existing rows before validating NOT VALID constraints.

begin;

-- ---------------------------------------------------------------------------
-- Supabase Auth -> application profile bridge
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_auth_user_fk'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_auth_user_fk
      foreign key (id)
      references auth.users(id)
      on delete cascade;
  end if;
end
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    role,
    status,
    display_name,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    'consumer'::public.account_role,
    'active'::public.account_status,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name'
    ),
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.sync_auth_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set email = new.email,
      updated_at = now()
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update of email on auth.users
for each row execute function public.sync_auth_user_profile();

-- ---------------------------------------------------------------------------
-- Role helpers and privilege-escalation protection
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'::public.account_status
      and p.role in (
        'manager'::public.account_role,
        'admin'::public.account_role
      )
  );
$$;

create or replace function private.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.status = 'active'::public.account_status
      and p.role = 'admin'::public.account_role
  );
$$;

revoke all on function private.is_active_staff() from public;
revoke all on function private.is_active_admin() from public;
grant execute on function private.is_active_staff() to anon, authenticated;
grant execute on function private.is_active_admin() to anon, authenticated;

create or replace function public.protect_profile_authorization_fields()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  -- service-role/server writes have no auth.uid() and are allowed.
  if (select auth.uid()) is not null
     and (select auth.uid()) = old.id
     and not private.is_active_admin() then
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.email is distinct from old.email then
      raise exception 'Users cannot change their own role, status, or auth email';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_authorization_fields on public.profiles;
create trigger protect_profile_authorization_fields
before update on public.profiles
for each row execute function public.protect_profile_authorization_fields();

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own_or_staff on public.profiles;
create policy profiles_select_own_or_staff
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_active_staff())
);

drop policy if exists profiles_update_own_or_admin on public.profiles;
create policy profiles_update_own_or_admin
on public.profiles
for update
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_active_admin())
)
with check (
  id = (select auth.uid())
  or (select private.is_active_admin())
);

-- A consumer owns at most one customer row through customers.profile_id.
alter table public.customers enable row level security;

drop policy if exists customers_select_own_or_staff on public.customers;
create policy customers_select_own_or_staff
on public.customers
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.is_active_staff())
);

drop policy if exists customers_insert_own_or_staff on public.customers;
create policy customers_insert_own_or_staff
on public.customers
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  or (select private.is_active_staff())
);

drop policy if exists customers_update_own_or_staff on public.customers;
create policy customers_update_own_or_staff
on public.customers
for update
to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.is_active_staff())
)
with check (
  profile_id = (select auth.uid())
  or (select private.is_active_staff())
);

-- ---------------------------------------------------------------------------
-- Cross-table relation invariants
-- ---------------------------------------------------------------------------
create or replace function public.assert_variant_matches_product()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.variant_id is not null
     and not exists (
       select 1
       from public.product_variants v
       where v.id = new.variant_id
         and v.product_id = new.product_id
     ) then
    raise exception 'Variant % does not belong to product %', new.variant_id, new.product_id;
  end if;

  return new;
end;
$$;

-- These tables all expose product_id + variant_id with identical semantics.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'holds',
    'order_lines',
    'product_media',
    'stock_levels',
    'stock_movements'
  ] loop
    execute format('drop trigger if exists assert_variant_matches_product on public.%I', table_name);
    execute format(
      'create trigger assert_variant_matches_product before insert or update of product_id, variant_id on public.%I for each row execute function public.assert_variant_matches_product()',
      table_name
    );
  end loop;
end
$$;

create or replace function public.assert_hold_matches_order_customer()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_id is not null
     and not exists (
       select 1
       from public.orders o
       where o.id = new.order_id
         and o.customer_id = new.customer_id
     ) then
    raise exception 'Hold customer does not own the selected order';
  end if;

  return new;
end;
$$;

drop trigger if exists assert_hold_matches_order_customer on public.holds;
create trigger assert_hold_matches_order_customer
before insert or update of order_id, customer_id on public.holds
for each row execute function public.assert_hold_matches_order_customer();

create or replace function public.assert_payment_event_matches_order()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payment_id is not null
     and not exists (
       select 1
       from public.payments p
       where p.id = new.payment_id
         and p.order_id = new.order_id
     ) then
    raise exception 'Payment event references a payment from another order';
  end if;

  return new;
end;
$$;

drop trigger if exists assert_payment_event_matches_order on public.order_payment_events;
create trigger assert_payment_event_matches_order
before insert or update of payment_id, order_id on public.order_payment_events
for each row execute function public.assert_payment_event_matches_order();

create or replace function public.assert_return_line_matches_return_order()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.returns r
    join public.order_lines ol on ol.id = new.order_line_id
    where r.id = new.return_id
      and r.order_id = ol.order_id
  ) then
    raise exception 'Return line does not belong to the return order';
  end if;

  return new;
end;
$$;

drop trigger if exists assert_return_line_matches_return_order on public.return_lines;
create trigger assert_return_line_matches_return_order
before insert or update of return_id, order_line_id on public.return_lines
for each row execute function public.assert_return_line_matches_return_order();

create or replace function public.assert_stock_level_matches_inventory_mode()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  mode public.product_inventory_mode;
begin
  select p.inventory_mode
  into mode
  from public.products p
  where p.id = new.product_id;

  if mode = 'variant'::public.product_inventory_mode and new.variant_id is null then
    raise exception 'Variant products require variant-level stock rows';
  end if;

  if mode in (
       'unique'::public.product_inventory_mode,
       'stocked'::public.product_inventory_mode
     ) and new.variant_id is not null then
    raise exception 'Unique and stocked products require product-level stock rows';
  end if;

  if mode = 'unique'::public.product_inventory_mode and (
    new.total_received > 1
    or new.available > 1
    or new.reserved > 1
    or new.committed > 1
    or new.sold > 1
    or new.returned > 1
    or new.damaged > 1
  ) then
    raise exception 'A unique product cannot contain more than one physical unit';
  end if;

  return new;
end;
$$;

drop trigger if exists assert_stock_level_matches_inventory_mode on public.stock_levels;
create trigger assert_stock_level_matches_inventory_mode
before insert or update on public.stock_levels
for each row execute function public.assert_stock_level_matches_inventory_mode();

-- ---------------------------------------------------------------------------
-- Reviews: verified purchases, moderation, and customer/admin ownership
-- ---------------------------------------------------------------------------
create or replace function public.protect_review_moderation_fields()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if (select auth.uid()) is not null
     and not private.is_active_staff()
     and (
       new.status is distinct from old.status
       or new.reviewed_by_profile_id is distinct from old.reviewed_by_profile_id
       or new.reviewed_at is distinct from old.reviewed_at
       or new.rejection_reason is distinct from old.rejection_reason
     ) then
    raise exception 'Only active staff can moderate reviews';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_product_review_moderation on public.product_reviews;
create trigger protect_product_review_moderation
before update on public.product_reviews
for each row execute function public.protect_review_moderation_fields();

drop trigger if exists protect_order_review_moderation on public.order_reviews;
create trigger protect_order_review_moderation
before update on public.order_reviews
for each row execute function public.protect_review_moderation_fields();

alter table public.product_reviews enable row level security;
alter table public.order_reviews enable row level security;

drop policy if exists product_reviews_select on public.product_reviews;
create policy product_reviews_select
on public.product_reviews
for select
to anon, authenticated
using (
  status = 'approved'::public.review_status
  or (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.order_lines ol
      join public.orders o on o.id = ol.order_id
      join public.customers c on c.id = o.customer_id
      where ol.id = product_reviews.order_line_id
        and c.profile_id = (select auth.uid())
    )
  )
  or (select private.is_active_staff())
);

drop policy if exists product_reviews_insert_owner on public.product_reviews;
create policy product_reviews_insert_owner
on public.product_reviews
for insert
to authenticated
with check (
  status = 'pending'::public.review_status
  and reviewed_by_profile_id is null
  and reviewed_at is null
  and rejection_reason is null
  and exists (
    select 1
    from public.order_lines ol
    join public.orders o on o.id = ol.order_id
    join public.customers c on c.id = o.customer_id
    where ol.id = product_reviews.order_line_id
      and c.profile_id = (select auth.uid())
      and o.fulfilment_status in (
        'delivered'::public.fulfilment_status,
        'partially_returned'::public.fulfilment_status,
        'returned'::public.fulfilment_status
      )
  )
);

drop policy if exists product_reviews_update_owner_or_staff on public.product_reviews;
create policy product_reviews_update_owner_or_staff
on public.product_reviews
for update
to authenticated
using (
  (select private.is_active_staff())
  or (
    status = 'pending'::public.review_status
    and exists (
      select 1
      from public.order_lines ol
      join public.orders o on o.id = ol.order_id
      join public.customers c on c.id = o.customer_id
      where ol.id = product_reviews.order_line_id
        and c.profile_id = (select auth.uid())
    )
  )
)
with check (
  (select private.is_active_staff())
  or exists (
    select 1
    from public.order_lines ol
    join public.orders o on o.id = ol.order_id
    join public.customers c on c.id = o.customer_id
    where ol.id = product_reviews.order_line_id
      and c.profile_id = (select auth.uid())
  )
);

drop policy if exists order_reviews_select on public.order_reviews;
create policy order_reviews_select
on public.order_reviews
for select
to anon, authenticated
using (
  status = 'approved'::public.review_status
  or (
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = order_reviews.order_id
        and c.profile_id = (select auth.uid())
    )
  )
  or (select private.is_active_staff())
);

drop policy if exists order_reviews_insert_owner on public.order_reviews;
create policy order_reviews_insert_owner
on public.order_reviews
for insert
to authenticated
with check (
  status = 'pending'::public.review_status
  and reviewed_by_profile_id is null
  and reviewed_at is null
  and rejection_reason is null
  and exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = order_reviews.order_id
      and c.profile_id = (select auth.uid())
      and o.fulfilment_status in (
        'delivered'::public.fulfilment_status,
        'partially_returned'::public.fulfilment_status,
        'returned'::public.fulfilment_status
      )
  )
);

drop policy if exists order_reviews_update_owner_or_staff on public.order_reviews;
create policy order_reviews_update_owner_or_staff
on public.order_reviews
for update
to authenticated
using (
  (select private.is_active_staff())
  or (
    status = 'pending'::public.review_status
    and exists (
      select 1
      from public.orders o
      join public.customers c on c.id = o.customer_id
      where o.id = order_reviews.order_id
        and c.profile_id = (select auth.uid())
    )
  )
)
with check (
  (select private.is_active_staff())
  or exists (
    select 1
    from public.orders o
    join public.customers c on c.id = o.customer_id
    where o.id = order_reviews.order_id
      and c.profile_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Check constraints. NOT VALID avoids blocking the migration on old bad rows;
-- PostgreSQL still enforces each constraint for new/updated rows.
-- ---------------------------------------------------------------------------
alter table public.order_lines
  drop constraint if exists order_lines_quantity_positive,
  add constraint order_lines_quantity_positive
    check (quantity > 0) not valid;

alter table public.holds
  drop constraint if exists holds_quantity_positive,
  add constraint holds_quantity_positive
    check (quantity > 0) not valid;

alter table public.return_lines
  drop constraint if exists return_lines_quantity_positive,
  add constraint return_lines_quantity_positive
    check (quantity > 0) not valid;

alter table public.payments
  drop constraint if exists payments_amount_positive,
  add constraint payments_amount_positive
    check (amount > 0) not valid;

alter table public.deliveries
  drop constraint if exists deliveries_attempts_nonnegative,
  add constraint deliveries_attempts_nonnegative
    check (attempts >= 0) not valid;

alter table public.stock_levels
  drop constraint if exists stock_levels_nonnegative,
  add constraint stock_levels_nonnegative
    check (
      total_received >= 0
      and available >= 0
      and reserved >= 0
      and committed >= 0
      and sold >= 0
      and returned >= 0
      and damaged >= 0
    ) not valid;

alter table public.orders
  drop constraint if exists orders_amounts_valid,
  add constraint orders_amounts_valid
    check (
      subtotal >= 0
      and delivery_fee >= 0
      and discount_amount >= 0
      and total >= 0
      and refunded_amount >= 0
      and refunded_amount <= total
      and total = subtotal + delivery_fee - discount_amount
    ) not valid,
  drop constraint if exists orders_fulfilment_target_valid,
  add constraint orders_fulfilment_target_valid
    check (
      (
        fulfilment_method = 'delivery'::public.fulfilment_method
        and pickup_location_id is null
      )
      or
      (
        fulfilment_method = 'pickup'::public.fulfilment_method
        and pickup_location_id is not null
        and delivery_zone_id is null
      )
    ) not valid;

alter table public.product_reviews
  drop constraint if exists product_reviews_rating_valid,
  add constraint product_reviews_rating_valid
    check (rating between 1 and 5) not valid;

alter table public.order_reviews
  drop constraint if exists order_reviews_ratings_valid,
  add constraint order_reviews_ratings_valid
    check (
      overall_rating between 1 and 5
      and (delivery_rating is null or delivery_rating between 1 and 5)
      and (packaging_rating is null or packaging_rating between 1 and 5)
      and (service_rating is null or service_rating between 1 and 5)
    ) not valid;

alter table public.store_settings
  drop constraint if exists store_settings_singleton_id,
  add constraint store_settings_singleton_id
    check (id = 1) not valid;

commit;

-- After cleaning historical data, validate each NOT VALID constraint, e.g.:
-- alter table public.orders validate constraint orders_amounts_valid;
-- alter table public.stock_levels validate constraint stock_levels_nonnegative;
