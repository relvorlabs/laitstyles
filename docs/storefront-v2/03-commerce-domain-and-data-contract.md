# 03 — Commerce Domain & Data Contract

The **DB schema** (`…phase11…sql`) is the contract. This file defines the domain entities, the product discriminated union, exact storefront visibility rules, never-expose fields, and resolutions for data the storefront needs that admin cannot yet write. All field names map to existing columns unless marked **(new)**.

## 1. Money & identifiers
- Money in **integer kobo** app-side (DB `numeric(12,2)` → ×100). Format via `src/lib/money` (`naira()`; `usd()` display-only, approximate).
- Public identifiers are **slugs** (`products.slug`, `catalogue_categories.slug`, `catalogue_collections.slug`) and **order numbers**. Never expose raw UUIDs in consumer URLs where a slug or number exists. Never accept a client-supplied customer identifier as authority.

## 2. Product discriminated union (`inventory_mode`)

### 2.1 Common fields (all modes)
`id, slug, name, description, brand, category{id,slug,name,imageUrl}, collection{…}, inventoryMode('unique'|'stocked'|'variant'), lifecycle, publication, channels, media{cover, detail[], defect[]}, price, referencePrice(compare-at), scheduledAt, createdAt, updatedAt`. Fulfilment-relevant: `condition, sizeLabel, colour` where applicable per mode. `archiveNumber` (accession "№ 0001") from `products.archive_number`.
*Server-derived, not raw columns:* `availability` (§3), `reviewSummary` (from published `product_reviews`), `deliveryEstimate` (from `delivery_zones` + destination).

### 2.2 Unique
`archiveNumber`, `condition`, `size`, `colour`, `measurements[]` (`product_measurements`), **one-of-one availability** (`total_received === 1`; sold ⇒ gone for good), **defect disclosure** (from description + `product-defect` media), reservation behaviour = hold-on-add (`01` §7).

### 2.3 Stocked
`sku`, `sizeLabel`, `colour`, `available` quantity (`stock_levels.available`), low-stock messaging (`available <= low_stock_threshold`), cart quantity rules (max per line), reserve-at-cart.

### 2.4 Variant
`variants[]`: `{ variantId, label, sku, size, colour, variantImage?, priceOverride?, available }`; option names; **disabled/unavailable combinations** surfaced as disabled with reason; variant-level price override falls back to product price; per-variant stock via `stock_levels.variant_id`.

## 3. Availability (server-computed; never a client timer)
```
state ∈ { available, low, reserved_by_others, reserved_by_me, sold_out }
```
Derived from `stock_levels` + live `holds` (status `active`, `expires_at > now()`), scoped to the current session:
- `sold_out`: unique with a `sold` movement / `available = 0` and no reclaimable hold.
- `reserved_by_me`: an active hold owned by this session's customer/guest.
- `reserved_by_others`: `available = 0` due to an active hold not owned by this session.
- `low`: stocked/variant `available <= low_stock_threshold`.
- `available`: otherwise. One-of-one flag = `mode==='unique'`.

## 4. Storefront visibility rules (public read predicate)
A product is publicly visible **only if all** hold:
1. store `status = 'active'`,
2. product `lifecycle = 'active'`,
3. `publication = 'published'` **or** `scheduled_at <= now()` (scheduled become effective),
4. storefront channel enabled (`product_channels.channel = 'storefront'`),
5. required media exists (≥1 cover),
6. not archived,
7. `price` valid (`> 0`),
8. product/variant stock state safe to expose.

This is encoded once as `publishedProductWhere()` and composed by **every** catalogue read so the public projection and Prisma repository agree.

## 5. Never expose (public reads must strip)
`cost`, internal staff notes (`customer_notes`, product internal notes), audit metadata (`audit_events`), raw stock movement history (`stock_movements`), customer notes, private staff identifiers/profile ids, unpublished media, service-role data, raw availability counts beyond what's needed for messaging, `reference_price` when invalid (≤ price). DTOs in `src/server/commerce/*/dto.ts` are allow-lists, not Prisma models.

## 6. Entity contract

For each: *purpose · key fields · relationships · ownership · lifecycle · indexes/uniques · public visibility · authz · admin write · storefront read/write · deletion · audit.* (● = table exists in `…phase11…sql`; ○ = **new**, needs migration; ◐ = exists but needs added fields.)

| Entity | Notes (delta only; full columns in the migration) |
|---|---|
| **Store** ● | Storefront reads `active` only (public). No write from storefront. |
| **StorefrontSettings** ◐ | `store_settings.identity/selling/payments/notifications` JSONB exists. **Add safe merchandising fields** (hero, featured collection/category, announcement bar, footer/support/social/policy copy, size-guide, care, accepted-payment display, newsletter config) as **allow-listed JSON keys** — never arbitrary CSS. Admin writes; storefront reads sanitized subset. |
| **Category / Collection** ● | Public-visible only if they contain at least one visible product. Storefront read-only. Counts computed from visible products. |
| **Product / ProductVariant / ProductMedia / ProductMeasurement** ● | Contract §2. Read-only public. Admin write (create/publish migrated in Phase 1). Slug unique per store; slug change retains old → redirect (`02` §8). |
| **StockLevel / StockMovement** ● | Never public. Availability derived server-side. Movements written transactionally on hold/order/return. |
| **GuestSession** ○ | **New.** Signed cookie token → owns guest cart/holds/saves pre-auth; merged on sign-in. Server-issued, httpOnly, rotating; ownership check server-side. |
| **Customer / CustomerAddress / WishlistItem(`customer_saved_products`)** ● | Owned by `profile_id = auth.uid()`. Authz: app-layer scope by resolved customerId (`04`). Address delete = soft where referenced by orders (snapshot preserved on order). |
| **Cart / CartLine** ◐ | Modeled **as holds** (`holds` rows, stage `cart`) rather than a separate cart table for unique/stocked truth; a lightweight `Cart` view aggregates the session's active holds. If a durable cart distinct from holds is needed for stocked wishlist-to-cart, add `carts`/`cart_lines` ○ — decide in Phase 5; default = holds-as-cart. |
| **Hold** ● | `stage(product|cart|checkout|payment)`, `status(active|released|converted|expired)`, `source`, `expires_at`. Owner = customer or guest session. Atomic ops (`01` §7.2). |
| **Order / OrderLine / OrderTimelineEvent** ● | Owned by customer (or guest, claimable). Price **snapshot** in `order_lines.unit_price`. Timeline drives tracking. Never deleted; cancel via status. |
| **PaymentAttempt / PaymentEvent** ◐ | `order_payment_events` ● exists; **add `payment_attempts`** ○ (idempotency key, provider ref, amount, currency, status) if the provider flow needs attempt-level records. Webhook authoritative. |
| **DeliveryZone / PickupLocation** ● | Public `enabled` only. Fees/ETA server-authoritative at checkout. |
| **Shipment** ○ | **New (optional V1).** If courier/tracking modeled beyond `orders.courier` jsonb; else use jsonb. Decide Phase 8. |
| **Review** ◐ | `product_reviews` ●; **add `fit_note`, `size_ordered`** ○. Verified-purchase enforced by joining eligible order lines. Public = `published`. |
| **ReturnRequest / ReturnLine** ● | Owned by customer; line-level qty; disposition restock/damaged; status timeline. |
| **Promotion/Discount** | **Only if genuinely required.** V1: no promo engine; "reduced" = valid `reference_price`. Defer. |
| **NotificationSubscription** ○ | **New (for back-in-stock / released-hold).** `{customer_or_email, product_id, kind, status, created_at, expires_at}`; delivery = **Resend** email (`08` §3). Prevents "fake notify". |
| **ReturnEvidence** (files) | Return-line evidence images, if required, use the configured private asset provider and are referenced by `return_lines`. Product and brand imagery stays on Cloudinary. |
| **AnalyticsEvent** | Not a DB table by default; via analytics provider (`07` §events). No PII/payment data in payloads. |

## 7. Missing-capability resolutions (smallest maintainable, no page-builder)

| Need | Home | Resolution |
|---|---|---|
| Hero/campaign, featured collection/category, merchandising order, announcement bar | homepage | **`store_settings` allow-listed JSON** (admin-editable safe fields). No arbitrary CSS/HTML. |
| Navigation & footer links, support contact, social, delivery/returns/care copy, size guide, accepted payments, newsletter config | shell | `store_settings` safe fields; static fallbacks in code. |
| Editorial / Journal | home | **Descope V1**; derive "Editors' picks" from a flagged `catalogue_collections` row. Revisit CMS later. |
| Product SEO title/description, tags | PDP/SEO | Derive from product fields V1; **add optional `seo_title/seo_description/tags`** ○ only if owners need override (defer unless required). |
| Collection cover media, scheduled campaign publishing | merch | `catalogue_collections` cover via `product_media`-style asset link ○ if needed; scheduling via existing `scheduled_at` pattern. |
| Review moderation | reviews | existing `product_reviews.status` plus admin-only server authorization. |
| Return eligibility, order tracking, courier/tracking number | orders | existing `orders`, `order_timeline_events`, `orders.courier`; consumer status mapping §8. |
| Store logo & favicon | brand | `store_brand_assets` (exists) + `/app` icons. |

**Rule:** prefer code for static, `store_settings` for owner-editable operational content, a dedicated table only when a list/relationship demands it, a future CMS never assumed. Do not turn admin into a page builder; keep this effort storefront-focused while documenting the **minimal** admin integration (`06`).

## 8. Consumer status mapping (admin → shopper copy)
| DB (`orders`/timeline) | Consumer copy |
|---|---|
| payment pending | Awaiting payment |
| payment confirmed/paid | Payment confirmed |
| unfulfilled / preparing | Preparing your order |
| ready_for_pickup | Ready for pickup |
| handed_to_courier | Handed to courier |
| out_for_delivery | Out for delivery |
| delivered | Delivered |
| cancelled | Cancelled |
| return_requested | Return requested |
| returned | Returned |
| refunded / partially_refunded | Refunded / Partially refunded |
Raw DB strings are never rendered directly.

## 9. New/changed migrations implied (owned per `04`)
1. `product_reviews`: `fit_note text null`, `size_ordered text null` (additive).
2. `guest_sessions` (or signed-cookie-only, no table — decide `04`) for guest cart/hold ownership.
3. `notification_subscriptions` (back-in-stock / released-hold).
4. Optional: `payment_attempts`, `shipments`, `carts`/`cart_lines`, product `seo_*`/`tags`, collection cover — each gated on a real need in its phase and captured in a small, domain-named Prisma migration.
