# Storefront account, checkout, delivery, and promotions redesign

Status: corrective bugfix implementation in progress; local runtime, database, browser, and payment gates are not passed.

Predecessors: PR #63 was merged into `main` before this follow-up. This specification governs branch `agent/storefront-checkout-delivery-promotions-redesign` and draft PR #64.

## Runtime incident record — 31 July 2026

A local Next.js 16.2.10 development run exposed failures that the earlier connector-only review did not catch:

1. `src/modules/orders/client/offline-sale-payment.ts` contained invalid UTF-8 bytes inside the offline-sale verification request and prevented the admin bundle from parsing.
2. `GET /api/v1/account/cart` returned HTTP 500. The endpoint reads the checked-in `customer_cart_lines` migration, so database migration readiness must be verified before the persistence feature is considered usable.
3. `GET /api/v1/payments/checkout` returned HTTP 500 after the nationwide-delivery change introduced an unnecessary read-only interactive Prisma transaction.
4. The local runtime used Node 26.5.0 while the repository contract requires Node 25.x. This warning did not create the corrupted Git blob, but results from Node 26 are outside the supported validation environment.

The previous statement that source implementation was complete was incorrect and is withdrawn.

## Correct bugfix workflow

The repository-local authority requires the bugfix chain:

```text
systematic-debugging → owning engineer → reviewer
```

The corrective pass therefore uses only the relevant roles from the fixed six-role roster introduced by commit `66433b46e164c60a5e1821de21ef964a4f6d7ba8`:

- **Orchestrator** — classified the reports as separate defects and selected `.agents/workflows/bugfix.md`.
- **Domain engineer** — owns the corrupted browser transport, checkout query boundary, API error mapping, and regression tests.
- **Data engineer** — owns migration readiness for `customer_cart_lines` and confirms checked-in migrations are applied with the repository’s deploy workflow.
- **Reviewer** — owns local command, runtime, browser, and PR verdict evidence and does not implement source.

The planner and UI engineer are not dispatched for this focused corrective pass because no new feature scope or visual redesign is being performed. This follows `.agents/doctrine/toolchain-and-skills.md`: load skills deliberately rather than claiming every available skill was used.

## Skills actually loaded for the corrective pass

- `using-superpowers`
- `systematic-debugging`
- `test-driven-development`
- `next-best-practices` and its error-handling reference
- `prisma-cli`
- repository-local `supabase-postgres-best-practices`
- `create-pr` for the PR record

No unavailable MCP or unexecuted skill is claimed as evidence.

## Corrective source changes

### Invalid UTF-8 admin transport

- Reconstructed the intended typed `/api/v1/admin/orders/offline-sales/:id/verify` request.
- Replaced the corrupted blob with valid UTF-8 source.
- Changed the production-readiness scanner to decode every application `.ts` and `.tsx` file with fatal UTF-8 validation so invalid bytes are reported instead of silently replaced.

### API database error containment

- Added regression cases for missing tables/columns and database connection failures.
- Missing schema objects now map to HTTP 503 `DATABASE_SCHEMA_NOT_READY`.
- Connection failures now map to HTTP 503 `DATABASE_UNAVAILABLE`.
- Diagnostics contain only request metadata and safe Prisma/Postgres error codes; table names, column names, hostnames, SQL, and raw provider messages are not logged or returned.
- Unknown failures remain HTTP 500 `INTERNAL_ERROR`.

This mapping improves diagnosis; it does not substitute for applying a pending migration.

### Checkout context

- Removed the unnecessary read-only interactive Prisma transaction around delivery-policy reads.
- Delivery settings now use the existing Prisma client directly.
- Serializable checkout/order creation still resolves delivery inside its write transaction, preserving pricing integrity.
- Added a focused regression test that rejects reintroducing an interactive transaction into the read-only checkout context.

### Cart persistence

`customer_cart_lines` is created by the checked-in migration:

```text
prisma/migrations/20260731110000_customer_cart_persistence/migration.sql
```

The application must not fake an empty successful cart when that table is missing. The database must be brought to the checked-in migration state. For an existing configured Supabase database, the repository’s verification workflow uses `prisma:migrate:deploy`, not `prisma:migrate:dev`.

## Existing product contracts retained

### Server and Cache Components safety

- Prerender recovery diagnostics do not read wall-clock time.
- Internal database/provider details remain server-only.
- Storefront catalogue failures still produce the typed public unavailable state.

### Nationwide delivery

- Address city is not an eligibility blocker.
- Pricing uses an explicit nationwide fallback, an optional regional override, or the documented zero-fee emergency fallback.
- The browser submits an owned address ID, never a delivery-zone ID.
- Transactional order creation recalculates the delivery quote before payment initialization.

### Checkout and cart experience

- Real cart, coupon, address, payment initialization, verification, pending, failed, abandoned, reversed, and review-required states remain the source of truth.
- No simulated payment success path is introduced.

### Promotions administration

- Coupon generation/mutation remains server-authorized, validated, audited, and stored in the existing settings contract.

## Required local recovery and verification

Use Node 25.x before collecting evidence. Apply existing checked-in migrations rather than creating a new migration:

```bash
pnpm prisma:validate
pnpm prisma:migrate:status
pnpm prisma:migrate:deploy
pnpm prisma:generate
pnpm check:storefront-production
pnpm typecheck
pnpm exec vitest run src/lib/http/server.test.ts src/modules/checkout/server/get-checkout-context.test.ts src/modules/checkout/server/delivery-policy.test.ts src/modules/checkout/server/checkout.test.ts
pnpm dev
```

After the server starts, verify:

- `/admin` compiles without an invalid UTF-8 parsing failure.
- `/api/v1/account/cart` returns 200 for a valid consumer after migration deployment.
- `/api/v1/payments/checkout` returns 200 and includes address-bound delivery quotes.
- Missing-schema simulations return safe 503 responses, not opaque 500 responses.
- Default and alternate address selection, nationwide pricing, coupon validation, and real Paystack recovery remain functional.

Full reviewer gates remain:

```bash
pnpm validate:full
pnpm validate:browser
```

## Current reviewer verdict

**Blocked from merge.** The corrective source changes are committed, but no test, TypeScript, migration, Next.js runtime, browser, or real Paystack gate has been executed by this GitHub-only session. The PR must remain draft until the local evidence above passes.
