# Phase 9 Admin Team UI Ownership Cutover Design

**Date:** 2026-08-01  
**Status:** Approved by the user; implementation and executable acceptance remain open.  
**Migration scope:** Phase 9, one independently reviewable `src/features/**` retirement slice.

## Context and decision

The Store Team workspace still lives at
`src/features/admin/team/team-workspace.tsx`, even though the screen is the owner-facing UI for
manager invitations and membership status. Its browser request, client-safe member contract,
owner policy, invitation command and manager query are already owned by `src/modules/auth/**`.
Leaving the presentation under legacy admin composition obscures that single-domain ownership.

This slice makes one decision: Auth owns the Store Team invitation UI and the contracts it
consumes. The existing file moves exactly to
`src/modules/auth/ui/admin/team-workspace.tsx`; `src/app/admin/team/page.tsx` changes only the
`TeamWorkspace` import path. The component is not redesigned or decomposed.

The source file is currently 12,287 bytes and 286 lines, with SHA-256
`82906C5C036134842AE79D3B7C782DDDE2FCDE12FDA397E9624A734440E62CED`. Its size is acknowledged,
but a large-file refactor would combine architectural relocation with behavioural risk and is not
part of this migration-only slice.

The source is clean against the active branch, `src/app/admin/team/page.tsx` is its exactly one
consumer, and the destination does not yet exist. Those facts form the structural baseline for the
move.

The active branch is `agent/storefront-checkout-delivery-promotions-redesign` and contains unrelated
modified and untracked work. Implementation and review must preserve that work and isolate this
cutover to the two source paths named below.

## Migration phase and evidence status

This is Phase 9 work: it retires one remaining legacy `src/features/**` owner and leaves no
compatibility edge behind. The migration tracker's summary is stale: it still reports Phase 6 as
in progress, Phase 7 as not started, Phase 9 as not started, and `main` as the current branch,
despite the present Auth module, its completed manager-invitation contracts and later migration
work on the active branch. The stale summary is context, not permission to reopen Phase 6 or Phase
7 and not a reason to update the tracker in this slice.

Earlier phases also carry recorded private-runner, exact-head, browser and visual validation debt.
That debt remains unresolved unless separately re-executed on the relevant heads. It must not be
reported as cleared by this small move, and it does not reduce the requirement to validate this
cutover on its own exact implementation head.

## Goals

- Place the Store Team workspace under the Auth domain that already owns manager invitations.
- Keep `/admin/team` as a thin app-layer composition route.
- Preserve the complete Phase 0 admin presentation and every current interaction and contract.
- Remove the legacy source path without adding a transition layer.
- Produce a small UI-engineer change that a reviewer can validate independently.

## Architecture and ownership

This slice maps onto two target layers:

| Layer | Responsibility |
| --- | --- |
| `src/modules/auth/ui/admin/**` | Own the staff-facing manager invitation and team-membership presentation. |
| `src/app/admin/team/**` | Authorize the request, obtain Auth-owned server data and compose the Auth-owned UI. |

`admin` is a presentation context below `auth/ui`, not a new business domain. Auth is the correct
owner because the screen's purpose is to invite an authenticated manager, display the resulting
manager identity state and communicate Auth invitation failures. The UI already depends only on
shared UI primitives, `@/lib/http/client`, `@/modules/auth/client/staff-invitation-api` and the
client-safe `ManagerMember` type from `@/modules/auth/types`.

The dependency flow remains:

```text
src/app/admin/team/page.tsx
  -> modules/auth/server/session.ts
  -> modules/auth/server/staff-invitations.ts
  -> modules/auth/ui/admin/team-workspace.tsx
       -> modules/auth/client/staff-invitation-api.ts
       -> POST /api/v1/auth/invitations
       -> modules/auth/server/staff-invitations.ts
```

The Server Component may import both Auth server operations and Auth UI because `src/app/**`
composes modules. The Client Component remains free of `server-only`, Prisma, Supabase admin and
Auth server imports. No shared primitive moves into the domain, and no Auth implementation is
exposed through a barrel.

## Components and interfaces

### `TeamPage`

`src/app/admin/team/page.tsx` retains its existing responsibilities and implementation:

- resolve `getCurrentSession()`;
- redirect non-staff users to `/auth/sign-in?next=/admin/team`;
- redirect staff who are not owners/admins to `/admin`;
- call `listStoreManagers()`;
- pass the resulting array as `initialMembers` to `TeamWorkspace`.

Only this import changes:

```text
@/features/admin/team/team-workspace
  -> @/modules/auth/ui/admin/team-workspace
```

No other import, statement, redirect, prop or JSX in the route changes.

### `TeamWorkspace`

The named export and prop contract remain exactly:

```ts
TeamWorkspace({ initialMembers }: { initialMembers: ManagerMember[] })
```

The destination continues to be a Client Component. Its local form state, touched state, pending
guard, message state, field-error mapping, email validation, member deduplication and optimistic
insertion of the returned member remain intact. It continues to consume
`inviteManagerRequest(input)` and `ManagerMember`; those Auth-owned public contracts do not move or
change in this slice.

No shim, re-export, barrel, forwarding module, path alias or duplicate copy may remain at the old
path. Consumers must import the concrete Auth UI file.

## Exact file scope and ordered implementation

1. Confirm the source hash and that `src/app/admin/team/page.tsx` is the only production importer
   of `TeamWorkspace` from the legacy path.
2. Move the file without content changes:

   ```text
   src/features/admin/team/team-workspace.tsx
     -> src/modules/auth/ui/admin/team-workspace.tsx
   ```

3. In `src/app/admin/team/page.tsx`, replace only the legacy `TeamWorkspace` import path with
   `@/modules/auth/ui/admin/team-workspace`.
4. Search the repository for the legacy path and confirm no importer, check, test or documentation
   contract requires a compatibility edge.
5. Confirm the old file is absent, the destination hash matches the pre-move hash and the focused
   diff contains one pure rename plus one import-path replacement.
6. Run the acceptance gates below on the exact implementation head and report failures, skipped
   checks and pre-existing debt precisely.

No other source or documentation file is part of implementation scope.

## Data flow and state preservation

The initial request remains server-led. `TeamPage` enforces the existing staff/admin redirects,
then `listStoreManagers()` returns the Auth-owned `ManagerMember[]` used to initialize the client
workspace. The component deduplicates that array by member ID and renders the same count, empty
state and membership cards.

Submitting the form continues to validate the three local fields, call
`inviteManagerRequest({ firstName, lastName, email })`, and POST the same JSON to
`/api/v1/auth/invitations`. A successful response prepends and deduplicates the returned member,
clears the form and touched state, and displays the server message. The move adds no new request,
cache, action, store, context, optimistic policy or persistence owner.

## Error handling and preservation contract

The existing error paths are part of the behaviour contract:

- local validation keeps the same required-field and email messages;
- invalid submission keeps the same highlighted-field summary;
- `ApiClientError` keeps its server message and mapped `firstName`, `lastName` and `email` errors;
- unknown errors keep the same connection-and-retry fallback;
- `finally` always clears pending state;
- repeated submission remains blocked while pending;
- owner/session failures retain the route and domain behaviour already implemented outside this UI.

Implementation must preserve every line of component behaviour and presentation, including:

- JSX structure and element order;
- all visible copy, punctuation and status labels;
- every Tailwind class and responsive breakpoint;
- Lucide icon imports and rendered icons;
- input IDs, labels, `aria-invalid`, `role="alert"`, `role="status"`, autocomplete values,
  disabled states and button semantics;
- light/dark styling, focus behaviour, truncation, empty state and mobile/desktop layouts;
- export name, prop type and member key construction.

Any content, accessibility-tree, interaction, computed-style, responsive or screenshot difference
is a regression. The implementation must not format, reorder imports inside, extract helpers,
split components, deduplicate types or otherwise refactor the 286-line file.

## Testing and acceptance

### Structural acceptance

- `src/modules/auth/ui/admin/team-workspace.tsx` exists and matches the implementation-time source
  hash; against the current design baseline that hash is
  `82906C5C036134842AE79D3B7C782DDDE2FCDE12FDA397E9624A734440E62CED`.
- `src/features/admin/team/team-workspace.tsx` no longer exists.
- Repository search finds no import of `@/features/admin/team/team-workspace` and no compatibility
  file, re-export, alias or duplicate workspace.
- `src/app/admin/team/page.tsx` differs only by the one import path.
- The moved component has no content diff and remains a Client Component with no server-only import.
- The final diff preserves all unrelated dirty work and contains no package, lockfile, generated,
  schema or migration change attributable to this slice.

### Repository gates

Use the repository-owned `pnpm@11.13.0` commands on Node 25.x and record actual results:

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

Run focused Auth coverage as part of the test pass, including
`src/modules/auth/auth-boundaries.test.ts`,
`src/modules/auth/server/staff-invitations.test.ts` and
`src/app/api/v1/auth/invitations/route.test.ts`. The Auth boundary test must continue proving that
client Auth UI does not import Auth server modules or the trusted Supabase admin client.

`tests/e2e/manager-invitation.spec.ts` is the end-to-end acceptance path for owner access, form
submission, success copy, invited member rendering, invitation completion and denial of owner
access to the resulting manager. Run it through `pnpm test:auth:e2e` only when its disposable
Supabase Auth, PostgreSQL and mailbox prerequisites are available. An unavailable integration
environment is a recorded blocked gate, not a pass.

Earlier migration validation debt cannot be used to waive a newly introduced failure. A repo-wide
failure may be classified as pre-existing only with comparable unchanged-baseline evidence; no
failure touching either scoped file or the Auth ownership boundary is waivable.

### Browser, accessibility and responsive acceptance

Against an owner session, verify `/admin/team` at mobile, tablet and desktop widths in light and
dark themes. Exercise untouched-field, blur-validation, invalid-submit, valid-submit, pending,
success, API-error and empty/non-empty manager-list states where deterministic fixtures or the
real disposable Auth environment support them. Confirm keyboard focus order, associated labels,
error/status announcements, disabled controls, truncation and the one-column-to-two-column layout.

Also verify both route authorization branches: a signed-out user is redirected to the existing
sign-in URL with `next=/admin/team`, and a manager is redirected to `/admin`. Inspect the browser
console, failed requests and production server logs, and compare screenshots with the existing
admin presentation. Missing viewports, states or runtime prerequisites must be reported as skipped
or blocked.

## Rollback

Rollback is source-only and requires no schema, data, Auth identity or cache migration:

1. Move the unchanged component back to
   `src/features/admin/team/team-workspace.tsx`.
2. Restore the single route import to `@/features/admin/team/team-workspace`.
3. Remove `src/modules/auth/ui/admin/team-workspace.tsx` only after the route resolves to the
   restored source.
4. Re-run the structural, Auth boundary, static and browser gates against the restored composition.

A partial rollback that leaves two workspace copies or a forwarding module is not acceptable.

## Roles and handoff

1. **Planner:** freezes this two-file scope, Auth ownership decision, preservation contract and
   acceptance evidence.
2. **UI engineer:** performs the exact move and route import-only cutover. No domain, data or
   behavioural changes are authorized.
3. **Reviewer:** verifies the rename/content identity, import graph, architecture boundaries,
   responsive and accessibility parity, exact-head gates and preservation of unrelated work.

No domain engineer or data engineer is required because the existing Auth contracts, policies,
server operations, HTTP transport and persistence remain unchanged.

## Explicit exclusions

- No redesign or change to behaviour, JSX, copy, classes, icons, accessibility, themes or
  responsive semantics.
- No large-file cleanup, helper extraction, component split, validation consolidation, type
  deduplication, import reordering or formatting of `TeamWorkspace`.
- No shim, barrel, re-export, alias, forwarding import, compatibility facade or duplicate file at
  the legacy path.
- No change to Auth schemas, types, client API, query/command logic, owner policy, redirects,
  Supabase configuration, Prisma schema, migrations, profiles, audit events or invitation setup.
- No route URL, route logic, session semantics, role capability, HTTP endpoint, request shape or
  response shape change.
- No changes to shared UI primitives, Tailwind, tokens, global CSS, dependencies, package metadata
  or lockfile.
- No test rewrite to accommodate changed behaviour; existing assertions must pass against the moved
  code.
- No migration of any other `src/features/**` file or admin surface.
- No migration-tracker, progress-ledger, architecture-guard or readiness-check edit in this slice.
- No repair or reclassification of earlier phase validation debt.
- No edit, deletion, formatting, staging, commit or overwrite of unrelated modified or untracked
  work already present on the active branch.

## Recorded overrides

None. This design applies the target architecture and Phase 9 legacy-removal goal without changing
the product, behaviour or validation doctrine.
