# Storefront catalogue data source

PostgreSQL is the sole runtime catalogue authority. Application reads go through Prisma in
`src/server/commerce/catalogue/catalog-repository.ts`; active storefront routes consume only the
serializable `ProductSummary` and `ProductDetail` contracts from `src/lib/storefront/types.ts`.

## Runtime boundaries

- The root layout does not query or serialize the catalogue.
- `/`, `/products`, and `/products/[slug]` read on the server.
- `/products` owns filter, sort, and pagination state in `searchParams`; repository queries are
  bounded and paginated.
- Product cards consume `ProductSummary`; the product route consumes `ProductDetail`.
- Prisma models, database rows, cost fields, and internal operational fields never enter client
  components.
- Catalogue writes invalidate `catalogue` and the affected `product-${slug}` tag.

The remaining Generation-1 provider is mounted only for explicitly identified account/checkout
prototype routes and receives an empty compatibility catalogue. It is not a product source and is
not mounted around the home, catalogue, or product-detail routes.

## One-time snapshot import

`scripts/seed/storefront-catalog-snapshot.json` is migration input only. It is not a public asset,
runtime fallback, production synchronization mechanism, or client import.

```bash
pnpm db:import:catalog
```

The importer requires `DIRECT_URL`, validates the complete snapshot with Zod, rejects conflicting
identities before writes, and inserts all rows in one bounded transaction. Stable snapshot IDs and
`createMany({ skipDuplicates: true })` make interrupted imports resumable without turning the tool
into an update/synchronization path.

Variant-level measurements are persisted through `product_measurements.variant_id`; product-level
and variant-level positions have separate partial unique indexes. The importer verifies the full
measurement count before commit, including the 580 variant-scoped rows in the archived snapshot.

## Verification mode

`STOREFRONT_STYLE_SMOKE=1` exposes one deterministic canonical product from the repository boundary.
It exists only for build/browser verification where a managed Supabase database is unavailable. It
never activates in normal development or production.
