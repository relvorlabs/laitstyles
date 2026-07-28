# Product Creation, Browser Draft Import, and Catalogue Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair signed Cloudinary uploads, add a browser-only JSON/CSV product draft queue that reuses the canonical editor, and replace the taxonomy dialog with dedicated responsive Category and Collection CRUD workspaces.

**Architecture:** Fix the Cloudinary provider protocol at its Route Handler boundary first, then add client-safe import contracts and pure mappers under the Products module. Move the existing product editor into Products-module ownership before composing it into a browser-only parent queue. Expand existing taxonomy queries/commands without a Prisma migration, then build the approved Category and Collection admin route against that contract.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript 5, React Hook Form, Zod 4, TanStack Query 5, next-cloudinary 6.17.5, Prisma 7.8, Vitest 4, Testing Library, Playwright 1.61, Biome, pnpm 11.

## Global Constraints

- Package manager is `pnpm`; do not introduce npm/yarn commands.
- Follow test-driven development: every behavior change starts with a focused failing test that is observed failing for the intended reason.
- Preserve `unique`, `stocked`, and `variant` product modes as discriminated unions.
- Import parsing and editing are browser-only; no request is made until a user explicitly chooses Save draft, Schedule, or Publish for one child.
- Imported product/variant media is always discarded: product `media: []`; variant `image: null`.
- CSV is one row per product; `variants` and `measurements` are JSON-encoded cells.
- Reject files over 10 MiB or more than 1,000 products.
- Category uploads persist only `catalogue_categories.image_url` on explicit save; no Prisma migration is planned.
- Collections do not accept uploads; previews derive from connected product covers.
- New capability belongs under `src/modules/products/**`; legacy `src/features/admin/product-editor/**` is migrated, not copied.
- Do not import production code from `scripts/**`.
- Do not add Cloudinary deletion/garbage collection, persistent import batches, migration-tracker cleanup, checkout/payment work, or unrelated refactors.
- Required UI viewports are 375×812, 768×1024, and 1280×800 with light/dark parity, keyboard access, reduced motion, and no horizontal overflow.

## File Structure

### Provider and upload boundary

- Create `src/app/api/v1/admin/assets/sign/route.test.ts` — provider-protocol regression tests.
- Modify `src/app/api/v1/admin/assets/sign/route.ts` — top-level signature response with standard error mapping.
- Create `src/lib/assets/client/cloudinary-upload.ts` — validate and normalize widget results.
- Create `src/lib/assets/client/cloudinary-upload.test.ts` — normalization tests.

### Canonical product editor and import

- Move `src/features/admin/product-editor/**` to `src/modules/products/ui/admin/product-editor/**` — canonical editor ownership.
- Modify affected imports in `src/features/admin/**` and `src/app/**` — consume the moved public editor/controller.
- Create `src/modules/products/import/types.ts` — import source, issue, child, and session types.
- Create `src/modules/products/import/schema.ts` — Zod schemas for direct JSON, relational snapshot, and CSV rows.
- Create `src/modules/products/import/csv.ts` and `csv.test.ts` — dependency-free quoted CSV parser.
- Create `src/modules/products/import/mapper.ts` and `mapper.test.ts` — source normalization to `ProductEditorValues[]`.
- Create `src/modules/products/import/session.ts` and `session.test.ts` — pure browser queue reducer.
- Create `src/modules/products/ui/admin/import/product-import-dialog.tsx` — file selection/preflight shell.
- Create `src/modules/products/ui/admin/import/product-import-session.tsx` and `.test.tsx` — parent queue and child editor composition.
- Create `src/modules/products/ui/admin/import/product-import-queue.tsx` — responsive child list/navigation.
- Create `public/templates/laitstyles-product-import.csv` — documented three-mode CSV sample.

### Catalogue structure domain and UI

- Modify `src/modules/products/types.ts` — richer taxonomy projections and mutation inputs.
- Modify `src/modules/products/schema.ts` — update, reorder, and collection-membership validation.
- Modify `src/modules/products/server/mappers.ts`, `queries.ts`, `taxonomy-commands.ts`, and tests — counts, image/previews, update, membership, and reorder.
- Modify `src/app/api/v1/admin/products/taxonomy/route.ts` and `[id]/route.ts`; add focused route tests.
- Create `src/app/api/v1/admin/products/taxonomy/reorder/route.ts` and `route.test.ts`.
- Modify `src/modules/products/client/api.ts`, `hooks.ts`, and `keys.ts` — new mutation contract and invalidation.
- Create `src/app/admin/inventory/catalogue/page.tsx`, `loading.tsx`, and `error.tsx` — authorized route composition.
- Create `src/modules/products/ui/admin/catalogue/catalogue-structure-workspace.tsx` — tabs and server-truth state.
- Create `category-grid.tsx`, `category-editor-dialog.tsx`, `collection-stories.tsx`, `collection-editor-dialog.tsx`, `taxonomy-delete-dialog.tsx`, and UI tests beside them.
- Modify `src/features/admin/inventory/inventory-workspace-header.tsx` — replace dialog trigger with route link and import trigger.
- Delete `src/features/admin/inventory/catalogue-taxonomy-manager.tsx` after consumers are removed.

### Acceptance

- Create `tests/e2e/admin-product-creation.spec.ts` — upload/import/taxonomy browser acceptance.
- Create `tests/e2e/fixtures/product-import.csv` and `product-import.json` — deterministic import fixtures without assets.

---

### Task 1: Reproduce and Fix the Cloudinary Signing Contract

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/app/api/v1/admin/assets/sign/route.test.ts`
- Modify: `src/app/api/v1/admin/assets/sign/route.ts`

**Interfaces:**
- Consumes: `signCloudinaryUploadParams(paramsToSign): string`, `requireApiStaff`, request-context/error helpers.
- Produces: successful HTTP JSON `{ signature: string }`; failures retain the normal `{ error: ... }` envelope and request ID.

- [ ] **Step 1: Reproduce the current boundary failure without changing code**

Run the authenticated product image upload in the browser with Network inspection open. Record that `POST /api/v1/admin/assets/sign` returns HTTP 200 with `{ "data": { "signature": "..." } }` while installed `generateSignatureCallback` reads `result.signature`. Save the network evidence in the task completion notes; if runtime auth/config blocks reproduction, report the blocker and keep the static installed-source evidence.

- [ ] **Step 2: Write the failing route contract tests**

```ts
it("returns the top-level signature required by next-cloudinary", async () => {
  mocks.requireApiStaff.mockResolvedValue(staff);
  mocks.signCloudinaryUploadParams.mockReturnValue("signed-value");

  const response = await POST(new Request("http://localhost/api/v1/admin/assets/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ paramsToSign: { timestamp: 123, folder: "laitstyles/products" } }),
  }));

  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("x-request-id")).toBeTruthy();
  await expect(response.json()).resolves.toEqual({ signature: "signed-value" });
});

it("keeps the safe API error envelope when signing is unavailable", async () => {
  mocks.signCloudinaryUploadParams.mockImplementation(() => {
    throw new Error("missing secret");
  });
  const response = await POST(validRequest());
  expect(response.status).toBe(503);
  await expect(response.json()).resolves.toMatchObject({
    error: { code: "ASSET_PROVIDER_UNCONFIGURED" },
  });
});
```

- [ ] **Step 3: Run the focused test and verify RED**

Run: `pnpm test src/app/api/v1/admin/assets/sign/route.test.ts`

Expected: FAIL because success is currently `{ data: { signature } }`.

- [ ] **Step 4: Implement the provider-specific response boundary**

Use `createApiRequestContext`, `withRequestId`, `mapApiError`, and `apiFailure` so only success bypasses `handleApiRequest`:

```ts
export async function POST(request: Request) {
  const context = createApiRequestContext(request);
  try {
    await requireApiStaff();
    const { paramsToSign } = await parseJsonBody(request, signRequestSchema);
    let signature: string;
    try {
      signature = signCloudinaryUploadParams(paramsToSign);
    } catch (cause) {
      throw new ApiError({
        code: "ASSET_PROVIDER_UNCONFIGURED",
        message: "Image uploads are not configured on this server.",
        status: 503,
        cause,
      });
    }
    return NextResponse.json(
      { signature },
      { headers: withRequestId({ "Cache-Control": "private, no-store" }, context.requestId) },
    );
  } catch (cause) {
    return apiFailure(mapApiError(cause, context), {
      headers: withRequestId(undefined, context.requestId),
    });
  }
}
```

This preserves validation/auth errors and maps only an actual signing failure to provider-unconfigured.

- [ ] **Step 5: Run focused and HTTP contract tests**

Run: `pnpm test src/app/api/v1/admin/assets/sign/route.test.ts src/lib/http/server.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/admin/assets/sign/route.ts src/app/api/v1/admin/assets/sign/route.test.ts
git commit -m "fix(assets): return Cloudinary signature contract"
```

### Task 2: Normalize Upload Results and Repair Product Feedback

**Owner:** Laitstyles UI engineer

**Files:**
- Create: `src/lib/assets/client/cloudinary-upload.ts`
- Create: `src/lib/assets/client/cloudinary-upload.test.ts`
- Modify now, then move in Task 3: `src/features/admin/product-editor/product-images-step.tsx`
- Modify now, then move in Task 3: `src/features/admin/product-editor/variant-product-fields.tsx`

**Interfaces:**
- Produces: `normalizeCloudinaryUploadResult(result): Result<UploadedCloudinaryAsset, CloudinaryUploadIssue>`.

- [ ] **Step 1: Write failing normalization tests**

```ts
it("normalizes a complete widget success result", () => {
  expect(normalizeCloudinaryUploadResult({ info: {
    public_id: "laitstyles/products/coat",
    secure_url: "https://res.cloudinary.com/store/image/upload/v1/coat.jpg",
    width: 1200,
    height: 1500,
    format: "jpg",
    bytes: 2048,
  }} as CloudinaryUploadWidgetResults)).toEqual({
    ok: true,
    value: expect.objectContaining({ publicId: "laitstyles/products/coat" }),
  });
});

it.each([{ info: undefined }, { info: "pending" }, { info: { public_id: "", secure_url: "" } }])(
  "rejects incomplete success metadata",
  (result) => expect(normalizeCloudinaryUploadResult(result as never)).toMatchObject({ ok: false }),
);
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/lib/assets/client/cloudinary-upload.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure normalizer**

```ts
export type UploadedCloudinaryAsset = {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
  format: string | null;
  bytes: number | null;
};

export function normalizeCloudinaryUploadResult(result: CloudinaryUploadWidgetResults) {
  const info = result.info;
  if (!info || typeof info === "string" || !info.public_id?.trim() || !info.secure_url?.trim()) {
    return err({ code: "invalid-upload-result", message: "Cloudinary did not return a usable image." });
  }
  return ok({
    publicId: info.public_id,
    url: info.secure_url,
    width: info.width ?? null,
    height: info.height ?? null,
    format: info.format ?? null,
    bytes: info.bytes ?? null,
  });
}
```

- [ ] **Step 4: Replace silent callback returns with explicit form feedback**

Use the normalizer in product and variant image callbacks. Track `"opening" | "uploading" | "completed" | "cancelled" | "failed"` from widget events, render status through `aria-live="polite"`, disable duplicate upload starts, and preserve existing duplicate/MAX_IMAGES guards.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `pnpm test src/lib/assets/client/cloudinary-upload.test.ts`

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/assets/client src/features/admin/product-editor/product-images-step.tsx src/features/admin/product-editor/variant-product-fields.tsx
git commit -m "fix(products): surface successful image uploads"
```

### Task 3: Move the Canonical Product Editor into Products-Module Ownership

**Owner:** Laitstyles UI engineer

**Files:**
- Move: `src/features/admin/product-editor/**` → `src/modules/products/ui/admin/product-editor/**`
- Modify: all imports returned by `rg -l "@/features/admin/product-editor" src`
- Modify: `src/modules/products/product-module-boundaries.test.ts` only if its public UI allowlist needs the new admin path.

**Interfaces:**
- Produces: public `ProductEditorControllerProvider`, `useProductEditorController`, `ProductEditorDialog`, and reusable `ProductEditorSurface` inside the Products module.

- [ ] **Step 1: Record the pre-move architecture baseline**

Run: `pnpm check:architecture`

Expected: PASS before the move; save any pre-existing failure exactly.

- [ ] **Step 2: Move files mechanically and rewrite imports**

Use filesystem moves/patches without changing behavior. The canonical prefix becomes:

```ts
import { ProductEditorDialog } from "@/modules/products/ui/admin/product-editor/product-editor-dialog";
```

- [ ] **Step 3: Extract the reusable surface from dialog chrome**

In `product-editor-dialog.tsx`, export:

```ts
export type ProductEditorSurfaceProps = {
  initialValues: ProductEditorValues;
  onCompleted?: (result: ProductEditorActionSuccess) => void;
  onValuesChange?: (values: ProductEditorValues) => void;
  onRequestClose: () => void;
  queueNavigation?: ReactNode;
};
```

Move the existing `ProductEditorForm` body into an exported `ProductEditorSurface` with this prop contract, and keep `ProductEditorDialog` as the normal overlay wrapper around it. Use `useWatch` plus an effect to report values to the parent without triggering a server mutation. Remove the inaccurate “Session only · refresh resets the prototype” footer copy because product persistence is real.

- [ ] **Step 4: Verify architecture and behavior remain green**

Run: `pnpm check:architecture`

Run: `pnpm test src/modules/products`

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin src/modules/products src/app
git commit -m "refactor(products): move admin editor into module"
```

### Task 4: Define Import Contracts and Parse CSV/Direct JSON

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/products/import/types.ts`
- Create: `src/modules/products/import/schema.ts`
- Create: `src/modules/products/import/csv.ts`
- Create: `src/modules/products/import/csv.test.ts`
- Create: `public/templates/laitstyles-product-import.csv`

**Interfaces:**
- Produces: `parseCsvTable(text): Result<Record<string,string>[], ProductImportFileIssue>`.
- Produces: `parseProductImportText({ fileName, size, text }): ProductImportParseResult`.

- [ ] **Step 1: Write failing CSV contract tests**

Cover quoted commas, escaped quotes, CRLF, embedded newlines, blank trailing rows, malformed quotes, nested JSON cells, 10 MiB rejection, and 1,001-row rejection.

```ts
it("parses variants and measurements JSON cells", () => {
  const csv = 'mode,name,variants,measurements\r\nvariant,"Varsity, Blue","[{""label"":""S"",""stock"":2}]","[]"';
  const result = parseProductImportText({ fileName: "products.csv", size: csv.length, text: csv });
  expect(result).toMatchObject({
    ok: true,
    value: { source: "csv", rows: [expect.objectContaining({ name: "Varsity, Blue" })] },
  });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/products/import/csv.test.ts`

Expected: FAIL because parser modules do not exist.

- [ ] **Step 3: Implement a dependency-free state-machine CSV parser**

Track `row`, `field`, `insideQuotes`, and character index. A quote inside a quoted field escapes only when followed by another quote. Commas/newlines delimit only outside quotes. Return row/column issues; do not use naive `split(",")`.

- [ ] **Step 4: Add Zod schemas for the three modes**

The direct JSON schema uses camelCase editor-oriented names, rejects database IDs, and accepts nested arrays directly. CSV schema preprocesses nested cell strings with `JSON.parse` before the same discriminated union.

- [ ] **Step 5: Create the committed CSV template**

Include headers and exactly one `unique`, `stocked`, and `variant` example. Do not include media/image columns.

- [ ] **Step 6: Verify GREEN**

Run: `pnpm test src/modules/products/import/csv.test.ts`

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/products/import public/templates/laitstyles-product-import.csv
git commit -m "feat(products): parse browser import files"
```

### Task 5: Map the Relational Snapshot into Editor Drafts

**Owner:** Laitstyles domain engineer

**Files:**
- Create: `src/modules/products/import/mapper.ts`
- Create: `src/modules/products/import/mapper.test.ts`

**Interfaces:**
- Consumes: parsed direct rows or relational snapshot.
- Produces: `mapProductImport(source): { children: ProductImportChild[]; ignoredAssetCount: number }`.

- [ ] **Step 1: Write failing mapper tests for every inventory mode**

Build small relational fixtures rather than loading the 1.9 MiB sample in unit tests. Assert taxonomy joins, channel normalization, stock aggregation, measurements, pricing/fulfilment, and missing-reference issues.

```ts
it("never imports product or variant images", () => {
  const result = mapProductImport(snapshotWithAssetsAndVariantCover());
  expect(result.children[0]?.values.media).toEqual([]);
  expect(result.children[0]?.values).toMatchObject({
    inventoryMode: "variant",
    variant: { variants: [expect.objectContaining({ image: null })] },
  });
  expect(result.ignoredAssetCount).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/modules/products/import/mapper.test.ts`

Expected: FAIL because mapper does not exist.

- [ ] **Step 3: Implement indexed relational joins**

Create Maps by ID once, then normalize each product in O(products + related rows):

```ts
const categories = new Map(source.catalogue_categories.map((row) => [row.id, row.name]));
const variantsByProduct = groupBy(source.product_variants, (row) => row.product_id);
const stockByProduct = groupBy(source.stock_levels, (row) => row.product_id);
const measurementsByProduct = groupBy(source.product_measurements, (row) => row.product_id);
```

Generate browser-only `importId` values, but set every `values.productId` to `null`. Map `weight_grams / 1000` to `weightKg`, snake_case channels to editor channel literals, and numeric measurement plus unit to the editor string value. Broken foreign references create issues tied to the relevant child and step.

- [ ] **Step 4: Verify the real sample as a bounded fixture check**

Add a test that reads `scripts/seed/storefront-catalog-snapshot.json` only from the test file and asserts 100 mapped children, all three modes present, and no mapped images. Production mapper must not import the script module.

Run: `pnpm test src/modules/products/import/mapper.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/products/import/mapper.ts src/modules/products/import/mapper.test.ts
git commit -m "feat(products): map catalogue snapshots to drafts"
```

### Task 6: Implement Browser Queue State and Import Session UI

**Owner:** Laitstyles UI engineer

**Files:**
- Create: `src/modules/products/import/session.ts`
- Create: `src/modules/products/import/session.test.ts`
- Create: `src/modules/products/ui/admin/import/product-import-dialog.tsx`
- Create: `src/modules/products/ui/admin/import/product-import-session.tsx`
- Create: `src/modules/products/ui/admin/import/product-import-session.test.tsx`
- Create: `src/modules/products/ui/admin/import/product-import-queue.tsx`
- Modify: `src/modules/products/ui/admin/product-editor/product-editor-controller.tsx`
- Modify: `src/features/admin/inventory/inventory-workspace-header.tsx`

**Interfaces:**
- Produces: pure `productImportSessionReducer(state, action)`.
- Produces: `openProductImport(): void` from the Products admin controller.

- [ ] **Step 1: Write failing reducer tests**

Cover select child, update values without touching siblings, previous/next bounds, persistence transitions, failed child retention, and dirty-close detection.

```ts
it("keeps sibling edits isolated", () => {
  const next = productImportSessionReducer(twoChildState, {
    type: "update-values",
    importId: "child-1",
    values: { ...twoChildState.children[0]!.values, name: "Edited" },
  });
  expect(next.children[0]?.values.name).toBe("Edited");
  expect(next.children[1]).toEqual(twoChildState.children[1]);
});
```

- [ ] **Step 2: Verify reducer RED, implement, and verify GREEN**

Run: `pnpm test src/modules/products/import/session.test.ts`

Expected before implementation: FAIL. Expected after minimal reducer: PASS.

- [ ] **Step 3: Write failing UI interaction tests**

Use Testing Library to upload a two-product JSON fixture, select the second child, edit its name, return to the first, and verify values persist. Mock `saveProductRequest` and assert parsing/navigation makes zero calls; clicking Save draft calls once with only the active child.

- [ ] **Step 4: Implement the approved parent/child UI**

Desktop: persistent queue rail, search/status dots, canonical editor surface, product Previous/Next controls. Mobile/tablet: queue becomes an accessible product picker plus Previous/Next controls; no nested dialog. Render ignored-asset count and “Nothing has been uploaded or saved” prominently.

- [ ] **Step 5: Add dismissal safeguards**

Use the existing AlertDialog primitive. Warn only when unsaved children are dirty. Saved/published children remain visible with their persistence status until the user closes the session.

- [ ] **Step 6: Verify focused UI and architecture**

Run: `pnpm test src/modules/products/import src/modules/products/ui/admin/import`

Run: `pnpm check:architecture`

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/modules/products/import src/modules/products/ui/admin src/features/admin/inventory/inventory-workspace-header.tsx
git commit -m "feat(products): add browser draft import session"
```

### Task 7: Expand Taxonomy Server Truth Without a Schema Migration

**Owner:** Laitstyles domain engineer

**Files:**
- Modify: `src/modules/products/types.ts`
- Modify: `src/modules/products/schema.ts`
- Modify: `src/modules/products/server/mappers.ts`
- Modify: `src/modules/products/server/queries.ts`
- Modify: `src/modules/products/server/taxonomy-commands.ts`
- Modify: `src/modules/products/server/taxonomy-commands.test.ts`
- Create: `src/modules/products/server/taxonomy-queries.test.ts`

**Interfaces:**
- Produces taxonomy items with `imageUrl`, `position`, `productCount`, and `previewImageUrls`.
- Produces `updateProductTaxonomy(actor, taxonomyId, input)` and `reorderProductTaxonomy(actor, input)`.

- [ ] **Step 1: Write failing query projection tests**

```ts
expect(category).toMatchObject({
  kind: "category",
  imageUrl: "https://res.cloudinary.com/store/image/upload/category.jpg",
  position: 1,
  productCount: 12,
  previewImageUrls: [],
});
expect(collection).toMatchObject({
  kind: "collection",
  imageUrl: null,
  productCount: 4,
  previewImageUrls: [expect.stringContaining("res.cloudinary.com")],
});
```

- [ ] **Step 2: Write failing command tests**

Test Category name/image/position update, Collection exact-membership update, explicit reassignment from another Collection, affected slug collection, atomic reorder, permissions, duplicates, not-found, and in-use deletion.

- [ ] **Step 3: Verify RED**

Run: `pnpm test src/modules/products/server/taxonomy-commands.test.ts src/modules/products/server/taxonomy-queries.test.ts`

Expected: FAIL for missing projection/update/reorder behavior.

- [ ] **Step 4: Implement the richer read projection**

Query `_count.products`; for Collections include the first three products ordered by `updated_at desc`, selecting their primary/cover product media. Keep Category `image_url` as the only stored Category image field.

- [ ] **Step 5: Implement update and exact membership semantics**

For Collection `productIds`, validate every ID, fetch current and selected products, set removed members' `collection_id` to null, and set selected members' `collection_id` to this Collection in one serializable transaction. Selecting a product assigned elsewhere explicitly moves it; the UI must disclose that before save. Audit each taxonomy mutation once.

- [ ] **Step 6: Implement atomic reorder**

`reorderProductTaxonomy(actor, { kind, orderedIds })` decodes every public ID, rejects mixed kinds/duplicates, verifies the submitted set equals the current set for that kind, then updates `position` values in a serializable transaction.

- [ ] **Step 7: Verify GREEN**

Run: `pnpm test src/modules/products/server/taxonomy-commands.test.ts src/modules/products/server/taxonomy-queries.test.ts`

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/modules/products/types.ts src/modules/products/schema.ts src/modules/products/server
git commit -m "feat(products): expand catalogue taxonomy contracts"
```

### Task 8: Publish Taxonomy Update/Reorder Through API and Client Hooks

**Owner:** Laitstyles domain engineer

**Files:**
- Modify: `src/app/api/v1/admin/products/taxonomy/route.ts`
- Modify: `src/app/api/v1/admin/products/taxonomy/[id]/route.ts`
- Create: `src/app/api/v1/admin/products/taxonomy/route.test.ts`
- Create: `src/app/api/v1/admin/products/taxonomy/[id]/route.test.ts`
- Create: `src/app/api/v1/admin/products/taxonomy/reorder/route.ts`
- Create: `src/app/api/v1/admin/products/taxonomy/reorder/route.test.ts`
- Modify: `src/modules/products/client/api.ts`
- Modify: `src/modules/products/client/hooks.ts`
- Modify: `src/modules/products/client/api.test.ts`

**Interfaces:**
- `PATCH /api/v1/admin/products/taxonomy/:id` accepts the richer update input.
- `POST /api/v1/admin/products/taxonomy/reorder` accepts `{ kind, orderedIds }`.

- [ ] **Step 1: Write failing route/client tests**

Assert capability checks, request validation, standard envelopes, cache-control, domain invocation, affected-slug invalidation, and client Result error mapping.

- [ ] **Step 2: Verify RED**

Run: `pnpm test src/app/api/v1/admin/products/taxonomy src/modules/products/client/api.test.ts`

Expected: FAIL for missing update/reorder transports.

- [ ] **Step 3: Implement routes and requests**

Keep Route Handlers thin: authenticate, parse Zod input, call command, translate domain error, invalidate affected catalogue slugs, and return the existing API envelope.

- [ ] **Step 4: Implement query-cache policy**

On successful create/update/delete/reorder, invalidate `productKeys.taxonomy()`, `productKeys.list()`, `inventoryKeys.all`, and storefront catalogue tags through the server command/route. Do not optimistically pretend Collection membership succeeded before the transaction completes.

- [ ] **Step 5: Verify GREEN**

Run: `pnpm test src/app/api/v1/admin/products/taxonomy src/modules/products/client/api.test.ts`

Run: `pnpm typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/v1/admin/products/taxonomy src/modules/products/client
git commit -m "feat(products): expose catalogue structure mutations"
```

### Task 9: Build the Approved Category and Collection Workspaces

**Owner:** Laitstyles UI engineer

**Files:**
- Create: `src/app/admin/inventory/catalogue/page.tsx`
- Create: `src/app/admin/inventory/catalogue/loading.tsx`
- Create: `src/app/admin/inventory/catalogue/error.tsx`
- Create: `src/modules/products/ui/admin/catalogue/catalogue-structure-workspace.tsx`
- Create: `src/modules/products/ui/admin/catalogue/category-grid.tsx`
- Create: `src/modules/products/ui/admin/catalogue/category-editor-dialog.tsx`
- Create: `src/modules/products/ui/admin/catalogue/collection-stories.tsx`
- Create: `src/modules/products/ui/admin/catalogue/collection-editor-dialog.tsx`
- Create: `src/modules/products/ui/admin/catalogue/taxonomy-delete-dialog.tsx`
- Create: colocated `*.test.tsx` files for workspace/editor behavior.
- Modify: `src/features/admin/inventory/inventory-workspace-header.tsx`
- Delete: `src/features/admin/inventory/catalogue-taxonomy-manager.tsx`

**Interfaces:**
- Consumes: taxonomy query/update/delete/reorder hooks and shared Cloudinary upload normalizer.
- Produces: `/admin/inventory/catalogue?tab=categories|collections`.

- [ ] **Step 1: Write failing UI tests for Categories**

Test loading/empty/error/data states, search, responsive card semantics, create/edit, successful Cloudinary preview, cancel preserving server record, save sending `imageUrl`, reorder keyboard controls, pending states, and in-use deletion feedback.

- [ ] **Step 2: Write failing UI tests for Collections**

Test full-width story cards, product-derived preview collage, empty canvas, exact membership selection, explicit “moves from another collection” disclosure, reorder controls, and deletion guard.

- [ ] **Step 3: Verify RED**

Run: `pnpm test src/modules/products/ui/admin/catalogue`

Expected: FAIL because components do not exist.

- [ ] **Step 4: Implement authorized route composition**

`page.tsx` calls `getStaffAccess("inventory:read")`; render `AdminAccessDenied` on failure and the client workspace on success. Parse only the `tab` query value server-side.

- [ ] **Step 5: Implement the approved image-led Category screen**

Use existing Button, Dialog/Sheet, Field, Input, CloudImage, Skeleton, Empty, AlertDialog, Tabs, and Progress primitives. Store upload result in editor-local state; only the update mutation writes `imageUrl`. Derived readiness copy must not imply a persisted publication field.

- [ ] **Step 6: Implement the approved editorial Collection screen**

Render one full-width story card per collection with up to three member covers, not the rejected compact row table. The editor manages name, product membership, and storefront order; no Collection upload control exists.

- [ ] **Step 7: Replace the legacy dialog trigger**

Inventory header links to `/admin/inventory/catalogue`. Add the Import products trigger beside it, wired to `openProductImport`. Delete the old taxonomy manager only after `rg "CatalogueTaxonomyManager" src` returns no consumers.

- [ ] **Step 8: Verify focused UI, architecture, and React health**

Run: `pnpm test src/modules/products/ui/admin/catalogue src/modules/products/ui/admin/import`

Run: `pnpm check:architecture`

Run: `pnpm react-doctor`

Run: `pnpm typecheck`

Expected: required checks PASS; React Doctor findings touching changed files are zero.

- [ ] **Step 9: Commit**

```bash
git add src/app/admin/inventory/catalogue src/modules/products/ui/admin src/features/admin/inventory
git commit -m "feat(products): redesign catalogue structure workspace"
```

### Task 10: Browser Acceptance, Full Gates, and Completion Report

**Owner:** Laitstyles reviewer

**Files:**
- Create: `tests/e2e/admin-product-creation.spec.ts`
- Create: `tests/e2e/fixtures/product-import.csv`
- Create: `tests/e2e/fixtures/product-import.json`
- Modify: documentation only if verification reveals an actual contract change.

**Interfaces:**
- Verifies the completed behavior; does not implement source fixes. Failures return to the owning engineer.

- [ ] **Step 1: Write browser acceptance tests before claiming completion**

Cover authenticated Cloudinary signing response shape (mock binary upload only when real Cloudinary credentials are unavailable), real callback normalization, imported assets ignored, child navigation/edit preservation, explicit individual save, Category upload/save/cancel, Collection previews/membership, deletion guards, and close confirmation.

- [ ] **Step 2: Run viewport and accessibility matrix**

Run source-backed Playwright at 375×812, 768×1024, and 1280×800 in light and dark modes. Validate keyboard navigation, focus trapping/return, live regions, Escape, touch targets, reduced motion, no horizontal overflow, console errors, failed requests, and screenshots.

- [ ] **Step 3: Run focused regression suite**

```bash
pnpm test src/app/api/v1/admin/assets/sign src/lib/assets/client src/modules/products
pnpm check:architecture
pnpm typecheck
```

Expected: PASS.

- [ ] **Step 4: Run authoritative full gates**

```bash
pnpm validate:full
pnpm validate:browser
```

Expected: PASS with fresh manifests/logs. Any unavailable runner, skipped step, missing manifest, or changed-scope React Doctor finding blocks completion.

- [ ] **Step 5: Inspect final diff**

Confirm no imported asset URL reaches editor state, no import action writes automatically, no Collection upload exists, no Prisma migration/dependency drift occurred, legacy taxonomy dialog has no consumers, and visual implementation matches the three user-approved mockup directions.

- [ ] **Step 6: Write completion report and commit acceptance coverage**

```bash
git add tests/e2e docs
git commit -m "test(products): certify creation and catalogue flows"
```

Report changes, actual validations, blocked/skipped checks, warnings, limitations, and any doctrine/spec deviation. Do not claim completion without fresh evidence.
