# Storefront V2 — Specification

This folder is the **implementation-grade specification** for rebuilding the entire consumer-facing Laitstyle fashion e-commerce storefront, end to end. It is a planning deliverable: **no storefront application code has been written.** Implementation proceeds phase-by-phase only after this spec is reviewed and explicitly accepted.

## Branch & base commit

- **Spec branch:** `feat/storefront-v2-spec`
- **Created from:** PR #4 (`feat/control-room-v2`) head
- **Base commit SHA:** `4e4f4283a01bd0c0d98708246e19b033211299f7` (verified against `origin/feat/control-room-v2`; local checkout matches; PR #4 is OPEN, base `main`, title "feat(control-room): Rebuild the operations workspace")
- PR #4 was **not** merged or rebased. Admin/Control Room was **not** modified. Admin changes are only *proposed* where the storefront needs data/persistence it cannot currently get.

## What this is / is not

- **Is:** an audit of the current storefront, a product/UX spec, an information architecture + route map, a commerce domain + data contract, a Prisma + Supabase Auth architecture, a UI system + wireframes, a phased implementation plan, and an acceptance/test matrix.
- **Is not:** decoration of the existing storefront, disconnected pages, or any acceptance of static arrays, fake timers, placeholder links, or simulated payments as real implementations.

## Reading order

| # | File | Purpose |
|---|---|---|
| 1 | [`00-current-state-audit.md`](00-current-state-audit.md) | Verified state of every consumer route, component, data source, auth path, and gap — with dispositions (retain/refactor/replace/move/remove). |
| 2 | [`01-product-and-experience-spec.md`](01-product-and-experience-spec.md) | The customer journey, consumer language, per-surface experience requirements, holds/reservation semantics, notifications, reviews, returns. |
| 3 | [`02-information-architecture-and-routes.md`](02-information-architecture-and-routes.md) | Canonical route map, redirects, rendering strategy, page-vs-sheet-vs-dialog decisions, and the **wiring map** (how every page/route/overlay links to every other). |
| 4 | [`03-commerce-domain-and-data-contract.md`](03-commerce-domain-and-data-contract.md) | Domain entities, product discriminated union, storefront visibility rules, never-expose fields, missing-data resolutions. |
| 5 | [`04-prisma-supabase-architecture.md`](04-prisma-supabase-architecture.md) | Prisma-only database ownership, Supabase Auth boundary, roles, migrations and server authorization. |
| 6 | [`05-ui-system-and-wireframes.md`](05-ui-system-and-wireframes.md) | Design tokens, typography/icons, the shared component contracts, and ASCII wireframes (mobile + desktop, all five states) for every surface. |
| 7 | [`06-implementation-plan.md`](06-implementation-plan.md) | Phases 0–10, each with objective, scope, files, DB changes, tests, acceptance criteria, exclusions, blockers, rollback, required evidence. |
| 8 | [`07-acceptance-and-test-matrix.md`](07-acceptance-and-test-matrix.md) | Static/integration/transactional/Playwright tests, viewport & a11y coverage, edge-case matrix, analytics events, anti-pattern ban list. |
| 9 | [`08-integrations-and-environments.md`](08-integrations-and-environments.md) | Paystack, Resend, Cloudinary and private assets, environment URLs, env registry and reinforced interface rules. |

## Cross-cutting rules (consistent across all files)

- **One product truth.** The storefront reads the same persistent records admin writes (`products`, `product_variants`, `stock_levels`, `orders`, `holds`, `product_reviews`, `delivery_zones`, …). There is never a separate storefront catalogue.
- **Consumer language** (Shop, New in, Pieces, Collections, Only one left, Reserved for you, Sold out, Delivery, Track order, Saved items, Returns) — internal terms (inventory, stock movement, intake, publication, control room) never leak into consumer copy.
- **Server is authoritative** for prices, delivery fees, stock, holds, order state and payment. No client-controlled customer identity, price or stock. The payment webhook—not the browser—confirms an order.
- **Money** is handled in integer minor units (kobo); NGN is the source of truth, USD is display-only/approximate.

## Key decisions index (see `04` §Decision records for full ADRs)

Canonical product URL `/products/[slug]`; cart sheet + `/cart` fallback with server-truth holds; guest checkout supported; Paystack behind an adapter with authoritative webhooks; Supabase Auth owns auth emails and sessions; Resend owns commerce email; Cloudinary owns product imagery; Prisma owns the application database; server authorization uses consumer/admin/manager roles; the one admin account is CLI-only and customers self-serve; PostgreSQL search, publication-driven invalidation, distinct category/collection routing and environment-specific origins remain planned.

**Non-negotiable engineering rules (`08` §5):** zero hardcoded/inline theme or style — everything from semantic **theme tokens**; **shadcn-first** (verify/add a shadcn+Base UI primitive before any custom component; custom = deep composition of shadcn, never a reinvented primitive); **never forget deep links** (every state URL-reachable).
