# Storefront catalogue data source

The canonical development catalogue is [`public/assets/data/storefront-catalog.json`](../../public/assets/data/storefront-catalog.json). It is a single public-safe relational dataset generated from the 100-product archive; product records must not be copied into TypeScript components, account fixtures, checkout fixtures, or feature-local arrays.

## Dataset contract

The JSON retains each relation once, using stable IDs and snake_case database-style columns:

- store, category, collection, product, channel, variant, media, asset, measurement, and stock tables;
- product options, option values, and variant-option joins;
- condition reports;
- tags and product-tag joins;
- asset provenance and source-search records.

The source contains 100 products, 173 variants, 240 stock rows, 884 measurements, 100 condition reports, 100 audited external assets, 183 tags, 540 product-tag joins, and 289 variant-option joins. Cost, customer identity, holds, audit events, and stock movements remain excluded from the public projection.

Run the reproducible importer when a replacement archive is supplied:

```bash
node scripts/build-storefront-catalog.mjs <dataset-directory> public/assets/data/storefront-catalog.json
```

The importer verifies manifest counts, unique IDs, every relevant foreign key, inventory-mode rules, and stock arithmetic before writing the consolidated file.

## Runtime boundary

`src/lib/storefront/catalog-data.ts` is server-only. It validates the consolidated dataset and maps rows into the existing `ProductSummary`, `ProductDetail`, and shopper `Product` contracts. Client Components never import the JSON. The async root layout loads the catalog once on the server and passes the serializable shopper projection through the existing providers.

This follows the same boundary as a production database repository:

1. validate and authorize source rows on the server;
2. apply the shared storefront visibility predicate (active store and product, valid publication time, storefront channel, positive price, and cover media);
3. derive stock availability from stock rows and variants;
4. return only existing public DTOs to the client.

Product detail metadata, static params, page rendering, overlays, checkout, account fixtures, cart recommendations, and the legacy ShopProvider all consume that same server-loaded projection.

## Cache decision

`next.config.ts` does not enable Next.js Cache Components, so this implementation does not add `use cache`, `cacheLife`, or `cacheTag`. React `cache()` deduplicates the server repository build within a render/request. The imported JSON is deployment-versioned and changes only when the asset is regenerated and redeployed.

When the production Prisma repository becomes authoritative, retain the existing public DTOs and replace only this source adapter. Database mutations should invalidate the database-backed catalog at that point; Server Actions remain a mutation boundary, not a catalog read mechanism.

## Failure and empty states

- malformed roots, unsupported schema versions, broken relations, invalid prices, inconsistent stock, and duplicate product IDs fail explicitly before rendering;
- unpublished, archived, channel-disabled, non-positive-price, inactive-store, and coverless products are excluded;
- missing slugs return `null` and use the existing route `notFound()` boundary;
- filter/search results retain the existing empty state;
- empty media/viewer and empty home-hero cases are guarded rather than indexing missing data;
- external Pexels media remains marked as reference imagery and must be replaced with approved Laitstyles stock photography before production commerce claims.
