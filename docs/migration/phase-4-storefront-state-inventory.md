# Phase 4 provider and storage inventory

Base inspected: `main@20e178cc01feb0efb13c1f8196f0811bdc969cfa`

## Final provider composition

```text
StorefrontRouteBoundary
├─ loadStorefrontAuthSession()      server session snapshot
├─ loadStorefrontShellCatalog()     lightweight read-only shell projection
└─ StorefrontProviders
   └─ StorefrontClientStateProvider cart + saved + client-only holds
      └─ StorefrontAuthProvider     auth dialog + canonical Server Actions
         └─ SiteChrome
            └─ StorefrontProvider   filters + overlays + presentation selectors
               └─ QueryProvider
```

`AppProviders` remains root-only theme/toast composition. Admin and auth routes do not mount storefront state from the app root.

## Final owners

### `StorefrontClientStateProvider`

Owns:

- canonical cart-line intents;
- saved product IDs;
- client-only absolute hold expiries;
- one hydration/migration path;
- one persistence path;
- one countdown and global hold alert.

It resolves product presentation and current availability from the server-provided shell index; it never persists product objects.

### `StorefrontAuthProvider`

Owns only auth-dialog interaction state. It receives identity from the server-resolved session and calls canonical password/sign-out Server Actions. It does not create a browser Supabase client or maintain a mutable signed-in identity mirror.

### `StorefrontProvider`

Owns local storefront presentation concerns:

- catalogue filter/sort controls;
- recently viewed IDs and utility dismissal preference;
- quick view, search, image viewer, cart drawer and saved drawer state;
- shared storefront toast adapter;
- compatibility selectors over the unified cart/saved state.

It does not own or persist cart, saved products or holds.

### Catalogue authority

The database/repository remains authoritative. The global client boundary receives `StorefrontShellCatalogPayload`, a pure projection with one cover image and summary/variant-selection data. Product detail galleries, flaw notes, care instructions and product variant-label arrays remain outside that boundary. Full product details are loaded per slug on the server.

## Storage keys

| Key | Prior owner | Final handling |
| --- | --- | --- |
| `laitstyles-storefront:v3:client-state` | new | authoritative minimal snapshot |
| `laitstyles-storefront:v2:cart` | former `StorefrontProvider` | migrate, then remove after successful v3 write |
| `laitstyles-storefront:v1:cart` | compatibility | migrate, then remove after successful v3 write |
| `laitstyles-cart` | compatibility | migrate, then remove after successful v3 write |
| `laitstyles-storefront:v1:saved` | former `StorefrontProvider` | migrate, then remove after successful v3 write |
| `laitstyles-saved` | compatibility | migrate, then remove after successful v3 write |
| `laitstyles-storefront:v1:holds` | former experience provider | migrate absolute expiries, then remove after successful v3 write |
| `laitstyle-held-items-v1` | former `ShopProvider` | convert remaining seconds to an absolute expiry, then remove after successful v3 write |
| `laitstyles-storefront:v1:recent` | `StorefrontProvider` | remains a local presentation preference outside durable commerce intent |
| `laitstyles-storefront:v1:utility` | `StorefrontProvider` | remains a local presentation preference |
| `laitstyles-storefront:v1:latest-order` | checkout | explicit prototype receipt for the current session |
| `laitstyle-latest-order-v1` | legacy receipt key | read during compatibility window, removed on canonical write |

## Canonical client-state contract

```ts
type StorefrontClientStateSnapshot = {
  version: 3;
  cart: Array<{
    productId: string;
    variantId: string | null;
    quantity: number;
  }>;
  saved: string[];
  holds: Array<{
    productId: string;
    expiresAt: number;
  }>;
};
```

No product name, price, image, material, description, stock object or catalogue row is persisted.

## Migration and failure rules

- Only a valid `version: 3` snapshot is authoritative.
- A malformed or wrong-version canonical value falls back to recoverable legacy state.
- Duplicate saved IDs are collapsed.
- Duplicate cart lines combine by `productId + variantId`.
- Non-positive or invalid quantities are removed.
- Duplicate holds keep the latest valid expiry.
- Expired holds are discarded.
- Legacy seconds-left holds are converted relative to migration time.
- Unknown products, unavailable variants and ambiguous legacy variant tokens are discarded during canonical restoration.
- Cart quantities are capped by current availability.
- Legacy keys are removed only after the canonical write succeeds.
- If the canonical write fails, legacy recovery data is retained.
- If cleanup is blocked after a successful canonical write, the canonical value remains authoritative and the storefront does not crash.

## Removed paths

- `src/components/shop/shop-provider.tsx`
- `src/features/storefront/shared/cart-persistence.ts`
- `src/features/storefront/shared/cart-persistence.test.ts`
- `src/features/storefront/shared/storefront-experience-provider.tsx`
- `src/features/storefront/shared/storefront-experience-data.ts`
- `src/features/storefront/shared/storefront-experience-data.test.ts`
- `src/features/storefront/checkout/checkout-flow.tsx`
- `src/lib/catalogue.ts`
- `src/lib/order.ts`

The architecture guard and boundary tests fail if these files or imports return.

## Validation state

Authored but not executed:

- state migration and failed-storage unit tests;
- canonical cart-restoration tests;
- checkout calculations and receipt tests;
- provider/route/catalogue boundary tests;
- mobile/tablet/desktop Playwright journeys;
- architecture, lint, typecheck, full test and production-build workflows.

GitHub-hosted Linux, Windows and macOS probes all fail before step allocation with no logs. The phase remains draft and unaccepted until actual commands execute and pass.
