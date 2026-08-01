# Centralized uploads and import workflow design

**Date:** 2026-08-01

**Status:** Approved in conversation; pending written-spec review

**Scope:** Product-admin upload boundaries, import queue management, and import-only editor navigation

## Context

Laitstyles currently imports `next-cloudinary`'s `CldUploadButton` directly in several UI
components. Each consumer repeats widget lifecycle state and callbacks. This allowed the product
image editor to unmount the SDK component during `onOpen`, which caused `next-cloudinary` to destroy
the widget before the user could use it.

The product import dialog also treats its imported products as a fixed queue. Staff cannot append
another file, select or remove queue entries, or return to the file picker without closing the
dialog. Imported products use the normal editor's sequential `highestVisited` gate even though the
import has already populated most steps.

This design creates one upload boundary, makes the browser-owned import queue editable, and allows
unrestricted step navigation only while reviewing imported products.

## Goals

- Make one application component responsible for the Cloudinary upload widget lifecycle.
- Prevent consumers from repeating the unmount-during-open defect.
- Preserve domain-specific upload limits, folders, labels, and success behavior.
- Let staff append import files, select queue entries, and remove one, many, or all entries.
- Skip appended products whose internal reference already exists in the full queue.
- Return an empty queue to the import file picker.
- Let imported products jump to any editor step without weakening publish validation.
- Preserve the normal create-product wizard's sequential workflow.

## Non-goals

- Changing Cloudinary credentials, signing, persistence, or storage providers.
- Deleting persisted catalogue products when a queue entry is removed.
- Importing image/media fields from CSV or JSON.
- Persisting import-session state across reloads.
- Changing normal new-product or existing-product navigation.
- Changing product, inventory, or authentication schemas.

## 1. Shared upload boundary

Add `src/components/ui/cloud-upload-button.tsx` beside `cloud-image.tsx`. `CloudUploadButton`
becomes the only production UI component allowed to import `CldUploadButton` from
`next-cloudinary`.

The shared component owns:

- `signatureEndpoint="/api/v1/admin/assets/sign"`;
- common image formats (`png`, `jpg`, `jpeg`, `webp`, and `avif`);
- the stable widget mount for its complete open/upload/close lifecycle;
- provider event normalization through the existing Cloudinary upload helper;
- provider-neutral lifecycle values (`idle`, `opening`, `uploading`, `completed`, `cancelled`,
  and `failed`);
- accessible loading/disabled labels and duplicate-click protection;
- common error conversion without exposing SDK result types to consumers.

Consumers provide a required folder and label plus narrowly-scoped options such as single versus
multiple upload, maximum files, size/variant styling, and callbacks for each normalized asset,
queue completion, status changes, or a normalized error. The shared boundary remains mounted while
the widget is opening or uploading. Capacity may disable its button, but lifecycle state must never
conditionally remove the SDK component.

Migrate every production upload consumer, including:

- product media;
- product variant images;
- category images;
- store identity/logo uploads.

Consumers continue to own product rules such as the 12-image limit, cover/detail assignment,
variant association, and consumer-specific feedback. A repository guard or focused architecture
test rejects new direct `CldUploadButton` imports outside the shared boundary.

## 2. Editable import queue

### Selection and row actions

Each queue entry receives a checkbox and an individual Delete action. A queue toolbar provides:

- **Add another file**;
- **Select all** / **Clear selection**;
- **Delete selected**.

Select all targets the complete queue, not only search-filtered entries. Search changes visibility
only and does not clear selection. The existing `ready` suffix is replaced by selection/delete
controls. Meaningful persistence and transient states such as saving, failed, draft, scheduled, and
published remain visible and are not conveyed by colour alone.

Selection is browser-owned import-session state. It uses import IDs and is pruned whenever entries
are removed. Desktop and compact/mobile queue controls expose the same operations with accessible
names and comfortable touch targets.

### Deletion semantics

Deleting a queue entry never deletes a persisted catalogue product.

- An untouched imported entry may be removed immediately.
- An unchanged saved, scheduled, or published entry may be removed immediately; its catalogue
  record remains.
- An entry with unsaved edits requires confirmation before it is removed.
- A bulk deletion containing any edited entry uses one confirmation that states how many edited
  drafts will be lost.

After deletion, the active entry moves to the next surviving item, or to the previous item when the
last row was removed. If no entries remain, the session ends and the same dialog returns to its
initial CSV/JSON file picker. This reset clears queue selection and session-only issues.

### Appending files and duplicates

Add another file uses the same file-size, row-count, parsing, mapping, and ignored-media rules as
the initial import. Successfully mapped children append to the existing queue.

Duplicate detection compares non-empty internal references after trimming and case-folding against
the full existing queue and earlier accepted rows from the new file. A duplicate is skipped; it
does not replace or merge the existing entry. Products without an internal reference remain because
they cannot be identified safely. The UI reports appended and skipped counts. A parse failure is
shown inline and leaves the existing queue intact.

The ignored-media count accumulates across successfully appended files.

## 3. Import-only workflow navigation

`ProductEditorSurface` receives an explicit navigation mode, preferably
`navigationMode: "sequential" | "unrestricted"`, defaulting to `"sequential"`.
`ProductImportSession` selects `"unrestricted"`; normal creation and ordinary existing-product
editing keep the default.

In unrestricted mode:

- every workflow step is immediately available on desktop;
- compact/mobile presentation exposes an accessible step selector instead of only a progress label;
- jumping does not validate or mark skipped steps complete;
- completion indicators are derived from each step's current validation result rather than its
  position relative to the active step;
- Continue still validates the active step;
- Publish and Schedule still validate all required steps and navigate to the first issue.

The availability rule and completion rule remain separate. Opening Review must not make invalid
earlier steps appear complete.

## 4. State and data flow

The import queue remains local browser state managed by the import-session reducer. Extend its
actions to append mapped children, toggle/select/clear selection, and remove entries while choosing
a deterministic next active entry. File parsing and duplicate identification remain client-safe
product-import logic rather than component-local ad hoc code.

No API, Prisma, Supabase, TanStack Query, or server persistence changes are required. Existing
product save operations remain authoritative. Queue removal only forgets the browser-session entry.

## 5. Error handling and accessibility

- Cloudinary script/widget failures produce a normalized error and leave the upload control usable
  for retry.
- Import append errors preserve the existing queue and selection.
- Dirty-entry deletion uses the existing accessible confirmation-dialog pattern.
- Checkbox labels include the product name; icon-only deletion controls have accessible names.
- Status is textual as well as visual.
- Keyboard users can select, delete, append, search, and change workflow steps.
- Focus returns predictably after confirmation, queue reset, and compact step selection.

## 6. Testing and validation

Test-first coverage must include:

- the shared uploader remains mounted after `onOpen` and through upload lifecycle changes;
- common configuration and normalized result/error callbacks;
- all production consumers use the shared boundary and retain their folders/limits;
- appended files preserve existing queue entries;
- duplicate internal references are skipped case-insensitively;
- blank internal references are retained;
- select all includes filtered-out entries;
- individual and bulk deletion choose the correct next active item;
- only edited entries require confirmation;
- saved/published queue removal leaves persistence untouched;
- deleting the final entry returns to the file picker;
- unrestricted navigation is import-only on desktop and compact layouts;
- jumping does not falsify step-completion state;
- publish/schedule validation remains unchanged.

Run the repository's scope-relevant unit/component checks, Biome, TypeScript, architecture guards,
React Doctor, build, and source-backed browser validation. Browser review covers Cloudinary widget
open/close/focus/Escape behavior, queue selection/deletion, import reset, and workflow navigation at
375x812, 768x1024, and 1280x800 in both themes.

## Explicit exclusions and preservation

This work must preserve unrelated dirty-worktree changes, including current storefront/checkout
work and the user's in-progress edits in the import queue and product images step. It must not turn
the import queue into a server-side batch job, change product persistence semantics, or expand into
catalogue deletion.
