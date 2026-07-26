# Phase 7 — Authentication Consolidation Status

**Status:** Refreshed bootstrap; runtime migration not started  
**Branch:** `refactor/phase-7-auth-consolidation`  
**Base merge:** `fe6616ecee79c11c856f3165cc46c63d68ad1e37`  
**Scope:** Authentication ownership only

## Objective

Create one clear authentication domain under `src/modules/auth/**` while preserving every existing browser route, redirect, cookie, form, role check and storefront/admin presentation.

## Inherited baseline

Phase 5–6 source architecture was merged through PR #46 and is now the Phase 7 baseline.

Inherited source decisions include:

- Products catalogue and PDP ownership under `src/modules/products/**`;
- account-order ownership under `src/modules/orders/**`;
- review ownership under `src/modules/reviews/**`;
- storefront runtime and shell ownership under `src/modules/storefront-shell/**`;
- browser Products reads through `GET /api/v1/products`;
- direct domain reads from Server Components;
- principle-based architecture and module-export guards.

The merged Phase 5–6 head was not dependency-backed certified in the connected runtime. Biome, TypeScript, architecture checks, Prisma validation, Vitest, build, React Doctor and Playwright must not be represented as passed until they execute on a current exact head.

## Phase 7-owned compatibility edge

Phase 7 inherits one exact auth-owned compatibility file:

- `src/features/storefront/shared/catalogue-data.ts`
  - consumed only by the legacy storefront auth dialog for the `Product` type;
  - exports no runtime value and no wildcard barrel;
  - must be deleted after the auth dialog moves into `src/modules/auth/ui/**` and its type import is canonical.

The remaining `src/features/storefront/shared/storefront-runtime.ts` checkout edge is Phase 8-owned and must not be absorbed into this phase.

## Current ownership map

Authentication responsibilities remain fragmented across locations including:

- `src/app/auth/actions.ts` — Next.js Server Action transport;
- `src/app/auth/callback/route.ts` — OAuth callback browser flow;
- `src/app/auth/google/route.ts` — Google browser redirect flow;
- `src/app/auth/sign-out/route.ts` — POST-only sign-out browser flow;
- `src/server/auth/session.ts` — session and staff-access resolution;
- `src/server/auth/profile.ts` — account/profile provisioning;
- `src/lib/auth/**` — roles, capabilities, errors and shared helpers;
- storefront auth provider/dialog files — customer-facing presentation and local dialog state.

This map must be confirmed against the refreshed exact branch before moving code.

## Target ownership

```text
src/modules/auth/
├── schema.ts
├── types.ts
├── server/
│   ├── session.ts
│   ├── authenticate.ts
│   ├── account-provisioning.ts
│   ├── permissions.ts
│   ├── redirects.ts
│   └── diagnostics.ts
└── ui/
    ├── sign-in-form.tsx
    ├── sign-up-form.tsx
    └── auth-dialog.tsx
```

`src/app/auth/actions.ts` may remain only as a thin Next.js adapter. Browser redirect routes remain under `/auth/**` and must call module-owned operations rather than duplicating auth rules.

## Locked boundaries

Phase 7 may:

- move session resolution into the Auth module;
- move account provisioning into the Auth module;
- move capability and permission orchestration into the Auth module;
- consolidate redirect and diagnostic helpers;
- thin `src/app/auth/actions.ts`;
- migrate auth UI into module-owned presentation without visual change;
- delete the Phase 7-owned catalogue-data compatibility edge after consumer cutover;
- remove duplicate auth ownership after every consumer is migrated.

Phase 7 must not:

- implement checkout or payment settlement;
- create Paystack verification or webhook flows;
- rewrite cart, saved-item or catalogue state;
- delete the Phase 8 checkout runtime compatibility edge;
- perform broad Phase 9 deletion outside auth-owned paths;
- change existing auth URLs;
- redesign auth forms or dialogs;
- weaken POST-only sign-out;
- move Prisma or Supabase clients into browser modules.

## Task ledger

- [x] P7-T00 refresh the Phase 7 branch onto the merged Phase 5–6 baseline;
- [x] P7-T00A reconcile inherited architecture and validation truth;
- [x] P7-T00B define Phase 7 scope and non-scope boundaries;
- [ ] P7-T01 confirm the complete auth ownership/import map on the refreshed branch;
- [ ] P7-T02 create `src/modules/auth` runtime contracts;
- [ ] P7-T03 move session resolution;
- [ ] P7-T04 move account provisioning;
- [ ] P7-T05 move permission orchestration;
- [ ] P7-T06 move redirect helpers;
- [ ] P7-T07 move diagnostics;
- [ ] P7-T08 reduce `src/app/auth/actions.ts` to thin adapters;
- [ ] P7-T09 preserve OAuth browser routes under `/auth/**`;
- [ ] P7-T10 move storefront auth presentation into `src/modules/auth/ui/**` without visual change;
- [ ] P7-T11 delete the Auth-owned `features/storefront/shared/catalogue-data.ts` compatibility edge;
- [ ] P7-T12 remove duplicate auth ownership from `src/server/auth/**` and legacy auth-server locations after cutover;
- [ ] P7-T13 preserve all existing auth URLs and visual contracts;
- [ ] P7-T14 run focused auth unit, integration and Playwright validation;
- [ ] P7-T15 reconcile documentation and merge evidence on the exact final head.

## Acceptance gate

Phase 7 is complete only when all of the following are proven:

- password sign-in works;
- sign-up works;
- Google OAuth initiation and callback work;
- password reset works;
- sign-out remains POST-only;
- session cookies and redirects remain correct;
- consumer account provisioning works;
- admin capability checks work;
- auth UI has no intentional visual change;
- `src/app/auth/actions.ts` contains transport concerns rather than reusable business logic;
- no duplicate active auth ownership remains outside `src/modules/auth/**`, except documented thin app adapters;
- the Phase 7 catalogue-data compatibility edge is deleted;
- exact-head auth tests, architecture checks and browser contracts pass.

## First implementation order

1. Audit every auth import and consumer on the refreshed branch.
2. Establish module-owned types and server contracts without changing behaviour.
3. Move session and provisioning code with temporary compatibility only where strictly necessary.
4. Thin app actions and redirect routes.
5. Move auth presentation without changing JSX, classes, labels or responsive behaviour.
6. Delete auth-only compatibility paths after consumer cutover.
7. Run the complete auth acceptance gate and reconcile the ledger.
