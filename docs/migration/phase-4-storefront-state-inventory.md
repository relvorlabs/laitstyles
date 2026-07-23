# Phase 4 provider and storage inventory

Base inspected: `main@20e178cc01feb0efb13c1f8196f0811bdc969cfa`

## Provider composition

```text
StorefrontRouteBoundary
└─ StorefrontProviders
   └─ StorefrontExperienceProvider
      └─ SiteChrome
         └─ ShopProvider
            └─ StorefrontProvider
               └─ QueryProvider
```

`AppProviders` is root-only theme/toast composition and does not own storefront state. `SiteChrome` already returns children directly for `/admin` and `/auth`, but the storefront route boundary remains the preferred mounting boundary.

## Current owners

### `StorefrontProvider`

Owns:

- server-provided catalogue projection and product lookup;
- cart lines and cart persistence;
- saved product IDs and persistence;
- recently viewed product IDs;
- catalogue filters and sort state;
- quick view, search, image viewer, cart drawer and saved drawer state;
- shared storefront toast adapter.

Representative consumers include the header, cart sheet, checkout flow, catalogue, product purchase/gallery surfaces, home sections, account product selectors and overlay components.

### `StorefrontExperienceProvider`

Owns:

- browser Supabase session subscription and client identity mirrors;
- sign-in/sign-up dialog state and direct browser auth calls;
- seeded account items;
- storefront hold records and countdown;
- hold alert and a second toast system.

Representative consumers include `SiteChrome`, the account menu/grid, catalogue/home product lists and product recommendations.

### `ShopProvider`

Owns:

- a second independent hold list;
- a second one-second countdown;
- full legacy product objects in local storage;
- `/cart` reserve/release/re-hold selectors.

Live consumers are `SiteChrome` and `src/app/cart/page.tsx`.

## Existing storage keys

| Key | Storage | Owner | Migration decision |
| --- | --- | --- | --- |
| `laitstyles-storefront:v2:cart` | session | `StorefrontProvider` | migrate to v3 cart intents |
| `laitstyles-storefront:v1:cart` | session | compatibility | migrate then remove |
| `laitstyles-cart` | local | compatibility | migrate then remove |
| `laitstyles-storefront:v1:saved` | session | `StorefrontProvider` | migrate to v3 saved IDs |
| `laitstyles-saved` | local | compatibility | migrate then remove |
| `laitstyles-storefront:v1:holds` | session | `StorefrontExperienceProvider` | migrate absolute expiries to v3 hold intents |
| `laitstyle-held-items-v1` | local | `ShopProvider` | convert remaining seconds to an absolute expiry, then remove |
| `laitstyles-storefront:v1:recent` | session | `StorefrontProvider` | remains outside durable cart/saved/hold contract |
| `laitstyles-storefront:v1:utility` | session | `StorefrontProvider` | remains local UI preference |

## New storage contract

`laitstyles-storefront:v3:client-state`

```ts
type StorefrontClientStateSnapshot = {
  version: 3;
  cart: Array<{ productId: string; variantId: string | null; quantity: number }>;
  saved: string[];
  holds: Array<{ productId: string; expiresAt: number }>;
};
```

The snapshot intentionally stores IDs, quantities and expiries only. Product names, prices, images, availability and inventory semantics continue to resolve from the server-owned catalogue.

## Migration rules

- A valid v3 snapshot is authoritative; legacy keys are not merged back into it.
- Malformed values are ignored instead of breaking storefront rendering.
- Duplicate saved IDs are collapsed.
- Duplicate cart lines are combined by `productId + variantId`.
- Invalid or non-positive quantities are removed.
- Duplicate holds retain the latest valid expiry.
- Expired holds are discarded.
- The old `ShopProvider` seconds-left format is converted relative to migration time.
- Legacy keys are removed from both session and local storage only after a normalized v3 snapshot is written.

## Cutover order

1. Add and test the v3 storage contract.
2. Add the unified client-state provider at the existing storefront route boundary.
3. Move hold selectors and `/cart`; stop writing both legacy hold keys.
4. Move cart/saved selectors while preserving existing compatibility hook signatures.
5. Move auth transport to canonical Server Actions and narrow overlay ownership.
6. Delete compatibility providers and modules after repository search shows zero live imports.
7. Run unit, architecture, type, build and browser gates; keep the PR draft until evidence exists.
