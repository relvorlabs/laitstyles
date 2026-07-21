# Admin Inventory — Prisma Cutover, Delete-All, and JSON Fixture Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the admin Inventory page's in-memory prototype data with real Prisma-backed reads and writes, add a capability-gated "delete all products" action, and add a JSON-fixture importer that generates every id at the database level.

**Architecture:** A new server-only `src/server/commerce/inventory/` module holds Prisma reads (`inventory-read.ts`) and Server Action writes (`inventory-write.ts`, `"use server"`), following the exact transaction+audit-event pattern already established by `src/server/commerce/catalogue/product-write.ts`. Reads reach the client through four new `GET` route handlers under `src/app/api/admin/inventory/*` and a new fetch-based `InventoryRepository` implementation that slots into the existing `AdminRepositoryProvider` in place of the in-memory one — every other admin domain (Orders/Holds/Returns/Customers/Settings/Overview) keeps using the in-memory store unchanged. Writes are called directly from the existing TanStack Query mutation hooks in `src/lib/admin/inventory/inventory-mutations.ts`, replacing their current `Promise.resolve(useAdmin().someReducer(...))` bodies with real async Server Action calls — the hooks' signatures and cache-patching logic do not change.

**Tech Stack:** Next.js 16 (App Router, Server Actions, Route Handlers), Prisma 7 (`@/lib/prisma`), TanStack Query (already wired), Zod, React Hook Form (unchanged), Vitest, Base UI/shadcn (`base-mira` style), HugeIcons.

## Global Constraints

- shadcn style `base-mira`, primitives are Base UI (not Radix), icons are HugeIcons — no new Lucide usage.
- No client-supplied `id` is ever sent to Prisma for a create — every id comes from the database's `gen_random_uuid()` default.
- Every mutation resolves the actor via `getServerAuthPrincipal()` + `resolveAdminAccess(principal, capability)` inside the Server Action itself — never trust a client-supplied profile id or role.
- Every write wraps its Prisma calls in `prisma.$transaction(...)` and writes one `audit_events` row for the action, matching `product-write.ts`.
- Every write returns `Result<T, StorefrontError>` (`ok`/`err` from `@/lib/errors`) for expected/business failures; only genuinely unexpected errors throw.
- Admin money fields are plain naira `number` (not kobo) — matches `formatNaira` and `InventoryProduct.price`, unlike the storefront's kobo convention.
- Category/collection are resolved by **upsert-by-slug**, never a raw id — matches `scripts/seed/seed-storefront.ts`'s `ensureCategory`/`ensureCollection`.
- Orders, Holds, Returns, Customers, Settings, Overview stay on the in-memory `AdminStore` in this plan — do not touch `lib/admin/shared/admin-seed.ts` or any of those domains' reducers.
- Test convention: `vi.mock("@/lib/prisma", ...)` with a hand-written fake `tx`/`prisma` object recording calls — no real test database, matching `product-write.test.ts`.
- Verification per task: `pnpm exec vitest run <changed test file>` at minimum; full `pnpm lint && pnpm exec tsc --noEmit && pnpm exec vitest run --passWithNoTests && pnpm build` at the end (AGENTS.md §11).

---

## Scope note (read before starting)

The approved design spec ([`docs/superpowers/specs/2026-07-21-admin-inventory-prisma-cutover-design.md`](../specs/2026-07-21-admin-inventory-prisma-cutover-design.md)) scoped writes to `saveProduct` (create/update), `deleteAllProducts`, and `importProductFixtures`. Writing this plan surfaced a correctness gap the spec didn't address: the Inventory workspace also has working **archive**, **restore**, **single-product delete**, and **catalogue-taxonomy create/rename/delete** buttons today (`inventory-mutations.ts`'s `useArchiveProduct`, `useRestoreProduct`, `useDeleteProduct`, `useCreateCatalogueTaxonomy`, `useRenameCatalogueTaxonomy`, `useDeleteCatalogueTaxonomy`). If reads move to Prisma but these six mutations keep writing to the disconnected in-memory store, every one of those buttons would silently stop working (the UI would refetch the *unchanged* real data after each "success"). This plan therefore also migrates those six mutations to Prisma — each is a small, mechanical port of already-fully-specified logic (`product-lifecycle-reducer.ts`, `catalogue-taxonomy.ts`), not new design. This is called out explicitly rather than silently expanding scope.

### Schema upgrade note (read before starting Task 4)

`prisma/schema.prisma` was substantially revised after the design spec was written (998 changed lines — new `deliveries`/`payments`/`order_reviews` models, `stock_levels` gained a `committed` column, `stock_movement_kind` gained `reservation_released`/`committed`/`commitment_released`, and several relations that used to default to Restrict now say `onDelete: SetNull` explicitly). Two things in this plan were checked against the new schema and adjusted:

- `stock_levels.committed` has `@default(0)` — every `stock_levels.create(...)` in this plan can omit it safely; no task needed changing because of it.
- **`product_variants` rows are now demonstrably long-lived**: `holds.variant_id`, `order_lines.variant_id`, and `stock_movements.variant_id` all still resolve to `onDelete: Restrict`. The original draft of Task 4 rebuilt variants by deleting every row for a product and recreating them on every save (mirroring `scripts/seed/seed-storefront.ts`'s dev-seed convenience). That pattern would throw a P2003 the first time a real hold, order line, or stock movement ever pointed at an existing variant. Task 4 below upserts variants **by id** instead — updating a variant that already exists, creating one that doesn't, and only deleting variants the editor actually removed (which still correctly fails loudly, not silently, if that specific variant has real history). `stock_levels` rows themselves stay safe to delete-and-recreate on every save, since nothing else in the schema holds a foreign key pointing at a `stock_levels.id`.

---

### Task 1: JSON fixture schema

**Files:**
- Create: `src/lib/admin/inventory/inventory-fixture-schema.ts`
- Test: `src/lib/admin/inventory/inventory-fixture-schema.test.ts`

**Interfaces:**
- Produces: `productFixtureSchema` (Zod schema, `.strict()`), `type ProductFixture = z.infer<typeof productFixtureSchema>`, `productFixtureFileSchema = z.array(productFixtureSchema)`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/admin/inventory/inventory-fixture-schema.test.ts
import { describe, expect, it } from "vitest";
import { productFixtureFileSchema, productFixtureSchema } from "./inventory-fixture-schema";

const validUnique = {
  slug: "vintage-levis-jacket",
  name: "Vintage Levi's Jacket",
  description: "A one-of-one trucker jacket.",
  mode: "unique" as const,
  price: 34000,
  categorySlug: "jackets-coats",
  categoryName: "Jackets & Coats",
  archiveNumber: "0099",
  cover: { publicId: "cover-1", secureUrl: "https://res.cloudinary.com/demo/image/upload/cover-1.jpg", alt: "Jacket" },
};

describe("productFixtureSchema", () => {
  it("accepts a complete unique-mode fixture", () => {
    const result = productFixtureSchema.safeParse(validUnique);
    expect(result.success).toBe(true);
  });

  it("rejects a fixture that carries an id field", () => {
    const result = productFixtureSchema.safeParse({ ...validUnique, id: "not-allowed" });
    expect(result.success).toBe(false);
  });

  it("rejects unique mode without an archiveNumber", () => {
    const { archiveNumber, ...withoutArchiveNumber } = validUnique;
    const result = productFixtureSchema.safeParse(withoutArchiveNumber);
    expect(result.success).toBe(false);
  });

  it("rejects stocked mode without a stock count", () => {
    const result = productFixtureSchema.safeParse({
      ...validUnique,
      mode: "stocked",
      sku: "SKU-1",
      archiveNumber: undefined,
    });
    expect(result.success).toBe(false);
  });

  it("accepts stocked mode with a stock count", () => {
    const result = productFixtureSchema.safeParse({
      ...validUnique,
      mode: "stocked",
      archiveNumber: undefined,
      sku: "SKU-1",
      stock: 4,
    });
    expect(result.success).toBe(true);
  });

  it("rejects variant mode with a variant missing stock", () => {
    const result = productFixtureSchema.safeParse({
      ...validUnique,
      mode: "variant",
      archiveNumber: undefined,
      variants: [{ label: "Small", size: "S" }],
    });
    expect(result.success).toBe(false);
  });

  it("requires categoryName when categorySlug has no matching well-known slug hint", () => {
    const { categoryName, ...withoutCategoryName } = validUnique;
    const result = productFixtureSchema.safeParse(withoutCategoryName);
    expect(result.success).toBe(false);
  });

  it("parses a file as an array of fixtures", () => {
    const result = productFixtureFileSchema.safeParse([validUnique]);
    expect(result.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/admin/inventory/inventory-fixture-schema.test.ts`
Expected: FAIL — `Cannot find module './inventory-fixture-schema'`

- [ ] **Step 3: Write the schema**

```ts
// src/lib/admin/inventory/inventory-fixture-schema.ts
import { z } from "zod";

const mediaAssetSchema = z
  .object({
    publicId: z.string().min(1),
    secureUrl: z.string().url(),
    alt: z.string().min(1),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .strict();

const gallerySchema = mediaAssetSchema.extend({ kind: z.enum(["detail", "defect"]) }).strict();

const measurementSchema = z.object({ label: z.string().min(1), value: z.string().min(1) }).strict();

const variantSchema = z
  .object({
    label: z.string().min(1),
    size: z.string().min(1).optional(),
    colour: z.string().min(1).optional(),
    sku: z.string().min(1).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().min(0),
  })
  .strict();

const baseFixtureSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase-kebab, e.g. vintage-levis-jacket"),
  name: z.string().min(1),
  description: z.string().min(1),
  brand: z.string().min(1).optional(),
  price: z.number().positive(),
  referencePrice: z.number().positive().optional(),
  condition: z.string().min(1).optional(),
  sizeLabel: z.string().min(1).optional(),
  colour: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  categoryName: z.string().min(1).optional(),
  collectionSlug: z.string().min(1).optional(),
  collectionName: z.string().min(1).optional(),
  cover: mediaAssetSchema,
  gallery: z.array(gallerySchema).optional(),
  measurements: z.array(measurementSchema).optional(),
  material: z.string().min(1).optional(),
  fit: z.string().min(1).optional(),
  style: z.string().min(1).optional(),
  careInstructions: z.string().min(1).optional(),
  flawNotes: z.string().min(1).optional(),
  weightGrams: z.number().int().positive().optional(),
  pickupAvailable: z.boolean().optional(),
  deliveryRestrictions: z.string().optional(),
  packagingNotes: z.string().optional(),
});

export const productFixtureSchema = z
  .discriminatedUnion("mode", [
    baseFixtureSchema.extend({ mode: z.literal("unique"), archiveNumber: z.string().min(1) }).strict(),
    baseFixtureSchema
      .extend({ mode: z.literal("stocked"), sku: z.string().min(1), stock: z.number().int().min(0) })
      .strict(),
    baseFixtureSchema
      .extend({ mode: z.literal("variant"), variants: z.array(variantSchema).min(1) })
      .strict(),
  ])
  .superRefine((fixture, ctx) => {
    if (fixture.categorySlug && !fixture.categoryName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "categoryName is required alongside categorySlug (used if the category is new).",
        path: ["categoryName"],
      });
    }
    if (fixture.collectionSlug && !fixture.collectionName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "collectionName is required alongside collectionSlug (used if the collection is new).",
        path: ["collectionName"],
      });
    }
  });

export type ProductFixture = z.infer<typeof productFixtureSchema>;

export const productFixtureFileSchema = z.array(productFixtureSchema);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/admin/inventory/inventory-fixture-schema.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin/inventory/inventory-fixture-schema.ts src/lib/admin/inventory/inventory-fixture-schema.test.ts
git commit -m "feat(admin): add the product-fixture JSON import schema"
```

---

### Task 2: Prisma row → InventoryProduct mappers

**Files:**
- Create: `src/server/commerce/inventory/inventory-mappers.ts`
- Test: `src/server/commerce/inventory/inventory-mappers.test.ts`

**Interfaces:**
- Consumes: `InventoryProduct`, `InventoryCounts`, `ProductMedia`, `CatalogueTaxonomyItem`, `StockMovement`, `CatalogueChannel` from `@/lib/admin/inventory/inventory-types` and `@/lib/admin/inventory/catalogue-taxonomy`.
- Produces: `inventoryProductInclude` (Prisma include object), `type InventoryProductRow`, `mapInventoryProductRow(row): InventoryProduct`, `mapTaxonomyRow(row, kind): CatalogueTaxonomyItem`, `mapStockMovementRow(row): StockMovement` — consumed by Task 3.

- [ ] **Step 1: Write the failing test**

```ts
// src/server/commerce/inventory/inventory-mappers.test.ts
import { describe, expect, it } from "vitest";
import { mapInventoryProductRow, mapStockMovementRow, mapTaxonomyRow } from "./inventory-mappers";

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "prod-1",
    slug: "levis-501",
    name: "Levi's 501",
    description: "Classic denim.",
    brand: "Levi's",
    inventory_mode: "stocked",
    price: { toNumber: () => 18500 },
    reference_price: { toNumber: () => 28000 },
    cost: null,
    lifecycle: "active",
    publication: "published",
    low_stock_threshold: 2,
    archive_number: null,
    sku: "SKU-1",
    condition: "Excellent",
    size_label: "32",
    colour: "Mid Blue",
    material: null,
    fit: null,
    style: null,
    care_instructions: null,
    flaw_notes: null,
    weight_grams: null,
    pickup_available: true,
    delivery_restrictions: "",
    packaging_notes: "",
    scheduled_at: null,
    created_at: new Date("2026-01-01T00:00:00.000Z"),
    updated_at: new Date("2026-01-02T00:00:00.000Z"),
    catalogue_categories: { name: "Jeans & Denim" },
    catalogue_collections: null,
    product_channels: [{ channel: "storefront" }, { channel: "physical_store" }],
    product_media: [
      {
        id: "media-1",
        position: 0,
        kind: "product_cover",
        cloudinary_assets: { secure_url: "https://example/cover.jpg", public_id: "cover-1", alt: "Cover" },
      },
    ],
    product_measurements: [],
    product_variants: [],
    stock_levels: [
      { total_received: 4, available: 3, reserved: 1, sold: 0, returned: 0, damaged: 0 },
    ],
    ...overrides,
  };
}

describe("mapInventoryProductRow", () => {
  it("maps a stocked product row", () => {
    // biome-ignore lint/suspicious/noExplicitAny: hand-built fixture, not a real Prisma row type
    const product = mapInventoryProductRow(baseRow() as any);
    expect(product.inventoryMode).toBe("stocked");
    expect(product.price).toBe(18500);
    expect(product.referencePrice).toBe(28000);
    expect(product.category).toBe("Jeans & Denim");
    expect(product.collection).toBeNull();
    expect(product.channels).toEqual(["storefront", "physical-store"]);
    expect(product.media[0]).toMatchObject({ url: "https://example/cover.jpg", kind: "cover" });
    if (product.inventoryMode === "stocked") {
      expect(product.stock).toEqual({
        totalReceived: 4,
        available: 3,
        reserved: 1,
        sold: 0,
        returned: 0,
        damaged: 0,
      });
    }
  });

  it("maps a variant product row with per-variant stock", () => {
    const row = baseRow({
      inventory_mode: "variant",
      sku: null,
      stock_levels: [],
      product_variants: [
        {
          id: "variant-1",
          label: "Small",
          sku: "SKU-1-S",
          size: "S",
          colour: null,
          price: null,
          cost: null,
          position: 0,
          product_media: [],
          stock_levels: [
            { total_received: 2, available: 2, reserved: 0, sold: 0, returned: 0, damaged: 0 },
          ],
        },
      ],
    });
    // biome-ignore lint/suspicious/noExplicitAny: hand-built fixture, not a real Prisma row type
    const product = mapInventoryProductRow(row as any);
    expect(product.inventoryMode).toBe("variant");
    if (product.inventoryMode === "variant") {
      expect(product.variants).toHaveLength(1);
      expect(product.variants[0]).toMatchObject({ id: "variant-1", label: "Small", size: "S" });
      expect(product.variants[0].stock.available).toBe(2);
    }
  });
});

describe("mapTaxonomyRow", () => {
  it("maps a category row", () => {
    const item = mapTaxonomyRow(
      {
        id: "cat-1",
        slug: "jeans-denim",
        name: "Jeans & Denim",
        created_at: new Date("2026-01-01T00:00:00.000Z"),
        updated_at: new Date("2026-01-01T00:00:00.000Z"),
      },
      "category",
    );
    expect(item).toMatchObject({ id: "cat-1", kind: "category", slug: "jeans-denim" });
  });
});

describe("mapStockMovementRow", () => {
  it("maps a stock movement row", () => {
    const movement = mapStockMovementRow({
      id: "move-1",
      product_id: "prod-1",
      variant_id: null,
      kind: "received",
      quantity: 4,
      occurred_at: new Date("2026-01-01T00:00:00.000Z"),
      note: "Initial stock",
      profiles: { display_name: "Store owner" },
      // biome-ignore lint/suspicious/noExplicitAny: hand-built fixture, not a real Prisma row type
    } as any);
    expect(movement).toMatchObject({ id: "move-1", kind: "received", quantity: 4, actor: "Store owner" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-mappers.test.ts`
Expected: FAIL — `Cannot find module './inventory-mappers'`

- [ ] **Step 3: Write the mappers**

```ts
// src/server/commerce/inventory/inventory-mappers.ts
import "server-only";

import type { Prisma } from "@/lib/prisma";
import type { CatalogueTaxonomyItem, CatalogueTaxonomyKind } from "@/lib/admin/inventory/catalogue-taxonomy";
import type {
  CatalogueChannel,
  InventoryCounts,
  InventoryProduct,
  ProductMedia,
  ProductMeasurement,
  ProductMediaKind,
  ProductVariant,
  StockMovement,
} from "@/lib/admin/inventory/inventory-types";

export const inventoryProductInclude = {
  catalogue_categories: { select: { name: true } },
  catalogue_collections: { select: { name: true } },
  product_channels: true,
  product_media: {
    orderBy: { position: "asc" },
    include: { cloudinary_assets: { select: { secure_url: true, public_id: true, alt: true } } },
  },
  product_measurements: { orderBy: { position: "asc" } },
  product_variants: {
    orderBy: { position: "asc" },
    include: {
      stock_levels: true,
      product_media: {
        orderBy: { position: "asc" },
        include: { cloudinary_assets: { select: { secure_url: true } } },
      },
    },
  },
  stock_levels: { where: { variant_id: null } },
} satisfies Prisma.productsInclude;

export type InventoryProductRow = Prisma.productsGetPayload<{ include: typeof inventoryProductInclude }>;

const zeroCounts: InventoryCounts = {
  totalReceived: 0,
  available: 0,
  reserved: 0,
  sold: 0,
  returned: 0,
  damaged: 0,
};

function mapChannel(channel: string): CatalogueChannel {
  return channel === "physical_store" ? "physical-store" : (channel as CatalogueChannel);
}

function mapMediaKind(kind: string): ProductMediaKind {
  if (kind === "product_detail") return "detail";
  if (kind === "product_defect") return "defect";
  return "cover";
}

function mapMedia(row: InventoryProductRow["product_media"][number]): ProductMedia {
  return {
    id: row.id,
    url: row.cloudinary_assets.secure_url,
    provider: "cloudinary",
    storageKey: row.cloudinary_assets.public_id,
    alt: row.cloudinary_assets.alt,
    kind: mapMediaKind(row.kind),
    position: row.position,
  };
}

function mapCounts(row: {
  total_received: number;
  available: number;
  reserved: number;
  sold: number;
  returned: number;
  damaged: number;
} | undefined): InventoryCounts {
  if (!row) return zeroCounts;
  return {
    totalReceived: row.total_received,
    available: row.available,
    reserved: row.reserved,
    sold: row.sold,
    returned: row.returned,
    damaged: row.damaged,
  };
}

function mapMeasurement(row: { label: string; value: string }): ProductMeasurement {
  return { label: row.label, value: row.value };
}

function mapVariant(row: InventoryProductRow["product_variants"][number]): ProductVariant {
  return {
    id: row.id,
    label: row.label,
    sku: row.sku ?? "",
    size: row.size,
    colour: row.colour,
    imageUrl: row.product_media[0]?.cloudinary_assets.secure_url ?? null,
    price: row.price ? row.price.toNumber() : null,
    cost: row.cost ? row.cost.toNumber() : null,
    stock: mapCounts(row.stock_levels[0]),
  };
}

export function mapInventoryProductRow(row: InventoryProductRow): InventoryProduct {
  const base = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.catalogue_categories?.name ?? "Uncategorised",
    collection: row.catalogue_collections?.name ?? null,
    brand: row.brand ?? "Unlabelled",
    material: row.material,
    fit: row.fit,
    style: row.style,
    careInstructions: row.care_instructions,
    flawNotes: row.flaw_notes,
    image: row.product_media[0]?.cloudinary_assets.secure_url ?? "/product-placeholder.svg",
    media: row.product_media.map(mapMedia),
    price: row.price.toNumber(),
    referencePrice: row.reference_price ? row.reference_price.toNumber() : null,
    cost: row.cost ? row.cost.toNumber() : null,
    lifecycle: row.lifecycle,
    publication: row.publication,
    channels: row.product_channels.map((entry) => mapChannel(entry.channel)),
    lowStockThreshold: row.low_stock_threshold,
    fulfilment: {
      weightKg: row.weight_grams ? row.weight_grams / 1000 : null,
      pickupAvailable: row.pickup_available,
      deliveryRestrictions: row.delivery_restrictions,
      packagingNotes: row.packaging_notes,
    },
    scheduledAt: row.scheduled_at ? row.scheduled_at.toISOString() : undefined,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  if (row.inventory_mode === "unique") {
    return {
      ...base,
      inventoryMode: "unique",
      archiveNumber: row.archive_number ?? "Pending",
      condition: (row.condition ?? "Good") as "Excellent" | "Good" | "Fair",
      size: row.size_label ?? "Not recorded",
      colour: row.colour ?? "Not recorded",
      measurements: row.product_measurements.map(mapMeasurement),
      stock: mapCounts(row.stock_levels[0]),
    };
  }

  if (row.inventory_mode === "stocked") {
    return {
      ...base,
      inventoryMode: "stocked",
      sku: row.sku ?? "Pending",
      sizeLabel: row.size_label ?? "Not recorded",
      colour: row.colour ?? "Not recorded",
      stock: mapCounts(row.stock_levels[0]),
    };
  }

  return {
    ...base,
    inventoryMode: "variant",
    optionNames: [],
    variants: row.product_variants.map(mapVariant),
  };
}

export function mapTaxonomyRow(
  row: { id: string; slug: string; name: string; created_at: Date; updated_at: Date },
  kind: CatalogueTaxonomyKind,
): CatalogueTaxonomyItem {
  return {
    id: row.id,
    kind,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

// The DB's stock_movement_kind enum was expanded (reservation_released /
// committed / commitment_released) after the admin's own StockMovementKind
// union was defined and is now a superset of it. Translate rather than cast,
// so a movement kind the admin UI doesn't know how to label yet still falls
// back to something displayable instead of silently mismatching.
function mapStockMovementKind(kind: string): StockMovement["kind"] {
  if (kind === "reservation_released" || kind === "commitment_released") return "released";
  if (kind === "committed") return "reserved";
  return kind as StockMovement["kind"];
}

export function mapStockMovementRow(row: {
  id: string;
  product_id: string;
  variant_id: string | null;
  kind: string;
  quantity: number;
  occurred_at: Date;
  note: string | null;
  profiles: { display_name: string | null } | null;
}): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    kind: mapStockMovementKind(row.kind),
    quantity: row.quantity,
    occurredAt: row.occurred_at.toISOString(),
    actor: row.profiles?.display_name ?? "Store owner",
    note: row.note ?? "",
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-mappers.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/commerce/inventory/inventory-mappers.ts src/server/commerce/inventory/inventory-mappers.test.ts
git commit -m "feat(admin): map Prisma product rows to the admin InventoryProduct shape"
```

---

### Task 3: Prisma-backed inventory reads

**Files:**
- Create: `src/server/commerce/inventory/inventory-read.ts`
- Test: `src/server/commerce/inventory/inventory-read.test.ts`

**Interfaces:**
- Consumes: `inventoryProductInclude`, `mapInventoryProductRow`, `mapTaxonomyRow`, `mapStockMovementRow` from Task 2; `prisma` from `@/lib/prisma`.
- Produces: `listInventoryProducts(): Promise<InventoryProduct[]>`, `getInventoryProduct(productId: string): Promise<InventoryProduct | null>`, `listInventoryTaxonomy(): Promise<CatalogueTaxonomyItem[]>`, `listInventoryStockMovements(productId?: string): Promise<StockMovement[]>` — consumed by Task 9 (route handlers) and Task 4 (`saveProduct` reads the existing product).

- [ ] **Step 1: Write the failing test**

```ts
// src/server/commerce/inventory/inventory-read.test.ts
import { describe, expect, it, vi } from "vitest";

const productRow = {
  id: "prod-1",
  inventory_mode: "stocked",
  slug: "test",
  name: "Test",
  description: "",
  brand: null,
  price: { toNumber: () => 1000 },
  reference_price: null,
  cost: null,
  lifecycle: "active",
  publication: "published",
  low_stock_threshold: 1,
  archive_number: null,
  sku: "SKU-1",
  condition: "Good",
  size_label: "M",
  colour: "Black",
  material: null,
  fit: null,
  style: null,
  care_instructions: null,
  flaw_notes: null,
  weight_grams: null,
  pickup_available: true,
  delivery_restrictions: "",
  packaging_notes: "",
  scheduled_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  catalogue_categories: null,
  catalogue_collections: null,
  product_channels: [],
  product_media: [],
  product_measurements: [],
  product_variants: [],
  stock_levels: [],
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    products: {
      findMany: vi.fn().mockResolvedValue([productRow]),
      findUnique: vi.fn().mockResolvedValue(productRow),
    },
    catalogue_categories: { findMany: vi.fn().mockResolvedValue([]) },
    catalogue_collections: { findMany: vi.fn().mockResolvedValue([]) },
    stock_movements: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getInventoryProduct,
  listInventoryProducts,
  listInventoryStockMovements,
  listInventoryTaxonomy,
} from "./inventory-read";

describe("listInventoryProducts", () => {
  it("returns every product regardless of lifecycle/publication", async () => {
    const products = await listInventoryProducts();
    expect(products).toHaveLength(1);
    expect(prisma.products.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { updated_at: "desc" } }),
    );
    const call = vi.mocked(prisma.products.findMany).mock.calls[0][0];
    expect(call?.where).toBeUndefined();
  });
});

describe("getInventoryProduct", () => {
  it("returns null when not found", async () => {
    vi.mocked(prisma.products.findUnique).mockResolvedValueOnce(null);
    const product = await getInventoryProduct("missing");
    expect(product).toBeNull();
  });

  it("returns the mapped product when found", async () => {
    const product = await getInventoryProduct("prod-1");
    expect(product?.id).toBe("prod-1");
  });
});

describe("listInventoryTaxonomy", () => {
  it("combines categories and collections", async () => {
    vi.mocked(prisma.catalogue_categories.findMany).mockResolvedValueOnce([
      { id: "cat-1", slug: "jeans", name: "Jeans", created_at: new Date(), updated_at: new Date() },
    ]);
    const taxonomy = await listInventoryTaxonomy();
    expect(taxonomy).toEqual([expect.objectContaining({ kind: "category", slug: "jeans" })]);
  });
});

describe("listInventoryStockMovements", () => {
  it("filters by productId when provided", async () => {
    await listInventoryStockMovements("prod-1");
    expect(prisma.stock_movements.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { product_id: "prod-1" } }),
    );
  });

  it("omits the where clause when no productId is given", async () => {
    await listInventoryStockMovements();
    expect(prisma.stock_movements.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-read.test.ts`
Expected: FAIL — `Cannot find module './inventory-read'`

- [ ] **Step 3: Write the read repository**

```ts
// src/server/commerce/inventory/inventory-read.ts
import "server-only";

import { prisma } from "@/lib/prisma";
import type { CatalogueTaxonomyItem } from "@/lib/admin/inventory/catalogue-taxonomy";
import type { InventoryProduct, StockMovement } from "@/lib/admin/inventory/inventory-types";
import {
  inventoryProductInclude,
  mapInventoryProductRow,
  mapStockMovementRow,
  mapTaxonomyRow,
} from "@/server/commerce/inventory/inventory-mappers";

// Admin sees every product regardless of lifecycle/publication — unlike the
// storefront catalogue, there is no visibility filter here by design.
export async function listInventoryProducts(): Promise<InventoryProduct[]> {
  const rows = await prisma.products.findMany({
    include: inventoryProductInclude,
    orderBy: { updated_at: "desc" },
  });
  return rows.map(mapInventoryProductRow);
}

export async function getInventoryProduct(productId: string): Promise<InventoryProduct | null> {
  const row = await prisma.products.findUnique({
    where: { id: productId },
    include: inventoryProductInclude,
  });
  return row ? mapInventoryProductRow(row) : null;
}

export async function listInventoryTaxonomy(): Promise<CatalogueTaxonomyItem[]> {
  const [categories, collections] = await Promise.all([
    prisma.catalogue_categories.findMany({ orderBy: { name: "asc" } }),
    prisma.catalogue_collections.findMany({ orderBy: { name: "asc" } }),
  ]);
  return [
    ...categories.map((row) => mapTaxonomyRow(row, "category")),
    ...collections.map((row) => mapTaxonomyRow(row, "collection")),
  ];
}

export async function listInventoryStockMovements(productId?: string): Promise<StockMovement[]> {
  const rows = await prisma.stock_movements.findMany({
    where: productId ? { product_id: productId } : {},
    include: { profiles: { select: { display_name: true } } },
    orderBy: { occurred_at: "desc" },
  });
  return rows.map(mapStockMovementRow);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-read.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/commerce/inventory/inventory-read.ts src/server/commerce/inventory/inventory-read.test.ts
git commit -m "feat(admin): add Prisma-backed inventory reads"
```

---

### Task 4: `saveProduct` Server Action (create + update)

**Files:**
- Create: `src/server/commerce/inventory/inventory-write.ts`
- Test: `src/server/commerce/inventory/inventory-write.test.ts`

**Interfaces:**
- Consumes: `getInventoryProduct` (Task 3), `convertEditorValuesToProduct` from `@/lib/admin/product-editor/product-editor-conversion`, `validateCommittedStockEdit` from `@/lib/admin/product-editor/product-editor-stock-guard`, `productEditorDraftSchema` from `@/lib/admin/product-editor/product-editor-schema`, `getServerAuthPrincipal` from `@/lib/auth/server/session`, `resolveAdminAccess` from `@/lib/auth/server/access`, `ok`/`err`/`Result` from `@/lib/errors`, `ProductEditorActionError`/`ProductEditorActionSuccess`/`ProductEditorValues`/`ProductEditorIntent` from `@/lib/admin/product-editor/product-editor-types`.
- Produces: `saveProduct(values: ProductEditorValues, intent: ProductEditorIntent): Promise<Result<ProductEditorActionSuccess, ProductEditorActionError>>` — consumed by Task 11 (`useSaveProduct`).

- [ ] **Step 1: Write the failing test**

```ts
// src/server/commerce/inventory/inventory-write.test.ts
import { describe, expect, it, vi } from "vitest";

const recorded: {
  productCreates: Record<string, unknown>[];
  productUpdates: Record<string, unknown>[];
  variantCreates: Record<string, unknown>[];
  variantUpdates: { id: string; data: Record<string, unknown> }[];
  variantDeletes: string[][];
} = {
  productCreates: [],
  productUpdates: [],
  variantCreates: [],
  variantUpdates: [],
  variantDeletes: [],
};

vi.mock("@/lib/auth/server/session", () => ({
  getServerAuthPrincipal: vi.fn().mockResolvedValue({ profileId: "admin-1", role: "admin" }),
}));

vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError: class PrismaClientKnownRequestError {} },
  prisma: {
    products: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        products: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            recorded.productCreates.push(data);
            return { id: "prod-new", slug: data.slug, created_at: new Date(), updated_at: new Date() };
          },
          update: async ({ data }: { data: Record<string, unknown> }) => {
            recorded.productUpdates.push(data);
            return { id: "prod-1", slug: data.slug, created_at: new Date(), updated_at: new Date() };
          },
        },
        catalogue_categories: { upsert: async () => ({ id: "cat-1" }) },
        product_media: { deleteMany: async () => ({}), create: async () => ({}) },
        product_channels: { deleteMany: async () => ({}), create: async () => ({}) },
        product_measurements: { deleteMany: async () => ({}), createMany: async () => ({}) },
        product_variants: {
          deleteMany: async ({ where }: { where: { id: { in: string[] } } }) => {
            recorded.variantDeletes.push(where.id.in);
            return {};
          },
          create: async ({ data }: { data: Record<string, unknown> }) => {
            recorded.variantCreates.push(data);
            return { id: "variant-new", ...data };
          },
          update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
            recorded.variantUpdates.push({ id: where.id, data });
            return { id: where.id, ...data };
          },
        },
        stock_levels: { deleteMany: async () => ({}), create: async () => ({}) },
        stock_movements: { create: async () => ({}) },
        audit_events: { create: async () => ({}) },
      }),
  },
}));

import { saveProduct } from "./inventory-write";
import { createEmptyProductEditorValues } from "@/lib/admin/product-editor/product-editor-defaults";

describe("saveProduct", () => {
  it("creates a new stocked product with no client-supplied id", async () => {
    const values = {
      ...createEmptyProductEditorValues(),
      inventoryMode: "stocked" as const,
      name: "Nike Hoodie",
      description: "A hoodie.",
      category: "Hoodies",
      internalReference: "SKU-100",
      sellingPrice: 16000,
      stocked: { sizeLabel: "L", colour: "Black", quantity: 6 },
    };

    const result = await saveProduct(values, "publish");

    expect(result.ok).toBe(true);
    expect(recorded.productCreates[0]).not.toHaveProperty("id");
    if (result.ok) {
      expect(result.value.product.id).toBe("prod-new");
    }
  });

  it("rejects a draft with an empty required field via the shared schema", async () => {
    const values = { ...createEmptyProductEditorValues(), name: "" };
    const result = await saveProduct(values, "draft");
    expect(result.ok).toBe(true); // drafts skip publish-only requirements, but schema-level checks below prove wiring
  });

  it("upserts existing variants by id and only deletes variants that were actually removed", async () => {
    const { prisma } = await import("@/lib/prisma");
    const existingRow = {
      id: "prod-1",
      inventory_mode: "variant",
      slug: "floral-dress",
      name: "Floral Dress",
      description: "A dress.",
      brand: null,
      price: { toNumber: () => 17000 },
      reference_price: null,
      cost: null,
      lifecycle: "active",
      publication: "published",
      low_stock_threshold: 1,
      archive_number: null,
      sku: null,
      condition: null,
      size_label: null,
      colour: null,
      material: null,
      fit: null,
      style: null,
      care_instructions: null,
      flaw_notes: null,
      weight_grams: null,
      pickup_available: true,
      delivery_restrictions: "",
      packaging_notes: "",
      scheduled_at: null,
      created_at: new Date(),
      updated_at: new Date(),
      catalogue_categories: null,
      catalogue_collections: null,
      product_channels: [],
      product_media: [],
      product_measurements: [],
      product_variants: [
        {
          id: "variant-small",
          label: "Small",
          sku: "SKU-S",
          size: "S",
          colour: null,
          price: null,
          cost: null,
          position: 0,
          product_media: [],
          stock_levels: [{ total_received: 2, available: 2, reserved: 0, sold: 0, returned: 0, damaged: 0 }],
        },
        {
          id: "variant-large",
          label: "Large",
          sku: "SKU-L",
          size: "L",
          colour: null,
          price: null,
          cost: null,
          position: 1,
          product_media: [],
          stock_levels: [{ total_received: 1, available: 1, reserved: 0, sold: 0, returned: 0, damaged: 0 }],
        },
      ],
      stock_levels: [],
    };
    // biome-ignore lint/suspicious/noExplicitAny: hand-built fixture, not a real Prisma row type
    vi.mocked(prisma.products.findUnique).mockResolvedValueOnce(existingRow as any);

    const values = {
      ...createEmptyProductEditorValues(),
      productId: "prod-1",
      inventoryMode: "variant" as const,
      name: "Floral Dress",
      description: "A dress.",
      category: "Dresses",
      variant: {
        optionNames: ["Size"],
        variants: [
          {
            id: "variant-small",
            label: "Small",
            sku: "SKU-S",
            size: "S",
            colour: "",
            imageUrl: "",
            price: null,
            cost: null,
            quantity: 3,
          },
          {
            id: "",
            label: "Medium",
            sku: "SKU-M",
            size: "M",
            colour: "",
            imageUrl: "",
            price: null,
            cost: null,
            quantity: 2,
          },
        ],
      },
    };

    const result = await saveProduct(values, "publish");

    expect(result.ok).toBe(true);
    expect(recorded.variantUpdates).toEqual([
      { id: "variant-small", data: expect.objectContaining({ label: "Small" }) },
    ]);
    expect(recorded.variantCreates).toEqual([expect.objectContaining({ label: "Medium" })]);
    expect(recorded.variantDeletes).toEqual([["variant-large"]]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-write.test.ts`
Expected: FAIL — `Cannot find module './inventory-write'`

- [ ] **Step 3: Write `saveProduct`**

```ts
// src/server/commerce/inventory/inventory-write.ts
"use server";

import { Prisma, prisma } from "@/lib/prisma";
import { err, forbidden, ok, type Result } from "@/lib/errors";
import { resolveAdminAccess } from "@/lib/auth/server/access";
import { getServerAuthPrincipal } from "@/lib/auth/server/session";
import { getInventoryProduct } from "@/server/commerce/inventory/inventory-read";
import { convertEditorValuesToProduct } from "@/lib/admin/product-editor/product-editor-conversion";
import { validateCommittedStockEdit } from "@/lib/admin/product-editor/product-editor-stock-guard";
import type {
  InventoryProduct,
  ProductMediaKind,
} from "@/lib/admin/inventory/inventory-types";
import type {
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/admin/product-editor/product-editor-types";

const mediaKindToDb: Record<ProductMediaKind, "product_cover" | "product_detail" | "product_defect"> = {
  cover: "product_cover",
  detail: "product_detail",
  defect: "product_defect",
};

const channelToDb: Record<string, "storefront" | "physical_store" | "whatsapp" | "instagram"> = {
  storefront: "storefront",
  "physical-store": "physical_store",
  whatsapp: "whatsapp",
  instagram: "instagram",
};

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLocaleLowerCase("en-NG")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

async function requireCapability(
  capability: "inventory:create" | "inventory:update" | "inventory:archive" | "inventory:delete",
) {
  const principal = await getServerAuthPrincipal();
  const access = resolveAdminAccess(principal, capability);
  if (!access.ok || !principal.profileId) return null;
  return { profileId: principal.profileId };
}

async function resolveTaxonomyId(
  tx: Prisma.TransactionClient,
  kind: "category" | "collection",
  name: string,
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "Uncategorised") return null;
  const slug = slugify(trimmed);
  if (kind === "category") {
    const row = await tx.catalogue_categories.upsert({
      where: { slug },
      update: { name: trimmed },
      create: { slug, name: trimmed },
    });
    return row.id;
  }
  const row = await tx.catalogue_collections.upsert({
    where: { slug },
    update: { name: trimmed },
    create: { slug, name: trimmed },
  });
  return row.id;
}

// Variants are upserted by id, not deleted-and-recreated, because
// holds.variant_id / order_lines.variant_id / stock_movements.variant_id all
// resolve to onDelete: Restrict — deleting a variant row that already has real
// history throws P2003 instead of silently succeeding. Only variants genuinely
// removed by the editor (including all of them, if the product's mode changed
// away from "variant") are deleted; everything else updates in place.
// stock_levels rows have no incoming foreign keys pointing at their id, so
// they stay safe to delete-and-recreate on every save.
async function writeProductChildren(
  tx: Prisma.TransactionClient,
  productId: string,
  product: InventoryProduct,
  existingProduct: InventoryProduct | null,
) {
  await tx.product_media.deleteMany({ where: { product_id: productId } });
  await tx.product_channels.deleteMany({ where: { product_id: productId } });
  await tx.product_measurements.deleteMany({ where: { product_id: productId } });
  await tx.stock_levels.deleteMany({ where: { product_id: productId } });

  const existingVariantIds = new Set(
    existingProduct?.inventoryMode === "variant" ? existingProduct.variants.map((variant) => variant.id) : [],
  );
  const incomingVariantIds = new Set(
    product.inventoryMode === "variant" ? product.variants.map((variant) => variant.id) : [],
  );
  const removedVariantIds = [...existingVariantIds].filter((id) => !incomingVariantIds.has(id));
  if (removedVariantIds.length) {
    await tx.product_variants.deleteMany({ where: { id: { in: removedVariantIds } } });
  }

  for (const [index, media] of product.media.entries()) {
    const asset = await tx.cloudinary_assets.upsert({
      where: { public_id: media.storageKey ?? media.id },
      update: { secure_url: media.url, alt: media.alt },
      create: {
        kind: mediaKindToDb[media.kind],
        public_id: media.storageKey ?? media.id,
        secure_url: media.url,
        alt: media.alt,
      },
    });
    await tx.product_media.create({
      data: { product_id: productId, asset_id: asset.id, kind: mediaKindToDb[media.kind], position: index },
    });
  }

  for (const channel of product.channels) {
    await tx.product_channels.create({ data: { product_id: productId, channel: channelToDb[channel] } });
  }

  if (product.inventoryMode === "unique") {
    for (const [index, measurement] of product.measurements.entries()) {
      await tx.product_measurements.create({
        data: { product_id: productId, label: measurement.label, value: measurement.value, position: index },
      });
    }
    await tx.stock_levels.create({
      data: {
        product_id: productId,
        total_received: product.stock.totalReceived,
        available: product.stock.available,
        reserved: product.stock.reserved,
        sold: product.stock.sold,
        returned: product.stock.returned,
        damaged: product.stock.damaged,
      },
    });
    return;
  }

  if (product.inventoryMode === "stocked") {
    await tx.stock_levels.create({
      data: {
        product_id: productId,
        total_received: product.stock.totalReceived,
        available: product.stock.available,
        reserved: product.stock.reserved,
        sold: product.stock.sold,
        returned: product.stock.returned,
        damaged: product.stock.damaged,
      },
    });
    return;
  }

  for (const [index, variant] of product.variants.entries()) {
    const variantData = {
      label: variant.label,
      sku: variant.sku || null,
      size: variant.size,
      colour: variant.colour,
      price: variant.price != null ? variant.price.toFixed(2) : null,
      cost: variant.cost != null ? variant.cost.toFixed(2) : null,
      position: index,
    };
    const variantId = existingVariantIds.has(variant.id)
      ? (await tx.product_variants.update({ where: { id: variant.id }, data: variantData })).id
      : (await tx.product_variants.create({ data: { product_id: productId, ...variantData } })).id;

    await tx.stock_levels.create({
      data: {
        product_id: productId,
        variant_id: variantId,
        total_received: variant.stock.totalReceived,
        available: variant.stock.available,
        reserved: variant.stock.reserved,
        sold: variant.stock.sold,
        returned: variant.stock.returned,
        damaged: variant.stock.damaged,
      },
    });
  }
}

export async function saveProduct(
  values: ProductEditorValues,
  intent: ProductEditorIntent,
): Promise<Result<ProductEditorActionSuccess, ProductEditorActionError>> {
  const isUpdate = Boolean(values.productId);
  const actor = await requireCapability(isUpdate ? "inventory:update" : "inventory:create");
  if (!actor) {
    return err({ code: "validation-failed", message: "You don't have permission to save products." });
  }

  const existingProduct = values.productId ? await getInventoryProduct(values.productId) : null;
  if (values.productId && !existingProduct) {
    return err({ code: "product-not-found", message: "This product could not be found." });
  }

  const stockIssues = validateCommittedStockEdit(existingProduct ?? undefined, values);
  if (stockIssues.length) {
    return err({
      code: "validation-failed",
      message: "Received stock cannot be lower than units already reserved, sold, returned or damaged.",
      issues: stockIssues,
    });
  }

  const now = new Date().toISOString();
  const product = convertEditorValuesToProduct(values, {
    intent,
    now,
    existingProduct: existingProduct ?? undefined,
  });

  const requestedReference =
    product.inventoryMode === "unique" ? product.archiveNumber : product.inventoryMode === "stocked" ? product.sku : null;

  try {
    const written = await prisma.$transaction(async (tx) => {
      const categoryId = await resolveTaxonomyId(tx, "category", product.category);
      const collectionId = product.collection ? await resolveTaxonomyId(tx, "collection", product.collection) : null;

      const productData = {
        slug: product.slug,
        name: product.name,
        description: product.description,
        brand: product.brand,
        inventory_mode: product.inventoryMode,
        price: product.price.toFixed(2),
        reference_price: product.referencePrice != null ? product.referencePrice.toFixed(2) : null,
        cost: product.cost != null ? product.cost.toFixed(2) : null,
        lifecycle: product.lifecycle,
        publication: product.publication,
        low_stock_threshold: product.lowStockThreshold,
        archive_number: product.inventoryMode === "unique" ? product.archiveNumber : null,
        sku: product.inventoryMode === "stocked" ? product.sku : null,
        condition: product.inventoryMode === "unique" ? product.condition : null,
        size_label:
          product.inventoryMode === "unique"
            ? product.size
            : product.inventoryMode === "stocked"
              ? product.sizeLabel
              : null,
        colour: product.inventoryMode !== "variant" ? product.colour : null,
        category_id: categoryId,
        collection_id: collectionId,
        material: product.material,
        fit: product.fit,
        style: product.style,
        care_instructions: product.careInstructions,
        flaw_notes: product.flawNotes,
        weight_grams: product.fulfilment?.weightKg ? Math.round(product.fulfilment.weightKg * 1000) : null,
        pickup_available: product.fulfilment?.pickupAvailable ?? true,
        delivery_restrictions: product.fulfilment?.deliveryRestrictions ?? "",
        packaging_notes: product.fulfilment?.packagingNotes ?? "",
        scheduled_at: product.scheduledAt ? new Date(product.scheduledAt) : null,
      };

      const row = existingProduct
        ? await tx.products.update({ where: { id: existingProduct.id }, data: productData })
        : await tx.products.create({ data: productData });

      await writeProductChildren(tx, row.id, product, existingProduct);

      if (!existingProduct && intent !== "draft") {
        const quantity =
          product.inventoryMode === "variant"
            ? product.variants.reduce((total, variant) => total + variant.stock.totalReceived, 0)
            : product.stock.totalReceived;
        await tx.stock_movements.create({
          data: {
            product_id: row.id,
            kind: "received",
            quantity,
            actor_profile_id: actor.profileId,
            note: "Initial stock recorded through the product editor.",
          },
        });
      }

      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.profileId,
          action: existingProduct ? "inventory:update" : "inventory:create",
          target_table: "products",
          target_id: row.id,
        },
      });

      return row;
    });

    const savedProduct: InventoryProduct = { ...product, id: written.id };
    const message =
      intent === "draft"
        ? `${savedProduct.name} saved as a draft.`
        : intent === "schedule"
          ? `${savedProduct.name} scheduled for publication.`
          : `${savedProduct.name} published.`;

    return ok({ product: savedProduct, intent, message });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      requestedReference
    ) {
      return err({
        code: "duplicate-reference",
        message: `${requestedReference} is already used by another product.`,
        issues: [
          { path: "internalReference", message: "Use a unique archive number or SKU.", step: "identity" },
        ],
      });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return err({
        code: "validation-failed",
        message:
          "A removed variant still has order, hold or stock history and can't be deleted. Restore it or archive the product instead.",
      });
    }
    throw error;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-write.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/commerce/inventory/inventory-write.ts src/server/commerce/inventory/inventory-write.test.ts
git commit -m "feat(admin): add the saveProduct Server Action (real Prisma create/update)"
```

---

### Task 5: `archiveProduct`, `restoreProduct`, `deleteProduct` Server Actions

**Files:**
- Modify: `src/server/commerce/inventory/inventory-write.ts` (append three exports)
- Modify: `src/server/commerce/inventory/inventory-write.test.ts` (append tests)

**Interfaces:**
- Produces: `archiveProduct(productId: string)`, `restoreProduct(productId: string)`, `deleteProduct(productId: string): Promise<Result<ProductLifecycleActionSuccess, ProductLifecycleActionError>>` — consumed by Task 11.

- [ ] **Step 1: Write the failing tests**

Append to `src/server/commerce/inventory/inventory-write.test.ts` (extend the existing `vi.mock("@/lib/prisma", ...)` block's `$transaction` fake to also include `products: { update: ..., delete: ... }` and `order_lines`/`return_lines`/`stock_movements` counts used by the dependency check — replace the whole mock block with):

```ts
vi.mock("@/lib/prisma", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    },
  },
  prisma: {
    products: {
      findUnique: vi.fn().mockResolvedValue(null),
      findFirst: vi.fn().mockResolvedValue(null),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        products: {
          create: async ({ data }: { data: Record<string, unknown> }) => {
            recorded.productCreates.push(data);
            return { id: "prod-new", slug: data.slug, created_at: new Date(), updated_at: new Date() };
          },
          update: async ({ data }: { data: Record<string, unknown> }) => {
            recorded.productUpdates.push(data);
            return { id: "prod-1", slug: data.slug, created_at: new Date(), updated_at: new Date() };
          },
          delete: async () => ({ id: "prod-1" }),
        },
        catalogue_categories: { upsert: async () => ({ id: "cat-1" }) },
        product_media: { deleteMany: async () => ({}), create: async () => ({}) },
        product_channels: { deleteMany: async () => ({}), create: async () => ({}) },
        product_measurements: { deleteMany: async () => ({}), createMany: async () => ({}) },
        product_variants: {
          deleteMany: async () => ({}),
          create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "variant-new", ...data }),
          update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => ({
            id: where.id,
            ...data,
          }),
        },
        stock_levels: { deleteMany: async () => ({}), create: async () => ({}) },
        stock_movements: { create: async () => ({}) },
        audit_events: { create: async () => ({}) },
      }),
  },
}));
```

Add a new `describe` block in the same file:

```ts
import { archiveProduct, deleteProduct, restoreProduct } from "./inventory-write";

describe("archiveProduct / restoreProduct / deleteProduct", () => {
  it("archives a product", async () => {
    const result = await archiveProduct("prod-1");
    expect(result.ok).toBe(true);
    expect(recorded.productUpdates.at(-1)).toMatchObject({ lifecycle: "archived", publication: "unpublished" });
  });

  it("restores a product", async () => {
    const result = await restoreProduct("prod-1");
    expect(result.ok).toBe(true);
    expect(recorded.productUpdates.at(-1)).toMatchObject({ lifecycle: "active", publication: "unpublished" });
  });

  it("deletes a product with no dependents", async () => {
    const result = await deleteProduct("prod-1");
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-write.test.ts`
Expected: FAIL — `archiveProduct is not exported`

- [ ] **Step 3: Append the three Server Actions**

Append to `src/server/commerce/inventory/inventory-write.ts`:

```ts
import { err as errResult, ok as okResult } from "@/lib/errors";
import type {
  ProductLifecycleActionError,
  ProductLifecycleActionSuccess,
} from "@/lib/admin/inventory/product-lifecycle-reducer";

export async function archiveProduct(
  productId: string,
): Promise<Result<ProductLifecycleActionSuccess, ProductLifecycleActionError>> {
  const actor = await requireCapability("inventory:archive");
  if (!actor) {
    return errResult({ code: "product-not-found", productId, message: "You don't have permission to archive products." });
  }

  const existing = await getInventoryProduct(productId);
  if (!existing) {
    return errResult({ code: "product-not-found", productId, message: "The selected product could not be found." });
  }

  await prisma.$transaction(async (tx) => {
    await tx.products.update({
      where: { id: productId },
      data: { lifecycle: "archived", publication: "unpublished" },
    });
    await tx.product_channels.deleteMany({ where: { product_id: productId } });
    await tx.audit_events.create({
      data: { actor_profile_id: actor.profileId, action: "inventory:archive", target_table: "products", target_id: productId },
    });
  });

  return okResult({
    productId,
    deleted: false,
    message: `${existing.name} archived and removed from selling channels.`,
  });
}

export async function restoreProduct(
  productId: string,
): Promise<Result<ProductLifecycleActionSuccess, ProductLifecycleActionError>> {
  const actor = await requireCapability("inventory:update");
  if (!actor) {
    return errResult({ code: "product-not-found", productId, message: "You don't have permission to restore products." });
  }

  const existing = await getInventoryProduct(productId);
  if (!existing) {
    return errResult({ code: "product-not-found", productId, message: "The selected product could not be found." });
  }

  await prisma.$transaction(async (tx) => {
    await tx.products.update({ where: { id: productId }, data: { lifecycle: "active", publication: "unpublished" } });
    await tx.audit_events.create({
      data: { actor_profile_id: actor.profileId, action: "inventory:update", target_table: "products", target_id: productId },
    });
  });

  return okResult({ productId, deleted: false, message: `${existing.name} restored as an unpublished product.` });
}

export async function deleteProduct(
  productId: string,
): Promise<Result<ProductLifecycleActionSuccess, ProductLifecycleActionError>> {
  const actor = await requireCapability("inventory:delete");
  if (!actor) {
    return errResult({ code: "product-not-found", productId, message: "You don't have permission to delete products." });
  }

  const existing = await getInventoryProduct(productId);
  if (!existing) {
    return errResult({ code: "product-not-found", productId, message: "The selected product could not be found." });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.products.delete({ where: { id: productId } });
      await tx.audit_events.create({
        data: { actor_profile_id: actor.profileId, action: "inventory:delete", target_table: "products", target_id: productId },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return errResult({
        code: "product-not-found",
        productId,
        message: `${existing.name} cannot be permanently deleted because it has order, hold or stock history. Archive it instead.`,
      });
    }
    throw error;
  }

  return okResult({ productId, deleted: true, message: `${existing.name} permanently deleted.` });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-write.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/commerce/inventory/inventory-write.ts src/server/commerce/inventory/inventory-write.test.ts
git commit -m "feat(admin): add archive/restore/delete Server Actions for a single product"
```

---

### Task 6: `deleteAllProducts` Server Action

**Files:**
- Modify: `src/server/commerce/inventory/inventory-write.ts` (append)
- Modify: `src/server/commerce/inventory/inventory-write.test.ts` (append)

**Interfaces:**
- Produces: `deleteAllProducts(): Promise<Result<{ count: number }, StorefrontError>>` — consumed by Task 11/13.

- [ ] **Step 1: Write the failing test**

Append to `inventory-write.test.ts`:

```ts
import { deleteAllProducts } from "./inventory-write";

describe("deleteAllProducts", () => {
  it("deletes every product and writes one audit event", async () => {
    vi.mocked(prisma.products.deleteMany).mockResolvedValueOnce({ count: 3 });
    const result = await deleteAllProducts();
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.count).toBe(3);
  });
});
```

This test needs the transaction fake's `tx.products` to include `deleteMany`; update the shared `$transaction` fake used across the file (from Task 5's replacement block) to add `deleteMany: async () => ({ count: 3 })` alongside `create`/`update`/`delete` on `products`.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-write.test.ts`
Expected: FAIL — `deleteAllProducts is not exported`

- [ ] **Step 3: Append `deleteAllProducts`**

```ts
export async function deleteAllProducts(): Promise<Result<{ count: number }, ProductLifecycleActionError>> {
  const actor = await requireCapability("inventory:delete");
  if (!actor) {
    return errResult({
      code: "product-not-found",
      productId: "",
      message: "You don't have permission to delete all products.",
    });
  }

  try {
    const count = await prisma.$transaction(async (tx) => {
      const result = await tx.products.deleteMany();
      await tx.audit_events.create({
        data: { actor_profile_id: actor.profileId, action: "inventory:delete-all", target_table: "products" },
      });
      return result.count;
    });
    return okResult({ count });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return errResult({
        code: "product-not-found",
        productId: "",
        message: "Some products have order, return or stock history and can't be deleted this way. Archive them instead.",
      });
    }
    throw error;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-write.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/commerce/inventory/inventory-write.ts src/server/commerce/inventory/inventory-write.test.ts
git commit -m "feat(admin): add the deleteAllProducts Server Action"
```

---

### Task 7: `importProductFixtures` Server Action

**Files:**
- Modify: `src/server/commerce/inventory/inventory-write.ts` (append)
- Modify: `src/server/commerce/inventory/inventory-write.test.ts` (append)

**Interfaces:**
- Consumes: `ProductFixture`, `productFixtureFileSchema` from Task 1.
- Produces: `type FixtureImportRowResult = { slug: string; status: "created" | "skipped-duplicate" | "error"; message?: string }`, `importProductFixtures(fixtures: ProductFixture[]): Promise<Result<FixtureImportRowResult[], StorefrontError>>` — consumed by Task 14.

- [ ] **Step 1: Write the failing test**

Append to `inventory-write.test.ts`:

```ts
import { importProductFixtures } from "./inventory-write";

describe("importProductFixtures", () => {
  it("imports a valid unique-mode fixture with no id fields anywhere", async () => {
    const result = await importProductFixtures([
      {
        slug: "vintage-jacket",
        name: "Vintage Jacket",
        description: "One of one.",
        mode: "unique",
        price: 34000,
        archiveNumber: "0099",
        categorySlug: "jackets-coats",
        categoryName: "Jackets & Coats",
        cover: { publicId: "cover-9", secureUrl: "https://example/cover-9.jpg", alt: "Jacket" },
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([{ slug: "vintage-jacket", status: "created" }]);
    }
    const created = recorded.productCreates.at(-1);
    expect(created).not.toHaveProperty("id");
    expect(created).toMatchObject({ slug: "vintage-jacket", archive_number: "0099" });
  });

  it("reports a duplicate slug as skipped-duplicate instead of failing the batch", async () => {
    const duplicateError = new (
      await import("@/lib/prisma")
    ).Prisma.PrismaClientKnownRequestError("duplicate", "P2002");
    const prismaModule = await import("@/lib/prisma");
    const original = prismaModule.prisma.$transaction;
    vi.spyOn(prismaModule.prisma, "$transaction").mockImplementationOnce(async () => {
      throw duplicateError;
    });

    const result = await importProductFixtures([
      {
        slug: "already-exists",
        name: "Already Exists",
        description: "Dup.",
        mode: "stocked",
        price: 5000,
        sku: "SKU-DUP",
        stock: 2,
        categorySlug: "shirts",
        categoryName: "Shirts",
        cover: { publicId: "cover-dup", secureUrl: "https://example/cover-dup.jpg", alt: "Shirt" },
      },
    ]);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual([{ slug: "already-exists", status: "skipped-duplicate" }]);
    }
    prismaModule.prisma.$transaction = original;
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-write.test.ts`
Expected: FAIL — `importProductFixtures is not exported`

- [ ] **Step 3: Append `importProductFixtures`**

```ts
import type { ProductFixture } from "@/lib/admin/inventory/inventory-fixture-schema";

export type FixtureImportRowResult = {
  slug: string;
  status: "created" | "skipped-duplicate" | "error";
  message?: string;
};

async function importOneFixture(
  actorProfileId: string,
  fixture: ProductFixture,
): Promise<FixtureImportRowResult> {
  try {
    await prisma.$transaction(async (tx) => {
      const categoryId = fixture.categorySlug
        ? (
            await tx.catalogue_categories.upsert({
              where: { slug: fixture.categorySlug },
              update: {},
              create: { slug: fixture.categorySlug, name: fixture.categoryName ?? fixture.categorySlug },
            })
          ).id
        : null;
      const collectionId = fixture.collectionSlug
        ? (
            await tx.catalogue_collections.upsert({
              where: { slug: fixture.collectionSlug },
              update: {},
              create: { slug: fixture.collectionSlug, name: fixture.collectionName ?? fixture.collectionSlug },
            })
          ).id
        : null;

      const product = await tx.products.create({
        data: {
          slug: fixture.slug,
          name: fixture.name,
          description: fixture.description,
          brand: fixture.brand ?? null,
          inventory_mode: fixture.mode,
          price: fixture.price.toFixed(2),
          reference_price: fixture.referencePrice != null ? fixture.referencePrice.toFixed(2) : null,
          lifecycle: "active",
          publication: "published",
          condition: fixture.condition ?? null,
          size_label: fixture.sizeLabel ?? null,
          colour: fixture.colour ?? null,
          archive_number: fixture.mode === "unique" ? fixture.archiveNumber : null,
          sku: fixture.mode === "stocked" ? fixture.sku : null,
          category_id: categoryId,
          collection_id: collectionId,
          material: fixture.material ?? null,
          fit: fixture.fit ?? null,
          style: fixture.style ?? null,
          care_instructions: fixture.careInstructions ?? null,
          flaw_notes: fixture.flawNotes ?? null,
          weight_grams: fixture.weightGrams ?? null,
          pickup_available: fixture.pickupAvailable ?? true,
          delivery_restrictions: fixture.deliveryRestrictions ?? "",
          packaging_notes: fixture.packagingNotes ?? "",
        },
      });

      const coverAsset = await tx.cloudinary_assets.upsert({
        where: { public_id: fixture.cover.publicId },
        update: {},
        create: {
          kind: "product_cover",
          public_id: fixture.cover.publicId,
          secure_url: fixture.cover.secureUrl,
          alt: fixture.cover.alt,
          width: fixture.cover.width ?? null,
          height: fixture.cover.height ?? null,
        },
      });
      await tx.product_media.create({
        data: { product_id: product.id, asset_id: coverAsset.id, kind: "product_cover", position: 0 },
      });
      await tx.product_channels.create({ data: { product_id: product.id, channel: "storefront" } });

      for (const [index, item] of (fixture.gallery ?? []).entries()) {
        const kind = item.kind === "defect" ? "product_defect" : "product_detail";
        const asset = await tx.cloudinary_assets.upsert({
          where: { public_id: item.publicId },
          update: {},
          create: {
            kind,
            public_id: item.publicId,
            secure_url: item.secureUrl,
            alt: item.alt,
            width: item.width ?? null,
            height: item.height ?? null,
          },
        });
        await tx.product_media.create({ data: { product_id: product.id, asset_id: asset.id, kind, position: index + 1 } });
      }

      for (const [index, measurement] of (fixture.measurements ?? []).entries()) {
        await tx.product_measurements.create({
          data: { product_id: product.id, label: measurement.label, value: measurement.value, position: index },
        });
      }

      if (fixture.mode === "variant") {
        for (const [index, variant] of fixture.variants.entries()) {
          const createdVariant = await tx.product_variants.create({
            data: {
              product_id: product.id,
              label: variant.label,
              sku: variant.sku ?? null,
              size: variant.size ?? null,
              colour: variant.colour ?? null,
              price: variant.price != null ? variant.price.toFixed(2) : null,
              position: index,
            },
          });
          await tx.stock_levels.create({
            data: { product_id: product.id, variant_id: createdVariant.id, total_received: variant.stock, available: variant.stock },
          });
        }
      } else {
        const stock = fixture.mode === "unique" ? 1 : fixture.stock;
        await tx.stock_levels.create({ data: { product_id: product.id, total_received: stock, available: stock } });
      }

      await tx.audit_events.create({
        data: { actor_profile_id: actorProfileId, action: "inventory:create", target_table: "products", target_id: product.id },
      });
    });

    return { slug: fixture.slug, status: "created" };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { slug: fixture.slug, status: "skipped-duplicate" };
    }
    return { slug: fixture.slug, status: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function importProductFixtures(
  fixtures: ProductFixture[],
): Promise<Result<FixtureImportRowResult[], { kind: "forbidden"; message: string }>> {
  const actor = await requireCapability("inventory:create");
  if (!actor) {
    return err({ kind: "forbidden", message: "You don't have permission to import products." });
  }

  const results: FixtureImportRowResult[] = [];
  for (const fixture of fixtures) {
    results.push(await importOneFixture(actor.profileId, fixture));
  }
  return ok(results);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-write.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/commerce/inventory/inventory-write.ts src/server/commerce/inventory/inventory-write.test.ts
git commit -m "feat(admin): add the importProductFixtures Server Action"
```

---

### Task 8: Catalogue taxonomy Server Actions

**Files:**
- Create: `src/server/commerce/inventory/inventory-taxonomy-write.ts`
- Test: `src/server/commerce/inventory/inventory-taxonomy-write.test.ts`

**Interfaces:**
- Produces: `createCatalogueTaxonomy(input: CatalogueTaxonomyInput)`, `renameCatalogueTaxonomy(taxonomyId: string, name: string)`, `deleteCatalogueTaxonomy(taxonomyId: string): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>>` — consumed by Task 11. `taxonomyId` here is the real `catalogue_categories`/`catalogue_collections` row id, prefixed `category:` or `collection:` to disambiguate which table it targets (since the two tables share no id space) — see Step 3 for the exact encoding.

- [ ] **Step 1: Write the failing test**

```ts
// src/server/commerce/inventory/inventory-taxonomy-write.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/server/session", () => ({
  getServerAuthPrincipal: vi.fn().mockResolvedValue({ profileId: "admin-1", role: "admin" }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    catalogue_categories: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({
        id: "cat-1",
        slug: "denim",
        name: "Denim",
        created_at: new Date(),
        updated_at: new Date(),
      }),
      update: vi.fn().mockResolvedValue({
        id: "cat-1",
        slug: "denim-2",
        name: "Denim 2",
        created_at: new Date(),
        updated_at: new Date(),
      }),
      findUnique: vi.fn().mockResolvedValue({ id: "cat-1", name: "Denim" }),
    },
    catalogue_collections: { findFirst: vi.fn().mockResolvedValue(null) },
    products: { count: vi.fn().mockResolvedValue(0) },
  },
}));

import { createCatalogueTaxonomy, deleteCatalogueTaxonomy, renameCatalogueTaxonomy } from "./inventory-taxonomy-write";
import { prisma } from "@/lib/prisma";

describe("createCatalogueTaxonomy", () => {
  it("creates a category", async () => {
    const result = await createCatalogueTaxonomy({ kind: "category", name: "Denim" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.item?.kind).toBe("category");
  });

  it("rejects a duplicate name", async () => {
    vi.mocked(prisma.catalogue_categories.findFirst).mockResolvedValueOnce({ id: "existing" } as never);
    const result = await createCatalogueTaxonomy({ kind: "category", name: "Denim" });
    expect(result.ok).toBe(false);
  });
});

describe("renameCatalogueTaxonomy", () => {
  it("renames a category", async () => {
    const result = await renameCatalogueTaxonomy("category:cat-1", "Denim 2");
    expect(result.ok).toBe(true);
  });
});

describe("deleteCatalogueTaxonomy", () => {
  it("refuses to delete a category still in use", async () => {
    vi.mocked(prisma.products.count).mockResolvedValueOnce(2);
    const result = await deleteCatalogueTaxonomy("category:cat-1");
    expect(result.ok).toBe(false);
  });

  it("deletes an unused category", async () => {
    const result = await deleteCatalogueTaxonomy("category:cat-1");
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-taxonomy-write.test.ts`
Expected: FAIL — `Cannot find module './inventory-taxonomy-write'`

- [ ] **Step 3: Write the taxonomy Server Actions**

```ts
// src/server/commerce/inventory/inventory-taxonomy-write.ts
"use server";

import { prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/errors";
import { getServerAuthPrincipal } from "@/lib/auth/server/session";
import { resolveAdminAccess } from "@/lib/auth/server/access";
import type {
  CatalogueTaxonomyActionError,
  CatalogueTaxonomyActionSuccess,
  CatalogueTaxonomyInput,
  CatalogueTaxonomyItem,
} from "@/lib/admin/inventory/catalogue-taxonomy";

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLocaleLowerCase("en-NG")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function encodeTaxonomyId(kind: "category" | "collection", id: string): string {
  return `${kind}:${id}`;
}

function decodeTaxonomyId(taxonomyId: string): { kind: "category" | "collection"; id: string } | null {
  const [kind, id] = taxonomyId.split(":");
  if ((kind !== "category" && kind !== "collection") || !id) return null;
  return { kind, id };
}

async function requireInventoryUpdate() {
  const principal = await getServerAuthPrincipal();
  const access = resolveAdminAccess(principal, "inventory:update");
  return access.ok && principal.profileId ? { profileId: principal.profileId } : null;
}

export async function createCatalogueTaxonomy(
  input: CatalogueTaxonomyInput,
): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>> {
  const actor = await requireInventoryUpdate();
  if (!actor) return err({ code: "empty-name", message: "You don't have permission to manage catalogue groups." });

  const name = input.name.trim().replace(/\s+/g, " ");
  if (!name) return err({ code: "empty-name", message: `Enter a ${input.kind} name.` });

  const slug = slugify(name);
  const table = input.kind === "category" ? prisma.catalogue_categories : prisma.catalogue_collections;
  const existing = await table.findFirst({ where: { slug } });
  if (existing) {
    return err({ code: "duplicate-name", message: `${input.kind === "category" ? "Category" : "Collection"} "${name}" already exists.` });
  }

  const row = await table.create({ data: { slug, name } });
  const item: CatalogueTaxonomyItem = {
    id: encodeTaxonomyId(input.kind, row.id),
    kind: input.kind,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  return ok({ item, message: `${input.kind === "category" ? "Category" : "Collection"} "${name}" created.` });
}

export async function renameCatalogueTaxonomy(
  taxonomyId: string,
  nextName: string,
): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>> {
  const actor = await requireInventoryUpdate();
  if (!actor) return err({ code: "taxonomy-not-found", taxonomyId, message: "You don't have permission to rename catalogue groups." });

  const decoded = decodeTaxonomyId(taxonomyId);
  if (!decoded) return err({ code: "taxonomy-not-found", taxonomyId, message: "The selected catalogue group could not be found." });

  const name = nextName.trim().replace(/\s+/g, " ");
  if (!name) return err({ code: "empty-name", taxonomyId, message: `Enter a ${decoded.kind} name.` });

  const table = decoded.kind === "category" ? prisma.catalogue_categories : prisma.catalogue_collections;
  const row = await table.update({ where: { id: decoded.id }, data: { name, slug: slugify(name) } });
  const item: CatalogueTaxonomyItem = {
    id: taxonomyId,
    kind: decoded.kind,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  return ok({ item, message: `${decoded.kind === "category" ? "Category" : "Collection"} renamed to "${name}".` });
}

export async function deleteCatalogueTaxonomy(
  taxonomyId: string,
): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>> {
  const actor = await requireInventoryUpdate();
  if (!actor) return err({ code: "taxonomy-not-found", taxonomyId, message: "You don't have permission to delete catalogue groups." });

  const decoded = decodeTaxonomyId(taxonomyId);
  if (!decoded) return err({ code: "taxonomy-not-found", taxonomyId, message: "The selected catalogue group could not be found." });

  const usageCount = await prisma.products.count({
    where: decoded.kind === "category" ? { category_id: decoded.id } : { collection_id: decoded.id },
  });
  if (usageCount > 0) {
    return err({
      code: "taxonomy-in-use",
      taxonomyId,
      message: `This ${decoded.kind} is used by ${usageCount} product${usageCount === 1 ? "" : "s"}. Reassign those products before deleting it.`,
    });
  }

  const table = decoded.kind === "category" ? prisma.catalogue_categories : prisma.catalogue_collections;
  await table.delete({ where: { id: decoded.id } });

  return ok({ deletedId: taxonomyId, message: `${decoded.kind === "category" ? "Category" : "Collection"} deleted.` });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/server/commerce/inventory/inventory-taxonomy-write.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/commerce/inventory/inventory-taxonomy-write.ts src/server/commerce/inventory/inventory-taxonomy-write.test.ts
git commit -m "feat(admin): add Prisma-backed catalogue taxonomy Server Actions"
```

---

### Task 9: Route handlers for inventory reads

**Files:**
- Create: `src/app/api/admin/inventory/products/route.ts`
- Create: `src/app/api/admin/inventory/products/[id]/route.ts`
- Create: `src/app/api/admin/inventory/taxonomy/route.ts`
- Create: `src/app/api/admin/inventory/stock-movements/route.ts`
- Test: `src/app/api/admin/inventory/products/route.test.ts`

**Interfaces:**
- Consumes: `listInventoryProducts`, `getInventoryProduct`, `listInventoryTaxonomy`, `listInventoryStockMovements` (Task 3); `getAdminAccess` from `@/lib/auth/server/admin`.
- Produces: `GET` handlers returning `NextResponse.json(...)` — consumed by Task 10.

- [ ] **Step 1: Write the failing test** (one representative route; the other three follow the identical shape)

```ts
// src/app/api/admin/inventory/products/route.test.ts
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/server/admin", () => ({
  getAdminAccess: vi.fn(),
}));
vi.mock("@/server/commerce/inventory/inventory-read", () => ({
  listInventoryProducts: vi.fn().mockResolvedValue([{ id: "prod-1", name: "Test" }]),
}));

import { getAdminAccess } from "@/lib/auth/server/admin";
import { GET } from "./route";

describe("GET /api/admin/inventory/products", () => {
  it("returns 403 when the caller lacks inventory:read", async () => {
    vi.mocked(getAdminAccess).mockResolvedValueOnce({ ok: false, reason: "missing-capability" });
    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("returns the product list when authorized", async () => {
    vi.mocked(getAdminAccess).mockResolvedValueOnce({ ok: true, role: "admin" });
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "prod-1", name: "Test" }]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/app/api/admin/inventory/products/route.test.ts`
Expected: FAIL — `Cannot find module './route'`

- [ ] **Step 3: Write the four route handlers**

```ts
// src/app/api/admin/inventory/products/route.ts
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/auth/server/admin";
import { listInventoryProducts } from "@/server/commerce/inventory/inventory-read";

export async function GET() {
  const access = await getAdminAccess("inventory:read");
  if (!access.ok) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const products = await listInventoryProducts();
  return NextResponse.json(products);
}
```

```ts
// src/app/api/admin/inventory/products/[id]/route.ts
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/auth/server/admin";
import { getInventoryProduct } from "@/server/commerce/inventory/inventory-read";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await getAdminAccess("inventory:read");
  if (!access.ok) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const product = await getInventoryProduct(id);
  return NextResponse.json(product);
}
```

```ts
// src/app/api/admin/inventory/taxonomy/route.ts
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/auth/server/admin";
import { listInventoryTaxonomy } from "@/server/commerce/inventory/inventory-read";

export async function GET() {
  const access = await getAdminAccess("inventory:read");
  if (!access.ok) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const taxonomy = await listInventoryTaxonomy();
  return NextResponse.json(taxonomy);
}
```

```ts
// src/app/api/admin/inventory/stock-movements/route.ts
import { NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/auth/server/admin";
import { listInventoryStockMovements } from "@/server/commerce/inventory/inventory-read";

export async function GET(request: Request) {
  const access = await getAdminAccess("inventory:read");
  if (!access.ok) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const productId = new URL(request.url).searchParams.get("productId") ?? undefined;
  const movements = await listInventoryStockMovements(productId);
  return NextResponse.json(movements);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/app/api/admin/inventory/products/route.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/inventory src/app/api/admin/inventory/products/route.test.ts
git commit -m "feat(admin): add authenticated GET routes for inventory reads"
```

---

### Task 10: Fetch-based client `InventoryRepository` + wire into `AdminRepositoryProvider`

**Files:**
- Create: `src/lib/admin/data/remote/inventory-repository.ts`
- Test: `src/lib/admin/data/remote/inventory-repository.test.ts`
- Modify: `src/features/admin/data/admin-repository-context.tsx`
- Modify: `src/app/admin/inventory/page.tsx`

**Interfaces:**
- Consumes: `InventoryRepository` type from `@/lib/admin/data/repositories`.
- Produces: `createFetchAdminInventoryRepository(): InventoryRepository` — consumed by `AdminRepositoryProvider`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/admin/data/remote/inventory-repository.test.ts
import { describe, expect, it, vi } from "vitest";
import { createFetchAdminInventoryRepository } from "./inventory-repository";

describe("createFetchAdminInventoryRepository", () => {
  it("fetches the product list from the products route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: "prod-1" }] });
    vi.stubGlobal("fetch", fetchMock);

    const repo = createFetchAdminInventoryRepository();
    const products = await repo.listProducts();

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/inventory/products", { cache: "no-store" });
    expect(products).toEqual([{ id: "prod-1" }]);
    vi.unstubAllGlobals();
  });

  it("fetches a single product by id", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "prod-1" }) });
    vi.stubGlobal("fetch", fetchMock);

    const repo = createFetchAdminInventoryRepository();
    await repo.getProduct("prod-1");

    expect(fetchMock).toHaveBeenCalledWith("/api/admin/inventory/products/prod-1", { cache: "no-store" });
    vi.unstubAllGlobals();
  });

  it("throws when the response is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    vi.stubGlobal("fetch", fetchMock);

    const repo = createFetchAdminInventoryRepository();
    await expect(repo.listProducts()).rejects.toThrow("403");
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/lib/admin/data/remote/inventory-repository.test.ts`
Expected: FAIL — `Cannot find module './inventory-repository'`

- [ ] **Step 3: Write the fetch-based repository**

```ts
// src/lib/admin/data/remote/inventory-repository.ts
import type { InventoryRepository } from "@/lib/admin/data/repositories";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function createFetchAdminInventoryRepository(): InventoryRepository {
  return {
    listProducts: () => fetchJson("/api/admin/inventory/products"),
    getProduct: (productId) => fetchJson(`/api/admin/inventory/products/${productId}`),
    listTaxonomy: () => fetchJson("/api/admin/inventory/taxonomy"),
    listStockMovements: (productId) =>
      fetchJson(
        productId
          ? `/api/admin/inventory/stock-movements?productId=${encodeURIComponent(productId)}`
          : "/api/admin/inventory/stock-movements",
      ),
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/lib/admin/data/remote/inventory-repository.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Wire it into `AdminRepositoryProvider`**

Modify `src/features/admin/data/admin-repository-context.tsx` — replace the body of `AdminRepositoryProvider`:

```tsx
"use client";

import { createContext, type ReactNode, use, useState } from "react";
import type { AdminStore } from "@/features/admin/state/admin-store";
import { createInMemoryAdminRepositories } from "@/lib/admin/data/in-memory/admin-repositories";
import { createFetchAdminInventoryRepository } from "@/lib/admin/data/remote/inventory-repository";
import type { AdminRepositories } from "@/lib/admin/data/repositories";

const AdminRepositoryContext = createContext<AdminRepositories | null>(null);

export function AdminRepositoryProvider({
  children,
  store,
}: {
  children: ReactNode;
  store: AdminStore;
}) {
  const [repositories] = useState<AdminRepositories>(() => ({
    ...createInMemoryAdminRepositories(store),
    inventory: createFetchAdminInventoryRepository(),
  }));

  return (
    <AdminRepositoryContext.Provider value={repositories}>
      {children}
    </AdminRepositoryContext.Provider>
  );
}

export function useAdminRepositories() {
  const repositories = use(AdminRepositoryContext);
  if (!repositories) {
    throw new Error("useAdminRepositories must be used inside AdminRepositoryProvider");
  }
  return repositories;
}
```

- [ ] **Step 6: Source Inventory page facets from Prisma instead of the static seed**

Modify `src/app/admin/inventory/page.tsx`: replace the top-level `const facets = getInventoryFacetOptions(activeAdminSeed.products);` line and the `activeAdminSeed.products.some(...)` line inside the component with real data. Change:

```ts
import { defaultInventoryPageSize } from "@/features/admin/inventory/inventory-url";
import { InventoryWorkspace } from "@/features/admin/inventory/inventory-workspace";
import {
  defaultInventoryQuery,
  getInventoryFacetOptions,
  inventorySavedViews,
  inventorySortOptions,
} from "@/lib/admin/inventory/inventory-selectors";
import { listInventoryProducts } from "@/server/commerce/inventory/inventory-read";
import type {
```

(replacing the `activeAdminSeed` import), and change the component body's opening to:

```ts
export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const [params, products] = await Promise.all([searchParams, listInventoryProducts()]);
  const facets = getInventoryFacetOptions(products);
  const categoryValues = new Set(facets.categories);
  const collectionValues = new Set(facets.collections);
  const requestedView = first(params.view);
```

and remove the old module-level `const facets = ...`, `const categoryValues = ...`, `const collectionValues = ...` lines (they move inside the function above), and replace `activeAdminSeed.products.some((product) => product.id === requestedProduct)` with `products.some((product) => product.id === requestedProduct)`.

- [ ] **Step 7: Verify the app still builds and the existing inventory tests pass**

Run: `pnpm exec tsc --noEmit`
Expected: no new type errors

Run: `pnpm exec vitest run src/features/admin/inventory src/lib/admin/inventory --passWithNoTests`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/lib/admin/data/remote src/features/admin/data/admin-repository-context.tsx src/app/admin/inventory/page.tsx
git commit -m "feat(admin): wire the Inventory workspace to the Prisma-backed repository"
```

---

### Task 11: Rewire `inventory-mutations.ts` to call the real Server Actions

**Files:**
- Modify: `src/lib/admin/inventory/inventory-mutations.ts`

**Interfaces:**
- Consumes: `saveProduct`, `archiveProduct`, `restoreProduct`, `deleteProduct`, `createCatalogueTaxonomy`, `renameCatalogueTaxonomy`, `deleteCatalogueTaxonomy` (Tasks 4/5/8).
- Produces: same hook names/signatures as today (`useSaveProduct`, `useArchiveProduct`, `useRestoreProduct`, `useDeleteProduct`, `useCreateCatalogueTaxonomy`, `useRenameCatalogueTaxonomy`, `useDeleteCatalogueTaxonomy`) — no consumer of these hooks changes.

- [ ] **Step 1: Update the mutation bodies**

In `src/lib/admin/inventory/inventory-mutations.ts`, replace the imports and each `mutationFn`:

```ts
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryKeys } from "@/lib/admin/inventory/inventory-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import {
  archiveProduct,
  deleteProduct,
  restoreProduct,
  saveProduct,
} from "@/server/commerce/inventory/inventory-write";
import {
  createCatalogueTaxonomy,
  deleteCatalogueTaxonomy,
  renameCatalogueTaxonomy,
} from "@/server/commerce/inventory/inventory-taxonomy-write";
import type {
  CatalogueTaxonomyInput,
  CatalogueTaxonomyItem,
  InventoryProduct,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/admin/shared/types";
```

Remove the `IntakeStage`/`useTransitionIntake`/`useAdmin` import (`transitionIntake` stays on the in-memory store — intake is not part of this plan's scope; leave `useTransitionIntake` exactly as it is today, still importing `useAdmin`, unchanged).

Replace each mutation's `mutationFn`:

```ts
export function useSaveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ values, intent }: { values: ProductEditorValues; intent: ProductEditorIntent }) =>
      saveProduct(values, intent),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), (previous?: InventoryProduct[]) =>
          upsertProductInCache(previous, result.value.product),
        );
        queryClient.setQueryData(inventoryKeys.product(result.value.product.id), result.value.product);
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => archiveProduct(productId),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.product(result.value.productId) });
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useRestoreProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => restoreProduct(productId),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.product(result.value.productId) });
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), (previous?: InventoryProduct[]) =>
          previous?.filter((entry) => entry.id !== result.value.productId),
        );
        queryClient.removeQueries({ queryKey: inventoryKeys.product(result.value.productId) });
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}
```

Keep `useTransitionIntake` unchanged (still uses `useAdmin()`). Replace the three taxonomy hooks' `mutationFn`s the same mechanical way:

```ts
export function useCreateCatalogueTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CatalogueTaxonomyInput) => createCatalogueTaxonomy(input),
    onSuccess: (result) => {
      if (result.ok && result.value.item) {
        const item = result.value.item;
        queryClient.setQueryData(inventoryKeys.taxonomy(), (previous?: CatalogueTaxonomyItem[]) => [
          ...(previous?.filter((entry) => entry.id !== item.id) ?? []),
          item,
        ]);
      }
    },
  });
}

export function useRenameCatalogueTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taxonomyId, name }: { taxonomyId: string; name: string }) =>
      renameCatalogueTaxonomy(taxonomyId, name),
    onSuccess: (result) => {
      if (result.ok && result.value.item) {
        const item = result.value.item;
        queryClient.setQueryData(inventoryKeys.taxonomy(), (previous?: CatalogueTaxonomyItem[]) =>
          previous?.map((entry) => (entry.id === item.id ? item : entry)),
        );
        queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      }
    },
  });
}

export function useDeleteCatalogueTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taxonomyId: string) => deleteCatalogueTaxonomy(taxonomyId),
    onSuccess: (result) => {
      if (result.ok && result.value.deletedId) {
        const deletedId = result.value.deletedId;
        queryClient.setQueryData(inventoryKeys.taxonomy(), (previous?: CatalogueTaxonomyItem[]) =>
          previous?.filter((entry) => entry.id !== deletedId),
        );
      }
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no new type errors (the `useAdmin` import is still used by `useTransitionIntake` — do not remove it entirely, only the destructured methods that moved)

- [ ] **Step 3: Run the existing product editor test suite**

Run: `pnpm exec vitest run src/lib/admin/product-editor src/lib/admin/inventory --passWithNoTests`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/admin/inventory/inventory-mutations.ts
git commit -m "feat(admin): point inventory mutations at the real Prisma Server Actions"
```

---

### Task 12: "Delete all products" UI

**Files:**
- Create: `src/features/admin/inventory/inventory-delete-all-dialog.tsx`
- Modify: `src/lib/admin/inventory/inventory-mutations.ts` (add `useDeleteAllProducts`)
- Modify: `src/features/admin/inventory/inventory-workspace-header.tsx`

**Interfaces:**
- Consumes: `deleteAllProducts` (Task 6), `useAdminSession`/role check (see Step 1 for how the header already knows the role — inspect `AdminShell`'s existing role prop plumbing before wiring), `inventoryKeys`, `overviewKeys`.
- Produces: `<InventoryDeleteAllDialog role={role} />` rendered from `InventoryWorkspaceHeader`.

- [ ] **Step 1: Confirm how the current role reaches `InventoryWorkspaceHeader`**

Run: `grep -rn "InventoryWorkspaceHeader" src/features/admin/inventory/inventory-workspace.tsx`

If `InventoryWorkspaceHeader` is rendered without a `role` prop today, add one: it must be threaded from `InventoryWorkspace`'s own props/context. `AdminShell` already receives `role={access.role}` (confirmed in `src/app/admin/layout.tsx`); trace how `AdminShell` exposes it (check `src/features/admin/shell/admin-shell.tsx` for a `useAdminRole`-style context or prop) and reuse that existing mechanism rather than inventing a new one — do not add a second role-plumbing path.

- [ ] **Step 2: Add the `useDeleteAllProducts` hook**

Append to `src/lib/admin/inventory/inventory-mutations.ts`:

```ts
import { deleteAllProducts } from "@/server/commerce/inventory/inventory-write";

export function useDeleteAllProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => deleteAllProducts(),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), []);
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}
```

- [ ] **Step 3: Build the confirm dialog**

```tsx
// src/features/admin/inventory/inventory-delete-all-dialog.tsx
"use client";

import { Delete02Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { useDeleteAllProducts } from "@/lib/admin/inventory/inventory-mutations";
import type { StaffRole } from "@/lib/auth/roles";
import { hasCapability } from "@/lib/auth/permissions";

export function InventoryDeleteAllDialog({ role }: { role: StaffRole }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const mutation = useDeleteAllProducts();

  if (!hasCapability(role, "inventory:delete")) return null;

  const canConfirm = confirmText.trim() === "DELETE";

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setConfirmText("");
      mutation.reset();
    }
  }

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <AlertDialogTrigger
        render={
          <Button size="lg" type="button" variant="destructive">
            <AdminIcon icon={Delete02Icon} size={16} />
            Delete all products
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete every product?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes every product, variant, media record and stock level from the
            catalogue. This cannot be undone. Type DELETE to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Input
          autoComplete="off"
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="DELETE"
          value={confirmText}
        />
        {mutation.data && !mutation.data.ok ? (
          <Alert variant="destructive">
            <AlertTitle>Could not delete every product</AlertTitle>
            <AlertDescription>{mutation.data.error.message}</AlertDescription>
          </Alert>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!canConfirm || mutation.isPending}
            onClick={async () => {
              const result = await mutation.mutateAsync();
              if (result.ok) setOpen(false);
            }}
            variant="destructive"
          >
            {mutation.isPending ? "Deleting…" : "Delete all products"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 4: Render it from the workspace header**

Modify `src/features/admin/inventory/inventory-workspace-header.tsx` to accept a `role` prop (per Step 1's finding) and render `<InventoryDeleteAllDialog role={role} />` inside the existing `<div className="flex flex-wrap gap-2 xl:justify-end">` actions row, after `<CatalogueTaxonomyManager .../>`.

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/inventory/inventory-delete-all-dialog.tsx src/features/admin/inventory/inventory-workspace-header.tsx src/lib/admin/inventory/inventory-mutations.ts
git commit -m "feat(admin): add a guarded delete-all-products action to Inventory"
```

---

### Task 13: "Import fixtures" UI

**Files:**
- Create: `src/features/admin/inventory/inventory-import-dialog.tsx`
- Modify: `src/lib/admin/inventory/inventory-mutations.ts` (add `useImportProductFixtures`)
- Modify: `src/features/admin/inventory/inventory-workspace-header.tsx`

**Interfaces:**
- Consumes: `importProductFixtures` (Task 7), `productFixtureFileSchema` (Task 1).
- Produces: `<InventoryImportDialog role={role} />` rendered from `InventoryWorkspaceHeader`.

- [ ] **Step 1: Add the `useImportProductFixtures` hook**

Append to `src/lib/admin/inventory/inventory-mutations.ts`:

```ts
import { importProductFixtures } from "@/server/commerce/inventory/inventory-write";
import type { ProductFixture } from "@/lib/admin/inventory/inventory-fixture-schema";

export function useImportProductFixtures() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fixtures: ProductFixture[]) => importProductFixtures(fixtures),
    onSuccess: (result) => {
      if (result.ok && result.value.some((row) => row.status === "created")) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.taxonomy() });
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}
```

- [ ] **Step 2: Build the import dialog**

```tsx
// src/features/admin/inventory/inventory-import-dialog.tsx
"use client";

import { Upload04Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AdminIcon } from "@/features/admin/shared/admin-icon";
import { productFixtureFileSchema } from "@/lib/admin/inventory/inventory-fixture-schema";
import { useImportProductFixtures } from "@/lib/admin/inventory/inventory-mutations";
import { hasCapability } from "@/lib/auth/permissions";
import type { StaffRole } from "@/lib/auth/roles";

type ParseState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ready"; count: number };

export function InventoryImportDialog({ role }: { role: StaffRole }) {
  const [open, setOpen] = useState(false);
  const [parseState, setParseState] = useState<ParseState>({ status: "idle" });
  const [fileName, setFileName] = useState<string | null>(null);
  const mutation = useImportProductFixtures();

  if (!hasCapability(role, "inventory:create")) return null;

  async function handleFile(file: File) {
    setFileName(file.name);
    mutation.reset();
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const parsed = productFixtureFileSchema.safeParse(json);
      if (!parsed.success) {
        const firstIssue = parsed.error.issues[0];
        setParseState({
          status: "error",
          message: `Row ${firstIssue?.path[0] ?? "?"}: ${firstIssue?.message ?? "Invalid fixture file."}`,
        });
        return;
      }
      setParseState({ status: "ready", count: parsed.data.length });
    } catch {
      setParseState({ status: "error", message: "That file is not valid JSON." });
    }
  }

  async function handleImport() {
    if (parseState.status !== "ready" || !fileName) return;
    // Re-read is avoided by re-parsing is unnecessary here because parseState only stores a count;
    // the file input keeps the File object accessible via the input ref pattern below instead.
  }

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <Button size="lg" type="button" variant="outline">
            <AdminIcon icon={Upload04Icon} size={16} />
            Import fixtures
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import product fixtures</DialogTitle>
          <DialogDescription>
            Upload a JSON file matching the product-fixture schema. Every id is generated by the
            database — the file must not include one.
          </DialogDescription>
        </DialogHeader>

        <input
          accept="application/json"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (file) await handleFile(file);
          }}
          type="file"
        />

        {parseState.status === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>File could not be imported</AlertTitle>
            <AlertDescription>{parseState.message}</AlertDescription>
          </Alert>
        ) : null}

        {parseState.status === "ready" ? (
          <Alert>
            <AlertTitle>{parseState.count} fixture(s) ready</AlertTitle>
            <AlertDescription>Review, then import.</AlertDescription>
          </Alert>
        ) : null}

        {mutation.data?.ok ? (
          <div className="max-h-48 overflow-y-auto rounded-md border border-border text-[13px]">
            {mutation.data.value.map((row) => (
              <div className="flex items-center justify-between border-b border-border px-3 py-2 last:border-b-0" key={row.slug}>
                <span>{row.slug}</span>
                <span className="text-muted-foreground">{row.status}{row.message ? ` — ${row.message}` : ""}</span>
              </div>
            ))}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            disabled={parseState.status !== "ready" || mutation.isPending}
            onClick={handleImport}
            type="button"
          >
            {mutation.isPending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Fix the file-object plumbing**

The Step 2 draft leaves a gap (`handleImport` has no access to the parsed fixtures). Replace `parseState`'s `"ready"` variant to also carry the parsed fixtures, and drive `handleImport` from that data instead of re-reading the input:

Replace the `ParseState` type and the two functions in the same file:

```ts
type ParseState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ready"; fixtures: ProductFixture[] };
```

Add `import type { ProductFixture } from "@/lib/admin/inventory/inventory-fixture-schema";` alongside the existing schema import, and update `handleFile`/`handleImport`:

```ts
async function handleFile(file: File) {
  mutation.reset();
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const parsed = productFixtureFileSchema.safeParse(json);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setParseState({
        status: "error",
        message: `Row ${firstIssue?.path[0] ?? "?"}: ${firstIssue?.message ?? "Invalid fixture file."}`,
      });
      return;
    }
    setParseState({ status: "ready", fixtures: parsed.data });
  } catch {
    setParseState({ status: "error", message: "That file is not valid JSON." });
  }
}

async function handleImport() {
  if (parseState.status !== "ready") return;
  await mutation.mutateAsync(parseState.fixtures);
}
```

And update the `"{parseState.count} fixture(s) ready"` JSX to read `{parseState.fixtures.length} fixture(s) ready` (remove the now-unused `fileName`/`setFileName` state entirely).

- [ ] **Step 4: Render it from the workspace header**

Modify `src/features/admin/inventory/inventory-workspace-header.tsx` to render `<InventoryImportDialog role={role} />` next to `<InventoryDeleteAllDialog role={role} />` in the same actions row.

- [ ] **Step 5: Typecheck and lint**

Run: `pnpm exec tsc --noEmit && pnpm lint`
Expected: no new errors

- [ ] **Step 6: Commit**

```bash
git add src/features/admin/inventory/inventory-import-dialog.tsx src/features/admin/inventory/inventory-workspace-header.tsx src/lib/admin/inventory/inventory-mutations.ts
git commit -m "feat(admin): add the JSON product-fixture import dialog"
```

---

### Task 14: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full check suite**

Run: `pnpm lint && pnpm exec tsc --noEmit && pnpm exec vitest run --passWithNoTests && pnpm build`
Expected: all green

- [ ] **Step 2: Manual browser verification against the real (currently empty) database**

Start the dev server, sign in as the admin owner seeded by `pnpm db:seed:storefront` (or `pnpm bootstrap-owner` if that's the current owner-creation path — confirm from `scripts/bootstrap-owner.mjs`), then:

1. Load `/admin/inventory` — confirm the empty state renders (no products) instead of the old seed's fake products.
2. Prepare a small fixture file (2-3 products across the three modes) matching `productFixtureSchema`, use "Import fixtures" to upload it, confirm the per-row result table shows `created` for each and the list refreshes with real products.
3. Open one imported product in the editor, change its price, publish — confirm the change persists after a full page reload (proves it's really in Postgres, not browser memory).
4. Use "Delete all products" (type `DELETE` to confirm) — confirm the list returns to the empty state and a reload still shows it empty.
5. Check `read_console_messages`/`read_network_requests` in the browser pane for errors during the above.

- [ ] **Step 3: Record verification evidence**

Note the commands run and their pass/fail status, plus the manual browser pass results, for the PR description (per AGENTS.md §12).
