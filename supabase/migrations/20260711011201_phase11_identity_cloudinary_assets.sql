create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'staff_role') then
    create type public.staff_role as enum ('owner', 'manager', 'operator');
  end if;

  if not exists (select 1 from pg_type where typname = 'membership_status') then
    create type public.membership_status as enum ('invited', 'active', 'suspended');
  end if;

  if not exists (select 1 from pg_type where typname = 'store_status') then
    create type public.store_status as enum ('active', 'paused', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'product_inventory_mode') then
    create type public.product_inventory_mode as enum ('unique', 'stocked', 'variant');
  end if;

  if not exists (select 1 from pg_type where typname = 'product_lifecycle') then
    create type public.product_lifecycle as enum ('draft', 'intake', 'active', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'product_publication') then
    create type public.product_publication as enum ('published', 'unpublished', 'scheduled');
  end if;

  if not exists (select 1 from pg_type where typname = 'product_channel') then
    create type public.product_channel as enum ('storefront', 'physical-store', 'whatsapp', 'instagram');
  end if;

  if not exists (select 1 from pg_type where typname = 'cloudinary_asset_kind') then
    create type public.cloudinary_asset_kind as enum ('product-cover', 'product-detail', 'product-defect', 'store-logo', 'store-brand');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  auth_user_id uuid generated always as (id) stored unique,
  email text,
  display_name text,
  phone text,
  avatar_cloudinary_public_id text,
  avatar_url text check (avatar_url is null or avatar_url like 'https://%'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  owner_profile_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.store_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_memberships (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.staff_role not null,
  status public.membership_status not null default 'invited',
  created_by_cli boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint store_memberships_profile_unique unique (store_id, profile_id),
  constraint store_memberships_owner_cli_only check (role <> 'owner' or created_by_cli)
);

comment on column public.store_memberships.created_by_cli is
  'Owner memberships must be created by the service-role CLI bootstrap. Browser clients must never create owner rows.';

create table public.role_capabilities (
  role public.staff_role not null,
  capability text not null check (length(trim(capability)) > 0),
  created_at timestamptz not null default now(),
  primary key (role, capability)
);

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  role public.staff_role not null check (role in ('manager', 'operator')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid references public.profiles(id) on delete set null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.catalogue_categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table public.catalogue_collections (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  slug text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.catalogue_categories(id) on delete set null,
  collection_id uuid references public.catalogue_collections(id) on delete set null,
  slug text not null,
  name text not null,
  description text not null default '',
  inventory_mode public.product_inventory_mode not null,
  brand text,
  price numeric(12,2) not null check (price >= 0),
  reference_price numeric(12,2) check (reference_price is null or reference_price >= 0),
  cost numeric(12,2) check (cost is null or cost >= 0),
  lifecycle public.product_lifecycle not null default 'draft',
  publication public.product_publication not null default 'unpublished',
  low_stock_threshold integer not null default 1 check (low_stock_threshold >= 0),
  archive_number text,
  sku text,
  condition text,
  size_label text,
  colour text,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table public.product_channels (
  product_id uuid not null references public.products(id) on delete cascade,
  channel public.product_channel not null,
  created_at timestamptz not null default now(),
  primary key (product_id, channel)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  sku text,
  size text,
  colour text,
  price numeric(12,2) check (price is null or price >= 0),
  cost numeric(12,2) check (cost is null or cost >= 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cloudinary_assets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provider text not null default 'cloudinary' check (provider = 'cloudinary'),
  resource_type text not null default 'image' check (resource_type = 'image'),
  kind public.cloudinary_asset_kind not null,
  public_id text not null check (length(trim(public_id)) > 0),
  secure_url text not null check (secure_url like 'https://res.cloudinary.com/%'),
  delivery_url text check (delivery_url is null or delivery_url like 'https://%'),
  format text,
  version bigint,
  width integer check (width is null or width > 0),
  height integer check (height is null or height > 0),
  bytes integer check (bytes is null or bytes > 0),
  alt text not null default '',
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (store_id, public_id)
);

comment on table public.cloudinary_assets is
  'Cloudinary metadata only. Image binary/blob uploads to Supabase storage are forbidden.';

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  asset_id uuid not null references public.cloudinary_assets(id) on delete restrict,
  kind public.cloudinary_asset_kind not null check (kind in ('product-cover', 'product-detail', 'product-defect')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (product_id, position)
);

create table public.store_brand_assets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  asset_id uuid not null references public.cloudinary_assets(id) on delete restrict,
  kind public.cloudinary_asset_kind not null check (kind in ('store-logo', 'store-brand')),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (store_id, kind, position)
);

create table public.product_measurements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  value text not null,
  position integer not null default 0
);

create table public.stock_levels (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  total_received integer not null default 0 check (total_received >= 0),
  available integer not null default 0 check (available >= 0),
  reserved integer not null default 0 check (reserved >= 0),
  sold integer not null default 0 check (sold >= 0),
  returned integer not null default 0 check (returned >= 0),
  damaged integer not null default 0 check (damaged >= 0),
  updated_at timestamptz not null default now(),
  constraint stock_levels_counts_match check (total_received >= available + reserved + sold + damaged)
);

create unique index stock_levels_product_variant_unique
  on public.stock_levels (product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  kind text not null check (kind in ('received', 'reserved', 'released', 'sold', 'returned', 'restocked', 'damaged', 'adjusted')),
  quantity integer not null check (quantity > 0),
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  note text,
  related_order_id uuid,
  related_hold_id uuid,
  related_return_id uuid
);

create table public.intake_records (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  stage text not null default 'received' check (stage in ('received', 'photographing', 'details-required', 'pricing-review', 'ready-to-publish', 'published')),
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  phone text,
  city text,
  type text not null default 'individual' check (type in ('individual', 'stylist', 'reseller', 'walk-in')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text,
  line1 text not null,
  line2 text,
  city text not null,
  state text,
  country text not null default 'Nigeria',
  is_default boolean not null default false,
  delivery_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  body text not null,
  author_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.customer_saved_products (
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table public.holds (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete set null,
  quantity integer not null check (quantity > 0),
  stage text not null default 'product' check (stage in ('product', 'cart', 'checkout', 'payment')),
  source text not null check (source in ('storefront', 'admin', 'whatsapp', 'instagram', 'physical-store')),
  payment_progress text,
  status text not null default 'active' check (status in ('active', 'released', 'converted', 'expired')),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  released_at timestamptz,
  converted_order_id uuid,
  note text
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete restrict,
  source text not null check (source in ('online-order', 'offline-sale', 'hold-conversion')),
  channel text,
  payment_status text not null default 'pending',
  payment_method text,
  fulfilment_status text not null default 'unfulfilled',
  total numeric(12,2) not null check (total >= 0),
  refunded_amount numeric(12,2) not null default 0 check (refunded_amount >= 0),
  placed_at timestamptz not null default now(),
  delivery_city text,
  delivery_address jsonb,
  courier jsonb,
  notes text,
  attention text,
  created_by_profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  stock_state text not null default 'uncommitted' check (stock_state in ('uncommitted', 'reserved', 'sold', 'returned', 'released'))
);

create table public.order_timeline_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  note text
);

create table public.order_payment_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_status text not null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  method text,
  occurred_at timestamptz not null default now(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  note text
);

create table public.returns (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete restrict,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status text not null default 'requested',
  reason text,
  refund_amount numeric(12,2) not null default 0 check (refund_amount >= 0),
  note text,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.return_lines (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns(id) on delete cascade,
  order_line_id uuid not null references public.order_lines(id) on delete restrict,
  product_id uuid not null references public.products(id) on delete restrict,
  variant_id uuid references public.product_variants(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  disposition text not null default 'pending' check (disposition in ('pending', 'restock', 'damaged'))
);

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text,
  body text,
  status text not null default 'pending' check (status in ('published', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  identity jsonb not null default '{}'::jsonb,
  selling jsonb not null default '{}'::jsonb,
  payments jsonb not null default '{}'::jsonb,
  notifications jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  city text not null,
  rate numeric(12,2) not null default 0 check (rate >= 0),
  estimated_days text,
  enabled boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.pickup_locations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  address text not null,
  enabled boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  kind text not null,
  title text not null,
  detail text,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  product_id uuid references public.products(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  occurred_at timestamptz not null default now()
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index organizations_owner_profile_id_idx on public.organizations (owner_profile_id);
create index stores_organization_id_idx on public.stores (organization_id);
create index store_memberships_profile_status_idx on public.store_memberships (profile_id, status);
create index store_memberships_store_role_status_idx on public.store_memberships (store_id, role, status);
create index staff_invitations_store_status_idx on public.staff_invitations (store_id, status);
create index products_store_lifecycle_publication_idx on public.products (store_id, lifecycle, publication);
create index products_store_inventory_mode_idx on public.products (store_id, inventory_mode);
create unique index products_store_archive_number_unique on public.products (store_id, archive_number) where archive_number is not null;
create unique index products_store_sku_unique on public.products (store_id, sku) where sku is not null;
create index product_channels_channel_idx on public.product_channels (channel);
create unique index product_variants_product_sku_unique on public.product_variants (product_id, sku) where sku is not null;
create index cloudinary_assets_store_kind_idx on public.cloudinary_assets (store_id, kind);
create index product_media_product_position_idx on public.product_media (product_id, position);
create index product_media_store_idx on public.product_media (store_id);
create index stock_levels_store_available_idx on public.stock_levels (store_id, available);
create index stock_movements_store_occurred_idx on public.stock_movements (store_id, occurred_at desc);
create index stock_movements_product_occurred_idx on public.stock_movements (product_id, occurred_at desc);
create index intake_records_store_stage_idx on public.intake_records (store_id, stage);
create index customers_store_email_idx on public.customers (store_id, email);
create index customers_profile_idx on public.customers (profile_id);
create index customer_notes_store_customer_idx on public.customer_notes (store_id, customer_id);
create index holds_store_status_expires_idx on public.holds (store_id, status, expires_at);
create index holds_customer_status_idx on public.holds (customer_id, status);
create index orders_store_placed_idx on public.orders (store_id, placed_at desc);
create index orders_customer_placed_idx on public.orders (customer_id, placed_at desc);
create index order_timeline_events_order_occurred_idx on public.order_timeline_events (order_id, occurred_at desc);
create index order_payment_events_order_occurred_idx on public.order_payment_events (order_id, occurred_at desc);
create index returns_store_status_idx on public.returns (store_id, status);
create index product_reviews_product_status_idx on public.product_reviews (product_id, status);
create index product_reviews_customer_idx on public.product_reviews (customer_id);
create index activity_events_store_occurred_idx on public.activity_events (store_id, occurred_at desc);
create index audit_events_store_created_idx on public.audit_events (store_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger stores_set_updated_at before update on public.stores
  for each row execute function public.set_updated_at();
create trigger store_memberships_set_updated_at before update on public.store_memberships
  for each row execute function public.set_updated_at();
create trigger staff_invitations_set_updated_at before update on public.staff_invitations
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();
create trigger intake_records_set_updated_at before update on public.intake_records
  for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger customer_addresses_set_updated_at before update on public.customer_addresses
  for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger returns_set_updated_at before update on public.returns
  for each row execute function public.set_updated_at();
create trigger product_reviews_set_updated_at before update on public.product_reviews
  for each row execute function public.set_updated_at();
create trigger store_settings_set_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();
create trigger delivery_zones_set_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();
create trigger pickup_locations_set_updated_at before update on public.pickup_locations
  for each row execute function public.set_updated_at();

create or replace function private.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = auth, public, pg_temp
as $$
  select auth.uid()
$$;

create or replace function private.is_active_store_member(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.store_memberships memberships
      where memberships.store_id = target_store_id
        and memberships.profile_id = auth.uid()
        and memberships.status = 'active'
    )
$$;

create or replace function private.has_store_role(target_store_id uuid, allowed_roles public.staff_role[])
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.store_memberships memberships
      where memberships.store_id = target_store_id
        and memberships.profile_id = auth.uid()
        and memberships.status = 'active'
        and memberships.role = any(allowed_roles)
    )
$$;

create or replace function private.has_store_capability(target_store_id uuid, needed_capability text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.store_memberships memberships
      join public.role_capabilities capabilities on capabilities.role = memberships.role
      where memberships.store_id = target_store_id
        and memberships.profile_id = auth.uid()
        and memberships.status = 'active'
        and capabilities.capability = needed_capability
    )
$$;

create or replace function private.owns_customer(target_customer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.customers customers
      where customers.id = target_customer_id
        and customers.profile_id = auth.uid()
    )
$$;

revoke all on function private.current_profile_id() from public;
revoke all on function private.is_active_store_member(uuid) from public;
revoke all on function private.has_store_role(uuid, public.staff_role[]) from public;
revoke all on function private.has_store_capability(uuid, text) from public;
revoke all on function private.owns_customer(uuid) from public;
grant execute on function private.current_profile_id() to authenticated;
grant execute on function private.is_active_store_member(uuid) to authenticated;
grant execute on function private.has_store_role(uuid, public.staff_role[]) to authenticated;
grant execute on function private.has_store_capability(uuid, text) to authenticated;
grant execute on function private.owns_customer(uuid) to authenticated;

insert into public.role_capabilities (role, capability)
values
  ('owner', 'control-room:access'),
  ('owner', 'storefront:read'),
  ('owner', 'inventory:read'),
  ('owner', 'inventory:create'),
  ('owner', 'inventory:update'),
  ('owner', 'inventory:archive'),
  ('owner', 'inventory:delete'),
  ('owner', 'orders:read'),
  ('owner', 'orders:update'),
  ('owner', 'holds:read'),
  ('owner', 'holds:update'),
  ('owner', 'sales:record'),
  ('owner', 'returns:read'),
  ('owner', 'returns:update'),
  ('owner', 'customers:read'),
  ('owner', 'customers:note'),
  ('owner', 'settings:read'),
  ('owner', 'settings:update'),
  ('owner', 'team:read'),
  ('owner', 'team:manage'),
  ('owner', 'reports:export'),
  ('owner', 'audit:read'),
  ('manager', 'control-room:access'),
  ('manager', 'storefront:read'),
  ('manager', 'inventory:read'),
  ('manager', 'inventory:create'),
  ('manager', 'inventory:update'),
  ('manager', 'inventory:archive'),
  ('manager', 'orders:read'),
  ('manager', 'orders:update'),
  ('manager', 'holds:read'),
  ('manager', 'holds:update'),
  ('manager', 'sales:record'),
  ('manager', 'returns:read'),
  ('manager', 'returns:update'),
  ('manager', 'customers:read'),
  ('manager', 'customers:note'),
  ('manager', 'settings:read'),
  ('manager', 'settings:update'),
  ('manager', 'team:read'),
  ('operator', 'control-room:access'),
  ('operator', 'storefront:read'),
  ('operator', 'inventory:read'),
  ('operator', 'inventory:update'),
  ('operator', 'orders:read'),
  ('operator', 'orders:update'),
  ('operator', 'holds:read'),
  ('operator', 'holds:update'),
  ('operator', 'sales:record'),
  ('operator', 'returns:read'),
  ('operator', 'customers:read'),
  ('operator', 'customers:note')
on conflict do nothing;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.stores enable row level security;
alter table public.store_memberships enable row level security;
alter table public.role_capabilities enable row level security;
alter table public.staff_invitations enable row level security;
alter table public.catalogue_categories enable row level security;
alter table public.catalogue_collections enable row level security;
alter table public.products enable row level security;
alter table public.product_channels enable row level security;
alter table public.product_variants enable row level security;
alter table public.cloudinary_assets enable row level security;
alter table public.product_media enable row level security;
alter table public.store_brand_assets enable row level security;
alter table public.product_measurements enable row level security;
alter table public.stock_levels enable row level security;
alter table public.stock_movements enable row level security;
alter table public.intake_records enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.customer_notes enable row level security;
alter table public.customer_saved_products enable row level security;
alter table public.holds enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.order_timeline_events enable row level security;
alter table public.order_payment_events enable row level security;
alter table public.returns enable row level security;
alter table public.return_lines enable row level security;
alter table public.product_reviews enable row level security;
alter table public.store_settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.pickup_locations enable row level security;
alter table public.activity_events enable row level security;
alter table public.audit_events enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.stores, public.catalogue_categories, public.catalogue_collections, public.products, public.product_channels, public.product_variants, public.cloudinary_assets, public.product_media, public.store_brand_assets, public.product_measurements, public.delivery_zones, public.pickup_locations to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

create policy "profiles_select_own_or_staff" on public.profiles
  for select to authenticated
  using (
    id = private.current_profile_id()
    or exists (
      select 1
      from public.store_memberships own_memberships
      join public.store_memberships target_memberships on target_memberships.store_id = own_memberships.store_id
      where own_memberships.profile_id = private.current_profile_id()
        and own_memberships.status = 'active'
        and target_memberships.profile_id = profiles.id
    )
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = private.current_profile_id())
  with check (id = private.current_profile_id());

create policy "profiles_insert_own" on public.profiles
  for insert to authenticated
  with check (id = private.current_profile_id());

create policy "organizations_staff_select" on public.organizations
  for select to authenticated
  using (
    exists (
      select 1
      from public.stores stores
      where stores.organization_id = organizations.id
        and private.is_active_store_member(stores.id)
    )
  );

create policy "stores_public_active_select" on public.stores
  for select to anon, authenticated
  using (status = 'active');

create policy "stores_staff_select" on public.stores
  for select to authenticated
  using (private.is_active_store_member(id));

create policy "stores_owner_update" on public.stores
  for update to authenticated
  using (private.has_store_role(id, array['owner']::public.staff_role[]))
  with check (private.has_store_role(id, array['owner']::public.staff_role[]));

create policy "store_memberships_staff_select" on public.store_memberships
  for select to authenticated
  using (
    profile_id = private.current_profile_id()
    or private.has_store_capability(store_id, 'team:read')
    or private.has_store_capability(store_id, 'team:manage')
  );

create policy "store_memberships_owner_add_non_owner" on public.store_memberships
  for insert to authenticated
  with check (
    role in ('manager', 'operator')
    and created_by_cli is false
    and private.has_store_capability(store_id, 'team:manage')
  );

create policy "store_memberships_owner_update_non_owner" on public.store_memberships
  for update to authenticated
  using (
    role in ('manager', 'operator')
    and private.has_store_capability(store_id, 'team:manage')
  )
  with check (
    role in ('manager', 'operator')
    and created_by_cli is false
    and private.has_store_capability(store_id, 'team:manage')
  );

create policy "role_capabilities_authenticated_read" on public.role_capabilities
  for select to authenticated
  using (true);

create policy "staff_invitations_owner_manage" on public.staff_invitations
  for all to authenticated
  using (private.has_store_capability(store_id, 'team:manage'))
  with check (private.has_store_capability(store_id, 'team:manage'));

create policy "catalogue_categories_public_visible" on public.catalogue_categories
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.products products
      join public.product_channels channels on channels.product_id = products.id
      where products.category_id = catalogue_categories.id
        and products.lifecycle = 'active'
        and products.publication = 'published'
        and channels.channel = 'storefront'
    )
  );

create policy "catalogue_categories_staff_manage" on public.catalogue_categories
  for all to authenticated
  using (private.has_store_capability(store_id, 'inventory:read'))
  with check (private.has_store_capability(store_id, 'inventory:update'));

create policy "catalogue_collections_public_visible" on public.catalogue_collections
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.products products
      join public.product_channels channels on channels.product_id = products.id
      where products.collection_id = catalogue_collections.id
        and products.lifecycle = 'active'
        and products.publication = 'published'
        and channels.channel = 'storefront'
    )
  );

create policy "catalogue_collections_staff_manage" on public.catalogue_collections
  for all to authenticated
  using (private.has_store_capability(store_id, 'inventory:read'))
  with check (private.has_store_capability(store_id, 'inventory:update'));

create policy "products_public_storefront_select" on public.products
  for select to anon, authenticated
  using (
    lifecycle = 'active'
    and publication = 'published'
    and exists (
      select 1 from public.product_channels channels
      where channels.product_id = products.id and channels.channel = 'storefront'
    )
    and exists (
      select 1 from public.stores stores
      where stores.id = products.store_id and stores.status = 'active'
    )
  );

create policy "products_staff_manage" on public.products
  for all to authenticated
  using (private.has_store_capability(store_id, 'inventory:read'))
  with check (private.has_store_capability(store_id, 'inventory:update'));

create policy "product_channels_read_if_product_visible" on public.product_channels
  for select to anon, authenticated
  using (exists (select 1 from public.products products where products.id = product_channels.product_id));

create policy "product_channels_staff_manage" on public.product_channels
  for all to authenticated
  using (exists (select 1 from public.products products where products.id = product_channels.product_id and private.has_store_capability(products.store_id, 'inventory:read')))
  with check (exists (select 1 from public.products products where products.id = product_channels.product_id and private.has_store_capability(products.store_id, 'inventory:update')));

create policy "product_variants_read_if_product_visible" on public.product_variants
  for select to anon, authenticated
  using (exists (select 1 from public.products products where products.id = product_variants.product_id));

create policy "product_variants_staff_manage" on public.product_variants
  for all to authenticated
  using (exists (select 1 from public.products products where products.id = product_variants.product_id and private.has_store_capability(products.store_id, 'inventory:read')))
  with check (exists (select 1 from public.products products where products.id = product_variants.product_id and private.has_store_capability(products.store_id, 'inventory:update')));

create policy "cloudinary_assets_public_product_or_brand_select" on public.cloudinary_assets
  for select to anon, authenticated
  using (
    exists (
      select 1
      from public.product_media media
      join public.products products on products.id = media.product_id
      join public.product_channels channels on channels.product_id = products.id
      where media.asset_id = cloudinary_assets.id
        and products.lifecycle = 'active'
        and products.publication = 'published'
        and channels.channel = 'storefront'
    )
    or exists (
      select 1
      from public.store_brand_assets brand_assets
      join public.stores stores on stores.id = brand_assets.store_id
      where brand_assets.asset_id = cloudinary_assets.id
        and stores.status = 'active'
    )
  );

create policy "cloudinary_assets_staff_manage" on public.cloudinary_assets
  for all to authenticated
  using (
    private.has_store_capability(store_id, 'inventory:read')
    or private.has_store_capability(store_id, 'settings:read')
  )
  with check (
    provider = 'cloudinary'
    and resource_type = 'image'
    and (
      private.has_store_capability(store_id, 'inventory:update')
      or private.has_store_capability(store_id, 'settings:update')
    )
  );

create policy "product_media_public_visible" on public.product_media
  for select to anon, authenticated
  using (exists (select 1 from public.products products where products.id = product_media.product_id));

create policy "product_media_staff_manage" on public.product_media
  for all to authenticated
  using (private.has_store_capability(store_id, 'inventory:read'))
  with check (private.has_store_capability(store_id, 'inventory:update'));

create policy "store_brand_assets_public_visible" on public.store_brand_assets
  for select to anon, authenticated
  using (exists (select 1 from public.stores stores where stores.id = store_brand_assets.store_id and stores.status = 'active'));

create policy "store_brand_assets_staff_manage" on public.store_brand_assets
  for all to authenticated
  using (private.has_store_capability(store_id, 'settings:read'))
  with check (private.has_store_capability(store_id, 'settings:update'));

create policy "product_measurements_read_if_product_visible" on public.product_measurements
  for select to anon, authenticated
  using (exists (select 1 from public.products products where products.id = product_measurements.product_id));

create policy "product_measurements_staff_manage" on public.product_measurements
  for all to authenticated
  using (exists (select 1 from public.products products where products.id = product_measurements.product_id and private.has_store_capability(products.store_id, 'inventory:read')))
  with check (exists (select 1 from public.products products where products.id = product_measurements.product_id and private.has_store_capability(products.store_id, 'inventory:update')));

create policy "stock_levels_staff_only" on public.stock_levels
  for all to authenticated
  using (private.has_store_capability(store_id, 'inventory:read'))
  with check (private.has_store_capability(store_id, 'inventory:update'));

create policy "stock_movements_staff_only" on public.stock_movements
  for all to authenticated
  using (private.has_store_capability(store_id, 'inventory:read'))
  with check (private.has_store_capability(store_id, 'inventory:update'));

create policy "intake_records_staff_only" on public.intake_records
  for all to authenticated
  using (private.has_store_capability(store_id, 'inventory:read'))
  with check (private.has_store_capability(store_id, 'inventory:update'));

create policy "customers_staff_or_owner_select" on public.customers
  for select to authenticated
  using (private.has_store_capability(store_id, 'customers:read') or profile_id = private.current_profile_id());

create policy "customers_staff_or_owner_update" on public.customers
  for update to authenticated
  using (private.has_store_capability(store_id, 'customers:read') or profile_id = private.current_profile_id())
  with check (private.has_store_capability(store_id, 'customers:read') or profile_id = private.current_profile_id());

create policy "customers_staff_insert" on public.customers
  for insert to authenticated
  with check (private.has_store_capability(store_id, 'customers:read') or profile_id = private.current_profile_id());

create policy "customer_addresses_owner_or_staff" on public.customer_addresses
  for all to authenticated
  using (private.owns_customer(customer_id) or exists (select 1 from public.customers customers where customers.id = customer_addresses.customer_id and private.has_store_capability(customers.store_id, 'customers:read')))
  with check (private.owns_customer(customer_id) or exists (select 1 from public.customers customers where customers.id = customer_addresses.customer_id and private.has_store_capability(customers.store_id, 'customers:read')));

create policy "customer_notes_staff_only" on public.customer_notes
  for all to authenticated
  using (private.has_store_capability(store_id, 'customers:note'))
  with check (private.has_store_capability(store_id, 'customers:note'));

create policy "customer_saved_products_owner_or_staff" on public.customer_saved_products
  for all to authenticated
  using (
    private.owns_customer(customer_id)
    or exists (select 1 from public.customers customers where customers.id = customer_saved_products.customer_id and private.has_store_capability(customers.store_id, 'customers:read'))
  )
  with check (private.owns_customer(customer_id));

create policy "holds_owner_or_staff" on public.holds
  for all to authenticated
  using (private.owns_customer(customer_id) or private.has_store_capability(store_id, 'holds:read'))
  with check (private.owns_customer(customer_id) or private.has_store_capability(store_id, 'holds:update'));

create policy "orders_owner_or_staff_select" on public.orders
  for select to authenticated
  using (private.owns_customer(customer_id) or private.has_store_capability(store_id, 'orders:read'));

create policy "orders_staff_manage" on public.orders
  for insert to authenticated
  with check (private.has_store_capability(store_id, 'sales:record'));

create policy "orders_staff_update" on public.orders
  for update to authenticated
  using (private.has_store_capability(store_id, 'orders:update'))
  with check (private.has_store_capability(store_id, 'orders:update'));

create policy "order_lines_owner_or_staff_select" on public.order_lines
  for select to authenticated
  using (exists (select 1 from public.orders orders where orders.id = order_lines.order_id));

create policy "order_lines_staff_manage" on public.order_lines
  for insert to authenticated
  with check (exists (select 1 from public.orders orders where orders.id = order_lines.order_id and private.has_store_capability(orders.store_id, 'sales:record')));

create policy "order_timeline_events_owner_or_staff_select" on public.order_timeline_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders orders
      where orders.id = order_timeline_events.order_id
        and (private.owns_customer(orders.customer_id) or private.has_store_capability(orders.store_id, 'orders:read'))
    )
  );

create policy "order_timeline_events_staff_insert" on public.order_timeline_events
  for insert to authenticated
  with check (private.has_store_capability(store_id, 'orders:update'));

create policy "order_payment_events_owner_or_staff_select" on public.order_payment_events
  for select to authenticated
  using (
    exists (
      select 1
      from public.orders orders
      where orders.id = order_payment_events.order_id
        and (private.owns_customer(orders.customer_id) or private.has_store_capability(orders.store_id, 'orders:read'))
    )
  );

create policy "order_payment_events_staff_insert" on public.order_payment_events
  for insert to authenticated
  with check (private.has_store_capability(store_id, 'orders:update'));

create policy "returns_owner_or_staff" on public.returns
  for all to authenticated
  using (private.owns_customer(customer_id) or private.has_store_capability(store_id, 'returns:read'))
  with check (private.owns_customer(customer_id) or private.has_store_capability(store_id, 'returns:update'));

create policy "return_lines_owner_or_staff_select" on public.return_lines
  for select to authenticated
  using (exists (select 1 from public.returns returns where returns.id = return_lines.return_id));

create policy "return_lines_staff_manage" on public.return_lines
  for insert to authenticated
  with check (exists (select 1 from public.returns returns where returns.id = return_lines.return_id and private.has_store_capability(returns.store_id, 'returns:update')));

create policy "product_reviews_public_visible" on public.product_reviews
  for select to anon, authenticated
  using (
    status = 'published'
    and exists (
      select 1
      from public.products products
      join public.product_channels channels on channels.product_id = products.id
      where products.id = product_reviews.product_id
        and products.lifecycle = 'active'
        and products.publication = 'published'
        and channels.channel = 'storefront'
    )
  );

create policy "product_reviews_owner_or_staff_select" on public.product_reviews
  for select to authenticated
  using (private.owns_customer(customer_id) or private.has_store_capability(store_id, 'customers:read'));

create policy "product_reviews_customer_insert" on public.product_reviews
  for insert to authenticated
  with check (private.owns_customer(customer_id));

create policy "product_reviews_staff_moderate" on public.product_reviews
  for update to authenticated
  using (private.has_store_capability(store_id, 'settings:update'))
  with check (private.has_store_capability(store_id, 'settings:update'));

create policy "store_settings_staff_read" on public.store_settings
  for select to authenticated
  using (private.has_store_capability(store_id, 'settings:read'));

create policy "store_settings_staff_update" on public.store_settings
  for update to authenticated
  using (private.has_store_capability(store_id, 'settings:update'))
  with check (private.has_store_capability(store_id, 'settings:update'));

create policy "delivery_zones_public_enabled" on public.delivery_zones
  for select to anon, authenticated
  using (enabled and exists (select 1 from public.stores stores where stores.id = delivery_zones.store_id and stores.status = 'active'));

create policy "delivery_zones_staff_manage" on public.delivery_zones
  for all to authenticated
  using (private.has_store_capability(store_id, 'settings:read'))
  with check (private.has_store_capability(store_id, 'settings:update'));

create policy "pickup_locations_public_enabled" on public.pickup_locations
  for select to anon, authenticated
  using (enabled and exists (select 1 from public.stores stores where stores.id = pickup_locations.store_id and stores.status = 'active'));

create policy "pickup_locations_staff_manage" on public.pickup_locations
  for all to authenticated
  using (private.has_store_capability(store_id, 'settings:read'))
  with check (private.has_store_capability(store_id, 'settings:update'));

create policy "activity_events_staff_only" on public.activity_events
  for all to authenticated
  using (private.is_active_store_member(store_id))
  with check (private.is_active_store_member(store_id));

create policy "audit_events_owner_read" on public.audit_events
  for select to authenticated
  using (private.has_store_capability(store_id, 'audit:read'));

create policy "audit_events_owner_insert" on public.audit_events
  for insert to authenticated
  with check (private.has_store_capability(store_id, 'audit:read'));
