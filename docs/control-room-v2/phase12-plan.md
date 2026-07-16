# Laitstyle Control Room V2 — Phase 12 Server-State Foundation

## Objective

Move approved domains from deterministic prototype adapters to typed query options and mutations after their Prisma repositories and profile-role authorization boundaries are ready.

## Preconditions

- Supabase Auth sessions resolve to a Prisma profile.
- Server repositories enforce the static role capability matrix.
- Prisma migrations are reviewed and Prisma Client is current.
- Public storefront reads use the validated projection.

## Data ownership

TanStack Query owns server-like resource state. Local state owns dialogs, tabs, forms, unsaved values and theme preference. Components do not copy query data into another global store.

## Query and mutation rules

- Use typed array keys and include every data-affecting input.
- Colocate keys, options and mutations with the domain repository.
- Keep cached data visible during background refetch.
- Prefer authoritative cache replacement, then targeted invalidation; use optimistic updates only for reversible low-conflict actions.
- Never optimistically finalize payments, fulfilment, stock release, returns, refunds or unique-item ownership.
- Query functions call browser-safe API/RPC adapters, never Server Actions.

## Acceptance

- The first migrated domain has pending, error, empty, stale and background-refresh states.
- Server authorization is covered by tests and cannot be bypassed by client cache state.
- No prototype adapter is represented as production persistence.
- TypeScript, Vitest, build and React Doctor gates pass.
