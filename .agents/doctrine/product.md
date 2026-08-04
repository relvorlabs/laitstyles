# Doctrine: Product truth and commerce language

Owner of: Laitstyles product boundaries, inventory models, commerce invariants and authoritative
language.
Cited by: planner, server-side engineer, frontend engineer and reviewer.

## Product purpose

Laitstyles is a fashion commerce product with a customer storefront and staff administration
surface. It manages published products, inventory, carts, holds, checkout, orders, payments,
fulfilment, returns, reviews, customer accounts and operational reporting.

## Inventory modes

Every catalogue, cart, hold, checkout, order and stock decision must support:

- `unique`: one-of-one inventory;
- `stocked`: multiple identical units;
- `variant`: stock-bearing size, colour or other variants.

Do not restore a quantity-one assumption. Model mode-specific states with discriminated unions and
enforce inventory invariants in both application logic and the database.

## Authoritative language

- **Product**: canonical sellable definition—identity, description, media, pricing,
  merchandising, publication and available inventory modes.
- **Inventory**: stock, unique pieces, variants, reservations, movements and availability.
- **Catalogue**: public read model for browsing, searching, filtering and merchandising published
  products. Use British spelling.
- **Storefront**: customer-facing shell, catalogue, product detail, cart, checkout, account and
  saved-product experience.
- **Admin**: staff-facing operational surface; not a duplicate persistence domain.
- **Cart**: customer intent before an order exists.
- **Hold**: time-bounded reservation of inventory.
- **Order**: persisted commercial transaction and lifecycle.
- **Payment**: authorization, settlement, refund and dispute state; not merely UI state.
- **Customer**: commerce record; an authenticated Supabase user may be associated through a
  profile, while guest/CRM records may exist without one.

## Commerce safety

- Never mark stock sold, payment successful, refund complete or delivery complete based only on a
  browser callback.
- Payment and webhook operations are idempotent and verified server-side.
- Inventory, holds, checkout and order transitions are concurrency-sensitive.
- Prices, totals, discounts and delivery charges are recalculated or verified server-side.
- Client-supplied roles, totals, ownership IDs and status transitions are untrusted.

## Scope

Do not add supplier ERP, accounting, warehouse-management or marketplace-platform scope unless the
user explicitly requests it. Do not invent unavailable integrations or simulate live operations as
normal production behavior.
