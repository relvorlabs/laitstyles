# Phase 9 Admin Promotions UI Ownership Cutover Design

**Date:** 2026-08-01  
**Status:** Approved migration-only design; implementation and exact-head acceptance are unexecuted.  
**Scope:** Phase 9 retirement of one legacy Promotions UI file.

## Context and decision

The coupon workspace remains at
src/features/admin/promotions/promotions-workspace.tsx, despite the canonical Promotions module
already owning its types/schema, typed browser API and TanStack hooks, API route, and server coupon
operations. This makes the UI's domain ownership unclear.

The approved decision is a two-path cutover: move that file exactly to
src/modules/promotions/ui/admin/promotions-workspace.tsx, then change the sole import in
src/app/admin/promotions/page.tsx. Promotions owns the coupon UI; admin is its staff-facing UI
context, not a separate business domain. The route stays a thin Server Component that authorizes,
loads initial data, and composes module UI.

The source baseline is 22,000 bytes, 584 lines, SHA-256
3C6E4D561707BCCD536489CDF41679BE9F0F6B93D5D8EC5DD834806F6A66775F. The destination is absent,
the scoped paths are clean, and the route is the one external consumer. The active branch,
agent/storefront-checkout-delivery-promotions-redesign, has unrelated dirty and untracked work
which this slice must preserve.

## Considered approaches

1. Keep the UI in legacy composition: rejected because it retains the Phase 9 ownership edge.
2. Move it with a shim, alias, barrel, forwarding import, or duplicate: rejected because one
   consumer needs no compatibility edge and legacy ownership would remain.
3. Move and refactor the large component: rejected because it prevents an identity-preserving
   migration diff and expands behaviour risk.
4. Chosen vertical slice: byte-identical move plus the one route import cutover.

## Architecture, interface, and existing flow

| Layer | Responsibility |
| --- | --- |
| src/app/admin/promotions | Existing session/capability checks, initial server read, and UI composition. |
| src/modules/promotions/ui/admin | Moved client coupon workspace only. |
| src/modules/promotions/client | Existing typed API calls, query cache, and mutations; unchanged. |
| src/modules/promotions/schema, types, server | Existing contracts, validation, coupon queries/commands, and Prisma access; unchanged. |
| src/app/api/v1/admin/promotions/coupons | Existing authenticated HTTP adapter; unchanged. |

The named export and prop contract remain exactly:

    PromotionsWorkspace({ canManage, initialData }: {
      canManage: boolean;
      initialData: PromotionCouponList;
    })

The unchanged flow is:

    PromotionsPage
      -> getCurrentSession + hasCapability + listPromotionCoupons
      -> PromotionsWorkspace({ canManage, initialData })
      -> promotion query options / create and update mutations
      -> typed browser API -> /api/v1/admin/promotions/coupons
      -> requireApiStaff + Zod -> Promotions server coupons -> Prisma

No request, response, query key, cache policy, mutation, store, context, Server Action,
authorization rule, audit record, or persistence owner changes. The client component remains free
of Prisma, server-only imports, Server Actions, and Promotions server imports.

All current local state, forms, queries, mutations, refresh, scroll, toasts, client validation,
error fallbacks, JSX, copy, classes, accessibility, themes, and responsive behaviour remain
byte-for-byte intact. The page preserves its current signed-out redirect, insufficient-read
capability redirect, initial list read, canManage derivation, and props.

## Ordered implementation

1. Reconfirm the source hash/size/line baseline, absent destination, clean scoped paths, and one
   external legacy importer.
2. Move the file unchanged:

       src/features/admin/promotions/promotions-workspace.tsx
         -> src/modules/promotions/ui/admin/promotions-workspace.tsx

3. Change only the page import from
   @/features/admin/promotions/promotions-workspace to
   @/modules/promotions/ui/admin/promotions-workspace.
4. Search the repository for the old path; verify no consumer, test, check, or documentation
   contract requires compatibility. The legacy file must be absent.
5. Verify the destination hash matches the recorded baseline and the scoped diff is one
   content-identical rename plus the route import replacement.
6. Run and report focused, static, and browser acceptance on the exact implementation head.

Biome may require ordering the five existing page imports. The user approves that formatter-only
reorder if required; it must be documented in the final diff and must not add, remove, or
semantically change any import or route code.

## Baseline-causality rules

- The destination SHA-256 must equal the recorded source hash with no component content diff.
  This protects its directive, imports, export, JSX, local state, forms, query/mutation behaviour,
  toasts, accessibility, visual styling, and responsive behaviour.
- The old path must not exist after the move. A duplicate, re-export, alias, shim, barrel, or
  forwarding module fails the cutover.
- The route differs only by the import target and, under the explicit Biome exception, ordering of
  its existing imports.
- A failure touching either scoped source path, the Promotions ownership boundary, or
  /admin/promotions is never waivable as earlier migration debt. Broader failures require
  comparable unchanged-baseline evidence before classification as pre-existing.
- Any visual, interaction, accessibility-tree, route, request/response, authorization, cache, or
  persistence difference is a regression; this design authorizes none.

## Acceptance

### Structural and focused checks

- The destination exists, remains a Client Component, and hashes to
  3C6E4D561707BCCD536489CDF41679BE9F0F6B93D5D8EC5DD834806F6A66775F.
- The legacy source is absent and repository search finds no legacy-path import or compatibility
  edge.
- The page has only the allowed import-path change and, only if needed, documented ordering of its
  five existing imports.
- The scoped diff has no package, lockfile, generated, schema, migration, API, test, shared UI,
  CSS, or unrelated-work change attributable to this slice.
- Existing focused contract coverage at src/modules/promotions/schema.test.ts continues to pass;
  it proves coupon input validation but does not replace workspace parity evidence.

Run repository-owned commands on Node 25.x and pnpm 11.13.0, recording actual outcomes:

    pnpm check:architecture
    pnpm biome
    pnpm typecheck
    pnpm test -- src/modules/promotions/schema.test.ts
    pnpm test
    pnpm build
    pnpm react-doctor
    pnpm validate:full
    pnpm validate:browser

The current environment is Node v24.14.0 and pnpm 11.9.0, not the required Node 25/pnpm 11.13
contract. These gates therefore remain unexecuted here; the mismatch is known validation debt,
not permission to change package metadata, engines, dependencies, or lockfile.

### Browser, accessibility, and responsive checks

Against an authorized staff session, inspect /admin/promotions at 375x812, 768x1024, and 1280x800
in light and dark themes. Compare screenshots with the existing admin presentation; inspect console,
failed requests, and server logs. Exercise read-only, empty/non-empty, generated/custom coupon,
percent/fixed, invalid form, create success/error, edit/cancel, toggle, refresh/pending, and coupon
status states where controlled data permits. Confirm labels, select and checkbox operation, focus
order, disabled controls, toast feedback, no mobile overflow, sticky wide form/list layout, and the
unchanged signed-out and insufficient-capability redirects. Missing runner, browser, credentials,
or data prerequisites are blocked/skipped, never passing.

## Rollback

Rollback is source-only: move the unchanged file back to its legacy path, restore the sole route
import, then remove the module destination only after the route resolves. Re-run structural,
focused, static, and browser checks. A rollback with two copies or a forwarding module is invalid.

## Roles and exclusions

The planner freezes scope and evidence; the UI engineer performs the exact move and route import;
the reviewer verifies identity, import graph, gates, accessibility/responsive parity, and unrelated
work preservation. No domain or data engineer is needed because all Promotions contracts,
transport, policy, server operation, and persistence stay unchanged.

Excluded: every component refactor or formatting change; all changes to JSX/copy/classes/state/forms/
toasts/queries/mutations/a11y/responsive behaviour; compatibility layers; all schema/types/client/
server/API/policy/checkout/Prisma/Supabase/cache changes; route semantics; shared UI/CSS/dependency/
lockfile changes; test rewrites; other admin or legacy migrations; tracker/guard/readiness edits;
repair or reclassification of older validation debt; and any staging, committing, or alteration of
unrelated dirty work.
