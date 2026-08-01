# Phase 9 Admin Orders Presentation Primitives Cutover Design

**Date:** 2026-08-01  
**Status:** Approved migration-only design; implementation and exact-head acceptance are unexecuted.  
**Baseline:** `d1ba9821` on `agent/storefront-checkout-delivery-promotions-redesign`.  
**Scope:** One Phase 9 ownership cutover for two legacy Orders presentation primitives and their seven live consumers.

## Context and decision

The legacy admin Orders composition owns two presentation-only files even though their status,
payment, channel, and order-record contracts are canonical Orders domain contracts:

```text
src/features/admin/orders/order-labels.ts
src/features/admin/orders/order-status-badge.tsx
```

The approved decision is to move those files, without changing their contents other than their
type/import references, to the Orders domain's staff-facing UI context:

```text
src/modules/orders/ui/admin/order-labels.ts
src/modules/orders/ui/admin/order-status-badge.tsx
```

Their seven live consumers must import the concrete module UI paths. Admin is a presentation
surface, not a business domain; `src/modules/orders/ui/admin/**` is therefore the correct owner.
This is not a move of the wider Orders workspace or legacy Orders composition.

## Domain checkpoint

The legacy and canonical `OrderStatus`, `PaymentStatus`, and `SalesChannel` unions are currently
structurally and semantically identical. This permits `order-labels.ts` and
`order-status-badge.tsx` to retarget their type imports from `@/lib/admin/shared/types` to
`@/modules/orders/types` without a label, tone, or type-domain translation.

The legacy duplicate union definitions remain outside this slice. This cutover does not deduplicate,
delete, re-export, or otherwise alter `src/lib/admin/shared/types.ts` or its source contracts.

Promotions validation remains blocked. The user explicitly approved sequencing this independently
scoped Orders slice onward without treating that validation debt as passed, cleared, or waived.

## Considered approaches

1. Leave the primitives under `src/features/admin/orders/**`: rejected because it retains the
   Phase 9 legacy ownership edge for Orders presentation.
2. Add a legacy shim, re-export, barrel, path alias, or duplicate copy: rejected because all seven
   known consumers can move in this slice and a compatibility edge would preserve legacy ownership.
3. Move the broader Orders workspace or related selectors, controls, sheets, and routes: rejected
   as a wider Phase 9 migration with substantially more behaviour and ownership surface.
4. Refactor label maps, tone logic, badge markup, date formatting, or component boundaries while
   moving: rejected because this is an identity-preserving presentation cutover.
5. Chosen approach: move the two primitives, retarget their type and internal primitive import
   paths, and update only the seven named live consumers.

## Architecture and component boundaries

| Layer | Responsibility in this slice |
| --- | --- |
| `src/modules/orders/types.ts` | Existing canonical Orders unions and `ControlRoomOrder` contract; unchanged. |
| `src/modules/orders/ui/admin/order-labels.ts` | Moved pure label maps, date formatter, and tone helpers. |
| `src/modules/orders/ui/admin/order-status-badge.tsx` | Moved `OrderStatusBadge` and `PaymentStatusBadge` presentation components. |
| Legacy `src/features/admin/**` consumers | Continue composing admin screens but import the two concrete Orders UI primitives. |
| `src/app/**`, `src/modules/orders/{server,client}/**`, `src/lib/**`, Prisma/Supabase | Unchanged. |

The files retain their existing public exports exactly:

```text
order-labels.ts
  orderStatusLabels
  paymentStatusLabels
  channelLabels
  formatOrderDate
  getOrderStatusTone
  getPaymentTone

order-status-badge.tsx
  OrderStatusBadge
  PaymentStatusBadge
```

`order-status-badge.tsx` remains a server-compatible component: do not add a `"use client"`
directive. It continues to consume only shared UI primitives, `cn`, the moved label helpers, and
canonical Orders types. Neither primitive may acquire a server-only import, Prisma access, Server
Action, query hook, store, provider, HTTP client, or business mutation.

## Exact consumer cutover and dependency flow

Update exactly these live consumers:

| Consumer | Required module UI dependency |
| --- | --- |
| `src/features/admin/orders/orders-table.tsx` | labels and both status badges |
| `src/features/admin/orders/orders-mobile-list.tsx` | labels/date formatter and both status badges |
| `src/features/admin/orders/order-transition-controls.tsx` | order-status labels |
| `src/features/admin/orders/order-timeline.tsx` | order-status labels and date formatter |
| `src/features/admin/orders/order-detail-sheet.tsx` | labels/date formatter and both status badges |
| `src/features/admin/customers/customer-delivery-panel.tsx` | order-status labels |
| `src/features/admin/overview/open-orders-preview.tsx` | order-status badge |

The unchanged data and presentation flow is:

```text
canonical Orders records/status unions from modules/orders/types
  -> Orders label maps, date formatter, and tone helpers
  -> OrderStatusBadge / PaymentStatusBadge or direct labels
  -> legacy Admin Orders, Customer, and Overview presentation consumers
  -> existing admin DOM and visual output
```

The existing consumers retain their own current state and responsibilities: the table/list/detail
views render passed Orders data; transition controls retain their local confirmation state and
existing transition callback; the timeline, customer delivery panel, and overview remain read-only
presentational consumers. No new data source, request, cache key, mutation, callback, error
boundary, state owner, or transport path is introduced.

## Preservation and error contract

The move must preserve all label strings, status-tone classification, `Intl.DateTimeFormat`
configuration and resulting date formatting, class names, badge variants, DOM structure, export
names, prop types, server compatibility, and visual behaviour. It must preserve all existing
consumer error and empty/pending behaviour because none of those paths change.

No error handling is added or changed. In particular, this slice must not alter Orders transition
errors, client-query errors, server/API error mapping, authorization, redirects, toast feedback,
or loading/empty states. Any runtime, DOM, accessibility-tree, computed-style, responsive,
request/response, authorization, cache, or persistence difference is a regression.

## Ordered implementation boundary

1. Confirm the exact baseline, absent module destinations, clean scoped source paths, the seven
   named live consumers, and no other legacy-path importer requiring compatibility.
2. Move `order-labels.ts` and `order-status-badge.tsx` to `src/modules/orders/ui/admin/` with their
   exports, implementation, formatting, and directives intact. Retarget their allowed internal
   references to the new module paths and canonical `@/modules/orders/types` imports.
3. Replace imports in exactly the seven consumers listed above. Do not modify consumer logic or
   presentation.
4. Prove the legacy files are absent and repository search finds no remaining legacy primitive
   import, shim, alias, forwarding module, barrel, or duplicate copy.
5. Inspect the scoped diff and run exact-head validation; classify any unavailable or failing gate
   honestly, including the outstanding Promotions validation checkpoint.

## Validation and browser gates

Run repository-owned commands on the supported Node 25.x and pnpm 11.13.0 toolchain and retain
actual results:

```bash
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
pnpm validate:browser
```

Focused validation must include static import-graph/legacy-path searches and a scoped Biome check
for the two moved primitives and seven consumers. Existing focused Orders tests may demonstrate
unchanged canonical type/rule behaviour, but they do not substitute for identity and browser
parity evidence. A failure involving either primitive, its canonical Orders type imports, any
named consumer, or the Orders UI ownership boundary blocks this slice. A broader failure is
pre-existing only if it reproduces on an unchanged comparable baseline; blocked, skipped, queued,
unsupported-toolchain, missing-manifest, or deployment-only evidence is never a pass.

Against an authorized staff session, inspect `/admin/orders`, the customer delivery surface, and
the admin overview at 375x812, 768x1024, and 1280x800 in light and dark themes. Compare screenshots
and inspect console output, failed requests, and available server logs. Exercise existing orders
list/table and mobile layout, detail sheet, timeline, permitted and destructive transition
confirmation, customer delivery history, and overview open-order states where controlled data
permits. Verify exact labels, date strings, badge tones, keyboard/focus behaviour, responsive
layout, absence of overflow, and unchanged authorization/redirect behaviour. Missing credentials,
controlled data, runner, browser, or log access makes the named check blocked or skipped.

## Rollback

Rollback is source-only: move the two unchanged primitives back to
`src/features/admin/orders/`, restore only the seven imports to their legacy paths, and remove the
module destinations only after every consumer resolves. Re-run the identity, zero-consumer,
static, and browser checks. Do not leave duplicate copies, forwarding modules, aliases, or shims;
do not use a broad reset or touch concurrent work.

## Roles, scope, and exclusions

The planner freezes this design and evidence boundary. The UI engineer owns the two-file move and
the seven consumer-import changes. The reviewer owns structural identity, import graph, exact-head
gates, browser/accessibility/responsive parity, and dirty-work isolation. No domain engineer or
data engineer is required because Orders server/client contracts, rules, transport, policy, and
persistence do not change.

Explicitly excluded:

- Any move, refactor, cleanup, formatting rewrite, or redesign beyond the two primitives and seven
  listed import sites; specifically the broader Orders workspace remains legacy and out of scope.
- Any change to labels, tone logic, date formatting, exported names, props, classes, DOM,
  accessibility, responsive behaviour, client/server compatibility, queries, local state, or
  transitions.
- Any duplicate-union cleanup or type facade change in `src/lib/admin/shared/types.ts` or its
  legacy source modules.
- All server, client API, Route Handler, Server Action, schema, Prisma, Supabase, persistence,
  authorization, cache, configuration, dependency, lockfile, CSS/token, test, guard, and
  migration-tracker changes.
- Compatibility shims, barrels, aliases, re-exports, forwarding imports, or duplicate files.
- Repair, reclassification, or false clearance of Promotions validation debt.
- Any edit, deletion, staging, commit, reset, formatting, or overwrite of unrelated dirty or
  untracked work, especially the dirty Orders server and storefront files.

## Success criteria

- The two concrete primitives live only in `src/modules/orders/ui/admin/**`, retain every existing
  export and observable presentation contract, and use canonical Orders type imports.
- Exactly the seven named consumers import the new concrete module UI paths; no legacy primitive
  import or compatibility edge remains.
- The scoped diff contains no unauthorised source, dependency, configuration, test, server, data,
  or visual change.
- Exact-head structural, repository, and browser evidence is recorded honestly; no newly introduced
  failure exists, and unresolved Promotions validation remains clearly reported as debt rather than
  a passing gate.
