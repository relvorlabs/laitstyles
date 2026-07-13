# Product Field Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make one neutral product-domain contract carry every shopper-relevant field end-to-end (DB → mappers → shared domain → storefront card & detail) and let the Control Room editor enter, validate and round-trip those fields — closing the gap where the storefront prototype shows attributes (material, fit, style, care, disclosed flaws) that exist nowhere in the real pipeline.

**Architecture:** The repo already has the neutral shared domain (`src/lib/storefront/types.ts`), Prisma→domain mappers (`src/server/commerce/catalogue/mappers.ts`), a read repository, a minimal admin→DB write path (`product-write.ts`), and a real storefront card that consumes `ProductSummary`. The frozen `home-lab` prototype does NOT use any of it. This plan (1) adds the genuinely-missing persisted columns, (2) threads them through the write path, mappers and shared domain, (3) extends the Control Room editor input/validation/conversion + UI to collect them, then (4) migrates the `home-lab` card & detail onto the shared contracts and points the live routes at the real repository.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Prisma 7 with **Prisma-managed migrations against hosted Supabase** (CLI/migrate use `DIRECT_URL` via `prisma.config.ts`; runtime client uses `DATABASE_URL` through the `@prisma/adapter-pg` driver adapter). No Supabase CLI, no local Postgres. Zod 4, React Hook Form 7, Vitest 4, Biome 2.

## Global Constraints

- **Branch (CORRECTED 2026-07-13):** All parts run on **`feat/storefront-v2-spec`** — it is the only branch containing BOTH the storefront pipeline (`server/commerce/catalogue`, `lib/storefront/types.ts`, `home-lab`) AND the merged Control Room editor. `feat/control-room-v2` lacks the storefront pipeline, so Parts B/C/E cannot run there. The earlier per-part "(feat/control-room-v2)" labels below are superseded by this line. This diverges from AGENTS.md §3's control-room-PR isolation by necessity (user-confirmed) since the reconciliation requires both surfaces in one tree.
- **Phase-2-3N freeze:** `home-lab/data.ts` is a deliberately frozen prototype ("Do not swap these for the real catalogue"). Part E lifts that freeze — it is gated on explicit user confirmation before execution (already granted: "full reconciliation, correct branches").
- **Migrations are Prisma-managed against hosted Supabase.** Edit `prisma/schema.prisma` to add fields, then run `pnpm exec prisma migrate dev --name <name>` (reads `DIRECT_URL` from `.env.local` via `prisma.config.ts`, writes a migration folder under `prisma/migrations/`, applies it to the hosted DB, and regenerates the client). Do NOT hand-write `supabase/migrations/*.sql` and do NOT use the Supabase CLI. **The migrate step mutates the shared hosted database — it is outward-facing and gated on explicit user go-ahead before each run.**
- **New columns MUST be nullable or defaulted** so existing product rows load unchanged. No non-nullable column without a default.
- **Never expose internal fields to the storefront.** `cost`, supplier data, `fulfilment.packagingNotes`, `fulfilment.deliveryRestrictions` must never enter `src/lib/storefront/types.ts` or any client component. The mappers are the enforcement boundary.
- **No `any`, no broad index signatures, no unvalidated JSON casts.**
- **Money is integer kobo** in the storefront domain (`@/lib/money`); the DB stores Naira `Decimal(12,2)`. Convert only in mappers/write-path (`decimalToKobo` / `koboToDecimalString`).
- **Verification per part:** `pnpm lint` (Biome), `pnpm typecheck`, `pnpm test` (Vitest), `pnpm build`. Full gate: `pnpm verify`. Storefront read path: `pnpm smoke:storefront`.
- **Field set (the only new persisted attributes this plan adds):** `material`, `fit`, `style`, `care_instructions`, `flaw_notes` (all shopper-facing text), plus fulfilment persistence `weight_grams`, `pickup_available`, `delivery_restrictions`, `packaging_notes` (admin/ops — NOT storefront). Do not add any other column without new evidence.
- **Deliberately NOT persisted (kept derived/global/internal):** discount % (derived from price/referencePrice), availability label (derived from stock_levels), condition 0–10 bar (derived from condition grade), care copy fallback (global), delivery/returns policy (global), `saved`/`new` prototype flags (derived), `cost` (internal).

---

## File Structure

**Part A — DB (feat/control-room-v2)**
- Modify: `prisma/schema.prisma` (`model products`) — add the columns, then `prisma migrate dev` generates the SQL.
- Create: `prisma/migrations/<ts>_product_shopper_attributes/migration.sql` — generated + applied to hosted Supabase via `DIRECT_URL`.

**Part B — Write path + read mappers (feat/control-room-v2)**
- Modify: `src/server/commerce/catalogue/product-write.ts` — extend `CreatePublishedProductInput`, persist new columns + gallery media + measurements.
- Test: `src/server/commerce/catalogue/product-write.test.ts` (create).

**Part C — Shared domain + mappers (feat/control-room-v2)**
- Modify: `src/lib/storefront/types.ts` — add shopper fields to `ProductCommon` + `ProductDetail`; add `ConditionGrade` + `conditionDisplay` helper.
- Modify: `src/server/commerce/catalogue/mappers.ts` — map new columns; assert internal fields never leak.
- Test: `src/server/commerce/catalogue/mappers.test.ts` (create or extend).

**Part D — Control Room editor (feat/control-room-v2)**
- Modify: `src/lib/control-room/inventory-types.ts` (`ProductBase`), `product-editor-types.ts` (`ProductEditorBase`), `product-editor-schema.ts`, `product-editor-defaults.ts`, `product-editor-conversion.ts`.
- Modify: `src/features/control-room/product-editor/product-identity-step.tsx` — add the new fields (grouped).
- Test: `src/lib/control-room/product-editor-conversion.test.ts`, `product-editor-schema.test.ts` (extend existing).

**Part E — Storefront unification (feat/storefront-v2-spec)**
- Create: `src/features/storefront/home-lab/product-view-adapter.ts` — maps `ProductDetail`/`ProductSummary` → the home-lab render shape (bridge; keeps design JSX intact).
- Modify: `src/features/storefront/home-lab/product-card.tsx`, `product-detail-lab.tsx` — accept shared-domain-derived props.
- Modify: `src/app/products/[slug]/page.tsx`, `src/app/products/page.tsx`, `src/app/(home)/page.tsx` — read from `catalog-repository`, add `revalidateTag`/route revalidation.
- Test: `src/features/storefront/home-lab/product-view-adapter.test.ts` (create).

**Part F — Editor→DB persistence wiring (feat/control-room-v2, Phase-12 gated)**
- Modify: Control Room save action to call `createPublishedProduct`/an `updateProduct` sibling. Flagged as the largest risk; execute only after Parts A–E land and the Phase-12 data boundary is opened.

---

## Part A — Database columns (branch: `feat/control-room-v2`)

### Task A1: Add shopper + fulfilment columns to `products`

**Files:**
- Modify: `prisma/schema.prisma` (`model products`)
- Create: `prisma/migrations/<timestamp>_product_shopper_attributes/migration.sql` (generated by `prisma migrate dev`)

**Interfaces:**
- Produces: `products.material String?`, `products.fit String?`, `products.style String?`, `products.care_instructions String?`, `products.flaw_notes String?`, `products.weight_grams Int?`, `products.pickup_available Boolean @default(true)`, `products.delivery_restrictions String @default("")`, `products.packaging_notes String @default("")`. Consumed by Parts B, C, D.

**Note:** `prisma migrate dev` applies to the **shared hosted Supabase DB** via `DIRECT_URL`. This is outward-facing — obtain explicit user go-ahead before Step 3, and do not run it over an unstable shell (a half-applied remote migration is hard to reverse).

- [ ] **Step 1: Edit `prisma/schema.prisma`**

In `model products`, after `condition String?`, add:

```prisma
  material              String?
  fit                   String?
  style                 String?
  care_instructions     String?
  flaw_notes            String?
  weight_grams          Int?
  pickup_available      Boolean @default(true)
  delivery_restrictions String  @default("")
  packaging_notes       String  @default("")
```

(All nullable or defaulted → existing rows load unchanged. Keep the `@@schema("public")` and existing attributes intact.)

- [ ] **Step 2: Preview the migration SQL without applying (safe, read-only diff)**

Run: `pnpm exec prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script`
Expected: prints `ALTER TABLE "public"."products" ADD COLUMN …` for the nine columns and nothing else. Review it before applying.

- [ ] **Step 3: Apply the migration to hosted Supabase (GATED — user go-ahead first)**

Run: `pnpm exec prisma migrate dev --name product_shopper_attributes`
Expected: creates `prisma/migrations/<ts>_product_shopper_attributes/migration.sql`, applies the ADD COLUMNs to the hosted DB, regenerates the client. If the project has drift from prior out-of-band changes, STOP and escalate rather than accepting a reset.

- [ ] **Step 4: Regenerate client + typecheck**

Run: `pnpm prisma:generate && pnpm typecheck`
Expected: PASS (no consumers use the new fields yet).

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/generated
git commit -m "feat(db): add shopper + fulfilment attribute columns to products"
```

---

## Part B — Write path persistence (branch: `feat/control-room-v2`)

### Task B1: Persist new columns, gallery media and measurements in `createPublishedProduct`

**Files:**
- Modify: `src/server/commerce/catalogue/product-write.ts`
- Test: `src/server/commerce/catalogue/product-write.test.ts` (create)

**Interfaces:**
- Consumes: `products.*` columns from Task A1.
- Produces: extended `CreatePublishedProductInput` with `material?`, `fit?`, `style?`, `careInstructions?`, `flawNotes?`, `weightGrams?`, `pickupAvailable?`, `deliveryRestrictions?`, `packagingNotes?`, `gallery?: { publicId; secureUrl; alt; kind: "detail" | "defect"; width?; height? }[]`, `measurements?: { label: string; value: string }[]`. Consumed by Part F.

- [ ] **Step 1: Write the failing test**

Create `src/server/commerce/catalogue/product-write.test.ts`. Mock `@/lib/prisma` so `$transaction` runs the callback against a recording `tx` double; assert the `products.create` data carries the new fields and that measurements are written:

```ts
import { describe, expect, it, vi } from "vitest";

const created: Record<string, unknown[]> = { products: [], measurements: [] };
vi.mock("@/lib/prisma", () => ({
  Prisma: { PrismaClientKnownRequestError: class {} },
  prisma: {
    store_memberships: { findFirst: vi.fn().mockResolvedValue({ role: "owner" }) },
    role_capabilities: { findFirst: vi.fn().mockResolvedValue({ role: "owner" }) },
    $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        products: { create: async ({ data }: { data: Record<string, unknown> }) => { created.products.push(data); return { id: "p1", slug: data.slug }; } },
        cloudinary_assets: { upsert: async () => ({ id: "a1" }) },
        product_media: { create: async () => ({}) },
        product_channels: { create: async () => ({}) },
        product_measurements: { create: async ({ data }: { data: unknown }) => { created.measurements.push(data); return {}; } },
        stock_levels: { create: async () => ({}) },
        audit_events: { create: async () => ({}) },
      }),
  },
}));

import { createPublishedProduct } from "./product-write";

describe("createPublishedProduct", () => {
  it("persists shopper attributes and measurements", async () => {
    const result = await createPublishedProduct(
      { storeId: "s1", profileId: "u1" },
      {
        slug: "test", name: "Test", description: "d", mode: "unique", priceKobo: 1000,
        cover: { publicId: "c", secureUrl: "u", alt: "a" },
        material: "Wool", fit: "M–L", style: "Vintage", flawNotes: "Small mark",
        measurements: [{ label: "Chest", value: "112cm" }],
      },
    );
    expect(result.ok).toBe(true);
    expect(created.products[0]).toMatchObject({ material: "Wool", fit: "M–L", style: "Vintage", flaw_notes: "Small mark" });
    expect(created.measurements[0]).toMatchObject({ label: "Chest", value: "112cm", position: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/commerce/catalogue/product-write.test.ts`
Expected: FAIL — input type has no `material`; `product_measurements.create` never called.

- [ ] **Step 3: Extend the input interface**

In `product-write.ts`, add to `CreatePublishedProductInput`:

```ts
  material?: string | null;
  fit?: string | null;
  style?: string | null;
  careInstructions?: string | null;
  flawNotes?: string | null;
  weightGrams?: number | null;
  pickupAvailable?: boolean;
  deliveryRestrictions?: string;
  packagingNotes?: string;
  gallery?: { publicId: string; secureUrl: string; alt: string; kind: "detail" | "defect"; width?: number | null; height?: number | null }[];
  measurements?: { label: string; value: string }[];
```

- [ ] **Step 4: Persist the new columns in `products.create`**

In the `tx.products.create({ data: { … } })` object, add:

```ts
          material: input.material ?? null,
          fit: input.fit ?? null,
          style: input.style ?? null,
          care_instructions: input.careInstructions ?? null,
          flaw_notes: input.flawNotes ?? null,
          weight_grams: input.weightGrams ?? null,
          pickup_available: input.pickupAvailable ?? true,
          delivery_restrictions: input.deliveryRestrictions ?? "",
          packaging_notes: input.packagingNotes ?? "",
```

- [ ] **Step 5: Persist gallery media and measurements inside the transaction**

After the cover `product_media.create` call, before the channel create, add gallery + measurement writes:

```ts
      if (input.gallery?.length) {
        for (const [index, item] of input.gallery.entries()) {
          const galleryAsset = await tx.cloudinary_assets.upsert({
            where: { store_id_public_id: { store_id: actor.storeId, public_id: item.publicId } },
            update: {},
            create: {
              store_id: actor.storeId,
              kind: item.kind === "defect" ? "product_defect" : "product_detail",
              public_id: item.publicId, secure_url: item.secureUrl, alt: item.alt,
              width: item.width ?? null, height: item.height ?? null,
            },
          });
          await tx.product_media.create({
            data: {
              store_id: actor.storeId, product_id: product.id, asset_id: galleryAsset.id,
              kind: item.kind === "defect" ? "product_defect" : "product_detail", position: index + 1,
            },
          });
        }
      }
      if (input.measurements?.length) {
        for (const [index, m] of input.measurements.entries()) {
          await tx.product_measurements.create({
            data: { product_id: product.id, label: m.label, value: m.value, position: index },
          });
        }
      }
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm exec vitest run src/server/commerce/catalogue/product-write.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck + commit**

Run: `pnpm typecheck`
Expected: PASS.

```bash
git add src/server/commerce/catalogue/product-write.ts src/server/commerce/catalogue/product-write.test.ts
git commit -m "feat(catalogue): persist shopper attributes, gallery media and measurements on create"
```

---

## Part C — Shared domain + mappers (branch: `feat/control-room-v2`)

### Task C1: Add shopper fields + condition display to the shared domain

**Files:**
- Modify: `src/lib/storefront/types.ts`

**Interfaces:**
- Produces: `ProductCommon` gains `material: string | null`, `fit: string | null`, `style: string | null`. `ProductDetail` gains `careInstructions: string | null`, `flawNotes: string | null`. New export `type ConditionGrade` and `conditionDisplay(grade)` → `{ label: string; score: number }`. Consumed by Task C2 and Part E.

- [ ] **Step 1: Add the fields to `ProductCommon`**

In `interface ProductCommon`, after `condition`:

```ts
  material: string | null;
  fit: string | null;
  style: string | null;
```

- [ ] **Step 2: Add detail-only fields to `ProductDetail`**

In `ProductDetail`'s intersection object (alongside `description`, `media`, `measurements`, `reviewSummary`):

```ts
  careInstructions: string | null;
  flawNotes: string | null;
```

- [ ] **Step 3: Add the condition display helper**

Append to `src/lib/storefront/types.ts`:

```ts
/** Canonical condition vocabulary persisted in products.condition. */
export type ConditionGrade = "Excellent" | "Good" | "Fair";

/** Derives a shopper label + a 0–10 confidence score (never persisted). */
export function conditionDisplay(grade: string | null): { label: string; score: number } {
  switch (grade) {
    case "Excellent": return { label: "Like new", score: 10 };
    case "Good": return { label: "Good", score: 7 };
    case "Fair": return { label: "Fair", score: 5 };
    default: return { label: grade ?? "Unrated", score: 6 };
  }
}
```

- [ ] **Step 4: Typecheck to see the mapper break**

Run: `pnpm typecheck`
Expected: FAIL in `mappers.ts` — `ProductSummary`/`ProductDetail` object literals are missing `material`/`fit`/`style`/`careInstructions`/`flawNotes`. This confirms the domain is the single source of truth. Proceed to Task C2.

### Task C2: Map the new columns (and prove internal fields never leak)

**Files:**
- Modify: `src/server/commerce/catalogue/mappers.ts`
- Test: `src/server/commerce/catalogue/mappers.test.ts` (create)

**Interfaces:**
- Consumes: `products.material/fit/style/care_instructions/flaw_notes` (Task A1), domain fields (Task C1).

- [ ] **Step 1: Write the failing test**

Create `src/server/commerce/catalogue/mappers.test.ts` with a hand-built row fixture typed via the exported include payloads. Assert new fields map and that `cost` is absent from the output:

```ts
import { describe, expect, it } from "vitest";
import { mapProductDetail } from "./mappers";

function detailRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1", slug: "s", name: "N", brand: null,
    price: { toNumber: () => 100, lessThanOrEqualTo: () => true } as never,
    reference_price: null, archive_number: null, condition: "Good",
    material: "Wool", fit: "M–L", style: "Vintage",
    care_instructions: "Hang dry", flaw_notes: "Small mark",
    inventory_mode: "unique", low_stock_threshold: 1, description: "d",
    catalogue_categories: null, catalogue_collections: null,
    product_media: [], product_measurements: [], stock_levels: [], product_variants: [],
    product_reviews: [], size_label: "L", colour: "Sage",
    cost: { toNumber: () => 50 }, // internal — must NOT appear in output
    ...overrides,
  } as never;
}

describe("mapProductDetail", () => {
  it("maps shopper attributes and never leaks cost", () => {
    const out = mapProductDetail(detailRow());
    expect(out).toMatchObject({ material: "Wool", fit: "M–L", style: "Vintage", careInstructions: "Hang dry", flawNotes: "Small mark" });
    expect(JSON.stringify(out)).not.toContain("50");
    expect("cost" in out).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run src/server/commerce/catalogue/mappers.test.ts`
Expected: FAIL — output lacks `material` etc.

- [ ] **Step 3: Map the fields in `mapProductSummary` common block**

In `mapProductSummary`'s returned object, after `condition: row.condition,`:

```ts
    material: row.material,
    fit: row.fit,
    style: row.style,
```

- [ ] **Step 4: Map the fields in `mapProductDetail` common block**

In `mapProductDetail`'s `const common = { … }`, after `condition: row.condition,`:

```ts
    material: row.material,
    fit: row.fit,
    style: row.style,
    careInstructions: row.care_instructions,
    flawNotes: row.flaw_notes,
```

- [ ] **Step 5: Run tests + typecheck to verify pass**

Run: `pnpm exec vitest run src/server/commerce/catalogue/mappers.test.ts && pnpm typecheck`
Expected: PASS (both mapper literals now satisfy the domain).

- [ ] **Step 6: Run the storefront smoke check**

Run: `pnpm smoke:storefront`
Expected: PASS — read pipeline still maps live rows.

- [ ] **Step 7: Commit**

```bash
git add src/lib/storefront/types.ts src/server/commerce/catalogue/mappers.ts src/server/commerce/catalogue/mappers.test.ts
git commit -m "feat(storefront-domain): carry material/fit/style/care/flaw + condition display"
```

---

## Part D — Control Room editor (branch: `feat/control-room-v2`)

### Task D1: Add fields to the editor domain, input, schema, defaults and conversion

**Files:**
- Modify: `src/lib/control-room/inventory-types.ts`, `product-editor-types.ts`, `product-editor-schema.ts`, `product-editor-defaults.ts`, `product-editor-conversion.ts`
- Test: `src/lib/control-room/product-editor-conversion.test.ts` (extend)

**Interfaces:**
- Consumes: nothing new from other parts (editor domain is self-contained in the current phase).
- Produces: `ProductEditorBase` and `ProductBase` gain `material: string`, `fit: string`, `style: string`, `careInstructions: string`, `flawNotes: string` (editor uses `""` for empty; domain uses `string | null`).

- [ ] **Step 1: Write the failing conversion test**

Add to `src/lib/control-room/product-editor-conversion.test.ts` (create the file if absent, importing `convertEditorValuesToProduct` and `createEmptyProductEditorValues`):

```ts
import { describe, expect, it } from "vitest";
import { convertEditorValuesToProduct } from "./product-editor-conversion";
import { createEmptyProductEditorValues } from "./product-editor-defaults";

describe("convertEditorValuesToProduct shopper fields", () => {
  it("carries material/fit/style/care/flaw into the domain product", () => {
    const values = { ...createEmptyProductEditorValues("unique"), name: "Jacket", material: "Wool", fit: "M–L", style: "Vintage", careInstructions: "Hang dry", flawNotes: "Small mark" };
    const product = convertEditorValuesToProduct(values, { intent: "draft", now: "2026-07-13T00:00:00Z" });
    expect(product).toMatchObject({ material: "Wool", fit: "M–L", style: "Vintage", careInstructions: "Hang dry", flawNotes: "Small mark" });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run src/lib/control-room/product-editor-conversion.test.ts`
Expected: FAIL — `material` not assignable to editor values / not on product.

- [ ] **Step 3: Extend the editor domain `ProductBase`**

In `inventory-types.ts` `ProductBase`, after `brand: string;`:

```ts
  material: string | null;
  fit: string | null;
  style: string | null;
  careInstructions: string | null;
  flawNotes: string | null;
```

- [ ] **Step 4: Extend `ProductEditorBase`**

In `product-editor-types.ts` `ProductEditorBase`, after `brand: string;`:

```ts
  material: string;
  fit: string;
  style: string;
  careInstructions: string;
  flawNotes: string;
```

- [ ] **Step 5: Add them to the Zod draft base shape**

In `product-editor-schema.ts` `baseDraftShape`, after `brand: z.string(),`:

```ts
  material: z.string(),
  fit: z.string(),
  style: z.string(),
  careInstructions: z.string(),
  flawNotes: z.string(),
```

(These are draft-optional strings; no publish-gate requirement — flaw disclosure is optional, honesty is enforced by *showing* whatever is entered, not by forcing a value.)

- [ ] **Step 6: Add defaults + edit-hydration + mode-change carry-over**

In `product-editor-defaults.ts`, add `material: "", fit: "", style: "", careInstructions: "", flawNotes: ""` to the `base` object in `createEmptyProductEditorValues`; carry them through in `changeProductEditorMode` (copy from `values`); and hydrate from the product in `createProductEditorValues` with `material: product.material ?? ""` (and the same for the other four).

- [ ] **Step 7: Map them in conversion**

In `product-editor-conversion.ts` `const base = { … }`, after `brand: values.brand.trim() || "Unlabelled",`:

```ts
    material: values.material.trim() || null,
    fit: values.fit.trim() || null,
    style: values.style.trim() || null,
    careInstructions: values.careInstructions.trim() || null,
    flawNotes: values.flawNotes.trim() || null,
```

- [ ] **Step 8: Run test + typecheck to verify pass**

Run: `pnpm exec vitest run src/lib/control-room/product-editor-conversion.test.ts && pnpm typecheck`
Expected: PASS. (If other control-room tests build `ProductEditorBase`/`ProductBase` literals, update those fixtures too — search `inventoryMode: "unique"` in `*.test.ts`.)

- [ ] **Step 9: Commit**

```bash
git add src/lib/control-room
git commit -m "feat(control-room): editor collects material/fit/style/care/flaw"
```

### Task D2: Surface the new fields in the identity step UI

**Files:**
- Modify: `src/features/control-room/product-editor/product-identity-step.tsx`

**Interfaces:**
- Consumes: RHF field names `material`, `fit`, `style`, `careInstructions`, `flawNotes` (Task D1); existing `EditorTextField`/`EditorTextareaField` primitives.

- [ ] **Step 1: Add a "Fabric, fit & disclosure" field group**

After the existing `<EditorTextareaField … name="description" />` (before `</FieldGroup>`), add a grouped block reusing the existing primitives (matches the current two-column pattern):

```tsx
        <div className="grid gap-5 md:grid-cols-2">
          <EditorTextField label="Material / composition" name="material" placeholder="Wool body / leather sleeves" />
          <EditorTextField label="Recommended fit" name="fit" placeholder="M–L" />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <EditorTextField label="Style" name="style" placeholder="Vintage, Streetwear, Workwear…" />
          <EditorTextField label="Care instructions" name="careInstructions" placeholder="Hang dry, do not machine wash" />
        </div>
        <EditorTextareaField
          description="Disclosed honestly and shown to shoppers. Leave blank if there are no flaws."
          label="Disclosed flaws"
          name="flawNotes"
          placeholder="Small mark inside the left cuff"
          rows={3}
        />
```

- [ ] **Step 2: Typecheck + build the control-room route**

Run: `pnpm typecheck && pnpm build`
Expected: PASS; `/admin` compiles.

- [ ] **Step 3: Manual verify (browser)**

Start the app, open the product editor, confirm the five fields render in the Identity step, accept input, survive step navigation (values preserved), and appear pre-filled when editing a product that has them. Follow AGENTS.md §10 viewports (375/768/1280).

- [ ] **Step 4: Commit**

```bash
git add src/features/control-room/product-editor/product-identity-step.tsx
git commit -m "feat(control-room): identity step fields for fabric, fit, care and disclosed flaws"
```

---

## Part E — Storefront unification (branch: `feat/storefront-v2-spec`)

> **STATUS (2026-07-13): DEFERRED by user decision** to a dedicated, separately-reviewed pass. Scope confirmed larger than "two files": the home-lab prototype references `Product`/`products` 82× across 9 coupled files (cart/quick-view context, overlays, catalogue, home, card, detail), so migrating card+detail requires rewiring the whole home-lab data/state/cart layer + live routes + retiring `data.ts`, and changes live homepage behavior. Not started. Parts A–D (the backend/domain/admin reconciliation) are complete and independently valuable.

> **Gate:** This lifts the Phase-2-3N `home-lab/data.ts` freeze (user-approved). It swaps the hardcoded prototype catalogue on `/`, `/products`, `/products/[slug]` for the real repository. Land Parts A–C first (the shared domain must already carry the new fields). Do NOT delete `home-lab/data.ts` until every consumer is migrated and the build is green.

### Task E1: Build a domain→home-lab render adapter

**Files:**
- Create: `src/features/storefront/home-lab/product-view-adapter.ts`
- Test: `src/features/storefront/home-lab/product-view-adapter.test.ts`

**Interfaces:**
- Consumes: `ProductDetail`, `ProductSummary`, `conditionDisplay` from `@/lib/storefront/types`; `formatNaira` from `@/lib/money`.
- Produces: `toCardView(summary: ProductSummary)` and `toDetailView(detail: ProductDetail)` returning the exact shape the existing `product-card.tsx` / `product-detail-lab.tsx` JSX reads (name, priceLabel, images[], sizeLabel, conditionLabel/score, mode, availability, material, fit, style, careInstructions, flawNotes, measurements, variants). This bridge lets the design JSX stay byte-for-byte where possible — only the prop *source* changes.

- [ ] **Step 1: Write the failing adapter test**

```ts
import { describe, expect, it } from "vitest";
import { toDetailView } from "./product-view-adapter";

const detail = {
  id: "p1", slug: "jacket", name: "Jacket", brand: "Archive", price: 4_800_000,
  referencePrice: null, archiveNumber: null, condition: "Good", material: "Wool",
  fit: "M–L", style: "Vintage", careInstructions: "Hang dry", flawNotes: "Small mark",
  category: { id: "c", slug: "men", name: "Men" }, collection: null, cover: null,
  description: "d", media: [], measurements: [{ label: "Chest", value: "112cm", position: 0 }],
  reviewSummary: { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
  mode: "unique" as const, sizeLabel: "L", colour: "Sage",
  availability: { state: "available" as const, available: 1, isOneOfOne: true },
};

describe("toDetailView", () => {
  it("derives condition label/score and omits empty flaw", () => {
    const v = toDetailView(detail);
    expect(v.conditionLabel).toBe("Good");
    expect(v.conditionScore).toBe(7);
    expect(v.flawNotes).toBe("Small mark");
    expect(v.priceLabel).toContain("48,000");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm exec vitest run src/features/storefront/home-lab/product-view-adapter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the adapter**

Create `product-view-adapter.ts` mapping the shared domain to the render shape, using `conditionDisplay` for label/score, `formatNaira` for prices, `availability.state` for the sold/reserved overlay, and normalizing empty strings to omitted sections (return `null` for empty flaw/care so the JSX's existing `!== "None"` guards become truthy checks). Keep money in kobo → `formatNaira`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run src/features/storefront/home-lab/product-view-adapter.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/storefront/home-lab/product-view-adapter.ts src/features/storefront/home-lab/product-view-adapter.test.ts
git commit -m "feat(storefront): domain→home-lab render adapter"
```

### Task E2: Point the detail route at the real repository

**Files:**
- Modify: `src/features/storefront/home-lab/product-detail-lab.tsx`, `src/app/products/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPublishedProductBySlug` from `@/server/commerce/catalogue/catalog-repository`; `toDetailView` (Task E1).

- [ ] **Step 1: Change the detail component's prop type**

In `product-detail-lab.tsx`, replace `product: Product` (from `./data`) with a `view: DetailView` prop (the adapter's output type). Update the JSX field reads to the view fields (`view.name`, `view.priceLabel`, `view.material`, `view.fit`, `view.style`, `view.conditionLabel`, `view.conditionScore`, `view.flawNotes`, `view.careInstructions`, `view.measurements`, `view.variants`, `view.availability`). Preserve ALL layout/motion/JSX — this is a data-source swap, not a redesign. Render measurements from `view.measurements` (real data) instead of the global `measurementsCm` constant. Guard optional sections: render the flaw section only when `view.flawNotes`, the Care accordion body from `view.careInstructions ?? <global fallback>`.

- [ ] **Step 2: Update the route to fetch + adapt + revalidate**

In `src/app/products/[slug]/page.tsx`, replace `productBySlug` (home-lab data) with `await getPublishedProductBySlug(slug)`; `notFound()` when null; pass `view={toDetailView(product)}`. Keep the JSON-LD but source it from the domain product. Replace `generateStaticParams` over prototype data with either dynamic rendering or params from `listPublishedProducts`. Add `export const revalidate` / a `revalidateTag` consistent with the repo's caching (mirror `(shop)` routes).

- [ ] **Step 3: Typecheck + build**

Run: `pnpm typecheck && pnpm build`
Expected: PASS; `/products/[slug]` builds against real data.

- [ ] **Step 4: Manual verify**

Load a real product's PDP; confirm gallery, price, condition bar, measurements, disclosed flaw, care, variants, add-to-cart all render from DB data; confirm a product with no flaw/care omits those sections cleanly (no empty labels). Verify 375/768/1024/1280.

- [ ] **Step 5: Commit**

```bash
git add src/features/storefront/home-lab/product-detail-lab.tsx src/app/products/[slug]/page.tsx
git commit -m "feat(storefront): PDP reads the real catalogue via shared domain"
```

### Task E3: Migrate the card + listing + home routes, then retire prototype data

**Files:**
- Modify: `src/features/storefront/home-lab/product-card.tsx`, `src/app/products/page.tsx`, `src/app/(home)/page.tsx`, `catalogue-lab.tsx`/`storefront-lab.tsx` as needed
- Modify/Delete: `src/features/storefront/home-lab/data.ts` (remove `products`/`Product` once unused; keep any genuinely-shared pure helpers by relocating them)

**Interfaces:**
- Consumes: `ProductSummary`, `toCardView`, `listPublishedProducts`.

- [ ] **Step 1: Change the card prop type to the card view**

In `home-lab/product-card.tsx`, replace `product: Product` with `view: CardView` (adapter output) and update field reads. Preserve the design, badges, hover, save/quick-add controls and the `/products/[slug]` link (now `view.slug`).

- [ ] **Step 2: Feed listing + home from the repository**

Update `products/page.tsx` and `(home)/page.tsx` (and the lab wrappers) to fetch `listPublishedProducts()` and map through `toCardView`. Keep the catalogue/home layout intact.

- [ ] **Step 3: Remove the duplicate `Product` type + prototype array**

Delete the `Product` type and `products` array from `home-lab/data.ts`; relocate any still-used pure helpers (`money`, `slugify`, `inventoryLabel`) to a neutral util or replace with `@/lib/money`/domain equivalents. Fix all imports.

- [ ] **Step 4: Full gate**

Run: `pnpm verify && pnpm smoke:storefront`
Expected: PASS — lint, typecheck, tests, build all green; storefront reads real data.

- [ ] **Step 5: Manual verify end-to-end**

Home → `/products` → card → `/products/[slug]`; add-to-cart; a legacy product with no new fields renders without empty sections; one-of-one / stocked / variant behaviours correct. Verify 375/768/1024/1280/wide.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(storefront): unify card + home + listing on the shared product domain; retire prototype catalogue"
```

---

## Part F — Editor→DB persistence wiring (branch: `feat/control-room-v2`, Phase-12 gated)

> **Gate:** Only after Parts A–E land AND the Control Room V2 Phase-12 data boundary is open (AGENTS.md §9). Until then the editor persists to in-memory `ControlRoomState` by design; this plan does NOT claim production persistence before this part runs.

### Task F1: Route editor "publish" through `createPublishedProduct`

**Files:**
- Modify: Control Room save action / a new server action that maps `ProductEditorValues` → `CreatePublishedProductInput` and calls `createPublishedProduct` (and an `updateProduct` sibling for edits).

- [ ] **Step 1** Write a mapper `mapEditorValuesToWriteInput(values): CreatePublishedProductInput` with a unit test (measurements, gallery kinds, new attributes, kobo conversion). Run it red→green.
- [ ] **Step 2** Wire the publish intent to call the write path behind the existing capability check; keep draft/schedule in-memory. Add `revalidateTag`/route revalidation for `/products`, `/products/[slug]`, `/`, `/shop`, and the admin product list.
- [ ] **Step 3** `pnpm verify`; manual create→reload→PDP end-to-end. Commit.

---

## Self-Review

**Spec coverage:** DB fields (A1), persistence incl. no-silent-discard of measurements/gallery/fulfilment (B1, D1), one neutral shared contract already exists and is extended not duplicated (C1/C2), Control Room validation+submit+hydrate (D1/D2), card uses shared type + no duplicate `Product` (E3), detail uses shared detail contract with all shopper fields + conditional empty-section omission (E2/E3), internal `cost` leak guard (C2 test), backward compatibility via nullable columns + `?? null`/`?? ""` hydration (A1/C/D), cache revalidation (E2/E3/F2). Global vs derived vs internal classification captured in Global Constraints.

**Placeholder scan:** No "TBD"/"add validation"/"similar to". Concrete SQL, types, mapper edits and test code are inline; Part F is intentionally interface-level because it is gated and depends on the Phase-12 boundary not yet open — its concrete steps are deferred to that phase by design, not omitted.

**Type consistency:** editor uses non-null `string` (`""` empty) while domain uses `string | null` — the boundary is `convertEditorValuesToProduct` (`.trim() || null`) and `createProductEditorValues` (`?? ""`); this asymmetry is intentional and matches the existing `colour`/`archiveNumber` handling. `conditionDisplay` returns `{ label, score }` used identically in adapter + detail. New DB columns are snake_case; domain/editor are camelCase; conversion happens only in mappers/write-path/conversion.

---

## Execution Handoff

Two execution options:

1. **Subagent-Driven (recommended)** — a fresh subagent per task with review between tasks. Best for the branch-switching discipline this plan requires.
2. **Inline Execution** — batch execution in this session with checkpoints.

Note: execution requires the Bash classifier (currently intermittently unavailable) for `pnpm`/`git`/`supabase` steps.
