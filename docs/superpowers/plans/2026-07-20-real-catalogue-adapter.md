# Real Catalogue Adapter (Sub-project A) Implementation Plan

> **SUPERSEDED 2026-07-27 — do not execute.** Every file this plan touches (`src/lib/storefront/catalog-data.ts`, `src/server/commerce/catalogue/*`) was deleted or moved to `src/modules/products/**` by the architecture migration. The catalogue is already real/Prisma-backed under the new module (unlike when this plan was written). Kept for history only. See the replacement spec/plan dated 2026-07-27.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/products` and `/products/[slug]` read real, live Prisma-backed products instead of the static `storefront-catalog.json` dev fixture, with zero changes to the ~40 components that already consume the `Product`/`StorefrontCatalogPayload` contracts.

**Architecture:** `src/lib/storefront/catalog-data.ts` is rewritten to call the same real Prisma repository `/collections/[slug]` already uses (`src/server/commerce/catalogue/catalog-repository.ts`), then re-project its `ProductDetail[]` output into the existing shopper `Product` shape via a new pure mapping function. The repository gains two small additions (bulk product-detail listing, slug listing) it didn't need before. Dead JSON-fixture code, the fixture file, its build script, and its doc are removed. The dead `/shop` redirect stub is removed from `next.config.ts` per explicit request.

**Tech Stack:** Next.js 16 (Cache Components), Prisma 7, TypeScript, Vitest.

## Global Constraints

- Money crosses the DB boundary as integer kobo, converted to Naira only at the shopper-DTO edge (`docs/storefront-v2/03` §1; `koboToNaira`/`nairaToKobo` in `src/lib/money`).
- Every catalogue read is scoped through `publishedProductWhere()` — no unscoped product query (`docs/storefront-v2/03` §4, §5).
- `"use cache"`-directive repository functions are not unit-tested directly in this codebase (Vitest has no Next cache-directive runtime) — pure mapping/business logic is unit-tested instead; cache-wrapped reads are verified via `pnpm build` + browser check. This is the existing, deliberate convention (`mappers.test.ts` already follows it) — do not invent a workaround.
- Never claim a check passed without actually running it (`AGENTS.md` §11).
- Follow existing repo conventions: `server-only` on server modules, `Result`/`StorefrontError` for expected failures (not used in this plan — no writes here), Prisma singleton import from `@/lib/prisma`.

---

### Task 1: Repository additions — bulk detail listing, slug listing, category image

**Files:**
- Modify: `src/server/commerce/catalogue/catalog-repository.ts`
- Modify: `src/lib/storefront/types.ts:124-127` (`TaxonomyWithCount`)

**Interfaces:**
- Produces: `listPublishedProductDetails(limit?: number): Promise<ProductDetail[]>`, `listPublishedProductSlugs(): Promise<string[]>`, and `listStorefrontCategories(): Promise<TaxonomyWithCount[]>` now includes `imageUrl: string | null` on each returned item.
- Consumes: existing `prisma`, `publishedProductWhere`, `productDetailInclude`, `mapProductDetail` (already imported in this file).

No test step for the two new repository functions — see Global Constraints (cache-directive functions aren't unit-tested here); they're exercised by Task 6's build/browser check.

- [ ] **Step 1: Add `imageUrl` to `TaxonomyWithCount`**

Open `src/lib/storefront/types.ts` and change:

```ts
export interface TaxonomyWithCount extends TaxonomyRef {
  /** Count of storefront-visible products — never fabricated. */
  productCount: number;
}
```

to:

```ts
export interface TaxonomyWithCount extends TaxonomyRef {
  /** Category artwork; null until an admin sets one. */
  imageUrl: string | null;
  /** Count of storefront-visible products — never fabricated. */
  productCount: number;
}
```

- [ ] **Step 2: Populate `imageUrl` in `listStorefrontCategories`**

In `src/server/commerce/catalogue/catalog-repository.ts`, find:

```ts
export async function listStorefrontCategories(): Promise<TaxonomyWithCount[]> {
  if (useStyleSmokeCatalogue) return [{ ...styleSmokeCategory, productCount: 0 }];

  const categories = await prisma.catalogue_categories.findMany({
    orderBy: { position: "asc" },
    select: { id: true, slug: true, name: true },
  });
  const withCounts = await Promise.all(
    categories.map(async (category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      productCount: await prisma.products.count({
        where: { AND: [publishedProductWhere(), { category_id: category.id }] },
      }),
    })),
  );
  return withCounts.filter((category) => category.productCount > 0);
}
```

Replace with:

```ts
export async function listStorefrontCategories(): Promise<TaxonomyWithCount[]> {
  if (useStyleSmokeCatalogue) {
    return [{ ...styleSmokeCategory, imageUrl: null, productCount: 0 }];
  }

  const categories = await prisma.catalogue_categories.findMany({
    orderBy: { position: "asc" },
    select: { id: true, slug: true, name: true, image_url: true },
  });
  const withCounts = await Promise.all(
    categories.map(async (category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      imageUrl: category.image_url,
      productCount: await prisma.products.count({
        where: { AND: [publishedProductWhere(), { category_id: category.id }] },
      }),
    })),
  );
  return withCounts.filter((category) => category.productCount > 0);
}
```

- [ ] **Step 3: Add `listPublishedProductDetails` and `listPublishedProductSlugs`**

At the end of `src/server/commerce/catalogue/catalog-repository.ts`, add:

```ts
// The prototype storefront (/products*) loads the whole visible catalogue at
// once and filters/sorts client-side — see src/lib/storefront/catalog-data.ts.
// A single boutique store stays well under this ceiling; server-side
// pagination for /products is a later refinement if the catalogue grows past it.
const STOREFRONT_CATALOG_LIMIT = 300;

export async function listPublishedProductDetails(
  limit: number = STOREFRONT_CATALOG_LIMIT,
): Promise<ProductDetail[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");

  if (useStyleSmokeCatalogue) return [];

  const rows = await prisma.products.findMany({
    where: publishedProductWhere(),
    include: productDetailInclude,
    orderBy: { created_at: "desc" },
    take: limit,
  });
  return rows.map(mapProductDetail);
}

export async function listPublishedProductSlugs(): Promise<string[]> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");

  if (useStyleSmokeCatalogue) return [];

  const rows = await prisma.products.findMany({
    where: publishedProductWhere(),
    select: { slug: true },
    take: STOREFRONT_CATALOG_LIMIT,
  });
  return rows.map((row) => row.slug);
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: no new errors. (`ProductDetail`, `mapProductDetail`, `productDetailInclude` are already imported at the top of this file.)

- [ ] **Step 5: Commit**

```bash
git add src/server/commerce/catalogue/catalog-repository.ts src/lib/storefront/types.ts
git commit -m "feat(storefront): add bulk product-detail and slug catalogue reads"
```

---

### Task 2: Pure shopper-product mapper

**Files:**
- Create: `src/lib/storefront/product-mapping.ts`
- Test: `src/lib/storefront/product-mapping.test.ts`

**Interfaces:**
- Consumes: `Product` from `@/features/storefront/shared/catalogue-data`; `ProductDetail`, `AvailabilityState` from `@/lib/storefront/types`; `koboToNaira` from `@/lib/money`.
- Produces: `toShopperProduct(detail: ProductDetail, index: number): Product` — used by Task 3.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/storefront/product-mapping.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toShopperProduct } from "./product-mapping";
import type { ProductDetail } from "@/lib/storefront/types";

function baseFields() {
  return {
    id: "prod-1",
    slug: "wool-jacket",
    name: "Wool Jacket",
    brand: "Archive",
    price: 4_800_000, // kobo => ₦48,000
    referencePrice: null,
    archiveNumber: null,
    condition: "Good" as string | null,
    material: "Wool" as string | null,
    fit: null as string | null,
    style: "Vintage" as string | null,
    category: { id: "c1", slug: "men", name: "Men" },
    collection: { id: "col1", slug: "archive", name: "Archive Edit" },
    cover: null,
    description: "A wool jacket",
    media: [
      { id: "m1", url: "https://cdn/cover.jpg", alt: "", kind: "cover" as const, position: 0, width: null, height: null, variantId: null },
      { id: "m2", url: "https://cdn/detail.jpg", alt: "", kind: "detail" as const, position: 1, width: null, height: null, variantId: null },
    ],
    measurements: [],
    reviewSummary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    careInstructions: null as string | null,
    flawNotes: null as string | null,
  };
}

function uniqueDetail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    ...baseFields(),
    mode: "unique",
    sizeLabel: "L",
    colour: "Sage",
    availability: { state: "available", available: 1, isOneOfOne: true },
    ...overrides,
  } as ProductDetail;
}

function variantDetail(): ProductDetail {
  return {
    ...baseFields(),
    mode: "variant",
    availability: { state: "available", available: 5, isOneOfOne: false },
    variants: [
      {
        id: "v1",
        label: "Small / Blue",
        sku: "SKU-1",
        size: "S",
        colour: "Blue",
        colourHex: "#1144AA",
        price: null,
        availability: { state: "available", available: 3, isOneOfOne: false },
      },
      {
        id: "v2",
        label: "Medium / Blue",
        sku: "SKU-2",
        size: "M",
        colour: "Blue",
        colourHex: "#1144AA",
        price: null,
        availability: { state: "low", available: 2, isOneOfOne: false },
      },
    ],
  } as ProductDetail;
}

describe("toShopperProduct", () => {
  it("maps common fields and converts kobo price to naira", () => {
    const product = toShopperProduct(uniqueDetail(), 0);
    expect(product.id).toBe("prod-1");
    expect(product.databaseId).toBe("prod-1");
    expect(product.slug).toBe("wool-jacket");
    expect(product.price).toBe(48_000);
    expect(product.category).toBe("Archive Edit");
    expect(product.type).toBe("Men");
    expect(product.images).toEqual(["https://cdn/cover.jpg", "https://cdn/detail.jpg"]);
  });

  it("maps condition grades", () => {
    expect(toShopperProduct(uniqueDetail({ condition: "Excellent" } as never), 0).condition).toBe("A+");
    expect(toShopperProduct(uniqueDetail({ condition: "Fair" } as never), 0).condition).toBe("B+");
    expect(toShopperProduct(uniqueDetail({ condition: "Good" } as never), 0).condition).toBe("A");
    expect(toShopperProduct(uniqueDetail({ condition: null } as never), 0).condition).toBe("A");
  });

  it("maps inventory mode", () => {
    expect(toShopperProduct(uniqueDetail(), 0).inventory).toBe("one-of-one");
    expect(toShopperProduct(variantDetail(), 0).inventory).toBe("variant");
  });

  it("maps availability state to shopper status", () => {
    expect(toShopperProduct(uniqueDetail({ availability: { state: "sold_out", available: 0, isOneOfOne: true } } as never), 0).status).toBe("sold");
    expect(toShopperProduct(uniqueDetail({ availability: { state: "reserved_by_others", available: 0, isOneOfOne: true } } as never), 0).status).toBe("reserved");
    expect(toShopperProduct(uniqueDetail({ availability: { state: "available", available: 1, isOneOfOne: true } } as never), 0).status).toBe("available");
    expect(toShopperProduct(uniqueDetail({ availability: { state: "low", available: 2, isOneOfOne: true } } as never), 0).status).toBe("available");
  });

  it("joins variant sizes and takes the first variant's colour", () => {
    const product = toShopperProduct(variantDetail(), 0);
    expect(product.size).toBe("S–M");
    expect(product.colour).toBe("Blue");
    expect(product.variants).toEqual(["S", "M"]);
  });

  it("uses sizeLabel and colour directly for unique/stocked modes", () => {
    const product = toShopperProduct(uniqueDetail(), 0);
    expect(product.size).toBe("L");
    expect(product.colour).toBe("Sage");
    expect(product.variants).toBeUndefined();
  });

  it("falls back sensible defaults for nullable fields", () => {
    const product = toShopperProduct(
      uniqueDetail({
        brand: null,
        material: null,
        careInstructions: null,
        flawNotes: null,
        fit: null,
        sizeLabel: null,
      } as never),
      0,
    );
    expect(product.brand).toBe("Unbranded");
    expect(product.brandStatus).toBe("Unbranded");
    expect(product.material).toBe("Material not specified");
    expect(product.careInstructions).toBe("Follow the garment care label.");
    expect(product.flaw).toBe("None");
    expect(product.fit).toBe("One size");
  });

  it("flags the first 20 catalogue-order products as new", () => {
    expect(toShopperProduct(uniqueDetail(), 19).new).toBe(true);
    expect(toShopperProduct(uniqueDetail(), 20).new).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/lib/storefront/product-mapping.test.ts`
Expected: FAIL — `Cannot find module './product-mapping'` (file doesn't exist yet).

- [ ] **Step 3: Implement `toShopperProduct`**

Create `src/lib/storefront/product-mapping.ts`:

```ts
import "server-only";

import type { Product } from "@/features/storefront/shared/catalogue-data";
import { koboToNaira } from "@/lib/money";
import type { AvailabilityState, ProductDetail } from "@/lib/storefront/types";

function conditionGrade(condition: string | null): Product["condition"] {
  if (condition === "Excellent") return "A+";
  if (condition === "Fair") return "B+";
  return "A";
}

function inventoryLabel(mode: ProductDetail["mode"]): Product["inventory"] {
  if (mode === "unique") return "one-of-one";
  if (mode === "stocked") return "matching-stock";
  return "variant";
}

function shopperStatus(state: AvailabilityState): Product["status"] {
  if (state === "sold_out") return "sold";
  if (state === "reserved_by_others") return "reserved";
  return "available";
}

/**
 * Maps a real Prisma-backed ProductDetail into the shopper-facing `Product`
 * contract the prototype storefront (/products*) already consumes. Preserves
 * the field derivations the retired JSON-fixture adapter used, so no
 * consuming component needs to change. `index` drives the `new` flag exactly
 * as before — the newest 20 products in catalogue order are "new".
 */
export function toShopperProduct(detail: ProductDetail, index: number): Product {
  const variants = detail.mode === "variant" ? detail.variants : [];
  const sizeLabelValue = detail.mode === "variant" ? null : detail.sizeLabel;
  const size =
    detail.mode === "variant"
      ? variants
          .map((variant) => variant.size)
          .filter((value): value is string => Boolean(value))
          .join("–")
      : sizeLabelValue ?? "";
  const colour =
    detail.mode === "variant" ? variants[0]?.colour ?? "" : detail.colour ?? "";
  const fit = detail.fit ?? sizeLabelValue ?? "One size";

  return {
    id: detail.id,
    databaseId: detail.id,
    slug: detail.slug,
    name: detail.name,
    brand: detail.brand ?? "Unbranded",
    brandStatus: detail.brand ? "Branded" : "Unbranded",
    category: detail.collection?.name ?? "Unisex",
    type: detail.category?.name ?? "Pieces",
    style: detail.style ?? "Essentials",
    price: koboToNaira(detail.price),
    referencePrice: detail.referencePrice != null ? koboToNaira(detail.referencePrice) : null,
    condition: conditionGrade(detail.condition),
    size,
    fit,
    colour,
    inventory: inventoryLabel(detail.mode),
    stock: detail.availability.available,
    status: shopperStatus(detail.availability.state),
    new: index < 20,
    saved: 0,
    flaw: detail.flawNotes ?? "None",
    material: detail.material ?? "Material not specified",
    careInstructions: detail.careInstructions ?? "Follow the garment care label.",
    images: detail.media.map((item) => item.url),
    ...(detail.mode === "variant"
      ? { variants: variants.map((variant) => variant.size ?? variant.label) }
      : {}),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/lib/storefront/product-mapping.test.ts`
Expected: PASS, 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storefront/product-mapping.ts src/lib/storefront/product-mapping.test.ts
git commit -m "feat(storefront): map real ProductDetail rows to the shopper Product contract"
```

---

### Task 3: Rewrite `catalog-data.ts` onto the real repository

**Files:**
- Modify: `src/lib/storefront/catalog-data.ts` (full rewrite)

**Interfaces:**
- Consumes: `toShopperProduct` (Task 2); `listPublishedProductDetails`, `listPublishedProductSlugs`, `listStorefrontCategories`, `getPublishedProductBySlug` (Task 1 + existing, from `@/server/commerce/catalogue/catalog-repository`).
- Produces (unchanged signatures, so no caller changes): `StorefrontCatalogPayload`, `StorefrontCategory`, `loadStorefrontCatalog(): Promise<StorefrontCatalogPayload>`, `loadStorefrontProductBySlug(slug): Promise<Product | null>`, `loadStorefrontProductPageBySlug(slug): Promise<StorefrontProductPageData | null>`, `loadStorefrontProductSlugs(): Promise<string[]>`, `StorefrontProductPageData`.
- Removed (dead exports — see Task 4 for why): `loadCatalogSnapshot`, `loadCatalogProductDetails`, `loadCatalogProductSummaries`, `CatalogSnapshot`.

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/lib/storefront/catalog-data.ts` with:

```ts
import "server-only";

import { connection } from "next/server";
import { cache } from "react";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import type { ProductDetail, ProductVariantOption } from "@/lib/storefront/types";
import {
  getPublishedProductBySlug,
  listPublishedProductDetails,
  listPublishedProductSlugs,
  listStorefrontCategories,
} from "@/server/commerce/catalogue/catalog-repository";
import { toShopperProduct } from "./product-mapping";

export interface StorefrontCatalogPayload {
  products: Product[];
  categories: StorefrontCategory[];
  measurementsCm: Record<string, number>;
  variantOptionsByProductId: Readonly<Record<string, readonly ProductVariantOption[]>>;
}

export interface StorefrontCategory {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  productCount: number;
}

// Static reference table for the global "Size guide" modal
// (features/storefront/shared/overlays/information-overlays.tsx) — generic
// body measurements, not tied to any one product. The retired JSON-fixture
// adapter only ever borrowed one arbitrary product's numbers for this;
// an explicit static table is more honest than parsing a live product's
// free-text measurement values for something that was never really "that
// product's" data in the first place.
const GENERIC_SIZE_GUIDE_CM: Record<string, number> = {
  Chest: 96,
  Waist: 80,
  Hip: 100,
  "Sleeve length": 63,
  "Shoulder width": 45,
  Length: 71,
};

const getBuiltCatalog = cache(async () => {
  // Cache Components (next.config.ts) makes reading the current time require
  // an explicit dynamic marker first; the underlying repository's scheduled-
  // product visibility check genuinely needs live wall-clock time.
  await connection();

  const details = await listPublishedProductDetails();
  const products = details.map((detail, index) => toShopperProduct(detail, index));
  const categoryRows = await listStorefrontCategories();
  const categories: StorefrontCategory[] = categoryRows.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    imageUrl: category.imageUrl ?? "",
    productCount: category.productCount,
  }));
  const variantOptionsByProductId = Object.fromEntries(
    details.map((detail) => [detail.id, detail.mode === "variant" ? detail.variants : []]),
  );

  return {
    products,
    categories,
    measurementsCm: GENERIC_SIZE_GUIDE_CM,
    variantOptionsByProductId,
  } satisfies StorefrontCatalogPayload;
});

// generateStaticParams runs at build time with no request scope, so it cannot
// call connection(); it only needs slugs to enumerate, not schedule-filtered
// current-time visibility (the page render itself enforces that freshly via
// getBuiltCatalog above).
export const loadStorefrontProductSlugs = cache(async () => listPublishedProductSlugs());

export async function loadStorefrontCatalog(): Promise<StorefrontCatalogPayload> {
  return getBuiltCatalog();
}

export async function loadStorefrontProductBySlug(slug: string): Promise<Product | null> {
  const catalog = await loadStorefrontCatalog();
  return catalog.products.find((product) => product.slug === slug) ?? null;
}

export interface StorefrontProductPageData {
  product: Product;
  detail: ProductDetail;
}

export async function loadStorefrontProductPageBySlug(
  slug: string,
): Promise<StorefrontProductPageData | null> {
  const catalog = await loadStorefrontCatalog();
  const product = catalog.products.find((candidate) => candidate.slug === slug);
  if (!product) return null;

  const detail = await getPublishedProductBySlug(slug);
  if (!detail) return null;

  return { product, detail };
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: errors only in `catalog-data.test.ts` (Task 4 rewrites it next) — no errors in any other file. If any other file errors, stop and report which one before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/lib/storefront/catalog-data.ts
git commit -m "feat(storefront): read the storefront catalogue from Prisma instead of a JSON fixture"
```

---

### Task 4: Rewrite `catalog-data.test.ts`

**Files:**
- Modify: `src/lib/storefront/catalog-data.test.ts` (full rewrite)

**Interfaces:**
- Consumes: mocks `@/server/commerce/catalogue/catalog-repository` and `next/server`'s `connection`.

- [ ] **Step 1: Replace the test file**

Replace the entire contents of `src/lib/storefront/catalog-data.test.ts` with:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductDetail } from "@/lib/storefront/types";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: vi.fn(async () => undefined),
}));

const listPublishedProductDetails = vi.fn();
const listPublishedProductSlugs = vi.fn();
const listStorefrontCategories = vi.fn();
const getPublishedProductBySlug = vi.fn();

vi.mock("@/server/commerce/catalogue/catalog-repository", () => ({
  listPublishedProductDetails,
  listPublishedProductSlugs,
  listStorefrontCategories,
  getPublishedProductBySlug,
}));

function detail(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "prod-1",
    slug: "wool-jacket",
    name: "Wool Jacket",
    brand: "Archive",
    price: 4_800_000,
    referencePrice: null,
    archiveNumber: null,
    condition: "Good",
    material: "Wool",
    fit: null,
    style: "Vintage",
    category: { id: "c1", slug: "men", name: "Men" },
    collection: null,
    cover: null,
    description: "A wool jacket",
    media: [
      { id: "m1", url: "https://cdn/cover.jpg", alt: "", kind: "cover", position: 0, width: null, height: null, variantId: null },
    ],
    measurements: [],
    reviewSummary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
    careInstructions: null,
    flawNotes: null,
    mode: "unique",
    sizeLabel: "L",
    colour: "Sage",
    availability: { state: "available", available: 1, isOneOfOne: true },
    ...overrides,
  } as ProductDetail;
}

describe("public storefront catalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listPublishedProductDetails.mockResolvedValue([detail()]);
    listPublishedProductSlugs.mockResolvedValue(["wool-jacket"]);
    listStorefrontCategories.mockResolvedValue([
      { id: "c1", slug: "men", name: "Men", imageUrl: "https://cdn/men.jpg", productCount: 1 },
    ]);
    getPublishedProductBySlug.mockResolvedValue(detail());
  });

  it("maps repository details into the shopper catalogue payload", async () => {
    const { loadStorefrontCatalog } = await import("./catalog-data");
    const catalog = await loadStorefrontCatalog();

    expect(catalog.products).toHaveLength(1);
    expect(catalog.products[0].slug).toBe("wool-jacket");
    expect(catalog.categories).toEqual([
      { id: "c1", slug: "men", name: "Men", imageUrl: "https://cdn/men.jpg", productCount: 1 },
    ]);
    expect(catalog.variantOptionsByProductId["prod-1"]).toEqual([]);
    expect(Object.keys(catalog.measurementsCm).length).toBeGreaterThan(0);
  });

  it("falls back to an empty category image when none is set", async () => {
    listStorefrontCategories.mockResolvedValue([
      { id: "c1", slug: "men", name: "Men", imageUrl: null, productCount: 1 },
    ]);
    const { loadStorefrontCatalog } = await import("./catalog-data");
    const catalog = await loadStorefrontCatalog();
    expect(catalog.categories[0].imageUrl).toBe("");
  });

  it("finds a product by slug, and returns null for a missing one", async () => {
    const { loadStorefrontProductBySlug } = await import("./catalog-data");
    expect((await loadStorefrontProductBySlug("wool-jacket"))?.slug).toBe("wool-jacket");
    expect(await loadStorefrontProductBySlug("missing")).toBeNull();
  });

  it("loads matching product + detail for a product page", async () => {
    const { loadStorefrontProductPageBySlug } = await import("./catalog-data");
    const page = await loadStorefrontProductPageBySlug("wool-jacket");
    expect(page?.product.slug).toBe("wool-jacket");
    expect(page?.detail.slug).toBe("wool-jacket");
  });

  it("returns null from the product page when the detail repository has no row", async () => {
    getPublishedProductBySlug.mockResolvedValue(null);
    const { loadStorefrontProductPageBySlug } = await import("./catalog-data");
    expect(await loadStorefrontProductPageBySlug("wool-jacket")).toBeNull();
  });

  it("returns null from the product page for a slug outside the catalogue", async () => {
    const { loadStorefrontProductPageBySlug } = await import("./catalog-data");
    expect(await loadStorefrontProductPageBySlug("missing")).toBeNull();
  });

  it("exposes the repository's slug list for static params", async () => {
    const { loadStorefrontProductSlugs } = await import("./catalog-data");
    expect(await loadStorefrontProductSlugs()).toEqual(["wool-jacket"]);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `pnpm exec vitest run src/lib/storefront/catalog-data.test.ts`
Expected: PASS, 7 tests. (If `import("./catalog-data")` per-test causes stale `cache()` memoization across tests, add `vi.resetModules()` inside `beforeEach` before the mock assignments — re-run to confirm green.)

- [ ] **Step 3: Run the full test suite**

Run: `pnpm test`
Expected: all tests pass, no failures elsewhere.

- [ ] **Step 4: Commit**

```bash
git add src/lib/storefront/catalog-data.test.ts
git commit -m "test(storefront): cover the Prisma-backed catalogue adapter"
```

---

### Task 5: Remove dead JSON-fixture artifacts and the `/shop` redirect stub

**Files:**
- Delete: `public/assets/data/storefront-catalog.json`
- Delete: `scripts/build-storefront-catalog.mjs`
- Delete: `docs/storefront-v2/catalog-data-source.md`
- Modify: `next.config.ts`
- Modify: any file found referencing the deleted doc/fixture (Step 1 finds them)

- [ ] **Step 1: Find every reference to the files being deleted**

Run: `grep -rn "storefront-catalog.json\|build-storefront-catalog\|catalog-data-source" --include=*.md --include=*.ts --include=*.tsx --include=*.mjs docs src scripts`

Expected: matches only in `docs/storefront-v2/00-current-state-audit.md`, `docs/storefront-v2/README.md` (if it links the doc), and the three files being deleted. For each match outside the deleted files, open it and remove or rewrite the sentence referencing the now-removed JSON fixture / build script / doc (state plainly that the storefront catalogue now reads live Prisma data — one sentence, no new claims beyond that).

- [ ] **Step 2: Delete the fixture, build script, and doc**

```bash
git rm public/assets/data/storefront-catalog.json scripts/build-storefront-catalog.mjs docs/storefront-v2/catalog-data-source.md
```

- [ ] **Step 3: Remove the `/shop` redirect stub**

In `next.config.ts`, remove the now-pointless legacy redirects (nothing links to `/shop` anymore; it should 404 like any other nonexistent route rather than redirect):

```ts
      {
        source: "/shop/category/:slug",
        destination: "/products?category=:slug",
        permanent: true,
      },
      {
        source: "/shop",
        destination: "/products",
        permanent: true,
      },
```

Leave the `/p/:slug` redirect untouched — it's unrelated.

- [ ] **Step 4: Verify nothing still links to `/shop`**

Run: `grep -rn "\"/shop\"\|'/shop'\|href=\"/shop" src`
Expected: no matches. If any component still links to `/shop`, update it to link to `/products` instead before continuing.

- [ ] **Step 5: Typecheck and build**

Run: `pnpm typecheck && pnpm build`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(storefront): remove the retired JSON catalogue fixture and dead /shop redirect"
```

---

### Task 6: Seed, full gate, browser verification, contrast check

A real dev seed script already exists — `pnpm db:seed:storefront` (`scripts/seed/seed-storefront.ts`) — and creates an admin profile, store settings, and 7 real published products across all three inventory modes (stocked, unique, variant), each with categories/collections, media, and stock. It is idempotent and requires no new script. Use it as-is.

**Files:** none (verification only).

- [ ] **Step 1: Confirm the seed's prerequisite env var is set**

Read `scripts/seed/seed-storefront.ts:19-22`: it requires `DIRECT_URL` in `.env.local`. Run: `grep -q DIRECT_URL .env.local && echo present || echo missing`. If missing, stop and tell the user — provisioning the database connection is outside this plan's scope.

- [ ] **Step 2: Run the seed**

Run: `pnpm db:seed:storefront`
Expected: ends with `Seed complete — 7 products.` (Safe to re-run — it's idempotent and clears+rebuilds the catalogue each time.)

- [ ] **Step 3: Run the full repo gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm audit:buttons`
Expected: all succeed. Then run: `pnpm dlx react-doctor@latest . --verbose --diff` per `AGENTS.md` §11 and review its output for new, changed-scope findings (not pre-existing advisory noise). If any step fails, stop and fix before continuing — do not report this task done otherwise.

- [ ] **Step 4: Start the dev server and open `/products`**

Use the project's preview tooling to start the dev server and navigate to `/products`. Confirm real seeded products render — e.g. "Levi's 501 Original Straight Jeans" (₦18,500, was ₦28,000), "Vintage Levi's Trucker Denim Jacket" (one-of-one, archive № 0042), "Floral Midi Tea Dress" (variant, sizes S/M/L) — with correct inventory badges (matching-stock / one-of-one / variant).

- [ ] **Step 5: Open `/products/vintage-levis-denim-jacket`**

Confirm the detail page renders: name, price, condition ("Excellent"), material, and the "Add to bag" control shows the real one-of-one stock state (available, 1 unit). Check the browser console and network tab for errors.

- [ ] **Step 6: Open `/products/floral-midi-tea-dress`**

Confirm the three size variants (S available, M available, L shows unavailable — seeded with 0 stock) render correctly, since this exercises the variant-mode branch of `toShopperProduct`.

- [ ] **Step 7: Confirm `/shop` no longer redirects**

Navigate to `/shop`. Expected: a 404 page (Next's default not-found), not a redirect to `/products`.

- [ ] **Step 8: Contrast check on touched surfaces**

While the above pages are open, check text/background contrast on anything newly rendered from real data (price, condition badge, category labels, the unavailable-variant state) against `AGENTS.md` §10's WCAG AA requirement. If anything reads below AA (e.g. a muted-foreground price label on a light card, or a disabled variant button's text), fix the specific Tailwind class in that component before continuing — this is opportunistic, scoped only to what's actually on screen from this change, not a repo-wide audit.

- [ ] **Step 9: Final commit if Step 8 required a fix**

```bash
git add -A
git commit -m "fix(storefront): correct contrast on real catalogue data display"
```

(Skip this step if Step 8 found nothing to fix.)
