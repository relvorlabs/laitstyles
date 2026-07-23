# Doctrine: State & data ownership

Owner of: where each piece of state lives. This is the single source for state rules —
[server-and-actions](server-and-actions.md) and [ui-and-design-system](ui-and-design-system.md)
cite it, never restate it.
Cited by: ui-engineer, domain-engineer.

## The ownership ladder

Choose by **who owns the value**, not by convenience. Prefer the lowest rung that fits.

1. **Server-owned** (default for business data). Persistent records — products, inventory,
   orders, payments, permissions — are owned by the database and read on the server. Do not
   copy them into Context, reducers, Zustand, or a query cache to "make them global." See
   [server-and-actions](server-and-actions.md).
2. **URL state.** Anything that should be bookmarkable, shareable, restorable, or navigable —
   filters, pagination, sorting, saved views — lives in URL search params.
3. **Server-cache state.** When the client genuinely must synchronize server-like resource
   state, use TanStack Query (rules in [server-and-actions](server-and-actions.md)).
4. **Shared client state.** Genuinely shared, client-owned, cross-tree ephemeral UI state —
   cart-drawer visibility, guest cart, comparison selections, command-palette state. Zustand
   is the sanctioned store for this (not yet present in the tree; add it only when a real
   cross-tree need appears). Never put server-owned data here as the source of truth.
5. **Local interaction state** (the lowest rung — most state belongs here):
   - `useState` for simple, independent values.
   - `useReducer` for a local workflow with related transitions or invariants.
   - `useRef` for mutable values that must not trigger rendering.

## Avoid useState unless the value is locally owned

`useState` is only for state a single component (or a small component boundary) owns. Before
reaching for it, ask: is this really server data (→ rung 1), navigable state (→ rung 2), or
shared across the tree (→ rung 4)? Only when the answer is "none of those" does local state
apply. Lifting server or URL state into `useState` is the most common state defect here.

## Authentication & permissions

Come from the authenticated session and server-side authorization only — never from mutable
client state, and never enforced by hidden UI. See [server-and-actions](server-and-actions.md).

## Do-not

- Do not duplicate server state into Context, reducers, or Zustand for global convenience.
- Do not copy TanStack Query data into Context, reducers, or Zustand.
- Context consumer hooks may stay colocated with their Provider when that file is the natural
  owner. Do not split hooks into separate files for stylistic consistency alone.
