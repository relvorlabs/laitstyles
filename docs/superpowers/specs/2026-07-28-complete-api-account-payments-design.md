# Complete API, Account and Paystack Architecture Design

**Date:** 2026-07-28

**Status:** Approved design

**Branch:** `codex/product-creation-import-taxonomy`

**Controlling architecture:** `update.md` and `docs/architecture-migration/decision-and-migration-review.md`

## 1. Objective

Complete Laitstyles' production API and domain migration across storefront, account and admin,
including Paystack checkout, saved payment methods, refunds, disputes, settlements and owner-only
transfers. Replace dummy, simulated and local-state-only business behaviour with authenticated,
persistent domain operations while preserving the current interface.

This work closes the remaining Phase 5-7 gaps, implements Phase 8, and then completes the applicable
Phase 9 legacy deletion. It is one task delivered as ordered vertical slices on the current branch.

## 2. Approved overrides and constraints

- The user explicitly expanded the original account work to every real interactive or
  machine-readable API requirement across storefront, account and admin.
- Paystack payment and finance integrations are included. The earlier payment exclusion is removed.
- Non-payment legacy migration may proceed as consumers move. Final Phase 9 deletion and completion
  claims wait until Paystack checkout compatibility is also removed and Phase 8 acceptance passes.
- API paths follow reusable resources and security boundaries rather than mirroring the App Router or
  account page hierarchy.
- Collection Route Handlers colocate applicable `GET` and `POST` methods. Resource Route Handlers
  colocate applicable `GET`, `PATCH` and `DELETE` methods. State-transition routes exist only for
  real operations such as verification, finalization, challenge, revoke or refund.
- Prisma is the schema, generated-client and migration authority. Use Prisma CLI and Prisma
  migrations only. Do not use Supabase CLI.
- Supabase remains the authentication and session provider. Supabase Auth operations use the current
  supported server SDK surface rather than direct database manipulation.
- The approved UI preservation contract remains in force. Architecture work must not redesign the
  storefront, account, checkout or admin interfaces.

## 3. Architecture

Interactive browser data follows:

```text
Client Component
  -> TanStack Query hook
  -> typed domain API client
  -> /api/v1 Route Handler
  -> domain query, command and policy
  -> Prisma or server-only Paystack/Supabase adapter
```

Server-rendered data follows:

```text
Server Component
  -> domain server query
  -> Prisma
```

Route Handlers and Server Actions are separate transports. Neither calls the other. A thin
form-specific Server Action may call the same domain command as a Route Handler when progressive
enhancement, redirect or revalidation semantics justify it.

Production business code belongs in `src/modules/<domain>/**`. Server-only integrations and secrets
must not enter client dependency graphs. Remote browser data belongs to TanStack Query, navigable
state belongs to the URL, shared browser-owned state belongs to focused Zustand stores, and local
interaction state remains local.

## 4. API capability inventory

The implementation plan must turn this capability list into an exact route-and-method ledger based
on real consumers. It must not invent generic CRUD for every Prisma model.

### 4.1 Products and inventory

- Public catalogue queries, search, filters and pagination.
- Staff product create, detail, update, archive, restore and taxonomy operations.
- Media signing and product media ownership.
- Inventory lists, detail, levels, movements, adjustments, reservations and availability.

### 4.2 Holds, cart and checkout

- Persistent holds, authenticated ownership, extension, release, expiry and conversion.
- Guest cart remains browser-owned until it crosses the server-authoritative hold or checkout
  boundary.
- Server-computed products, prices, discounts, delivery fees and totals.
- Idempotent order draft and payment-attempt creation.
- Checkout initialization and authoritative status reads.

### 4.3 Customer account

- Authenticated customer profile read and update.
- Address list, create, update, delete and default selection.
- Saved-product synchronization.
- Customer-owned order and return reads where browser interaction requires them; Server Components
  continue to use direct domain reads.
- Order cancellation requests, return eligibility and creation, evidence, review creation/update/
  withdrawal, and customer-visible refund state.
- Shopping, sizing, communication and privacy preferences.
- Stored notifications, unread count, mark-read and delivery preferences.
- Support tickets, replies and attachment metadata.
- Account data export requests and protected downloads. Completed export downloads expire after
  seven days and remain accessible only to the requesting customer.
- Account deletion requests use a 14-day cancellation window and are blocked by active orders,
  returns, refunds, disputes or payouts. Execution removes or anonymizes profile, preference,
  notification, saved-item and support identity data while retaining legally/operationally required
  order, payment and audit records under the configured store retention policy.

### 4.4 Account security

- Email change, password change and MFA enrolment/challenge/verification/removal through Supabase
  Auth.
- Supported session inspection and revocation through Supabase Auth.
- If arbitrary single-session revocation is not supported by the installed/current SDK, expose an
  accurate sign-out-other-sessions operation instead of simulating device revocation.
- Sensitive operations require a fresh authenticated server session and appropriate confirmation.

### 4.5 Admin operations

- Complete and reconcile the existing products, inventory, orders, customers, holds, returns,
  settings, overview, assets and team invitation APIs.
- Add missing methods and resource-detail routes only where current UI or an approved external
  consumer requires them.
- Migrate typed clients, hooks and production UI ownership out of `features/**` without changing
  presentation.

### 4.6 Payments and finance

- Paystack checkout initialization, verification, signed webhook processing and local attempt
  history.
- Account payment-method list, default selection, deactivation and saved authorization reuse.
- Full and partial refunds, provider status, needs-attention retry, reconciliation and audit.
- Provider transaction fetch, verify and timeline for staff reconciliation.
- Owner-only Paystack balance, ledger, settlements and settlement transactions.
- Owner-only approved transfer recipients and manual single transfers, including Paystack OTP
  finalization, resend, verification, failure and reversal.
- Dispute webhooks, list/detail, evidence, signed upload handoff and accept/decline resolution.

## 5. Persistence design

Add or extend the smallest domain-owned models needed for:

- customer preferences;
- notification preferences and stored notifications;
- support tickets, messages and attachment metadata;
- versioned privacy consent records;
- data export jobs and account deletion requests;
- Paystack payment authorizations and safe descriptors;
- payment refunds;
- provider webhook event inbox and processing state;
- payment disputes and evidence references;
- payout recipients and transfers;
- provider settlements and settlement-transaction mappings;
- operation-scoped idempotency records.

Extend existing orders, order lines, payments, payment events, returns, holds, inventory and stock
movements rather than duplicating them. Add ownership, uniqueness, state and amount constraints.
Expose no raw card number, CVV, provider secret or unrestricted raw provider response.

Application writes use Prisma. New exposed-schema tables require RLS-compatible ownership policies
as defence in depth, expressed through Prisma migrations containing reviewed SQL where necessary.
Application authorization remains server-enforced even when RLS also applies.

## 6. Authorization design

- Consumers access only records connected to their authenticated customer identity.
- Staff reads and mutations use explicit server-side capabilities.
- Managers may inspect payment state and prepare return/refund work.
- Provider refund execution uses a dedicated `payments:refund` capability assigned to the owner by
  default. Managers may prepare the return/refund decision but cannot move money.
- Paystack balances, ledgers, settlements, recipient management and transfers are owner-only.
- Transfers require explicit review of recipient, amount and reason plus Paystack OTP whenever the
  provider requests it.
- The application exposes no operation that disables Paystack transfer OTP.
- Every financial mutation writes an immutable application audit event.
- Webhooks authenticate with the Paystack signature over the untouched raw body, not a browser
  session or CSRF token.
- Supabase authorization decisions use the authenticated server session and application roles,
  never editable user metadata.

## 7. Paystack design

### 7.1 Checkout

1. The browser sends cart identifiers, delivery choices and an idempotency token.
2. The server reloads authoritative products, availability, customer and store configuration and
   computes all monetary values.
3. A serializable Prisma transaction creates the pending order, order lines, holds and payment
   attempt.
4. The server initializes Paystack using the server-computed amount and persisted reference, then
   stores the access code and provider response mapping.
5. The browser opens `resumeTransaction(accessCode)`.
6. Popup success moves the UI to a confirming state only.
7. A signed webhook or explicit server verification produces one normalized provider result.
8. One idempotent serializable Prisma transaction confirms payment, commits stock, converts or
   releases holds, creates delivery state and appends payment/order/stock events.
9. The browser reads the local checkout status until a bounded success, failure or pending result.
10. The server-created order drives confirmation. The cart clears only after settlement.

### 7.2 Saved payment methods

- Save authorization metadata only after a verified successful Paystack transaction.
- Persist the authorization code in protected server storage together with the original transaction
  email, signature, reusable flag, channel, brand, bank, last four digits and expiry.
- Deduplicate instruments by provider signature and customer ownership.
- Reuse only authorizations marked reusable and only after explicit customer selection.
- A challenged authorization returns a provider continuation URL for browser completion.
- Deactivation calls Paystack and marks the local method inactive.
- Adding a method outside normal checkout uses an explicit NGN 50 Paystack setup charge. After its
  authorization is verified and stored, the application immediately requests a matching refund and
  shows the method/refund as pending until provider confirmation. No fake card form or local-only
  token is allowed.

### 7.3 Refunds

- Validate the captured provider payment and remaining refundable amount.
- Persist the local refund request before calling Paystack.
- Support full and partial amounts.
- Track pending, processing, needs-attention, processed and failed states.
- Retry needs-attention refunds using protected customer bank details.
- Only provider-confirmed processing updates order, line, return and customer-visible refund facts.
- Repeated requests, webhook delivery and reconciliation must not double-refund or double-update an
  order.

### 7.4 Settlements and transfers

- Settlements are read-only reconciliation of Paystack payouts to the store's configured bank
  account.
- Manual transfers deliberately send Paystack balance to a locally approved recipient.
- Recipient creation validates the selected bank/account using supported Paystack APIs and stores
  only safe account descriptors plus the provider recipient code.
- Transfer references are server-generated and unique. Transfer state remains pending until
  provider confirmation.
- OTP-required transfers cannot continue without owner-supplied OTP. Success, failure and reversal
  events reconcile idempotently.
- Bulk transfers are excluded because no payroll or marketplace workflow exists.

### 7.5 Disputes and reconciliation

- Persist supported Paystack dispute events and connect them to local payment/order/customer data.
- Allow authorized finance users to view the dispute, upload evidence through Paystack's signed
  upload flow, add fulfilment evidence and accept or decline the dispute.
- Provider transaction lists, details, timelines, totals, balance, ledger and settlements support
  reconciliation. They do not replace local payment records as the application source of truth.

## 8. Webhook and outbox design

The Paystack webhook Route Handler:

1. reads the untouched raw body;
2. verifies HMAC-SHA512 with constant-time comparison;
3. validates the supported event schema;
4. inserts a uniquely keyed provider event;
5. processes the relevant idempotent domain command;
6. records completion or retryable failure;
7. returns `200` only when the durable event and critical financial state are safe.

Already-processed duplicates return `200` without repeating side effects. Receipts, notifications
and other non-critical follow-up use a persisted outbox so they cannot make payment settlement
non-atomic.

## 9. State and UI integration

- TanStack Query owns interactive remote account, admin and finance state.
- Query keys contain all identifiers, filters, sorts and pagination inputs.
- Mutations replace authoritative resources or invalidate targeted keys after success.
- Financial optimistic updates are prohibited.
- URL search parameters own list filters, pagination, sorting and selected records.
- Local form and overlay state remains local.
- Existing account, checkout and admin JSX/classes are preserved where practical.
- Fake success toasts become server-confirmed success, explicit pending state, actionable error or an
  honest unavailable state when an external capability is not configured.

## 10. Error contract

All machine APIs use the existing success/error envelope and request correlation. Expected failures
use stable codes, including:

- `CHECKOUT_PRICE_CHANGED`;
- `STOCK_NOT_AVAILABLE`;
- `PAYMENT_PENDING`;
- `PAYMENT_AMOUNT_MISMATCH`;
- `PAYMENT_METHOD_UNAVAILABLE`;
- `REFUND_LIMIT_EXCEEDED`;
- `TRANSFER_REQUIRES_OTP`;
- `TRANSFER_BALANCE_INSUFFICIENT`;
- `MFA_CHALLENGE_REQUIRED`;
- `RESOURCE_NOT_OWNED`.

Provider messages, database errors and stack traces remain server-side. Client copy is stable and
actionable. Cancellation, timeout, abandoned popup, challenge continuation, provider outage and
missing configuration are distinct states.

## 11. Delivery sequence

1. Build the exact endpoint, method, consumer, dummy-state and legacy-dependency ledger.
2. Add Prisma models, constraints and migrations.
3. Deliver core account profile, addresses, saved products, orders, reviews and returns.
4. Deliver preferences, notifications, privacy, support, export and deletion.
5. Deliver Supabase email, password, MFA and supported session operations.
6. Deliver server-authoritative checkout, Paystack popup continuation, settlement and saved methods.
7. Deliver refunds, disputes, balance, ledger, settlements, recipients and owner-only transfers.
8. Reconcile remaining storefront/admin API contracts and migrate production UI ownership.
9. Delete fully migrated dummy, feature, action and compatibility architecture.
10. Run reviewer and release-readiness gates on the exact final head.

Each slice includes data, domain, API, typed client/hook, UI integration and focused verification.
The task is not complete when only routes or schemas exist.

## 12. Explicit exclusions

The application does not currently require:

- Paystack subscriptions or plans;
- marketplace subaccounts or transaction splits;
- Dedicated Virtual Accounts;
- bulk payouts;
- Paystack Terminal integration;
- ZAR-only preauthorization;
- a generic CRUD endpoint for every Prisma model;
- internal HTTP calls from Server Components.

Paystack-enabled one-time payment channels remain available through Popup according to the store's
Paystack configuration. Saved-card authorization reuse is included. Direct-debit mandate products
remain excluded until Laitstyles has an approved recurring or saved-bank mandate workflow.

## 13. Verification and completion

Required evidence includes:

- Prisma format, validation, migration and generated-client checks through repository `pnpm`
  scripts and Prisma CLI;
- architecture guards, Biome, TypeScript, unit and Route Handler tests;
- ownership and capability coverage;
- concurrent checkout and serializable transaction coverage;
- duplicate initialization, verification and webhook replay;
- amount, currency, reference and customer mismatch handling;
- partial/full refund and needs-attention recovery;
- transfer OTP, reversal and duplicate-submission handling;
- Supabase email, password, MFA and session acceptance;
- production build and React Doctor;
- browser checkout popup, cancellation, refresh and confirmation;
- account/admin interaction checks at required desktop, tablet and mobile viewports;
- Paystack test-mode and public webhook evidence where configured;
- final diff, presentation, accessibility and legacy-boundary review.

Unavailable credentials, live databases, webhooks or external services are reported as blockers,
not passes. No phase, integration or endpoint family is complete without its actual consumer,
persistence, authorization and executed evidence.
