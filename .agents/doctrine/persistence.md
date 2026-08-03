# Doctrine: PostgreSQL and Prisma

Owner of: Prisma client, schema, migrations, query quality, transactions, idempotency and
concurrency.
Cited by: server-side engineer, backend engineer when migration is active, planner and reviewer.

## Database ownership

Supabase hosts PostgreSQL and Auth. Prisma owns ordinary application-data access and schema
management for the `public` schema.

Do not use the Supabase JavaScript client for ordinary application CRUD unless a documented
capability genuinely requires Supabase-specific behavior.

Supabase owns `auth.*`. Prisma must not attempt to manage the Auth schema. Cross-schema foreign
keys and invariants that Prisma cannot express belong in reviewed SQL migrations.

## Prisma client

Use the singleton exported from `src/lib/prisma`.

- Do not instantiate Prisma per request or feature.
- Do not import generated client paths outside the designated coupling point.
- Keep Prisma server-only.
- Preserve the configured driver adapter and pooling strategy.
- Interactive transactions require a connection mode that pins the backend connection; respect
  the repository's `DIRECT_URL`/`DATABASE_URL` policy.

## Schema and migrations

Every schema change includes:

1. Prisma schema update;
2. validation and formatting;
3. named migration;
4. SQL review;
5. application to an isolated development/test PostgreSQL database;
6. client regeneration;
7. relevant integration and application tests.

Never edit a migration already applied to a shared environment. Create a corrective migration.
Never use `db push` as the production migration path.

A newly generated unapplied migration may contain reviewed custom SQL for cross-schema foreign
keys, partial indexes, data backfills, staged constraints or PostgreSQL features Prisma cannot
express. Document and test it.

## Query design

- Select only required fields.
- Prevent N+1 access with relation loading or batching.
- Use database aggregation for totals and counts.
- Keep collection queries bounded and deterministically ordered.
- Add indexes for real lookup, join, order and uniqueness patterns.
- Use cursor pagination where stable traversal matters.
- Do not expose Prisma records as transport data.

## Transactions

Use `prisma.$transaction` when multiple writes must commit atomically, including inventory holds,
order creation, payment state, fulfilment, refunds and related audit records.

Keep transactions short. Do not perform Paystack, Cloudinary, courier or email calls inside a
transaction. Use explicit state transitions, idempotency and an outbox/job only when reliable
post-commit side effects are required.

## Idempotency and concurrency

Retries, webhooks and checkout operations use database-backed idempotency:

- validated idempotency/provider event key;
- unique constraint;
- persisted operation state;
- deterministic repeat behavior.

Protect stock and unique-item ownership with atomic conditional updates, appropriate constraints,
optimistic concurrency or row locking. Choose the simplest mechanism that proves the invariant.

## Raw SQL and seed data

Prefer Prisma. Parameterized raw SQL is allowed when Prisma cannot express a required operation or
measured performance justifies it. Keep it in the owning server module and integration-test it.

Seed/fixture code is never imported by production request paths.
