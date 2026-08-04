# Doctrine: Frontend state and data ownership

Owner of: URL state, TanStack Query, form state, local state, Zustand and browser storage.
Cited by: frontend engineer and reviewer.

## Ownership ladder

1. Prisma/API state: authoritative product and account state.
2. URL state: shareable/navigation-relevant filters, search, sort, tabs and pagination.
3. TanStack Query: remote browser reads, mutations, cache, invalidation and optimistic projection.
4. Form state: unsaved user input.
5. Local component state: subtree-owned transient interaction.
6. Zustand: browser-owned state shared across distant branches when the earlier owners do not fit.
7. Browser storage: only when persistence across reloads is a product requirement.

Do not promote state because it might be globally useful later.

## TanStack Query

- Query keys use a domain factory and include every result-affecting input.
- Query functions call typed domain API functions and forward cancellation signals.
- Freshness, refetch and retry policy reflect product behavior.
- Do not retry validation, auth, forbidden, not-found or conflict responses by default.
- Do not copy Query data into Context, Zustand or local state.
- Mutations prevent unsafe duplicate submission and update/invalidate the smallest correct cache.
- Optimistic updates require a deterministic rollback and clear server invariant; avoid casual
  optimism for inventory, holds, checkout, payment, fulfilment and refunds.
- Preserve request IDs in support-visible errors.

## URL and forms

Validate search parameters centrally. Do not put secrets, session identifiers, full carts or
provider payloads in URLs.

Forms may use a permissive draft schema for intermediate typing, but final submission must parse
through the shared server request schema. Model field, form, pending, conflict and success states.

## Zustand

Create a store only for genuinely browser-owned cross-tree state, such as approved overlay
coordination or guest identifiers not represented by the server/URL.

Every store has one responsibility, explicit actions, narrow selectors, no duplicate Query/session
data, versioned runtime-validated persistence and a reset path.

Supabase client/session behavior remains the auth state owner. Do not duplicate the Supabase
session into Query, Zustand or storage.

## Storage

Treat local/session/extension storage as untrusted versioned input. Validate, migrate or reset it.
Never persist passwords, auth tokens, payment secrets or sensitive provider data.
