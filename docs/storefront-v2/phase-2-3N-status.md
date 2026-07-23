# Phase 2 status — canonical storefront catalogue

Status: **complete**

Phase 2 establishes PostgreSQL/Prisma as the only runtime product source and completes the
storefront read cutover.

## Completed

- Removed catalogue fetching and serialization from the root layout.
- Home, catalogue, and product-detail routes read canonical Prisma DTOs on the server.
- `/products` uses URL-owned filters, sort, bounded pagination, counts, facets, and taxonomy
  resolution.
- Product cards use `ProductSummary`; PDP and variant selection use `ProductDetail`.
- Product and variant measurements are both represented in Prisma, migrated, imported, mapped, and
  rendered.
- The archived JSON snapshot is migration input only.
- Deterministic style-smoke data exercises build and browser checks without masquerading as a live
  backend.
- Disabled CI workflows were restored; Prisma validation, boundaries, typecheck, tests, build, and
  Playwright are required PR checks.

## Explicitly not part of Phase 2

Account persistence, checkout/payment execution, admin catalogue mutations, and replacement of the
remaining account/checkout prototype provider belong to their dedicated migration phases. The
compatibility provider receives no product catalogue and cannot become a second product authority.
