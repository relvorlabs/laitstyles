# Storefront catalogue data source

PostgreSQL is the canonical catalogue. Application reads go through Prisma and
`src/server/commerce/catalogue/catalog-repository.ts`; storefront code must not introduce a
second product source in TypeScript arrays, public JSON, account fixtures, or checkout fixtures.

## One-time snapshot import

`scripts/seed/storefront-catalog-snapshot.json` is retained only as the migration input that moved
the former 100-product storefront snapshot into PostgreSQL. It is not a public asset, runtime data
source, production sync mechanism, or file that client components may import.

The one-time importer is:

```bash
pnpm db:import:catalog
```

It requires `DIRECT_URL` from `.env.local`; `DATABASE_URL` is not accepted as a fallback. Before any
write, Zod validates the snapshot and the importer checks existing identity fields for conflicts.
All inserts then run inside one bounded transaction, followed by snapshot-ID count verification
before commit. The completion report includes normalized duplicate variant SKUs and the 580 omitted
variant-level measurements.

Rows use stable snapshot IDs with `createMany({ skipDuplicates: true })`. The importer remains
insert-only: a repeat can fill rows that were not inserted, but it does not update or reconcile rows
that already exist. Treat it as migration tooling, not a routine synchronization or development
seed.

### Environment safeguards

- Set and verify `DIRECT_URL` for the intended non-production database before running the command.
- Confirm the database host and name without printing credentials into logs.
- Take a recoverable backup or snapshot first.
- Do not run the importer against production. The script does not detect or block a production URL.
- Verify row counts and representative unique, stocked, and variant products after the command.
- Do not follow this import with `pnpm db:seed:storefront`: that development seed clears products
  and rebuilds a separate seven-product catalogue.

## Measurement limitation

The archived snapshot contains 884 measurements: 304 product-level rows and 580 variant-level
rows. The current Prisma model stores product-level measurements only, so the importer deliberately
imports the 304 product-level rows and omits all 580 variant-level rows. This is a known, intentional
migration limitation; the omitted values must not be described as persisted or available at
runtime. Supporting them later requires an explicit schema and product-contract decision.

## Runtime boundary

The repository applies the shared storefront visibility predicate and maps database records into
public product contracts. The server-only storefront loader builds the temporary shopper projection
consumed by existing UI providers; client modules import only client-safe types and serialized data,
never Prisma or the snapshot.

Catalogue writes must invalidate the `catalogue` and relevant `product-${slug}` cache tags. Missing
or hidden products resolve through the existing `null`/`notFound()` boundaries, and empty filter or
search results retain their explicit empty state.
