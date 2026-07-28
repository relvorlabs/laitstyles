# Product Creation, Browser Draft Import, and Catalogue Structure — Design

## Status

Design approved by the user on 2026-07-28. No implementation has started.

This specification controls three connected workstreams:

1. repair signed Cloudinary uploads and product-form feedback;
2. add a browser-only JSON/CSV product draft session that reuses the canonical product editor;
3. replace the combined taxonomy dialog with dedicated, responsive Category and Collection CRUD workspaces.

## Context and confirmed evidence

The product editor opens Cloudinary's widget, but an upload never reaches a successful product-form preview. Static root-cause tracing found a contract mismatch at the signing boundary:

- `next-cloudinary@6.17.5` parses the signing response and calls its widget callback with `result.signature`;
- `src/app/api/v1/admin/assets/sign/route.ts` returns `{ signature }` through `handleApiRequest`, which serializes `{ data: { signature } }`;
- the widget therefore receives an undefined signature, does not complete successfully, and `ProductImagesStep.handleUploadSuccess` never appends the uploaded media to React Hook Form.

The remainder of the product association path already exists. A successful upload result can be normalized into editor media, and an explicit product save later upserts `cloudinary_assets` metadata and creates `product_media` associations. Uploading a binary alone is not a product database write.

The sample `scripts/seed/storefront-catalog-snapshot.json` is a relational snapshot rather than a flat product array. It contains products plus separate taxonomy, variants, stock, measurements, channels, media, and asset tables. Production UI must not import the migration-only seed implementation from `scripts/**`; it needs a client-safe mapper under the Products module.

The current Category/Collection manager is a compact shared dialog under legacy admin Inventory composition. The approved replacement gives catalogue structure a dedicated admin workspace. The existing data model already has Category `image_url` and ordering fields. Collections remain text/domain records whose visual previews derive from their assigned products.

## Goals

- Make signed product and Category uploads complete reliably and provide explicit progress, success, cancellation, and failure feedback.
- Preview successful product uploads immediately in the current product form and associate their metadata only when that product is explicitly persisted.
- Parse JSON or CSV into editable product drafts without uploading assets, creating records, or publishing anything during import.
- Preserve all three inventory modes: `unique`, `stocked`, and `variant`.
- Let a parent browser session own multiple child product drafts, retain per-child edits, and navigate directly or with Previous/Next controls.
- Allow each child to use the existing Save draft, Schedule, and Publish behavior independently.
- Replace the taxonomy dialog with the approved image-led Category workspace and product-derived editorial Collection workspace.
- Keep product editor taxonomy choices synchronized with Category and Collection server truth.
- Meet the repository's accessibility, responsive, test, and validation gates.

## Non-goals

- No automatic database write, bulk save, bulk publish, or taxonomy creation occurs when a file is selected or parsed.
- Imported media rows, Cloudinary/Pexels assets, image URLs, public IDs, provider metadata, and variant image references are never mapped into editor state.
- Import drafts are not stored in Prisma, Supabase, Server Actions, Route Handlers, localStorage, sessionStorage, or IndexedDB. They live only in the active browser component tree.
- Closing or reloading an unsaved import session does not preserve it.
- No image upload is added to Collections. Collection previews come from member product covers.
- No seed-script code is imported into `src/**`.
- No unrelated architecture migration, checkout/payment work, or legacy cleanup is included.
- No Cloudinary binary deletion/garbage-collection system is introduced in this scope.

## Architecture

### 1. Cloudinary signing and upload boundary

The signing endpoint is a provider-protocol adapter and must return Cloudinary's exact top-level response contract:

```json
{ "signature": "..." }
```

Authentication, request parsing, server-only secret access, request IDs, and safe error mapping remain required. The endpoint's successful response is an intentional exception to the application's standard `{ data }` success envelope because the installed third-party widget consumes the response directly. This exception must be documented in the route test.

A shared client upload normalizer validates that a success event contains non-empty `public_id` and `secure_url` before returning the asset reference used by forms. Product and Category UI share the normalized upload status vocabulary but own their domain form updates separately.

Product upload data flow:

```text
Cloudinary widget
  -> POST signed parameters to /api/v1/admin/assets/sign
  -> top-level signature response
  -> direct binary upload to Cloudinary
  -> validated success metadata
  -> append ProductEditorMedia to the active form
  -> explicit Save draft / Schedule / Publish
  -> product command upserts asset metadata and product_media relation
```

The UI exposes opening, uploading, completed, cancelled, and failed states through an accessible live region. A failure or product-save error retains current form values and any successful upload preview so the user can retry.

### 2. Browser-only import session

New import code belongs in the Products module, not legacy `src/features/**` and not `scripts/**`. It consists of three independently testable units:

- a format detector/parser for JSON and CSV;
- a source-to-`ProductEditorValues` normalizer;
- an `ImportDraftSession` state owner used by admin Products UI.

`ImportDraftSession` owns:

```ts
type ImportDraftChild = {
  importId: string;
  sourceIndex: number;
  values: ProductEditorValues;
  issues: ProductEditorIssue[];
  persistence: "unsaved" | "saving" | "saved-draft" | "scheduled" | "published" | "failed";
};

type ImportDraftSession = {
  fileName: string;
  children: ImportDraftChild[];
  activeImportId: string;
  dirtyImportIds: Set<string>;
};
```

The state stays in the active client component tree. Selecting or parsing a file makes no request to an application write endpoint. Each child renders through the canonical product editor form and validation schemas; the queue adds orchestration rather than copying product fields or business rules.

An explicit Save draft, Schedule, or Publish action sends only the active child's `ProductEditorValues` through the existing product mutation transport. A successful result marks that child with its persisted status and retains the rest of the queue. One failure never discards or blocks other children.

Closing an edited session requires confirmation and states that unsaved imported edits will be lost. Browser reload has the same documented limitation.

### 3. JSON mapping

The parser accepts either:

- a direct array with one object per product, using the same named scalar fields as the CSV contract while expressing `variants` and `measurements` as JSON arrays rather than encoded strings; or
- the relational snapshot shape demonstrated by `storefront-catalog-snapshot.json`.

For the relational shape, the mapper indexes referenced tables and joins them by IDs:

- product `category_id` and `collection_id` resolve to managed names;
- product variants group by `product_id`;
- stock levels group by product and optional variant;
- measurements group by product and optional variant;
- product channels group by product;
- prices, fulfilment fields, inventory references, and mode-specific values normalize into the canonical editor units.

Missing referenced rows produce addressable import issues. They are not silently invented or dropped. Media and asset tables are intentionally not indexed for editor output. Product `media` is always `[]`, and every variant `image` is always `null` regardless of source content.

### 4. CSV mapping

CSV uses one row per product. Ordinary scalar fields use named columns. Nested `variants` and `measurements` use JSON-encoded cells. The parser reports malformed nested JSON against the exact row and column.

The CSV contract supports the same inventory modes and editor fields as JSON. Image/asset columns are ignored if present and reported as intentionally excluded in the import summary. The committed implementation documentation must include an exportable CSV template and one example row for each inventory mode.

### 5. Catalogue structure workspace

Categories and Collections move to a dedicated admin catalogue-structure route under Products-module UI ownership. Inventory links to this workspace instead of opening the legacy combined taxonomy dialog.

Both screens use TanStack Query as server truth. Local component state owns only transient interaction state such as open editors, draft field values, upload progress, filters, and reorder intent. Mutations prevent duplicate submission and invalidate taxonomy, Products, Inventory, and storefront-dependent queries when relevant.

#### Categories

The approved Category screen is an image-led editorial grid with:

- name, slug, storefront order, connected-product count, and readiness state;
- Cloudinary-backed cover preview and explicit missing-image state;
- search and ordering controls;
- focused create/edit UI for name, image, and order;
- safe delete action disabled or rejected while products are connected;
- responsive behavior that collapses the grid and controls without horizontal overflow.

A Cloudinary success updates only the open Category form preview. `catalogue_categories.image_url` changes only after the Category mutation succeeds. Abandoning the editor does not update the Category record.

The screen's “visible/hidden” language represents storefront readiness derived from existing facts (cover availability, product usage, and ordering); it does not introduce an undocumented publication lifecycle field.

#### Collections

The approved Collection screen uses full-width editorial story cards rather than a dense table. Each card derives a collage from assigned product covers and includes name, slug, connected-product count, ordering/readiness, and CRUD entry points.

The focused Collection editor manages name, product membership, and storefront order. When no products are assigned, the card shows an explicit empty-canvas state. Collections do not receive a separate upload field. Delete remains blocked until product membership is empty.

## Error handling and safeguards

### Uploads

- Missing signing configuration returns a safe provider-unconfigured error without exposing secrets.
- Non-successful signing responses and malformed Cloudinary results become visible upload failures.
- Cancellation is distinct from failure.
- A normalized success requires both `public_id` and `secure_url`.
- The upload button cannot start duplicate concurrent submissions for the same form control.

### Imports

- File-level errors cover unreadable input, invalid JSON/CSV, unsupported root shape, zero products, files larger than 10 MiB, and files containing more than 1,000 products.
- Product-level errors identify source row/index, editor step, path, and message.
- Relational reference failures name the missing table/reference.
- CSV nested-cell errors identify the row and column.
- Ignored asset fields are summarized explicitly.
- A failed child persistence action retains that child's edits and queue position.
- Session dismissal warns when any unsaved child is dirty.

### Taxonomy CRUD

- Duplicate names/slugs, missing records, failed image uploads, failed mutations, and in-use deletion appear inline.
- Create/edit/reorder controls expose pending state and prevent duplicate actions.
- Reordering has keyboard controls in addition to any pointer/drag affordance.
- Query invalidation keeps editor choices, Inventory filters, and catalogue structure consistent.

## Ownership and sequencing

1. **Bugfix diagnosis and domain transport**: reproduce the Cloudinary network failure, fix the signing response contract, and add its route/normalizer tests.
2. **Products domain/client contract**: add import schemas, parsers, relational mapper, CSV contract, and focused unit tests.
3. **Data engineer only if required**: the approved design uses existing Category `image_url` and does not require a schema change. Any later persistence-field proposal must stop and return through design review.
4. **UI engineer**: implement the shared import session and canonical editor integration, then the Category and Collection workspaces using the approved visual directions.
5. **Reviewer**: run all required source, browser, accessibility, responsive, and diff gates.

Existing files under `src/features/admin/**` may receive scoped bug fixes or be migrated, but new import and catalogue-structure capabilities belong under `src/modules/products/**` according to current architecture doctrine.

## Testing and acceptance criteria

Implementation follows test-driven development. Required automated coverage includes:

- signing endpoint returns a top-level signature and preserves authentication/error behavior;
- upload normalization accepts valid Cloudinary success metadata and rejects incomplete results;
- product upload success appears in the form and later persists the asset/media association;
- relational JSON joins all three inventory modes correctly;
- imported media and variant images are always empty;
- CSV parses scalar fields plus JSON-encoded variants and measurements;
- invalid files, broken references, and malformed nested cells produce addressable errors;
- switching child products preserves independent edits and validation state;
- only explicit per-child Save draft, Schedule, or Publish calls the server;
- one child failure does not modify other children;
- Category create/edit/reorder/delete and image save behavior;
- Collection create/edit/membership/reorder/delete and product-derived previews;
- mutation pending/error states and required cache invalidation.

Browser acceptance must verify:

- the real Cloudinary signing request, upload success callback, image preview, and saved product association;
- JSON and CSV import sessions with multiple inventory modes;
- direct and Previous/Next product navigation;
- session close confirmation and retained edits after a child mutation failure;
- Category image upload plus save/cancel behavior;
- Collection empty and populated editorial previews;
- keyboard order, focus management, accessible names, live status, Escape/close behavior, and no console or failed-request regressions;
- 375×812, 768×1024, and 1280×800 viewports with no horizontal page overflow.

The reviewer runs focused checks during implementation and the repository-owned completion gates:

```bash
pnpm validate:full
pnpm validate:browser
```

No check may be reported as passing unless it was actually executed with fresh evidence.

## Known limitations

- Unsaved import sessions are intentionally lost on reload or confirmed dismissal.
- Files never import images; a staff user must upload actual product photography manually.
- Direct Cloudinary uploads can leave provider-side orphaned binaries when a form is abandoned; remote garbage collection is outside this scope.
- Static inspection establishes the high-confidence signing mismatch, but the implementation phase must reproduce it in the browser/network trace before applying the fix.
- The architecture migration tracker contains stale phase wording relative to merged Phase 7 work. Product-module ownership is nevertheless established; this task must not expand into migration tracker reconciliation unless separately authorized.
