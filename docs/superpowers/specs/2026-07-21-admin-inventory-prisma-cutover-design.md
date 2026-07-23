# Admin Inventory — Prisma Cutover, Delete-All, and JSON Fixture Import — Design

## Status

Design accepted by the user (2026-07-21). Pending: write-up self-review, then user review of this written spec, then `superpowers:writing-plans`.

## Context

The user asked to: delete all products currently in the admin/stock, add an import mechanism for a JSON "product fixtures" file that generates ids at runtime without faking foreign keys or leaving disconnected rows, and make the admin Inventory page use real backend/server-side data instead of dummy in-memory/JSON data.

Investigation (recorded here, summarized from the conversation) found:

- A real, hand-curated Prisma schema (`prisma/schema.prisma`) already models the full commerce domain — `products`, `product_variants`, `product_media`, `stock_levels`, `catalogue_categories`, `catalogue_collections`, `holds`, `orders`, etc. — with every primary key defaulting to `gen_random_uuid()` at the database level. No table anywhere expects a client-supplied id.
- A real, tested, transactional admin→DB write path already exists: [`src/server/commerce/catalogue/product-write.ts`](../../../src/server/commerce/catalogue/product-write.ts)'s `createPublishedProduct`. It authorizes via `hasCapability`, writes the product + media + variants + stock + an audit event inside one `prisma.$transaction`, and is unit-tested by mocking `@/lib/prisma` (no test database). It is currently **dead code** — nothing in the app calls it yet. Its own comment describes it as "closing the 'one product truth' loop", i.e. written in anticipation of exactly this task.
- The storefront catalogue is already fully Prisma-backed and read-only ([`catalog-repository.ts`](../../../src/server/commerce/catalogue/catalog-repository.ts)), scoped to published products only via `publishedProductWhere()`.
- The **admin** Inventory page is not Prisma-backed at all. [`src/app/admin/layout.tsx`](../../../src/app/admin/layout.tsx) passes a static, hand-written in-memory seed (`activeAdminSeed` from `lib/admin/shared/admin-seed.ts`) into `AdminShell` as `initialState`. All admin "writes" — including the product editor's save flow ([`product-editor-save-action.ts`](../../../src/lib/admin/product-editor/product-editor-save-action.ts)) — are pure client-side reducer calls against an in-memory `AdminStore`, with new ids invented in the browser via `crypto.randomUUID()`. Nothing persists past the browser tab.
- `src/lib/admin/data/repositories.ts` already defines an `AdminRepositories` interface (`InventoryRepository`, `OrderRepository`, `HoldRepository`, `ReturnRepository`, `CustomerRepository`, `SettingsRepository`, `OverviewRepository`) with exactly one implementation today: `createInMemoryAdminRepositories` (`src/lib/admin/data/in-memory/admin-repositories.ts`), wired into the app by `AdminRepositoryProvider` (`src/features/admin/data/admin-repository-context.tsx`). This interface is the intended seam for a real backend — it was designed for this swap but never implemented against Prisma.
- A prior (uncommitted) design doc, [`2026-07-16-repo-restructuring-and-admin-query-migration-design.md`](2026-07-16-repo-restructuring-and-admin-query-migration-design.md), planned migrating all six admin domains onto TanStack Query in front of the *in-memory* store, and explicitly scoped a real Prisma-backed adapter as **out of scope**, deferred to later. This spec is that deferred work, scoped first to Inventory/Products (see Non-goals).
- **The live database is currently empty**: a direct read-only count check (`products`, `product_variants`, `product_media`, `stock_levels`, `order_lines`, `return_lines`, `stock_movements`, `activity_events`, `holds`, `catalogue_categories`, `catalogue_collections`, `orders` — all 0) confirms this is a green-field cutover, not a migration of real customer/order data. This directly de-risks the delete-all action: there is currently nothing that could hit a foreign-key `Restrict` (order/return/stock-movement history referencing a product).
- Role capabilities `inventory:delete` and `inventory:create` already exist in `src/lib/auth/permissions.ts` and are already assigned only to the roles that should hold them (`inventory:delete` is admin-only; managers get `inventory:create`/`update`/`archive` but not `delete`) — unused today, ready to gate the new actions.
- The admin `InventoryProduct` type (`src/lib/admin/inventory/inventory-types.ts`) represents money as a plain naira `number` (e.g. `18500`), formatted directly by `formatNaira`. This differs from the storefront's kobo-integer convention (`decimalToKobo` in `mappers.ts`) — the two surfaces intentionally use different money units today, and this spec follows the admin convention throughout (fixture JSON prices are naira, matching the Prisma `Decimal` column directly, matching `scripts/seed/seed-storefront.ts`'s existing precedent).

## Goals

1. Replace the Inventory workspace's in-memory read path with a real Prisma-backed one, covering every state the admin needs to see (draft/intake/active/archived, published/unpublished/scheduled) — not just the storefront's published-only slice.
2. Replace the product editor's in-memory save path with a real Prisma-backed write (create and update), removing all client-invented ids.
3. Add a reusable, capability-gated "delete all products" admin action.
4. Add a JSON fixture importer: a documented schema, client + server validation, and a transactional per-item import that resolves category/collection by slug (never a raw id) and lets Postgres generate every id.
5. Keep every existing business rule intact: capability checks, the `Result<T,E>` error convention, the product editor's Zod validation and duplicate-reference checks, audit logging for sensitive mutations.

## Non-goals / explicitly out of scope

- Orders, Holds, Returns, Customers, Settings, Overview stay on the in-memory `AdminStore` in this cycle. They derive some figures from products (Overview's sales pulse, open orders) — those derived reads are updated only to the extent they currently read `state.products`; the underlying order/hold/return/customer/settings data model is untouched. A follow-up spec covers migrating those five domains the same way.
- No changes to authentication, the role/capability matrix itself, or the Supabase auth boundary.
- No Cache Components / `use cache` on any admin read in this spec — per AGENTS.md, admin reads are not cached; only the Prisma-backed storefront catalogue has that carve-out today.
- No bulk *update* or *upsert-by-slug* import mode — the importer's job here is populating a currently-empty catalogue from a fixtures file, not reconciling an existing one. Re-running an import against a slug that already exists reports that row as skipped (see Error handling), it does not overwrite it.
- No image upload/processing pipeline. Fixture `cover`/`gallery` entries carry an already-hosted Cloudinary `publicId`/`secureUrl` (same shape `product-write.ts` already accepts) — the importer does not upload files to Cloudinary itself.

## Architecture

### Reads: Prisma-backed `InventoryRepository` behind a fetch adapter

A new server-only repository, `src/server/commerce/inventory/inventory-read.ts`, implements the four methods `InventoryRepository` already declares (`listProducts`, `getProduct`, `listTaxonomy`, `listStockMovements`), querying Prisma directly with **no** `publishedProductWhere()` scoping (admin must see everything). Row→`InventoryProduct` mapping lives alongside it (`inventory-mappers.ts`), following the same shape/structure as `server/commerce/catalogue/mappers.ts` but producing the admin's discriminated-union `InventoryProduct` (naira numbers, all lifecycle/publication states, full `InventoryCounts` from `stock_levels`).

Because Prisma is `server-only` and the existing `AdminRepositoryProvider` is a client component constructing its repository synchronously via `useState`, reads reach the client through new Route Handlers:

```
src/app/api/admin/inventory/products/route.ts        GET  -> listProducts
src/app/api/admin/inventory/products/[id]/route.ts    GET  -> getProduct
src/app/api/admin/inventory/taxonomy/route.ts          GET  -> listTaxonomy
src/app/api/admin/inventory/stock-movements/route.ts   GET  -> listStockMovements
```

Each route re-derives the caller's session/role server-side (same `getAdminAccess`/capability pattern as everywhere else in admin) and calls the new repository — it does not trust any client-supplied identity. A new `createFetchAdminInventoryRepository()` (`src/lib/admin/data/remote/inventory-repository.ts`) implements the same `InventoryRepository` interface by calling these routes with `fetch`. `AdminRepositoryProvider` swaps its `inventory` slot to this implementation; the other five domains keep using the in-memory factory unchanged (Non-goals). This matches the "browser-safe API/RPC adapter" AGENTS.md already anticipates for client reads, and keeps `InventoryRepository` as the one interface every consumer already codes against — no consuming component changes.

`src/app/admin/inventory/page.tsx` currently derives facet options synchronously from `activeAdminSeed.products` at the Server Component level. It switches to `await` the new repository's `listProducts()`/`listTaxonomy()` directly (a Server Component can call the server-only repository with no HTTP hop) to compute `getInventoryFacetOptions`/default query bounds from real data.

### Writes: three Server Actions

New file `src/server/commerce/inventory/inventory-write.ts`, `"use server"`, following `product-write.ts`'s established shape exactly (actor-capability check outside and inside the transaction, `prisma.$transaction`, `audit_events` row, `Result<T, StorefrontError>` return):

**1. `saveProduct(actor, input)`** — requires `inventory:create` (new product) or `inventory:update` (existing). Wraps product + variants + media + stock + measurements writes in one transaction. Called from the product editor's submit handler in place of today's pure-reducer `applyProductEditorAction` call for the persistence step; the existing Zod schema (`productEditorDraftSchema`) and duplicate-reference/stock-guard checks in `product-editor-save-action.ts` run unchanged *before* this call — only the final "commit" step moves from an in-memory reducer to a real database write. No id is ever supplied by the client for a new product or variant.

**2. `deleteAllProducts(actor)`** — requires `inventory:delete`. Single transaction:

```ts
await prisma.$transaction(async (tx) => {
  const result = await tx.products.deleteMany();
  await tx.audit_events.create({
    data: { actor_profile_id: actor.profileId, action: "inventory:delete-all", target_table: "products" },
  });
  return result.count;
});
```

Relies on the schema's existing cascade rules (`product_variants`, `product_media`, `stock_levels`, `product_channels`, `product_measurements`, `holds`, `product_reviews`, `customer_saved_products`, `intake_records` all cascade from `products`). Tables with a `Restrict`-by-default relation to `products` (`order_lines`, `return_lines`, `stock_movements`, `activity_events`) are **not** touched — if any of those ever hold rows referencing a product (real order/return/movement history), Postgres raises a foreign-key violation and the whole transaction rolls back. The action surfaces that as a clear, typed error ("N products have order or stock history and can't be deleted this way") rather than catching and silently force-deleting order data. Today, with an empty database, this path always succeeds.

**3. `importProductFixtures(actor, fixtures)`** — requires `inventory:create`. `fixtures` is a server-side-revalidated array (see Fixture schema below). For each fixture, **in its own transaction** (so one bad row doesn't roll back a successful batch):

```ts
for (const fixture of fixtures) {
  const result = await importOneFixture(actor, fixture); // own $transaction
  results.push(result); // { slug, status: "created" | "skipped-duplicate" | "error", message? }
}
```

`importOneFixture` resolves `categorySlug`/`collectionSlug` via upsert-by-slug (`tx.catalogue_categories.upsert({ where: { slug }, update: {}, create: {...} })` — same pattern as `scripts/seed/seed-storefront.ts`'s `ensureCategory`/`ensureCollection`), so a fixture referencing a category that doesn't exist yet creates it rather than failing or requiring the JSON to already know a database id. It then creates the product, its `cloudinary_assets`/`product_media` rows (upsert-by-`public_id`, same as `product-write.ts`), `product_measurements`, and either `product_variants` + one `stock_levels` row per variant, or one `stock_levels` row for unique/stocked mode — again mirroring `product-write.ts` exactly. If `products.create` fails on the unique `slug` constraint (`P2002`), that row is reported as `skipped-duplicate`, not a fatal error for the batch. One `audit_events` row is written per successfully created product.

### JSON fixture schema

A fixture file is a JSON array of objects. Validated with a Zod schema shared between client (pre-upload, immediate feedback) and server (defense-in-depth) — `src/lib/admin/inventory/inventory-fixture-schema.ts`:

```ts
{
  slug: string;                 // required, unique, lowercase-kebab
  name: string;                 // required
  description: string;          // required
  brand?: string;
  mode: "unique" | "stocked" | "variant";
  price: number;                 // naira, e.g. 18500 — matches the DB Decimal(12,2) column directly
  referencePrice?: number;
  condition?: string;
  sizeLabel?: string;
  colour?: string;
  archiveNumber?: string;        // required + unique when mode is "unique"
  categorySlug?: string;         // resolved by upsert-by-slug; category created if new
  categoryName?: string;         // required only when categorySlug doesn't already exist — provides the
                                  // display name for the category being created; row fails validation if
                                  // categorySlug is new and categoryName is missing
  collectionSlug?: string;
  collectionName?: string;       // same rule as categoryName, for collectionSlug
  cover: { publicId: string; secureUrl: string; alt: string; width?: number; height?: number };
  gallery?: { publicId: string; secureUrl: string; alt: string; kind: "detail" | "defect"; width?: number; height?: number }[];
  measurements?: { label: string; value: string }[];
  material?: string; fit?: string; style?: string; careInstructions?: string; flawNotes?: string;
  weightGrams?: number; pickupAvailable?: boolean; deliveryRestrictions?: string; packagingNotes?: string;
  // unique/stocked only:
  stock?: number;                 // defaults to 1 for "unique", required for "stocked"
  // variant only:
  variants?: { label: string; size?: string; colour?: string; sku?: string; price?: number; stock: number }[];
}
```

No object in the schema ever contains an `id` field for anything — products, variants, media, categories or collections. This is the concrete mechanism that satisfies "generate the ids at runtime... without... faking the foreign key connections": the schema makes it structurally impossible for a fixture to claim an id, and every relationship in the importer is resolved by natural key (slug) or created fresh inside the same transaction that creates the row referencing it, never a bare foreign key value pointing at a row that may not exist.

### UI additions (Inventory workspace)

- **Delete all products**: a destructive control (existing `Alert`/`Dialog` primitives, HugeIcons, role-token colours per AGENTS.md §7) visible only when the signed-in role has `inventory:delete`. Opens a confirmation dialog requiring the admin to type the word `DELETE` before the action enables, matching AGENTS.md §8's "confirm before destructive actions." On success, invalidates `inventoryKeys.products()` (and `overviewKeys.overview()`, since Overview derives from products) so the now-empty state renders immediately.
- **Import fixtures**: a new dialog/sheet with a file input (`accept="application/json"`), gated on `inventory:create`. Flow: read file → `JSON.parse` → Zod-validate client-side, listing every row's errors before any network call → on success, submit valid rows to `importProductFixtures` → render a per-row result table (created / skipped-duplicate / error with message) so a partial import is never silently ambiguous.
- Both controls live in `inventory-workspace-header.tsx` (existing overflow/actions area) or a small new `inventory-data-actions.tsx` if that header is already at capacity — decided during implementation based on the file's current size.

## Data flow summary

```
Inventory page (Server Component)
  -> await inventory-read.ts (direct Prisma, no HTTP hop) for facets/initial query bounds
  -> InventoryWorkspace (Client Component)
       -> useQuery(inventoryKeys.products()) -> AdminRepositoryProvider.inventory
            -> createFetchAdminInventoryRepository -> GET /api/admin/inventory/products
                 -> inventory-read.ts (Prisma)
       -> useMutation(saveProduct | deleteAllProducts | importProductFixtures)
            -> Server Action -> inventory-write.ts (Prisma, $transaction, audit_events)
            -> onSuccess: queryClient.invalidateQueries(inventoryKeys.products(), overviewKeys.overview())
```

## Error handling

- Every write returns the existing `Result<T, StorefrontError>` convention (`ok`/`err`), not a thrown exception, for expected failures (validation, duplicate slug, forbidden capability, FK restrict on delete-all). Unexpected errors (connection failure, unknown Prisma error) still throw and are caught by the route's/action's boundary, surfaced through the existing route `error.tsx` boundaries.
- Import failures are per-row, never batch-fatal, except a fixture that fails Zod validation client-side — those never reach the server at all.
- Delete-all failing on a `Restrict` FK violation is treated as an expected, typed error (not a crash): the admin sees which constraint blocked it and the transaction leaves data untouched (full rollback).

## Testing

Unit tests follow `product-write.test.ts`'s established convention exactly: `vi.mock("@/lib/prisma", ...)` with an in-memory fake `tx` recording exactly what each Prisma call receives — no test database.

- `inventory-write.test.ts`: `deleteAllProducts` calls `products.deleteMany()` and writes one audit event; `saveProduct` persists a new product with no client-supplied id; `importProductFixtures` resolves `categorySlug` via `upsert`, never passes an `id` field to any `create` call, reports a duplicate slug (`P2002`) as `skipped-duplicate` rather than throwing, and continues importing subsequent rows after one row errors.
- `inventory-fixture-schema.test.ts`: valid fixture passes; missing required field, wrong `mode`/`stock` combination, and any stray `id` field (schema doesn't even declare the key, so `.strict()` mode rejects it) all fail with a row-addressable error.
- `inventory-mappers.test.ts`: Prisma row → `InventoryProduct` mapping for all three modes (unique/stocked/variant), matching `mappers.test.ts`'s style.
- Route handler tests for the four new `GET` endpoints: unauthenticated/unauthorized requests rejected, authorized requests return the repository's mapped shape.

## Verification

`pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm exec vitest run --passWithNoTests`, `pnpm build` (per AGENTS.md §11), plus a manual browser pass against the real (currently empty) database: load Inventory (empty state renders correctly), import a small fixture file, confirm products appear, edit one, delete all, confirm empty state again.

## Risk register

- `deleteAllProducts` is irreversible by design (that's the request) — the type-to-confirm UI gate is the only safety net; there is no soft-delete/undo in this spec.
- If `Prisma`'s cascade behavior differs from schema.prisma's stated `onDelete` annotations at the live-database level (e.g. a manually-applied migration drifted from the schema file), delete-all could behave unexpectedly. Mitigated by testing delete-all against the real (currently empty, low-stakes) database during the manual verification pass before considering this done — not relying on the schema file's annotations alone.
- Fixture files are trusted input from the admin uploading them (not adversarial/public input), but server-side Zod re-validation still applies since a route/Server Action must never trust client-side validation alone.
