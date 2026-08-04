# Product Import Upload Workflow Implementation Plan

**Status:** Implemented and merged; retained as a historical execution record. `src/components/ui/cloud-upload-button.tsx` is the only production importer of `CldUploadButton`, `src/modules/products/import/{prepare,session,types}.ts` own parsing/duplicate filtering/selection, and the editor exposes `navigationMode`. Do not execute the unchecked planning steps against the current tree.

**Goal:** Centralize production Cloudinary uploads, make the browser-owned product import queue editable and appendable, and enable unrestricted editor-step navigation only for imported products.

**Architecture:** Keep provider-specific widget types and lifecycle state behind one shared `src/components/ui` boundary, while each consumer retains its own folder, capacity, media-assignment, and feedback rules. Keep parsing, duplicate filtering, selection, and deterministic removal in client-safe `src/modules/products/import/**` domain contracts; React components only read files, dispatch transitions, confirm destructive local actions, and render responsive controls. Add an explicit editor navigation mode without changing save transports or publish/schedule validation.

**Tech Stack:** Next.js 16.2.10, React 19.2.4, TypeScript 5, React Hook Form 7.81, Zod 4.4, Base UI/shadcn `base-mira`, HugeIcons, next-cloudinary 6.17.5, Vitest 4.1, Testing Library 16.3, Playwright 1.61, Biome 2.5, pnpm 11.13.0.

## Global Constraints

- Use `pnpm@11.13.0` and Node `25.x`; do not change dependencies or the lockfile.
- `CloudUploadButton` is the only production UI component allowed to import `CldUploadButton` from `next-cloudinary`.
- Preserve `signatureEndpoint="/api/v1/admin/assets/sign"` and common image formats `png`, `jpg`, `jpeg`, `webp`, and `avif` in the shared boundary.
- Preserve product media's 12-image limit, cover/detail assignment, variant association, category image behavior, store-logo behavior, upload folders, and consumer-specific feedback.
- Import state remains browser-owned, reducer-managed, and non-persistent; no API, Prisma, Supabase, TanStack Query, or server-persistence change is permitted.
- Duplicate detection uses non-empty internal references after trimming and case-folding against the complete queue and earlier accepted rows; blank references remain.
- Queue removal never deletes a persisted catalogue product. Only edited entries require confirmation.
- `navigationMode: "sequential" | "unrestricted"` defaults to `"sequential"`; only `ProductImportSession` opts into `"unrestricted"`.
- Continue validates the active step; Publish and Schedule continue to validate all required steps and navigate to the first issue.
- Preserve the unrelated dirty storefront/checkout work and the user's in-progress edits in `src/modules/products/ui/admin/import/product-import-queue.tsx`, `src/modules/products/ui/admin/product-editor/product-images-step.tsx`, and untracked `src/modules/products/ui/admin/product-editor/product-images-step.test.tsx`.
- Before every task, run `git status --short` followed by `git diff --` with every path named in that task's **Files** block; incorporate the live file contents, stage only those explicit files, and never use `git checkout --`, `git restore`, `git reset`, or repo-wide formatting.
- Existing American-spelled catalogue identifiers are legacy debt; changed code must not add new `catalog*` identifiers.
- Use existing semantic tokens, Base UI contexts, `Checkbox`, `AlertDialog`, and `Select`; new icons must use HugeIcons. Status must remain textual as well as visual.
- Prototype boundary: appending, selection, and removal affect only the current browser import session; existing product-save operations remain the sole authoritative persistence path.

## Layer and role map

| Layer | Planned files | Owner | Decision |
| --- | --- | --- | --- |
| `prisma/**`, `supabase/**` | None | data-engineer | **Skipped.** The approved spec explicitly forbids product, inventory, auth, and persistence-schema changes. |
| `src/modules/products/import/**` | preparation, duplicate filtering, reducer state/actions, colocated tests | domain-engineer | Required because these are client-safe product-domain contracts and workflow invariants, not component-local UI state rules. No server transport is added. |
| `src/components/ui/**` | shared Cloudinary upload boundary and test | ui-engineer | Required shared primitive boundary; it exposes provider-neutral types only. |
| `src/modules/products/ui/admin/**`, `src/features/admin/settings/**` | consumer migrations, queue/session controls, editor navigation | ui-engineer | Required interaction and responsive presentation work. Existing legacy settings file may be repaired in place; do not migrate or refactor that feature. |
| `scripts/checks/**`, boundary test | direct-import guard | ui-engineer, reviewed by reviewer | Narrow architecture enforcement for this feature only. |
| Validation/evidence | repository gates and browser review | reviewer | Mandatory final feature-workflow gate. |

## Explicit exclusions

- No Cloudinary credentials, signing route, signing implementation, provider, storage, or asset-persistence changes.
- No CSV/JSON media import and no change to the 10 MiB / 1,000-product limits.
- No background import job, server-side batch, session reload persistence, new API route, Server Action, query hook, or Zustand store.
- No persisted product deletion, merge, or replacement when queue entries are deleted or duplicates are skipped.
- No normal create-product or existing-product navigation change.
- No weakening or replacement of draft, publish, or schedule validation.
- No redesign of unrelated admin, catalogue, storefront, checkout, order, or settings surfaces.
- No migration of `src/features/admin/settings/store-identity-section.tsx` beyond replacing its upload consumer.
- No dependency update, generated Prisma output, schema migration, lockfile edit, global formatting, or drive-by refactor.

---

### Task 1: Publish client-safe import preparation and duplicate contracts

**Owner:** domain-engineer

**Files:**
- Create: `src/modules/products/import/prepare.ts`
- Create: `src/modules/products/import/prepare.test.ts`
- Modify: `src/modules/products/import/mapper.ts`
- Modify: `src/modules/products/import/mapper.test.ts`

**Interfaces:**
- Consumes: `parseProductImportText(input: ProductImportFileInput): ProductImportParseResult`, `isBoundedProductImportRelationalSnapshot(value: unknown, size: number): boolean`, and `mapProductImport(source, ignoredAssetCount?): ProductImportMappingResult`.
- Produces: `prepareProductImport(input: ProductImportFileInput): Result<ProductImportMappingResult, ProductImportFileIssue>` and `filterDuplicateProductImportChildren(existing: ProductImportChild[], incoming: ProductImportChild[]): { accepted: ProductImportChild[]; skippedCount: number }`.
- Produces invariant: accepted children have queue-unique `importId` values even when a later direct file maps another `direct-1`; identity deduplication remains based only on normalized non-empty `values.internalReference`.

- [ ] **Step 1: Record and protect the dirty-file baseline**

Run: `git status --short && git diff -- src/modules/products/import/mapper.ts src/modules/products/import/mapper.test.ts`

Expected: the command shows the current unrelated worktree; these four task files are either clean or their pre-existing diff is recorded before edits. Do not proceed by discarding any existing hunk.

- [ ] **Step 2: Write failing preparation and duplicate tests**

Add tests with these complete assertions in `src/modules/products/import/prepare.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createEmptyProductEditorValues } from "@/modules/products/editor-defaults";
import {
  filterDuplicateProductImportChildren,
  prepareProductImport,
} from "@/modules/products/import/prepare";
import type { ProductImportChild } from "@/modules/products/import/types";

function child(importId: string, internalReference: string): ProductImportChild {
  return {
    importId,
    values: { ...createEmptyProductEditorValues("stocked"), name: importId, internalReference },
    issues: [],
    status: "ready",
    isDirty: false,
    persistence: null,
  };
}

describe("prepareProductImport", () => {
  it("maps a valid direct JSON file through the shared preparation path", () => {
    const result = prepareProductImport({
      fileName: "products.json",
      size: 64,
      text: JSON.stringify([{ mode: "stocked", name: "Linen coat", stock: 2 }]),
    });
    expect(result).toMatchObject({ ok: true, value: { ignoredAssetCount: 0 } });
    if (result.ok) expect(result.value.children[0]?.values.name).toBe("Linen coat");
  });

  it("maps a bounded relational snapshot through the same preparation path", () => {
    const text = JSON.stringify({
      catalogue_categories: [], catalogue_collections: [],
      products: [{ id: "p1", category_id: null, collection_id: null, name: "Archive coat", description: "", inventory_mode: "stocked", price: 12000, low_stock_threshold: 2 }],
      product_channels: [], product_variants: [],
      stock_levels: [{ product_id: "p1", variant_id: null, quantity_on_hand: 3 }],
      product_measurements: [], product_media: [], cloudinary_assets: [],
    });
    const result = prepareProductImport({ fileName: "snapshot.json", size: text.length, text });
    expect(result).toMatchObject({ ok: true, value: { children: [{ values: { name: "Archive coat" } }] } });
  });

  it("preserves the row-limit issue for an oversized relational snapshot", () => {
    const text = JSON.stringify({ products: Array.from({ length: 1_001 }, () => ({})) });
    expect(prepareProductImport({ fileName: "snapshot.json", size: text.length, text })).toEqual({
      ok: false,
      error: { code: "too-many-products", message: "Import files may contain at most 1,000 products." },
    });
  });
});

describe("filterDuplicateProductImportChildren", () => {
  it("skips trimmed case-insensitive references across the full queue and incoming file", () => {
    const result = filterDuplicateProductImportChildren(
      [child("existing", " Ref-01 ")],
      [child("direct-1", "ref-01"), child("direct-2", "REF-02"), child("direct-3", " ref-02 ")],
    );
    expect(result.skippedCount).toBe(2);
    expect(result.accepted.map((item) => item.values.internalReference)).toEqual(["REF-02"]);
  });

  it("retains blank references and makes colliding import IDs queue-unique", () => {
    const result = filterDuplicateProductImportChildren(
      [child("direct-1", "")],
      [child("direct-1", ""), child("direct-2", "   ")],
    );
    expect(result.skippedCount).toBe(0);
    expect(new Set(result.accepted.map((item) => item.importId)).size).toBe(2);
    expect(result.accepted.every((item) => item.values.internalReference.trim() === "")).toBe(true);
  });
});
```

- [ ] **Step 3: Run the focused test and verify red**

Run: `pnpm exec vitest run src/modules/products/import/prepare.test.ts`

Expected: FAIL because `@/modules/products/import/prepare` does not exist.

- [ ] **Step 4: Implement the shared preparation and duplicate boundary**

Create `prepare.ts` with the exact public flow below; keep relational-shape details in the existing mapper and return the parser's typed issue unchanged:

```ts
import { err, ok, type Result } from "@/lib/errors";
import { parseProductImportText } from "@/modules/products/import/csv";
import {
  isBoundedProductImportRelationalSnapshot,
  mapProductImport,
  type ProductImportMappingResult,
} from "@/modules/products/import/mapper";
import {
  PRODUCT_IMPORT_MAX_ROWS,
  type ProductImportChild,
  type ProductImportFileInput,
  type ProductImportFileIssue,
} from "@/modules/products/import/types";

export function prepareProductImport(
  input: ProductImportFileInput,
): Result<ProductImportMappingResult, ProductImportFileIssue> {
  const parsed = parseProductImportText(input);
  if (parsed.ok) return ok(mapProductImport(parsed.value.rows, parsed.value.ignoredAssetCount));
  if (!input.fileName.toLocaleLowerCase("en-NG").endsWith(".json")) return parsed;
  try {
    const snapshot: unknown = JSON.parse(input.text);
    if (
      snapshot &&
      typeof snapshot === "object" &&
      !Array.isArray(snapshot) &&
      Array.isArray((snapshot as { products?: unknown }).products) &&
      (snapshot as { products: unknown[] }).products.length > PRODUCT_IMPORT_MAX_ROWS
    ) {
      return err({
        code: "too-many-products",
        message: "Import files may contain at most 1,000 products.",
      });
    }
    if (isBoundedProductImportRelationalSnapshot(snapshot, input.size)) {
      return ok(mapProductImport(snapshot));
    }
  } catch {
    return parsed;
  }
  return err(parsed.error);
}

export function filterDuplicateProductImportChildren(
  existing: ProductImportChild[],
  incoming: ProductImportChild[],
) {
  const references = new Set(existing.map(referenceKey).filter((value) => value.length > 0));
  const importIds = new Set(existing.map((child) => child.importId));
  const accepted: ProductImportChild[] = [];
  let skippedCount = 0;
  for (const child of incoming) {
    const reference = referenceKey(child);
    if (reference && references.has(reference)) {
      skippedCount += 1;
      continue;
    }
    if (reference) references.add(reference);
    const importId = uniqueImportId(child.importId, importIds);
    importIds.add(importId);
    accepted.push(importId === child.importId ? child : { ...child, importId });
  }
  return { accepted, skippedCount };
}

function referenceKey(child: ProductImportChild) {
  return child.values.internalReference.trim().toLocaleLowerCase("en-NG");
}

function uniqueImportId(candidate: string, used: Set<string>) {
  if (!used.has(candidate)) return candidate;
  let suffix = 2;
  while (used.has(`${candidate}-${suffix}`)) suffix += 1;
  return `${candidate}-${suffix}`;
}
```

Update mapper exports only as required for the new type import; do not change media-ignore or inventory-mode mapping semantics.

- [ ] **Step 5: Run focused domain tests and verify green**

Run: `pnpm exec vitest run src/modules/products/import/prepare.test.ts src/modules/products/import/csv.test.ts src/modules/products/import/mapper.test.ts`

Expected: PASS; direct CSV/JSON and relational mapping retain current limits and ignored-media behavior.

- [ ] **Step 6: Commit the domain preparation contract**

```bash
git add src/modules/products/import/prepare.ts src/modules/products/import/prepare.test.ts src/modules/products/import/mapper.ts src/modules/products/import/mapper.test.ts
git commit -m "feat(products): prepare appendable product imports"
```

### Task 2: Extend the import-session reducer for append, selection, and deterministic removal

**Owner:** domain-engineer

**Files:**
- Modify: `src/modules/products/import/types.ts`
- Modify: `src/modules/products/import/session.ts`
- Modify: `src/modules/products/import/session.test.ts`

**Interfaces:**
- Consumes: `ProductImportChild` and the accepted children produced by Task 1.
- Produces: `selectedImportIds: string[]` on `ProductImportSessionState`.
- Produces actions: `{ type: "append"; children; ignoredAssetCount }`, `{ type: "toggle-selection"; importId }`, `{ type: "select-all" }`, `{ type: "clear-selection" }`, and `{ type: "remove"; importIds }` in addition to existing actions.
- Produces selectors: `editedProductImportCount(state, importIds): number` and existing `hasUnsavedProductImportChanges(state): boolean`.

- [ ] **Step 1: Record live diffs for reducer files**

Run: `git status --short && git diff -- src/modules/products/import/types.ts src/modules/products/import/session.ts src/modules/products/import/session.test.ts`

Expected: no task-owned changes unless another worker has begun; preserve and reconcile any reported hunk.

- [ ] **Step 2: Add failing reducer tests**

Extend `session.test.ts` with concrete cases that assert:

```ts
it("appends children without replacing queue state and accumulates ignored media", () => {
  const next = productImportSessionReducer(twoChildState(), {
    type: "append", children: [{ ...twoChildState().children[0]!, importId: "child-3" }], ignoredAssetCount: 4,
  });
  expect(next.children.map((child) => child.importId)).toEqual(["child-1", "child-2", "child-3"]);
  expect(next.ignoredAssetCount).toBe(4);
  expect(next.selectedImportId).toBe("child-1");
});

it("select all targets the full queue and clear selection is explicit", () => {
  const selected = productImportSessionReducer(twoChildState(), { type: "select-all" });
  expect(selected.selectedImportIds).toEqual(["child-1", "child-2"]);
  expect(productImportSessionReducer(selected, { type: "clear-selection" }).selectedImportIds).toEqual([]);
});

it("removing an active middle row selects the next survivor and prunes selection", () => {
  const state = productImportSessionReducer(twoChildState(), { type: "select-all" });
  const next = productImportSessionReducer(state, { type: "remove", importIds: ["child-1"] });
  expect(next.children.map((child) => child.importId)).toEqual(["child-2"]);
  expect(next.selectedImportId).toBe("child-2");
  expect(next.selectedImportIds).toEqual(["child-2"]);
});

it("removing the final row selects the previous survivor, then empties the session", () => {
  const atEnd = { ...twoChildState(), selectedImportId: "child-2" };
  const previous = productImportSessionReducer(atEnd, { type: "remove", importIds: ["child-2"] });
  expect(previous.selectedImportId).toBe("child-1");
  const empty = productImportSessionReducer(previous, { type: "remove", importIds: ["child-1"] });
  expect(empty).toMatchObject({ children: [], selectedImportId: null, selectedImportIds: [] });
});

it("counts only edited entries in a requested deletion", () => {
  const dirty = productImportSessionReducer(twoChildState(), {
    type: "update-values", importId: "child-1", values: { ...firstValues, name: "Edited" },
  });
  expect(editedProductImportCount(dirty, ["child-1", "child-2"])).toBe(1);
});
```

Update `twoChildState()` to initialize `selectedImportIds: []`.

- [ ] **Step 3: Verify reducer tests fail for missing contracts**

Run: `pnpm exec vitest run src/modules/products/import/session.test.ts`

Expected: FAIL on missing `selectedImportIds`, action variants, and `editedProductImportCount`.

- [ ] **Step 4: Implement reducer transitions as pure state updates**

Add `selectedImportIds: string[]` to the session type and implement removal using the old active index and the surviving queue:

```ts
function removeChildren(state: ProductImportSessionState, importIds: string[]) {
  const removed = new Set(importIds);
  const activeIndex = state.children.findIndex((child) => child.importId === state.selectedImportId);
  const children = state.children.filter((child) => !removed.has(child.importId));
  const selectedImportId = removed.has(state.selectedImportId ?? "")
    ? children[Math.min(Math.max(activeIndex, 0), children.length - 1)]?.importId ?? null
    : state.selectedImportId;
  return {
    ...state,
    children,
    selectedImportId,
    selectedImportIds: state.selectedImportIds.filter((importId) => !removed.has(importId)),
  };
}

export function editedProductImportCount(state: ProductImportSessionState, importIds: string[]) {
  const requested = new Set(importIds);
  return state.children.filter((child) => requested.has(child.importId) && child.isDirty).length;
}
```

For append, return the original state when `children` is empty; otherwise append and add `ignoredAssetCount`. For select-all, use `state.children.map(({ importId }) => importId)` so search filtering cannot alter semantics. For toggle, ignore unknown IDs and preserve queue order in the resulting selection array.

- [ ] **Step 5: Run reducer and import-domain tests**

Run: `pnpm exec vitest run src/modules/products/import/session.test.ts src/modules/products/import/prepare.test.ts src/modules/products/import/csv.test.ts src/modules/products/import/mapper.test.ts`

Expected: PASS with append preservation, complete-queue selection, deterministic active-row choice, and dirty-count semantics covered.

- [ ] **Step 6: Commit the reducer contract**

```bash
git add src/modules/products/import/types.ts src/modules/products/import/session.ts src/modules/products/import/session.test.ts
git commit -m "feat(products): manage editable import queue state"
```

### Task 3: Build the stable shared Cloudinary upload boundary

**Owner:** ui-engineer

**Files:**
- Create: `src/components/ui/cloud-upload-button.tsx`
- Create: `src/components/ui/cloud-upload-button.test.tsx`
- Modify: `src/lib/assets/client/cloudinary-upload.ts`
- Modify: `src/lib/assets/client/cloudinary-upload.test.ts`

**Interfaces:**
- Consumes: `normalizeCloudinaryUploadResult(result)` and `UploadedCloudinaryAsset`.
- Produces: `CloudUploadStatus = "idle" | "opening" | "uploading" | "completed" | "cancelled" | "failed"`.
- Produces: `CloudUploadIssue = { code: "invalid-upload-result" | "upload-failed"; message: string }`.
- Produces: `CloudUploadButton({ folder, label, multiple?, maxFiles?, disabled?, size?, variant?, onAsset, onComplete?, onStatusChange?, onError? })` without exporting SDK types; `onAsset(asset)` returns `false` when a consumer rejects an otherwise normalized asset.

- [ ] **Step 1: Preserve the user's upload-fix work before editing**

Run: `git status --short && git diff -- src/modules/products/ui/admin/product-editor/product-images-step.tsx src/modules/products/ui/admin/product-editor/product-images-step.test.tsx && git diff -- src/lib/assets/client/cloudinary-upload.ts src/lib/assets/client/cloudinary-upload.test.ts`

Expected: the known user change keeps the product uploader mounted and adds its regression test. Treat that behavior as required input to this task; do not overwrite it.

- [ ] **Step 2: Write the shared-boundary component tests first**

Mock `next-cloudinary` only in `cloud-upload-button.test.tsx`, capture the SDK props, and assert the public contract:

```tsx
it("stays mounted while opening and uploading and blocks duplicate clicks", () => {
  render(<CloudUploadButton folder="laitstyles/products" label="Upload images" onAsset={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Upload images" }));
  capturedProps.onOpen?.();
  expect(screen.getByRole("button", { name: "Opening image uploader" })).toBeDisabled();
  expect(screen.getByTestId("cloudinary-sdk-boundary")).toBeInTheDocument();
  capturedProps.onQueuesStart?.();
  expect(screen.getByRole("button", { name: "Uploading images" })).toBeDisabled();
  expect(screen.getByTestId("cloudinary-sdk-boundary")).toBeInTheDocument();
});

it("owns common signing, format, folder, and capacity options", () => {
  render(<CloudUploadButton folder="laitstyles/categories" label="Upload image" maxFiles={1} multiple={false} onAsset={vi.fn()} />);
  expect(capturedProps.signatureEndpoint).toBe("/api/v1/admin/assets/sign");
  expect(capturedProps.options).toMatchObject({
    folder: "laitstyles/categories", multiple: false, maxFiles: 1,
    clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "avif"], sources: ["local", "camera"],
  });
});

it("normalizes assets and provider failures without leaking SDK results", () => {
  const onAsset = vi.fn();
  const onError = vi.fn();
  render(<CloudUploadButton folder="laitstyles/products" label="Upload image" onAsset={onAsset} onError={onError} />);
  capturedProps.onSuccess?.({ info: { public_id: "coat", secure_url: "https://res.cloudinary.com/store/image/upload/coat.jpg" } });
  expect(onAsset).toHaveBeenCalledWith(expect.objectContaining({ publicId: "coat" }));
  capturedProps.onError?.();
  expect(onError).toHaveBeenCalledWith({ code: "upload-failed", message: "Image upload failed. Try again." });
});

it("does not report completion when the consumer rejects a normalized asset", () => {
  const onComplete = vi.fn();
  render(<CloudUploadButton folder="laitstyles/products" label="Upload image" onAsset={() => false} onComplete={onComplete} />);
  capturedProps.onSuccess?.({ info: { public_id: "duplicate", secure_url: "https://res.cloudinary.com/store/image/upload/duplicate.jpg" } });
  capturedProps.onQueuesEnd?.();
  expect(onComplete).not.toHaveBeenCalled();
});
```

- [ ] **Step 3: Verify the component test is red**

Run: `pnpm exec vitest run src/components/ui/cloud-upload-button.test.tsx src/lib/assets/client/cloudinary-upload.test.ts`

Expected: FAIL because `CloudUploadButton`, idle lifecycle, and normalized provider error do not exist.

- [ ] **Step 4: Implement one always-mounted SDK boundary**

Implement a single unconditional `CldUploadButton` return. The component must derive accessible text from lifecycle while keeping the SDK component mounted:

```tsx
const statusLabel: Record<CloudUploadStatus, string> = {
  idle: "", opening: "Opening image uploader", uploading: "Uploading images",
  completed: "Image upload completed", cancelled: "Image upload cancelled",
  failed: "Image upload failed. Try again",
};

const accessibleLabel = status === "idle" || status === "completed" || status === "cancelled" || status === "failed"
  ? label
  : statusLabel[status];
const busy = status === "opening" || status === "uploading";

return (
  <CldUploadButton
    aria-label={accessibleLabel}
    className={buttonVariants({ size, variant })}
    data-slot="button"
    disabled={disabled || busy}
    onClose={() => setLifecycle(busy ? "cancelled" : status)}
    onError={() => reportError({ code: "upload-failed", message: "Image upload failed. Try again." })}
    onOpen={() => { appended.current = false; setLifecycle("opening"); }}
    onQueuesStart={() => setLifecycle("uploading")}
    onQueuesEnd={() => setLifecycle(appended.current ? "completed" : "cancelled")}
    onSuccess={(result) => normalizeAndReport(result)}
    options={{ multiple, maxFiles, sources: ["local", "camera"], clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "avif"], folder }}
    signatureEndpoint="/api/v1/admin/assets/sign"
  >
    <span data-testid="cloudinary-sdk-boundary">{busy ? statusLabel[status] : label}</span>
    <span aria-live="polite" className="sr-only">{status === "idle" ? "" : statusLabel[status]}</span>
  </CldUploadButton>
);
```

`setLifecycle` must update internal state and call `onStatusChange`; `normalizeAndReport` must call `normalizeCloudinaryUploadResult`, set failed/report `CloudUploadIssue` on error, and otherwise call `onAsset(asset)`. `onComplete` fires after a queue ends with at least one accepted asset. Do not conditionally return a span instead of the SDK component.

For the acceptance rule, call `onAsset(asset)` first and set `appended.current = true` only when
the callback does not return `false`. This lets product media reject duplicates or over-capacity
assets without the shared boundary overwriting the consumer's failed feedback with `completed`.

- [ ] **Step 5: Run shared upload tests**

Run: `pnpm exec vitest run src/components/ui/cloud-upload-button.test.tsx src/lib/assets/client/cloudinary-upload.test.ts`

Expected: PASS; the widget boundary remains mounted through opening/uploading and all public callbacks use provider-neutral values.

- [ ] **Step 6: Commit the shared boundary**

```bash
git add src/components/ui/cloud-upload-button.tsx src/components/ui/cloud-upload-button.test.tsx src/lib/assets/client/cloudinary-upload.ts src/lib/assets/client/cloudinary-upload.test.ts
git commit -m "feat(ui): centralize Cloudinary upload lifecycle"
```

### Task 4: Migrate every production upload consumer and enforce the boundary

**Owner:** ui-engineer

**Files:**
- Modify: `src/modules/products/ui/admin/product-editor/product-images-step.tsx`
- Modify: `src/modules/products/ui/admin/product-editor/product-images-step.test.tsx`
- Modify: `src/modules/products/ui/admin/product-editor/variant-product-fields.tsx`
- Create: `src/modules/products/ui/admin/product-editor/variant-product-fields.test.tsx`
- Modify: `src/modules/products/ui/admin/catalogue/category-editor-dialog.tsx`
- Modify: `src/modules/products/ui/admin/catalogue/catalogue-structure-workspace.test.tsx`
- Modify: `src/features/admin/settings/store-identity-section.tsx`
- Create: `src/features/admin/settings/store-identity-section.test.tsx`
- Modify: `scripts/checks/architecture-guard.mjs`
- Modify: `src/modules/admin-persistence-boundary.test.ts`

**Interfaces:**
- Consumes: Task 3 `CloudUploadButton`, `UploadedCloudinaryAsset`, `CloudUploadStatus`, and `CloudUploadIssue`.
- Preserves folders: products `laitstyles/products`, variants `laitstyles/products/variants`, categories `laitstyles/categories`, store identity `laitstyles/brand`.
- Preserves capacities: product media `multiple=true, maxFiles=remainingSlots`; all other consumers `multiple=false, maxFiles=1`.
- Produces guard rule `direct-cloudinary-upload-import` for any production `CldUploadButton` import outside `src/components/ui/cloud-upload-button.tsx`.

- [ ] **Step 1: Re-read live versions of all consumers and protect user edits**

Run: `git status --short && git diff -- src/modules/products/ui/admin/import/product-import-queue.tsx src/modules/products/ui/admin/product-editor/product-images-step.tsx src/modules/products/ui/admin/product-editor/product-images-step.test.tsx src/modules/products/ui/admin/product-editor/variant-product-fields.tsx src/modules/products/ui/admin/catalogue/category-editor-dialog.tsx src/features/admin/settings/store-identity-section.tsx`

Expected: known edits in queue/images are visible. Keep the user's always-mounted image fix and its test intent, then replace only the provider-specific code with the shared boundary.

- [ ] **Step 2: Add failing consumer and guard assertions**

In focused consumer tests, mock `@/components/ui/cloud-upload-button` rather than `next-cloudinary`, click the rendered controls, invoke `onAsset`, and assert:

```tsx
expect(cloudUploadProps.folder).toBe("laitstyles/products");
expect(cloudUploadProps.maxFiles).toBe(12);
expect(cloudUploadProps.multiple).toBe(true);
cloudUploadProps.onAsset({ publicId: "coat", url: "https://res.cloudinary.com/store/image/upload/coat.jpg", width: 1200, height: 1500, format: "jpg", bytes: 2048 });
expect(screen.getByAltText(/featured view 1/i)).toBeInTheDocument();
```

Add equivalent exact folder/single-file assertions for variant, category, and brand. Extend `admin-persistence-boundary.test.ts` with:

```ts
it("allows CldUploadButton only inside the shared upload boundary", () => {
  const violations = classifyArchitectureGraph({
    files: {
      "src/components/ui/cloud-upload-button.tsx": 'import { CldUploadButton } from "next-cloudinary";',
      "src/modules/products/ui/admin/example.tsx": 'import { CldUploadButton } from "next-cloudinary";',
    },
  });
  expect(violations).toContainEqual(expect.objectContaining({
    rule: "direct-cloudinary-upload-import",
    importer: "src/modules/products/ui/admin/example.tsx",
  }));
  expect(violations).not.toContainEqual(expect.objectContaining({
    importer: "src/components/ui/cloud-upload-button.tsx",
  }));
});
```

- [ ] **Step 3: Run focused tests and verify red**

Run: `pnpm exec vitest run src/modules/products/ui/admin/product-editor/product-images-step.test.tsx src/modules/products/ui/admin/product-editor/variant-product-fields.test.tsx src/modules/products/ui/admin/catalogue/catalogue-structure-workspace.test.tsx src/features/admin/settings/store-identity-section.test.tsx src/modules/admin-persistence-boundary.test.ts`

Expected: FAIL while consumers import the SDK directly and the guard does not classify the prohibited edge.

- [ ] **Step 4: Replace provider-specific consumer code with normalized callbacks**

Each consumer must import `CloudUploadButton` and receive `UploadedCloudinaryAsset` directly. For product images, preserve the existing `addUploadedImage(image)` logic and render:

```tsx
<CloudUploadButton
  disabled={remainingSlots === 0}
  folder="laitstyles/products"
  label="Upload images"
  maxFiles={remainingSlots}
  multiple
  onAsset={(image) => {
    const accepted = addUploadedImage(image);
    if (!accepted) setUploadStatus("failed");
    return accepted;
  }}
  onError={(issue) => setFeedback(issue.message)}
  onStatusChange={setUploadStatus}
  size="lg"
  variant="outline"
/>
```

Variants pass the current row index/field key through a closure and keep `setValue(variant.variants.${index}.image, ...)`. Category and store identity pass only the normalized asset URL/public ID into their existing local form state. Remove consumer imports of SDK result types, `CldUploadButton`, `finishCloudinaryUploadQueue`, and `normalizeCloudinaryUploadResult`. Keep consumer-specific live-region copy and domain rules.

- [ ] **Step 5: Add the narrow direct-import architecture rule**

Inside `classifyArchitectureGraph`, inspect parsed imports and emit only for the named SDK binding outside the boundary:

```js
if (
  isProductionSource(file) &&
  file !== "src/components/ui/cloud-upload-button.tsx" &&
  imports.some(({ specifier, bindings = [] }) =>
    specifier === "next-cloudinary" && bindings.includes("CldUploadButton"))
) {
  violations.push({
    rule: "direct-cloudinary-upload-import",
    importer: file,
    imported: "next-cloudinary",
    detail: "Production upload widgets must use CloudUploadButton.",
  });
}
```

If `parseModuleSyntax` does not expose named bindings, use the guard's comment-stripped source and an exact named-import regular expression; do not reject `CldImage` in `cloud-image.tsx`, server-side `cloudinary`, or type-only test imports.

- [ ] **Step 6: Run migrated consumer tests and architecture guard**

Run: `pnpm exec vitest run src/components/ui/cloud-upload-button.test.tsx src/modules/products/ui/admin/product-editor/product-images-step.test.tsx src/modules/products/ui/admin/product-editor/variant-product-fields.test.tsx src/modules/products/ui/admin/catalogue/catalogue-structure-workspace.test.tsx src/features/admin/settings/store-identity-section.test.tsx src/modules/admin-persistence-boundary.test.ts && pnpm check:architecture`

Expected: PASS; `rg -n "CldUploadButton" src --glob "*.ts" --glob "*.tsx"` reports the production import only in `cloud-upload-button.tsx` plus permitted tests.

- [ ] **Step 7: Commit the complete consumer cutover**

```bash
git add src/components/ui/cloud-upload-button.tsx src/modules/products/ui/admin/product-editor/product-images-step.tsx src/modules/products/ui/admin/product-editor/product-images-step.test.tsx src/modules/products/ui/admin/product-editor/variant-product-fields.tsx src/modules/products/ui/admin/product-editor/variant-product-fields.test.tsx src/modules/products/ui/admin/catalogue/category-editor-dialog.tsx src/modules/products/ui/admin/catalogue/catalogue-structure-workspace.test.tsx src/features/admin/settings/store-identity-section.tsx src/features/admin/settings/store-identity-section.test.tsx scripts/checks/architecture-guard.mjs src/modules/admin-persistence-boundary.test.ts
git commit -m "refactor(ui): route uploads through shared boundary"
```

### Task 5: Add append, selection, deletion, and reset behavior to the import UI

**Owner:** ui-engineer

**Files:**
- Modify: `src/modules/products/ui/admin/import/product-import-dialog.tsx`
- Modify: `src/modules/products/ui/admin/import/product-import-session.tsx`
- Modify: `src/modules/products/ui/admin/import/product-import-session.test.tsx`
- Modify: `src/modules/products/ui/admin/import/product-import-queue.tsx`
- Create: `src/modules/products/ui/admin/import/product-import-queue.test.tsx`

**Interfaces:**
- Consumes: Task 1 `prepareProductImport` and `filterDuplicateProductImportChildren`; Task 2 reducer actions/selectors.
- Produces: `ProductImportSession` callback `onSessionEmpty(): void` that returns the existing dialog to its initial picker without closing it.
- Produces queue callbacks: `onAddFile(file)`, `onToggleSelection(importId)`, `onSelectAll()`, `onClearSelection()`, `onDelete(importIds)`.
- Preserves existing editor save callbacks as the only persistence path.

- [ ] **Step 1: Snapshot the live queue/session files before reconciliation**

Run: `git status --short && git diff -- src/modules/products/ui/admin/import/product-import-queue.tsx src/modules/products/ui/admin/import/product-import-session.tsx src/modules/products/ui/admin/import/product-import-session.test.tsx src/modules/products/ui/admin/import/product-import-dialog.tsx`

Expected: the user's queue footer removal is visible. Do not restore deleted copy or overwrite later user edits; build the new toolbar and feedback against the live file.

- [ ] **Step 2: Write failing component tests for all queue semantics**

Use Testing Library/user-event to cover these exact outcomes:

```tsx
it("select all includes rows hidden by search and search does not clear selection", async () => {
  render(<QueueHarness />);
  await user.type(screen.getByRole("searchbox", { name: "Search imported products" }), "First");
  await user.click(screen.getByRole("button", { name: "Select all imported products" }));
  expect(screen.getByRole("checkbox", { name: /select first import/i })).toBeChecked();
  await user.clear(screen.getByRole("searchbox", { name: "Search imported products" }));
  expect(screen.getByRole("checkbox", { name: /select second import/i })).toBeChecked();
});

it("appends accepted children, reports skipped duplicates, and accumulates ignored media", async () => {
  render(<SessionHarness appendFile={duplicateAndNewFile} />);
  await user.upload(screen.getByLabelText("Add another product import file"), duplicateAndNewFile);
  expect(screen.getByText("1 product appended; 1 duplicate skipped.")).toBeInTheDocument();
  expect(screen.getByText(/3 media assets were ignored/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /first import/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /new import/i })).toBeInTheDocument();
});

it("keeps the existing queue and selection when an appended file fails", async () => {
  render(<SessionHarness appendFile={malformedFile} />);
  await user.click(screen.getByRole("checkbox", { name: /select first import/i }));
  await user.upload(screen.getByLabelText("Add another product import file"), malformedFile);
  expect(screen.getByText("Import JSON must be valid JSON.")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: /select first import/i })).toBeChecked();
});

it("removes an untouched or unchanged persisted row without a persistence mutation", async () => {
  const save = vi.fn();
  render(<SessionHarness onSave={save} />);
  await user.click(screen.getByRole("button", { name: "Delete First import" }));
  expect(screen.queryByText("Discard edited import drafts?")).not.toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});

it("uses one confirmation with the edited count for bulk deletion", async () => {
  render(<SessionHarness dirtyIds={["child-1"]} />);
  await user.click(screen.getByRole("button", { name: "Select all imported products" }));
  await user.click(screen.getByRole("button", { name: "Delete selected imported products" }));
  expect(screen.getByText("1 edited draft will be lost.")).toBeInTheDocument();
});

it("returns to the same dialog file picker after deleting the final row", async () => {
  render(<ProductImportDialog open onOpenChange={vi.fn()} />);
  await user.upload(screen.getByLabelText("Choose a CSV or JSON import file"), oneProductFile);
  await user.click(screen.getByRole("button", { name: /delete only import/i }));
  expect(screen.getByLabelText("Choose a CSV or JSON import file")).toBeInTheDocument();
});
```

- [ ] **Step 3: Run queue/session tests and verify red**

Run: `pnpm exec vitest run src/modules/products/ui/admin/import/product-import-queue.test.tsx src/modules/products/ui/admin/import/product-import-session.test.tsx`

Expected: FAIL because toolbar callbacks, append feedback, selection controls, dirty-delete confirmation, and empty reset are absent.

- [ ] **Step 4: Route initial files through the shared preparation contract**

In `product-import-dialog.tsx`, replace parser/fallback duplication with:

```ts
const prepared = prepareProductImport({ fileName: file.name, size: file.size, text: await file.text() });
if (!prepared.ok) {
  setIssue(prepared.error);
  return;
}
if (!prepared.value.children.length) {
  setIssue({ code: "invalid-import", message: "The import file does not contain any products." });
  return;
}
setIssue(null);
setSession({
  source: file.name.toLocaleLowerCase("en-NG").endsWith(".csv") ? "csv" : "json",
  children: prepared.value.children,
  selectedImportId: prepared.value.children[0]?.importId ?? null,
  selectedImportIds: [],
  ignoredAssetCount: prepared.value.ignoredAssetCount,
});
```

Pass `onSessionEmpty={() => { setSession(null); setIssue(null); }}` to `ProductImportSession`.

- [ ] **Step 5: Implement append and deletion orchestration in the session**

On append, read the file, prepare it, filter it against `state.children`, leave state unchanged on failure, dispatch accepted children on success, and announce counts. Deletion requests calculate `editedProductImportCount`; dispatch immediately when zero or open one `AlertDialog` when positive. Its description must be exactly singular/plural aware:

```tsx
<AlertDialogDescription>
  {editedDeleteCount === 1
    ? "1 edited draft will be lost. Saved catalogue products will remain."
    : `${editedDeleteCount} edited drafts will be lost. Saved catalogue products will remain.`}
</AlertDialogDescription>
```

After every removal, call `onSessionEmpty()` when no child remains; clear append issue/feedback so the initial picker has no session-only residue. Save/publish handlers must remain untouched.

- [ ] **Step 6: Render equivalent desktop and compact queue operations**

Use `Checkbox` with `aria-label={`Select ${name}`}`, textual status via `queueStatusLabel`, an individual HugeIcons Delete button with `aria-label={`Delete ${name}`}`, and toolbar buttons named exactly `Add another file`, `Select all`, `Clear selection`, and `Delete selected`. The hidden file input must have label `Add another product import file`. Search filters only rendering; selection props always come from full reducer state. Compact controls must expose the same operations with at least 44px primary touch targets.

- [ ] **Step 7: Run import UI and domain regression tests**

Run: `pnpm exec vitest run src/modules/products/import/prepare.test.ts src/modules/products/import/session.test.ts src/modules/products/ui/admin/import/product-import-queue.test.tsx src/modules/products/ui/admin/import/product-import-session.test.tsx`

Expected: PASS; appends preserve entries, duplicates/blank references behave correctly, selection survives search, deletion confirmation follows dirty state, persistence is untouched, and the last deletion restores the picker.

- [ ] **Step 8: Commit the editable queue UI**

```bash
git add src/modules/products/ui/admin/import/product-import-dialog.tsx src/modules/products/ui/admin/import/product-import-session.tsx src/modules/products/ui/admin/import/product-import-session.test.tsx src/modules/products/ui/admin/import/product-import-queue.tsx src/modules/products/ui/admin/import/product-import-queue.test.tsx
git commit -m "feat(products): make import queue editable"
```

### Task 6: Add import-only unrestricted product-editor navigation

**Owner:** ui-engineer

**Files:**
- Modify: `src/modules/products/ui/admin/product-editor/product-editor-dialog.tsx`
- Modify: `src/modules/products/ui/admin/product-editor/product-editor-stepper.tsx`
- Create: `src/modules/products/ui/admin/product-editor/product-editor-navigation.test.tsx`
- Modify: `src/modules/products/ui/admin/import/product-import-session.tsx`
- Modify: `src/modules/products/ui/admin/import/product-import-session.test.tsx`

**Interfaces:**
- Produces: `ProductEditorNavigationMode = "sequential" | "unrestricted"`.
- Produces prop: `navigationMode?: ProductEditorNavigationMode`, default `"sequential"`, on `ProductEditorSurfaceProps`.
- Produces stepper props: `navigationMode`, `stepCompletion: Record<ProductEditorStep, boolean>`.
- Consumes unchanged `validateProductEditorStep`, `validateProductForPublish`, and `validateProductForSchedule` contracts.

- [ ] **Step 1: Record editor and import-session live diffs**

Run: `git status --short && git diff -- src/modules/products/ui/admin/product-editor/product-editor-dialog.tsx src/modules/products/ui/admin/product-editor/product-editor-stepper.tsx src/modules/products/ui/admin/import/product-import-session.tsx src/modules/products/ui/admin/import/product-import-session.test.tsx`

Expected: current task files and any concurrent edits are visible; preserve them and modify only navigation behavior.

- [ ] **Step 2: Write failing navigation-mode tests**

Create a real `ProductEditorSurface` harness with mocked save hook and assert:

```tsx
it("keeps ordinary creation sequential", async () => {
  render(<EditorHarness navigationMode="sequential" />);
  expect(screen.getByRole("button", { name: /review & publish/i })).toBeDisabled();
});

it("allows imported products to jump to every desktop step without marking invalid steps complete", async () => {
  render(<EditorHarness navigationMode="unrestricted" />);
  await user.click(screen.getByRole("button", { name: /review & publish/i }));
  expect(screen.getByRole("heading", { name: /review/i })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /identity/i })).not.toHaveAttribute("data-complete", "true");
});

it("exposes an accessible compact step selector only in unrestricted mode", async () => {
  render(<EditorHarness navigationMode="unrestricted" />);
  await user.click(screen.getByRole("combobox", { name: "Product editor step" }));
  await user.click(screen.getByRole("option", { name: "Pricing" }));
  expect(screen.getByRole("heading", { name: /price/i })).toBeInTheDocument();
});

it("continue still validates the active step after unrestricted jumps", async () => {
  render(<EditorHarness navigationMode="unrestricted" />);
  await user.click(screen.getByRole("button", { name: /identity/i }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
  expect(screen.getByText(/enter a product name/i)).toBeInTheDocument();
});

it.each(["Publish now", "Schedule"])("%s validates all steps and opens the first issue", async (action) => {
  render(<EditorHarness navigationMode="unrestricted" />);
  await user.click(screen.getByRole("button", { name: /review & publish/i }));
  await user.click(screen.getByRole("button", { name: action }));
  expect(screen.getByText(/choose a product type|enter a product name/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Verify navigation tests fail**

Run: `pnpm exec vitest run src/modules/products/ui/admin/product-editor/product-editor-navigation.test.tsx src/modules/products/ui/admin/import/product-import-session.test.tsx`

Expected: FAIL because the navigation mode and compact selector do not exist and completion is position-derived.

- [ ] **Step 4: Separate availability from completion**

Default `navigationMode = "sequential"`. Change `goToStep` to:

```ts
function goToStep(step: ProductEditorStep) {
  const index = productEditorSteps.indexOf(step);
  if (navigationMode === "unrestricted" || index <= highestVisited) setActiveStep(step);
}
```

Derive completion independently from the current values:

```ts
const stepCompletion = useMemo(
  () => Object.fromEntries(
    productEditorSteps.map((step) => [step, validateProductEditorStep(watchedValues, step).length === 0]),
  ) as Record<ProductEditorStep, boolean>,
  [watchedValues],
);
```

The stepper must use `stepCompletion[step]`, never `index < activeIndex`, for checkmarks/data state. Availability remains `navigationMode === "unrestricted" || index <= highestVisited`. Do not mutate `highestVisited` during a jump.

- [ ] **Step 5: Add the compact unrestricted selector and opt in only imports**

Keep the current progress label for sequential mode. In unrestricted compact mode render the existing Base UI `Select` with `aria-label="Product editor step"`, all seven labeled options, and `onValueChange={(value) => onStepChange(value as ProductEditorStep)}`. Pass `navigationMode="unrestricted"` only from `ProductImportSession`; `ProductEditorDialog` relies on the default.

- [ ] **Step 6: Run editor/import regression tests**

Run: `pnpm exec vitest run src/modules/products/ui/admin/product-editor/product-editor-navigation.test.tsx src/modules/products/ui/admin/import/product-import-session.test.tsx src/modules/products/import/session.test.ts`

Expected: PASS; desktop/compact imports can jump, ordinary creation remains gated, jumping does not falsify completion, and active/all-step validation paths remain intact.

- [ ] **Step 7: Commit navigation mode**

```bash
git add src/modules/products/ui/admin/product-editor/product-editor-dialog.tsx src/modules/products/ui/admin/product-editor/product-editor-stepper.tsx src/modules/products/ui/admin/product-editor/product-editor-navigation.test.tsx src/modules/products/ui/admin/import/product-import-session.tsx src/modules/products/ui/admin/import/product-import-session.test.tsx
git commit -m "feat(products): enable import-only step navigation"
```

### Task 7: Run scoped integration checks and repair only feature-owned failures

**Owner:** ui-engineer with domain-engineer for failures in `src/modules/products/import/**`

**Files:**
- Modify only: files already listed in Tasks 1-6 when a failing assertion proves a feature-owned defect

**Interfaces:**
- Consumes: all Task 1-6 contracts.
- Produces: a clean feature diff ready for independent review, with no direct SDK consumer and no unrelated worktree mutation.

- [ ] **Step 1: Inspect the exact feature diff and unrelated dirty files**

Run: `git status --short && git diff --stat && git diff -- docs/superpowers/plans/2026-08-01-product-import-upload-workflow.md src/components/ui/cloud-upload-button.tsx src/lib/assets/client/cloudinary-upload.ts src/modules/products/import src/modules/products/ui/admin/import src/modules/products/ui/admin/product-editor src/modules/products/ui/admin/catalogue/category-editor-dialog.tsx src/features/admin/settings/store-identity-section.tsx scripts/checks/architecture-guard.mjs src/modules/admin-persistence-boundary.test.ts`

Expected: only planned feature hunks appear in the scoped diff; storefront/checkout/order/vercel changes remain present and untouched outside it.

- [ ] **Step 2: Run all feature-focused tests together**

Run: `pnpm exec vitest run src/components/ui/cloud-upload-button.test.tsx src/lib/assets/client/cloudinary-upload.test.ts src/modules/products/import/csv.test.ts src/modules/products/import/mapper.test.ts src/modules/products/import/prepare.test.ts src/modules/products/import/session.test.ts src/modules/products/ui/admin/import/product-import-queue.test.tsx src/modules/products/ui/admin/import/product-import-session.test.tsx src/modules/products/ui/admin/product-editor/product-images-step.test.tsx src/modules/products/ui/admin/product-editor/variant-product-fields.test.tsx src/modules/products/ui/admin/product-editor/product-editor-navigation.test.tsx src/modules/products/ui/admin/catalogue/catalogue-structure-workspace.test.tsx src/features/admin/settings/store-identity-section.test.tsx src/modules/admin-persistence-boundary.test.ts`

Expected: PASS with no skipped feature test.

- [ ] **Step 3: Run static scope gates**

Run: `pnpm biome && pnpm typecheck && pnpm check:architecture`

Expected: all commands exit 0. If Biome reports unrelated warnings, record them without running repo-wide `biome:fix`; repair formatting manually with `apply_patch` in only the exact feature file reported by Biome, then rerun `pnpm biome`.

- [ ] **Step 4: Prove the upload boundary and persistence exclusions**

Run: `rg -n "CldUploadButton" src --glob "*.ts" --glob "*.tsx" && git diff --name-only -- prisma supabase src/app/api src/modules/products/server pnpm-lock.yaml package.json`

Expected: the only production `CldUploadButton` import is `src/components/ui/cloud-upload-button.tsx`; the persistence/schema/dependency diff command prints no paths.

- [ ] **Step 5: Route any evidence-driven repair back to its owning task**

If Step 2 or 3 proves a feature defect, return to Task 1 or 2 for `src/modules/products/import/**`, Task 3 or 4 for uploads/consumers/the guard, Task 5 for queue/session UI, or Task 6 for editor navigation. Apply the repair through that task's red/green cycle and repeat its exact scoped `git add`/commit command. If the combined checks already pass, create no integration-repair commit.

### Task 8: Apply the mandatory reviewer and browser gates

**Owner:** reviewer

**Files:**
- Review: all Task 1-7 files and the final Git diff
- Evidence only: repository-generated `ci-evidence/**` outputs, if produced by the configured validation scripts

**Interfaces:**
- Consumes: implementation handoff with feature commits, scoped test output, and dirty-worktree preservation evidence.
- Produces: reviewer verdict, responsive/a11y/browser evidence, completion report, and PR body; reviewer does not edit source.

- [ ] **Step 1: Verify scope, layer boundaries, and preserved dirty work**

Run: `git status --short && git diff --name-status 827839866c57f8d10698c7aa0c125a41f29f46c6...HEAD && git diff --check 827839866c57f8d10698c7aa0c125a41f29f46c6...HEAD`

Expected: planned files only in feature commits; unrelated storefront/checkout/order/system/vercel and user work remains uncommitted or separately owned; no whitespace errors. `827839866c57f8d10698c7aa0c125a41f29f46c6` is the planner-observed pre-execution HEAD and must remain the reviewer comparison base.

- [ ] **Step 2: Run repository-owned static and unit gates**

Run: `pnpm biome && pnpm typecheck && pnpm test && pnpm test:coverage && pnpm react-doctor`

Expected: required commands pass; React Doctor findings in changed scope are zero. Any repo-wide failure must be proven pre-existing with exact file/output evidence and still blocks completion when newly introduced.

- [ ] **Step 3: Run the full configured source validation**

Run: `pnpm validate:full`

Expected: the private source-backed suite produces a non-missing manifest/log and passes architecture, Biome, TypeScript, Vitest, Prisma validation, build, and other configured gates. Queued, cancelled, skipped, zero-step, or missing evidence is not a pass.

- [ ] **Step 4: Run source-backed browser validation**

Run: `pnpm validate:browser`

Expected: Playwright passes against the current source candidate, not only a public deployment.

- [ ] **Step 5: Manually inspect the required workflow matrix in both themes**

At `375x812`, `768x1024`, and `1280x800`, verify with keyboard and pointer:

- Cloudinary product, variant, category, and logo controls open, remain mounted, close with Escape, restore focus, retry after failure, and never accept duplicate clicks while busy.
- Product capacity disables at 12 without unmounting an active widget; folders and single/multiple behavior match Task 4.
- Append success/failure, case-insensitive duplicate counts, blank-reference retention, accumulated ignored-media count, search-independent selection, select/clear all, individual/bulk delete, dirty confirmation count, deterministic next/previous selection, and final-row reset.
- Saved/scheduled/published removal makes no delete request and leaves the persisted catalogue record present after reload.
- Imported editor navigation works on desktop and compact layouts; ordinary creation stays sequential; skipped invalid steps do not display completion; Continue, Publish, and Schedule show/navigate to correct issues.
- Light and dark themes have WCAG AA contrast, textual statuses, comfortable touch targets, no horizontal overflow, correct focus order, accessible checkbox/delete labels, and predictable AlertDialog focus/Escape behavior.

Expected: screenshots are generated and visually reviewed for all six viewport/theme combinations; browser console, failed requests, and production server logs contain no feature-owned error.

- [ ] **Step 6: Write the reviewer handoff**

The completion report and PR body must state implemented scope, important files, no data-engineer stage, domain/UI ownership, validations actually executed, blocked/skipped checks, required/advisory failures, prototype boundaries, explicit exclusions, dirty-worktree preservation, and any recorded override. Do not describe unexecuted browser or private-runner checks as passing.

## Self-review results

- **Spec coverage:** Tasks 3-4 cover lifecycle/configuration/normalization/all four production consumers/direct-import guard; Tasks 1-2 and 5 cover shared parsing, append preservation, duplicate/blank references, selection, deletion, persistence safety, reset, counts, errors, focusable accessible controls; Task 6 covers import-only desktop/compact navigation and validation separation; Tasks 7-8 cover all required automated and browser gates.
- **Placeholder scan:** No deferred implementation markers, unspecified error-handling steps, or unresolved command values remain; the reviewer command contains the exact planner-observed base SHA.
- **Type consistency:** `ProductImportChild`, `ProductImportSessionState.selectedImportIds`, reducer action names, `prepareProductImport`, `filterDuplicateProductImportChildren`, `CloudUploadStatus`, `CloudUploadIssue`, `UploadedCloudinaryAsset`, `ProductEditorNavigationMode`, and `navigationMode` are named consistently across producers and consumers.
- **Scope check:** One cohesive plan is appropriate because the uploader boundary and import workflow share the same admin product-editor surfaces and one reviewer/browser matrix. Prisma/Supabase/API persistence remain explicitly excluded; the data-engineer stage is skipped.

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-01-product-import-upload-workflow.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh role-appropriate subagent per task, review between tasks, and preserve the dirty-worktree baseline at every handoff. Required sub-skill: `superpowers:subagent-driven-development`.
2. **Inline Execution** — execute tasks in one session using `superpowers:executing-plans`, in batches with review checkpoints and the same role/file ownership boundaries.

The orchestrator should record the user's choice before source implementation begins.
