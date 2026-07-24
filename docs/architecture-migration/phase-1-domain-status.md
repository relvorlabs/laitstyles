# Phase 1 Domain Migration Status

**Baseline:** `6f5087f4aa08a5d9bce5989bad7b230344cdb493`  
**Phase 0 merge:** `072cc92aa5301342f060633663094f956089ef1a`  
**Current phase:** Phase 1 — architecture rules and language  
**Purpose:** Record ownership and scheduled migration without moving runtime code early.

Status values:

- `Legacy mapped` — current ownership is documented; runtime code has not moved.
- `Partially persisted` — some reads/writes use Prisma, but ownership or transport is duplicated.
- `Browser-owned` — intentionally client-owned state, to be moved to focused stores later.
- `Not implemented` — target capability exists in the plan but no production ownership is
  confirmed.
- `Migrated` — target module, transport, persistence, authorization, and reload behaviour satisfy
  the acceptance gate.

| Domain/capability | Current ownership and source of truth | Target ownership | Planned phase | Status |
| --- | --- | --- | --- | --- |
| Auth | Fragmented across `app/auth/**`, `lib/auth/server/**`, and `server/auth/**`; Supabase session with Prisma profile/account work | `modules/auth/**` with thin route/action adapters | 7 | Legacy mapped |
| Products | Public catalogue code under `server/commerce/catalogue/**`; admin product editing under `features/admin/inventory/**`; Prisma and client/admin projections overlap | `modules/products/**` | 4 | Partially persisted |
| Inventory | Admin inventory query path is fetch-backed, while editor/lifecycle state and taxonomy still overlap AdminStore, actions, and TanStack cache | `modules/inventory/**` | 4 | Partially persisted |
| Orders | Account reads under `server/commerce/orders/**`; admin orders remain in AdminStore/in-memory repositories | `modules/orders/**` | 5 | Partially persisted |
| Holds/reservations | AdminStore and in-memory repositories; storefront hold intent also exists as browser-owned state | `modules/holds/**` for server records; focused cart/hold browser state where appropriate | 5 and 6 | Legacy mapped |
| Returns | AdminStore and in-memory repositories | `modules/returns/**` | 5 | Legacy mapped |
| Customers | AdminStore and in-memory repositories | `modules/customers/**` | 5 | Legacy mapped |
| Settings | AdminStore defaults/reducer and in-memory repository | owning settings domain/module determined during Phase 5 implementation | 5 | Legacy mapped |
| Overview/reporting | Projection over AdminStore snapshots and seeded sales pulse | domain-owned read projection over persisted records | 5 | Legacy mapped |
| Reviews | Prisma-backed server code under `server/commerce/reviews/**` with a feature-owned Server Action/form | product/reviews domain ownership under `modules/**`, preserving verified-purchase policy | 4 or focused follow-up | Partially persisted |
| Catalogue | Public read model spread across storefront feature code and `server/commerce/catalogue/**`; not an independent persistence domain | public product read model inside `modules/products/**` plus storefront UI | 4 | Legacy mapped |
| Cart | Storefront Context/client-state provider and browser persistence | `stores/cart.store.ts` plus checkout domain integration | 6 | Browser-owned |
| Saved items | Storefront Context/client-state provider | `stores/saved-items.store.ts` with IDs only | 6 | Browser-owned |
| Storefront UI state | Broad StorefrontProvider owns filters, overlays, search, measurements, forms, and header scroll | URL state, local component state, and `stores/storefront-ui.store.ts` according to ownership | 6 | Browser-owned |
| Checkout | Storefront feature flow; current completion/receipt authority requires server hardening | `modules/checkout/**` | 8 | Legacy mapped |
| Payments | Existing payment route handlers and Paystack integration are not yet the single idempotent settlement authority | `modules/payments/**` plus `/api/v1/payments/**` adapters | 8 | Partially persisted |
| Delivery | No complete production ownership confirmed by Phase 0 evidence | `modules/delivery/**` only when required by checkout settlement | 8 | Not implemented |
| Storefront shell | `features/storefront/shell/**` and repeated route wrappers | `modules/storefront-shell/**` with one `(storefront)` layout | 2 and later relocation | Legacy mapped |
| Admin shell | `features/admin/shell/**`, AdminProvider, controller providers, and admin layout | `modules/admin-shell/**`; remote records removed from AdminStore by domain | 2 and 5 | Legacy mapped |

## Surface terms that are not persistence domains

- **Storefront** and **admin** are UI surfaces.
- **Catalogue** is a public product read model and UI term.
- **Commerce** is a conceptual umbrella only.

They must not acquire duplicate product, inventory, order, payment, or customer persistence.

## Phase 1 boundary

Phase 1 changes doctrine, guard rules, exception records, and migration status only. It does not:

- move routes into `(storefront)`;
- relocate QueryProvider;
- create `src/modules/**` runtime foundations;
- replace Server Actions with API routes;
- remove AdminStore or in-memory repositories;
- introduce Zustand;
- consolidate auth;
- change checkout/payment authority;
- redesign any UI.

Those tasks remain assigned to their approved later phases.
