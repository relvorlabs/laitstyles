# Laitstyle Supabase Schema Plan

## Status

**Planning blueprint for Phase 11.**

Do not treat this file as a migration. When Phase 11 starts, create migration files with the Supabase CLI and verify against current Supabase docs and advisors.

## Design principles

- `store_id` is the primary tenant boundary for Control Room data.
- `organization_id` groups ownership and future multi-store expansion without making multi-store management a current product feature.
- Supabase Auth owns identity; application tables own roles, permissions and product/customer data.
- RLS is enabled on every table in exposed schemas.
- Public storefront access is read-only and limited to published storefront-visible catalogue records.
- Staff access requires active store membership and role/capability checks.
- Consumer access is limited to the authenticated consumer's own account records.
- Authorization data must not live in user-editable metadata.
- Owner/admin accounts and owner store memberships are created only through CLI bootstrap tooling
  with service-role credentials. Browser routes, OAuth callbacks and public sign-up can create
  consumer identities, but must not create owner memberships.
- Supabase stores Cloudinary asset metadata only. Image binary/blob upload to Supabase is forbidden.

## Roles and permissions

### Staff roles

| Role | Description |
| --- | --- |
| `owner` | CEO/store owner with full operational and team control |
| `manager` | Senior operator with catalogue, sales, customer and most settings control |
| `operator` | Sales staff for daily orders, holds, offline sales and limited stock workflow |

### Suggested capabilities

```text
store:view
settings:update
team:manage
inventory:create
inventory:update
inventory:archive
inventory:delete
orders:update
holds:update
sales:record
returns:update
customers:view
customers:note
reports:export
```

Consumers do not receive store capabilities. They use ownership policies tied to their own profile/customer rows.

## Identity and tenancy tables

### `profiles`

One row per `auth.users` identity.

Core columns:

- `id uuid primary key references auth.users(id) on delete cascade`
- `display_name text`
- `email text`
- `phone text`
- `avatar_url text`
- `created_at timestamptz`
- `updated_at timestamptz`
- `created_by_cli boolean not null default false`
- check: owner memberships require `created_by_cli = true`

RLS:

- authenticated users can read/update their own profile
- staff can read limited profile fields for active store members and customers in their store

### `organizations`

Core columns:

- `id uuid primary key`
- `name text not null`
- `owner_profile_id uuid references profiles(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

RLS:

- owner can read/update
- active store members can read organization summary through their store membership

### `stores`

Core columns:

- `id uuid primary key`
- `organization_id uuid references organizations(id)`
- `name text not null`
- `slug text unique not null`
- `status text check (status in ('active','paused','archived'))`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- `(organization_id)`
- `(slug)`

RLS:

- public can read minimal active storefront identity by slug
- staff can read stores where they have active membership
- owner can update store ownership-level fields

### `store_memberships`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id) on delete cascade`
- `profile_id uuid references profiles(id) on delete cascade`
- `role text check (role in ('owner','manager','operator'))`
- `status text check (status in ('active','invited','suspended'))`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- unique `(store_id, profile_id)`
- `(profile_id, status)`
- `(store_id, role, status)`

RLS:

- owner can manage manager/operator memberships in their store
- manager can read active staff list where permitted
- member can read their own membership
- owner memberships are migration/service-role/CLI only; authenticated browser clients cannot insert
  or update a row into the `owner` role
- no consumer access

### `role_capabilities`

Core columns:

- `role text`
- `capability text`
- `created_at timestamptz`

Indexes:

- unique `(role, capability)`

RLS:

- authenticated users can read capability metadata
- writes are migration/admin only

### `staff_invitations`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `email text not null`
- `role text check (role in ('manager','operator'))`
- `status text check (status in ('pending','accepted','revoked','expired'))`
- `invited_by uuid references profiles(id)`
- `expires_at timestamptz`
- `created_at timestamptz`

RLS:

- owner can create/revoke
- manager can create operator invites only if capability allows
- invitee can read their pending invitation after sign-in by email match

## Catalogue and inventory tables

### `catalogue_categories` and `catalogue_collections`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `name text not null`
- `slug text not null`
- `position int`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- unique `(store_id, slug)`

RLS:

- public can read categories/collections that have published storefront products
- staff can manage within their store

### `products`

Maps to `InventoryProduct`.

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `slug text not null`
- `name text not null`
- `description text not null`
- `inventory_mode text check (inventory_mode in ('unique','stocked','variant'))`
- `category_id uuid references catalogue_categories(id)`
- `collection_id uuid references catalogue_collections(id)`
- `brand text`
- `price numeric(12,2) not null`
- `reference_price numeric(12,2)`
- `cost numeric(12,2)`
- `lifecycle text check (lifecycle in ('draft','intake','active','archived'))`
- `publication text check (publication in ('published','unpublished','scheduled'))`
- `low_stock_threshold int not null`
- `archive_number text`
- `sku text`
- `condition text`
- `size_label text`
- `colour text`
- `scheduled_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- unique `(store_id, slug)`
- unique `(store_id, archive_number)` where `archive_number is not null`
- unique `(store_id, sku)` where `sku is not null`
- `(store_id, lifecycle, publication)`
- `(store_id, inventory_mode)`
- `(store_id, updated_at desc)`

RLS:

- anon/authenticated storefront users can read rows where lifecycle is `active`, publication is `published` and the storefront channel is enabled
- staff can read according to store membership
- staff writes require relevant inventory capability
- owner-only or manager-only policies protect permanent delete/destructive actions

### `product_channels`

Core columns:

- `product_id uuid references products(id) on delete cascade`
- `channel text check (channel in ('storefront','physical-store','whatsapp','instagram'))`

Indexes:

- primary key `(product_id, channel)`
- `(channel)`

RLS:

- mirrors product access

### `product_variants`

Core columns:

- `id uuid primary key`
- `product_id uuid references products(id) on delete cascade`
- `label text not null`
- `sku text`
- `size text`
- `colour text`
- `image_url text`
- `price numeric(12,2)`
- `cost numeric(12,2)`
- `position int`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- unique `(product_id, sku)` where `sku is not null`

RLS:

- mirrors product access

### `cloudinary_assets`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `provider text check (provider = 'cloudinary')`
- `resource_type text check (resource_type = 'image')`
- `kind text check (kind in ('product-cover','product-detail','product-defect','store-logo','store-brand'))`
- `public_id text not null`
- `secure_url text not null`
- `delivery_url text`
- `format text`
- `version bigint`
- `width int`
- `height int`
- `bytes int`
- `alt text not null`
- `created_by_profile_id uuid references profiles(id)`
- `created_at timestamptz`

RLS:

- public reads only when linked product/brand records are storefront-visible
- staff writes require active store membership plus inventory/settings capability
- stores Cloudinary metadata only; no `bytea`, `storage.buckets` or `storage.objects`

### `product_media`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `product_id uuid references products(id) on delete cascade`
- `variant_id uuid references product_variants(id)`
- `asset_id uuid references cloudinary_assets(id)`
- `kind text check (kind in ('product-cover','product-detail','product-defect'))`
- `position int not null`
- `created_at timestamptz`

Indexes:

- `(product_id, position)`
- `(store_id)`

RLS:

- public reads only when parent product is storefront-visible
- staff writes require inventory media capability

Asset provider notes:

- Supabase stores metadata, tenant ownership and RLS policy state for product media only.
- Cloudinary is the required image upload and delivery provider for product imagery in Phase 11.
- Cloudflare may serve as a future CDN/proxy/delivery layer, but Phase 11 must not introduce
  Supabase image blob storage or Cloudflare R2 writes as a replacement upload path.
- Client code must not receive Cloudinary signing secrets, Cloudflare API tokens or Supabase service-role keys.
- Phase 11 must add signed upload/write routes or edge functions before any production upload flow is enabled.

### `product_measurements`

Core columns:

- `id uuid primary key`
- `product_id uuid references products(id) on delete cascade`
- `label text not null`
- `value text not null`
- `position int`

RLS:

- mirrors product access

### `stock_levels`

One row per product or variant stock bucket.

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `product_id uuid references products(id) on delete cascade`
- `variant_id uuid references product_variants(id) on delete cascade`
- `total_received int not null default 0`
- `available int not null default 0`
- `reserved int not null default 0`
- `sold int not null default 0`
- `returned int not null default 0`
- `damaged int not null default 0`
- `updated_at timestamptz`

Indexes:

- unique `(product_id, variant_id)`
- `(store_id, available)`
- `(store_id, reserved)`

RLS:

- public cannot read raw stock internals unless exposed through safe product availability fields
- staff read/write requires membership and inventory/sales capability

### `stock_movements`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `product_id uuid references products(id)`
- `variant_id uuid references product_variants(id)`
- `kind text check (kind in ('received','reserved','released','sold','returned','restocked','damaged','adjusted'))`
- `quantity int not null check (quantity > 0)`
- `occurred_at timestamptz not null`
- `actor_profile_id uuid references profiles(id)`
- `note text`
- `related_order_id uuid`
- `related_hold_id uuid`
- `related_return_id uuid`

Indexes:

- `(store_id, occurred_at desc)`
- `(product_id, occurred_at desc)`
- `(variant_id, occurred_at desc)`

RLS:

- staff only

### `intake_records`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `product_id uuid references products(id)`
- `stage text check (stage in ('received','photographing','details-required','pricing-review','ready-to-publish','published'))`
- `assigned_profile_id uuid references profiles(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

RLS:

- staff read/write with inventory capability

## Sales and fulfilment tables

### `customers`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `profile_id uuid references profiles(id)`
- `name text not null`
- `email text`
- `phone text`
- `city text`
- `type text check (type in ('individual','stylist','reseller','walk-in'))`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- `(store_id, email)`
- `(profile_id)`

RLS:

- staff can read/manage customers in their store according to capability
- consumer can read/update their own linked customer profile

### `customer_addresses`

Core columns:

- `id uuid primary key`
- `customer_id uuid references customers(id) on delete cascade`
- `label text`
- `line1 text`
- `line2 text`
- `city text`
- `state text`
- `country text default 'Nigeria'`
- `is_default boolean`
- `delivery_notes text`

RLS:

- staff in store or owning consumer profile

### `customer_notes`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `customer_id uuid references customers(id) on delete cascade`
- `body text not null`
- `author_profile_id uuid references profiles(id)`
- `created_at timestamptz`

RLS:

- staff only; consumers never read internal notes

### `customer_saved_products`

Core columns:

- `customer_id uuid references customers(id) on delete cascade`
- `product_id uuid references products(id) on delete cascade`
- `created_at timestamptz`

RLS:

- owning consumer or staff in store can read
- owning consumer can insert/delete their own saves

### `holds`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `customer_id uuid references customers(id)`
- `product_id uuid references products(id)`
- `variant_id uuid references product_variants(id)`
- `quantity int not null check (quantity > 0)`
- `stage text check (stage in ('product','cart','checkout','payment'))`
- `source text check (source in ('storefront','admin','whatsapp','instagram','physical-store'))`
- `payment_progress text`
- `status text check (status in ('active','released','converted','expired'))`
- `started_at timestamptz`
- `expires_at timestamptz`
- `released_at timestamptz`
- `converted_order_id uuid`
- `note text`

Indexes:

- `(store_id, status, expires_at)`
- `(customer_id, status)`
- `(product_id, variant_id, status)`

RLS:

- public cannot read holds
- consumer can read/manage own active storefront holds
- staff can manage holds in store

### `orders`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `customer_id uuid references customers(id)`
- `source text check (source in ('online-order','offline-sale','hold-conversion'))`
- `channel text`
- `payment_status text`
- `payment_method text`
- `fulfilment_status text`
- `total numeric(12,2) not null`
- `refunded_amount numeric(12,2) default 0`
- `placed_at timestamptz`
- `delivery_city text`
- `delivery_address jsonb`
- `courier jsonb`
- `notes text`
- `attention text`
- `created_by_profile_id uuid references profiles(id)`
- `created_at timestamptz`
- `updated_at timestamptz`

Indexes:

- `(store_id, placed_at desc)`
- `(store_id, fulfilment_status)`
- `(store_id, payment_status)`
- `(customer_id, placed_at desc)`

RLS:

- consumer can read own orders
- staff can read/manage store orders by capability

### `order_lines`

Core columns:

- `id uuid primary key`
- `order_id uuid references orders(id) on delete cascade`
- `product_id uuid references products(id)`
- `variant_id uuid references product_variants(id)`
- `quantity int not null check (quantity > 0)`
- `unit_price numeric(12,2) not null`
- `stock_state text check (stock_state in ('uncommitted','reserved','sold','returned','released'))`

RLS:

- mirrors order access

### `order_timeline_events` and `order_payment_events`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `order_id uuid references orders(id) on delete cascade`
- status/payment fields
- `amount numeric(12,2)` for payment events
- `method text` for payment events
- `occurred_at timestamptz`
- `actor_profile_id uuid references profiles(id)`
- `note text`

RLS:

- consumer reads safe order timeline/payment summary for own orders
- staff reads/writes store events by capability

### `returns` and `return_lines`

Core columns:

- `returns.id uuid primary key`
- `returns.store_id uuid references stores(id)`
- `returns.order_id uuid references orders(id)`
- `returns.customer_id uuid references customers(id)`
- `returns.status text`
- `returns.reason text`
- `returns.refund_amount numeric(12,2)`
- `returns.note text`
- `returns.requested_at timestamptz`
- `returns.updated_at timestamptz`
- `return_lines.id uuid primary key`
- `return_lines.return_id uuid references returns(id) on delete cascade`
- `return_lines.order_line_id uuid references order_lines(id)`
- `return_lines.product_id uuid references products(id)`
- `return_lines.variant_id uuid references product_variants(id)`
- `return_lines.quantity int check (quantity > 0)`
- `return_lines.disposition text check (disposition in ('pending','restock','damaged'))`

RLS:

- consumer can read own returns
- staff can manage returns by capability

## Reviews and settings

### `product_reviews`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `product_id uuid references products(id)`
- `customer_id uuid references customers(id)`
- `rating int check (rating between 1 and 5)`
- `title text`
- `body text`
- `status text check (status in ('published','pending'))`
- `created_at timestamptz`

RLS:

- public reads published reviews for storefront-visible products
- consumer can create/read own reviews
- staff can moderate reviews by capability

### `store_settings`

Prefer a normalized core plus JSON sections only where flexibility is useful.

Core columns:

- `store_id uuid primary key references stores(id) on delete cascade`
- `identity jsonb not null`
- `selling jsonb not null`
- `payments jsonb not null`
- `notifications jsonb not null`
- `updated_at timestamptz`

RLS:

- public reads only safe storefront identity fields through a security-invoker view or dedicated public table
- staff reads settings by membership
- owner/manager writes according to capability

### `delivery_zones` and `pickup_locations`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- name/address/rate/estimated days fields
- `enabled boolean`
- `position int`

RLS:

- public reads enabled storefront delivery/pickup options
- staff manages by settings capability

## Audit and activity

### `activity_events`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `kind text`
- `title text`
- `detail text`
- `actor_profile_id uuid references profiles(id)`
- `product_id uuid references products(id)`
- `order_id uuid references orders(id)`
- `customer_id uuid references customers(id)`
- `occurred_at timestamptz`

RLS:

- staff only unless a future consumer-safe timeline view explicitly exposes selected events

### `audit_events`

Core columns:

- `id uuid primary key`
- `store_id uuid references stores(id)`
- `actor_profile_id uuid references profiles(id)`
- `action text not null`
- `target_table text`
- `target_id uuid`
- `metadata jsonb`
- `created_at timestamptz`

RLS:

- owner and selected manager capabilities only

## External asset storage

### Product media

- Product cover, detail and defect imagery.
- Supabase stores `product_media` rows and authorization metadata.
- Cloudinary stores and delivers the binary image assets.
- Supabase does not store image blobs, `bytea` image payloads or Storage object rows.
- Staff writes require active store membership, inventory media capability and a server-issued upload/write authorization.
- Public reads require parent product storefront visibility.

### Store brand assets

- Logos and store brand imagery.
- Supabase stores metadata and storefront linkage.
- Cloudinary stores and delivers the binary image assets.
- Cloudflare can be evaluated later as CDN/proxy infrastructure, not as a Phase 11 image upload path.
- Owner/manager writes only through server-issued upload/write authorization.
- Public reads only for assets linked to active storefront identity.

## RLS helper direction

Use helper functions sparingly and keep them outside exposed schemas where possible:

- `private.current_profile_id()`
- `private.is_store_member(store_id uuid)`
- `private.has_store_role(store_id uuid, allowed_roles text[])`
- `private.has_store_capability(store_id uuid, capability text)`
- `private.owns_customer(customer_id uuid)`

Security notes:

- Do not create security-definer helpers in `public`.
- Lock `search_path`.
- Include an authenticated user check.
- Revoke default public execute before granting only needed roles.
- Add indexes used by helper predicates.

## First RLS test cases

- anonymous user can read published storefront products only
- anonymous user cannot read raw stock levels, customer notes, orders or holds
- consumer can read own orders and cannot read another consumer's orders
- consumer cannot read staff customer notes
- operator can record sale but cannot manage team
- manager can update catalogue but cannot remove owner
- owner can manage memberships
- staff from store A cannot read store B data
- unpublished product is hidden from storefront but visible to authorized staff
- product media read follows parent product visibility
