# Complete API, Account and Paystack Plan Index

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver every real non-speculative storefront, customer-account, admin and Paystack API capability approved in the design, connect each actual consumer, remove fake business state, and close the remaining architecture migration.

**Architecture:** Execute eight independently reviewable plans in dependency order. Every vertical slice owns persistence, domain policy, Route Handlers, typed clients/hooks, consumer integration and focused evidence; Server Components continue to call domain queries directly. Prisma owns schema/migrations, Supabase owns authentication, and Paystack is a server-only payment/payout provider with browser Popup continuation.

**Tech Stack:** Next.js 16.2.10 App Router, React 19.2.4, TypeScript 5, Prisma 7.8, PostgreSQL/Supabase hosting, `@supabase/supabase-js` 2.110.2, TanStack Query 5.101.2, `@paystack/inline-js` 2.23.1, Zod 4, Vitest 4, Playwright 1.61, Biome, pnpm 11.13.0.

## Global Constraints

- Package manager is `pnpm@11.13.0`; use repository scripts rather than remembered one-off commands.
- Prisma is the only schema, generated-client and migration authority. Use Prisma CLI and Prisma migrations only; do not invoke Supabase CLI or create `supabase/migrations/**` files.
- Supabase remains the hosted Auth/session provider. Never use editable `user_metadata` for authorization or expose a secret/service-role key to a client bundle.
- Machine-readable browser/external APIs live under `/api/v1/**`; redirect/callback transports may remain under `/auth/**` or an explicit checkout callback path.
- Server Components call domain server queries directly and never fetch internal application APIs.
- Route Handlers and Server Actions may call the same domain operation but never call one another.
- TanStack Query owns remote browser cache; URL parameters own navigable state; Zustand owns browser-only shared state; Prisma owns persisted business state.
- Preserve existing storefront, account, checkout and admin presentation. Move UI instead of redesigning it.
- Do not add generic CRUD for every Prisma model. Add an endpoint only for an actual interactive or machine consumer in the approved design.
- Financial mutations are pessimistic, idempotent, auditable and server-authoritative. Popup callbacks never deliver value or mark an order paid.
- No new production code under `src/features/**` or top-level `src/server/**`.
- Preserve all unrelated and pre-existing dirty-worktree changes. Re-run the exact file ledger before a plan touches an overlapping file.
- Before each planned commit, inspect `git diff --name-only` and stage exact task-owned files. Directory-scoped `git add` examples must be narrowed whenever that directory contains pre-existing or concurrent edits.
- Every behavior change begins with a focused failing test observed failing for the intended reason.
- Each task commits only its owned files with a conventional commit message.
- Required viewports are 375x812, 768x1024 and 1280x800 in light and dark themes.

## Approved Design

Read before execution:

- `docs/superpowers/specs/2026-07-28-complete-api-account-payments-design.md`
- `update.md`
- `.agents/doctrine/server-and-actions.md`
- `.agents/doctrine/state-and-data.md`
- `.agents/doctrine/validation-and-reporting.md`

## Plan Suite and Dependency Order

1. `2026-07-28-complete-api-01-ledger-persistence-foundation.md`
   - Freeze the exact endpoint/consumer/dummy-state ledger.
   - Add shared account/finance schema primitives, idempotency, webhook inbox and outbox.
2. `2026-07-28-complete-api-02-core-account.md`
   - Profile, addresses, saved products, customer order actions, returns and reviews.
3. `2026-07-28-complete-api-03-extended-account.md`
   - Preferences, notifications, privacy, support, export and deletion requests.
4. `2026-07-28-complete-api-04-account-security.md`
   - Supabase email/password/MFA and supported session management.
5. `2026-07-28-complete-api-05-paystack-checkout-methods.md`
   - Server-authoritative checkout, Popup continuation, signed settlement and saved methods.
6. `2026-07-28-complete-api-06-refunds-disputes.md`
   - Provider refunds, needs-attention recovery, disputes and evidence.
7. `2026-07-28-complete-api-07-owner-finance.md`
   - Balance, ledger, settlements, recipients, manual transfers and OTP.
8. `2026-07-28-complete-api-08-legacy-closure-validation.md`
   - Remaining admin/storefront client reconciliation, UI moves, legacy deletion and final gates.

Plans 2-4 may proceed in parallel only after Plan 1 is merged into the current branch and file ownership is disjoint. Plan 6 requires Plan 5 settlement. Plan 7 requires Plan 1 financial primitives and Plan 5 provider normalization. Plan 8 runs after every consumer is cut over.

## Existing API Baseline

The implementation must preserve and reconcile these working endpoints:

```text
GET         /api/v1/products
GET,POST    /api/v1/admin/products
GET,PATCH,DELETE /api/v1/admin/products/[id]
POST        /api/v1/admin/products/[id]/archive
POST        /api/v1/admin/products/[id]/restore
GET,POST    /api/v1/admin/products/taxonomy
PATCH,DELETE /api/v1/admin/products/taxonomy/[id]
POST        /api/v1/admin/products/taxonomy/reorder
GET         /api/v1/admin/inventory
POST        /api/v1/admin/inventory/adjustments
GET         /api/v1/admin/inventory/stock-movements
GET         /api/v1/admin/orders
GET,PATCH   /api/v1/admin/orders/[orderId]
POST        /api/v1/admin/orders/offline-sales
GET         /api/v1/admin/orders/sale-customers
GET         /api/v1/admin/holds
GET         /api/v1/admin/holds/[holdId]
POST        /api/v1/admin/holds/[holdId]/extend
POST        /api/v1/admin/holds/[holdId]/release
POST        /api/v1/admin/holds/[holdId]/convert
GET,POST    /api/v1/admin/returns
GET,PATCH   /api/v1/admin/returns/[returnId]
GET         /api/v1/admin/returns/eligible-orders
GET         /api/v1/admin/customers
GET         /api/v1/admin/customers/[customerId]
POST        /api/v1/admin/customers/[customerId]/notes
GET         /api/v1/admin/overview
GET,PATCH   /api/v1/admin/settings
POST        /api/v1/admin/assets/sign
POST        /api/v1/auth/invitations
```

Existing typed clients/hooks under `src/modules/{products,inventory,orders,holds,returns,customers,settings,overview}/client/**` are extended rather than replaced.

## Target Account API Ledger

```text
GET,PATCH   /api/v1/account/profile
GET,POST    /api/v1/account/addresses
PATCH,DELETE /api/v1/account/addresses/[addressId]
GET,POST    /api/v1/account/saved-products
DELETE      /api/v1/account/saved-products/[productId]
GET         /api/v1/account/orders
GET         /api/v1/account/orders/[orderNumber]
POST        /api/v1/account/orders/[orderNumber]/cancellation-requests
GET,POST    /api/v1/account/returns
GET         /api/v1/account/returns/[returnId]
POST        /api/v1/account/reviews
PATCH,DELETE /api/v1/account/reviews/[reviewId]
GET,PATCH   /api/v1/account/preferences
GET,PATCH   /api/v1/account/notification-preferences
GET,PATCH   /api/v1/account/notifications
PATCH       /api/v1/account/notifications/[notificationId]
GET,POST    /api/v1/account/support-tickets
GET         /api/v1/account/support-tickets/[ticketId]
POST        /api/v1/account/support-tickets/[ticketId]/messages
GET,PATCH   /api/v1/account/privacy-preferences
GET,POST    /api/v1/account/data-exports
GET         /api/v1/account/data-exports/[exportId]
GET         /api/v1/account/data-exports/[exportId]/download
GET,POST,DELETE /api/v1/account/deletion-requests
POST        /api/v1/account/security/email-change
PATCH       /api/v1/account/security/password
GET,POST    /api/v1/account/security/mfa/factors
POST        /api/v1/account/security/mfa/challenges
POST        /api/v1/account/security/mfa/challenges/[challengeId]/verify
DELETE      /api/v1/account/security/mfa/factors/[factorId]
GET         /api/v1/account/security/sessions
DELETE      /api/v1/account/security/sessions/others
GET,POST    /api/v1/account/payment-methods
PATCH,DELETE /api/v1/account/payment-methods/[methodId]
GET         /api/v1/account/payment-methods/setup/[attemptId]
POST        /api/v1/account/payment-methods/setup/[attemptId]/verify
```

`GET` account order/return routes exist for interactive browser refresh and external clients. Account Server Components continue to call `modules/orders/server/account-orders.ts` and `modules/returns/server/account-returns.ts` directly.

## Target Checkout, Payment and Finance API Ledger

```text
POST        /api/v1/checkout
GET         /api/v1/checkout/[checkoutId]
POST        /api/v1/payments/[paymentId]/verify
POST        /api/v1/payments/webhooks/paystack
GET         /api/v1/admin/payments
GET         /api/v1/admin/payments/[paymentId]
GET         /api/v1/admin/payments/[paymentId]/timeline
GET,POST    /api/v1/admin/refunds
GET         /api/v1/admin/refunds/[refundId]
POST        /api/v1/admin/refunds/[refundId]/retry
GET         /api/v1/admin/disputes
GET,PATCH   /api/v1/admin/disputes/[disputeId]
POST        /api/v1/admin/disputes/[disputeId]/evidence
POST        /api/v1/admin/disputes/[disputeId]/accept
POST        /api/v1/admin/disputes/[disputeId]/decline
GET         /api/v1/admin/finance/balance
GET         /api/v1/admin/finance/ledger
GET         /api/v1/admin/finance/ledger/[transactionId]
GET         /api/v1/admin/finance/settlements
GET         /api/v1/admin/finance/settlements/[settlementId]
GET         /api/v1/admin/finance/settlements/[settlementId]/transactions
GET         /api/v1/admin/finance/banks
POST        /api/v1/admin/finance/banks/resolve
GET,POST    /api/v1/admin/finance/recipients
GET,PATCH,DELETE /api/v1/admin/finance/recipients/[recipientId]
GET,POST    /api/v1/admin/finance/transfers
GET         /api/v1/admin/finance/transfers/[transferId]
POST        /api/v1/admin/finance/transfers/[transferId]/finalize
POST        /api/v1/admin/finance/transfers/[transferId]/resend-otp
POST        /api/v1/admin/finance/reconcile
```

The Paystack webhook is one stable public route for charge, refund, dispute and transfer events. It verifies untouched raw bytes before parsing.

## Current Dirty-Work Ownership

Before Plan 2 or Plan 8 starts, run:

```powershell
git status --short
git diff -- src/app/(storefront)/account src/modules/returns src/modules/products src/features/admin
```

Preserve these active changes:

- account address and return pages/actions;
- `src/modules/returns/{server,storefront,ui}/**` additions;
- account shell/nav/context/modal changes;
- product import/taxonomy/editor work under `src/modules/products/**`;
- active admin inventory/topbar and product-creation Playwright changes.

If a plan still overlaps, its owner must incorporate the current file contents and never restore an earlier version from the plan.

## Completion Definition

The suite is complete only when:

- every ledger entry has an authenticated domain operation, contract tests and its real consumer;
- all approved account prototype toasts are replaced by persisted success/pending/error behavior;
- checkout/order/payment/stock settlement is server-authoritative and idempotent;
- refunds, disputes, settlements and transfers reconcile provider state;
- no migrated consumer imports legacy `features/**`, dummy data or client receipt authority;
- Prisma, architecture, static, unit, build, React Doctor, browser and live-integration gates have executed on the exact final head;
- blocked live credentials/services are reported as blocked, never inferred as passing.
