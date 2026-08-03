# Workflow: Feature

Use for a new or changed capability.

## Current architecture sequence

```text
orchestrator
→ planner when scope is non-trivial
→ server-side engineer when contracts, data, auth, API or provider behavior changes
→ frontend engineer when route, client, UI or browser state changes
→ reviewer
```

Skip a role only when its owned surface is unaffected.

## Procedure

1. Orchestrator identifies the user operation and ownership surfaces.
2. Planner, when useful, defines acceptance, contract/data/auth impact, UI states, evidence and
   exclusions.
3. Server-side engineer produces the Zod contract and complete current Next.js server behavior,
   including Prisma/Supabase/security/tests, before dependent frontend integration.
4. Frontend engineer consumes the exact contract, implements API/Query/UI/auth behavior and
   verifies against the real server.
5. Reviewer verifies each surface and the seam.

## Explicit NestJS migration

When and only when the user requests NestJS migration:

```text
planner → server-side engineer behavior/contract audit → backend engineer migration
→ frontend engineer consumer changes if required → reviewer
```

The backend engineer does not pre-empt ordinary server-side work.

## Completion

The same runtime contract is used by producer and consumer; relevant migrations/auth paths are
exercised; the real server response is parsed by the browser client; every modeled outcome has UI
behavior; applicable static, test, build, browser and database gates pass; reviewer returns Pass.

Do not replace persistence with fixtures or server capability with client workarounds.
