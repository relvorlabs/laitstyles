# Phase 0 Source and Ownership Inventory

**Baseline commit:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Inventory scope:** Production runtime ownership chains relevant to the architecture migration  
**Status:** Complete for Phase 0 decision and migration planning

## 1. Purpose

This inventory records the current production owners of business data, browser state, providers, contexts, and query caches before implementation changes begin.

It is not a proposal and does not change runtime behaviour. It identifies the current chains that later phases must replace or preserve deliberately.

## 2. Global application composition

| Current path | Current responsibility | Current owner | Phase 0 decision |
| --- | --- | --- | --- |
| `src/app/layout.tsx` | Root HTML/body and application composition | App Router root | Preserve metadata, fonts, global CSS, body structure, and visible behaviour |
| `src/providers/providers.tsx` | Composes theme, TanStack Query, and toaster | Global client boundary | Theme and toaster may remain global; query scope is reviewed in Phase 2 |
| `src/providers/theme-provider.tsx` | Theme infrastructure | Global UI infrastructure | Preserve light/dark behaviour |
| `src/providers/query-provider.tsx` | Mounts one browser QueryClient for the complete application | Global remote-state cache | Current baseline only; later scope to surfaces that need browser server-state |
| `src/lib/query/query-client.ts` | Creates a per-request server client and one browser-session client | TanStack Query infrastructure | Current defaults: 30-second stale time, no retry, no focus refetch, pending-query dehydration |
| `src/components/ui/sonner.tsx` | Global toast presentation | Global UI infrastructure | Not a state or domain provider |

Current root chain:

```text
src/app/layout.tsx
  -> AppProvider
     -> ThemeProvider
        -> QueryProvider
           -> application routes
           -> Toaster
```

## 3. Admin runtime ownership

### 3.1 Initial production import chain

The authenticated admin layout currently imports deterministic seeded state into the production render path:

```text
src/app/admin/layout.tsx
  -> activeAdminSeed
     src/lib/admin/shared/admin-seed.ts
  -> activeControlRoomSeed
     src/lib/admin/shared/seed/index.ts
  -> src/lib/admin/shared/seed/active.ts
  -> src/lib/admin/shared/seed/active-store-data.ts
```

`src/app/admin/layout.tsx` passes that state to `AdminShell` after server-side staff access resolution.

### 3.2 Admin shell and client stores

```text
AdminShell
  -> AdminAccessProvider
  -> AdminProvider(initialState)
     -> createAdminStore(initialState)
     -> AdminRepositoryProvider(store)
  -> ProductEditorControllerProvider
  -> RecordSaleControllerProvider
```

| Current path | Current responsibility | State classification | Migration concern |
| --- | --- | --- | --- |
| `src/features/admin/state/admin-provider.tsx` | Creates and exposes the synchronous AdminStore | Mixed server-like business data and mutations in browser memory | Persistent business records have a second browser-owned source of truth |
| `src/features/admin/state/admin-store.ts` | Holds products, orders, holds, returns, customers, settings and mutation reducers | In-memory production business state | Reload persistence and server authority are incomplete outside migrated paths |
| `src/features/admin/data/admin-repository-context.tsx` | Builds repository adapters around AdminStore | Client repository composition | Mixes one remote repository with in-memory repositories behind one interface |
| `src/features/admin/shell/admin-access-provider.tsx` | Exposes already-resolved staff role/capabilities | Client presentation access context | Authorization must remain server-enforced; context is presentation only |
| `src/features/admin/product-editor/product-editor-controller.tsx` | Product-editor workflow state | Feature-local client workflow | Keep feature-local unless server-owned values are duplicated |
| `src/features/admin/record-sale/record-sale-controller.tsx` | Record-sale workflow state | Feature-local client workflow | Keep feature-local while sale authority later moves server-side |

### 3.3 Current repository split

`src/features/admin/data/admin-repository-context.tsx` creates repositories as follows:

```text
createInMemoryAdminRepositories(store)
  + inventory: createFetchAdminInventoryRepository()
```

The effective ownership is:

| Domain | Current read implementation | Current mutation authority | Persistence status |
| --- | --- | --- | --- |
| Inventory | Fetch repository | AdminStore/product reducers plus existing remote endpoints | Partially remote and Prisma-backed |
| Orders | Promise-wrapped AdminStore snapshot | AdminStore reducers | In-memory production state |
| Holds | Promise-wrapped AdminStore snapshot | AdminStore reducers | In-memory production state |
| Returns | Promise-wrapped AdminStore snapshot | AdminStore reducers | In-memory production state |
| Customers | Promise-wrapped AdminStore snapshot | AdminStore reducers | In-memory production state |
| Settings | Promise-wrapped AdminStore snapshot | AdminStore reducers | In-memory production state |
| Overview | Derived Promise-wrapped AdminStore snapshot | Derived from the same store | In-memory/derived production state |

The in-memory adapter is implemented by:

- `src/lib/admin/data/in-memory/admin-repositories.ts`
- `Promise.resolve(structuredClone(selector(store.getSnapshot())))`

This is asynchronous in type shape but not a remote or persistent data source.

## 4. Production fixture and in-memory import inventory

### Direct runtime fixture imports

| Importer | Imported fixture or seed | Runtime effect |
| --- | --- | --- |
| `src/app/admin/layout.tsx` | `activeAdminSeed` from `src/lib/admin/shared/admin-seed.ts` | Seeds the production admin shell after authentication |
| `src/lib/admin/shared/admin-seed.ts` | `activeControlRoomSeed`, `newStoreControlRoomSeed` | Compatibility aliases for seeded admin states |
| `src/lib/admin/shared/seed/active.ts` | Arrays from `active-store-data.ts` | Builds the active-store production seed |
| `src/features/admin/state/admin-store.ts` | `customer-profile-seed`, deterministic taxonomy/default-setting/intake hydration | Normalizes seeded browser state and creates missing prototype records |
| `src/features/admin/data/admin-repository-context.tsx` | `createInMemoryAdminRepositories` | Routes most admin reads back to AdminStore memory |

### In-memory repository consumers

The production consumer chain is centralized rather than imported separately by each screen:

```text
Admin screens and TanStack hooks
  -> useAdminRepositories()
  -> AdminRepositoryProvider
  -> createInMemoryAdminRepositories(AdminStore)
```

Domains currently served through that in-memory chain are orders, holds, returns, customers, settings, and overview. Inventory is explicitly replaced with the fetch-backed repository in the provider composition.

### Allowed non-production fixture locations

Later phases may retain deterministic data only when it is isolated to:

- unit and integration test fixtures;
- Playwright fixtures;
- stories or visual-development fixtures;
- database seed/import scripts;
- explicitly named development-only fixtures that cannot enter a production bundle.

## 5. Storefront state ownership

### StorefrontProvider

`src/features/storefront/shared/storefront-provider.tsx` receives a server-produced catalogue payload but also owns a broad set of client concerns:

- catalogue filters, category, collection, condition, inventory and price state;
- search and sorting;
- recent products and utility-message persistence;
- quick-view/product overlays and image viewer state;
- selected variants, image index and zoom;
- newsletter and delivery status;
- header scroll state;
- derived product, cart, saved and search projections.

The server-provided product catalogue itself is not classified as dummy data. The concern is mixed ownership and the duplication of URL-appropriate and local interaction state inside one broad context.

### StorefrontClientStateProvider

`src/features/storefront/shared/storefront-client-state-provider.tsx` owns browser-persisted:

- guest cart lines;
- saved product IDs;
- hold intents and countdowns;
- session/local-storage restoration and persistence.

This is browser-owned state, but the current Context boundary is broad. Phase 6 decides the focused Zustand and local-state split while preserving every interaction.

### Other feature-local contexts

The current tree also contains feature-local contexts/controllers such as account UI state and shop presentation state. They remain feature-owned unless evidence shows they contain remote business records or should be represented by URL state.

## 6. State ownership map

| State | Current owner | Current problem or status | Approved target |
| --- | --- | --- | --- |
| Public catalogue records | Server catalogue queries, passed to storefront providers | Server-first path is directionally correct | Domain server query -> Prisma |
| Admin inventory | Remote/fetch repository plus AdminStore mutations | Mixed transport and cache ownership | API/domain operation -> Prisma -> TanStack Query |
| Admin orders, holds, returns, customers, settings | AdminStore plus in-memory repositories | Production business data is browser-memory authoritative | API/domain operation -> Prisma -> TanStack Query |
| Admin overview | Derived in-memory repository snapshot | Derived from non-persistent store domains | Server/domain read model |
| Global browser query cache | Root QueryProvider | Mounted for every route whether required or not | Scope to the smallest surfaces that need it |
| Storefront filters/search/sort | StorefrontProvider local state | Navigable state is not URL-authoritative | URL search parameters |
| Guest cart/saved/holds | StorefrontClientStateProvider | Correctly browser-owned but broad Context subscription | Focused Zustand stores and local state |
| Storefront overlays/viewer | StorefrontProvider | Local/shared interaction state mixed with catalogue state | Focused store or local component state |
| Admin navigation/search sheets | AdminShell local state | Correct local shell ownership | Preserve locally |
| Authentication and staff access | Server session plus presentation context | Server authority is correct; ownership is split across folders | Consolidated auth domain with server enforcement |

## 7. TanStack Query baseline

Current QueryClient policy:

- one global `QueryProvider` under `AppProvider`;
- fresh QueryClient for each server request;
- one browser QueryClient singleton for the application session;
- `staleTime: 30_000`;
- `retry: false`;
- `refetchOnWindowFocus: false`;
- pending queries included in dehydration.

Current admin query hooks may read through `AdminRepositories`, but most repository methods resolve cloned AdminStore snapshots. TanStack Query therefore caches in-memory browser state rather than proving a remote persistent source for those domains.

## 8. Phase 0 conclusions

1. The current production admin path still imports deterministic seed data.
2. Inventory is the only admin repository explicitly replaced with a fetch-backed implementation in repository composition.
3. Orders, holds, returns, customers, settings, and overview remain backed by Promise-wrapped AdminStore memory.
4. AdminStore and TanStack Query can both represent the same records, creating duplicate ownership.
5. The global QueryProvider is broader than the approved target requires.
6. Storefront server catalogue reads are directionally correct, but one broad provider owns URL state, browser persistence, overlays, interaction state, and derived lists.
7. Phase 1 must update doctrine and guards before implementation begins; Phase 0 does not change these owners.
