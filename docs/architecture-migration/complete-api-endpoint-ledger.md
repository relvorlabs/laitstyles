# Complete API Endpoint and Prototype Interaction Ledger

**Purpose:** Task 1 of the `2026-07-28-complete-api-01-ledger-persistence-foundation.md` plan (part of the
8-plan `2026-07-28-complete-api-account-paystack-index.md` suite). This document freezes the exact
`/api/v1` Route Handler baseline and every prototype/browser-owned/server-direct interaction in the
storefront account, checkout and admin-finance surfaces, **before** any schema or code changes in later
tasks. It is the accurate written baseline the rest of the suite builds from.

**Captured from:**

- Worktree: `C:/Users/olaitan/Dev/laitstyles/.claude/worktrees/plan-01-ledger-persistence`
- Branch: `worktree-plan-01-ledger-persistence`
- HEAD commit: `54570e02ed3ebd809c6f03f4b536c17c3a98f510` (2026-07-28 18:43:52 +0100)
- Capture date: 2026-07-28
- Working tree at capture time: clean (`git status` reported "nothing to commit, working tree clean")

## Step 1 evidence: exact route/method baseline

Command run (bash, translated from the brief's PowerShell — same route.ts scan):

```bash
find src/app/api/v1 -type f -name "route.ts" | sort
```

Result: 31 `route.ts` files.

```bash
rg -n "^export async function (GET|POST|PATCH|PUT|DELETE)" src/app/api/v1
```

(Run via the Grep tool, since neither the bash nor PowerShell shell in this environment has an `rg`
binary on PATH — the harness's Grep tool is ripgrep-backed and produced the equivalent scan.)

Result: every exported HTTP method across all 31 files matched **exactly** the 30 entries in the index's
"Existing API Baseline" section, method-for-method, path-for-path — **plus one route not in the index**:
`GET /api/v1/health` (`src/app/api/v1/health/route.ts`). See BASE-031 and the Judged classifications
section below.

## Step 2 evidence: prototype interaction scan

Command run:

```bash
rg -n "demo modal|toast\(|not available yet|setTimeout\(|Promise\.resolve|sessionStorage|paystack\.shop" src/features src/app src/modules
```

(Run via the Grep tool across the superset path `src/`, which covers the brief's three named
directories plus `src/providers`, `src/lib`, `src/server` and `src/types`; no matches existed outside
`src/features`, `src/app` or `src/modules` except the browser-state hydrator under `src/providers`,
which is included below for completeness.)

Result: 60+ matches. Test-file matches (`*.test.ts`) were excluded as non-production. Every remaining
production match is represented by a ledger row below — either directly, or folded into the row for the
target endpoint/interaction it belongs to (e.g. six distinct `toast("... not available yet")` calls in
account sections each map onto their own target-ledger row rather than being duplicated).

## Ledger

| ID | Surface | Method/path or interaction | Consumer | Domain owner | Auth/capability | Current source | Target plan | Deletion gate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BASE-001 | Existing API | GET /api/v1/products | src/modules/products/client/api.ts (storefront catalogue) | Products module | Public (storefront) | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-002 | Existing API | GET,POST /api/v1/admin/products | src/modules/products/client/api.ts (admin catalogue table/create) | Products module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-003 | Existing API | GET,PATCH,DELETE /api/v1/admin/products/[id] | src/modules/products/client/api.ts | Products module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-004 | Existing API | POST /api/v1/admin/products/[id]/archive | src/modules/products/client/api.ts | Products module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-005 | Existing API | POST /api/v1/admin/products/[id]/restore | src/modules/products/client/api.ts | Products module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-006 | Existing API | GET,POST /api/v1/admin/products/taxonomy | src/modules/products/client/api.ts (catalogue-structure-workspace) | Products module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-007 | Existing API | PATCH,DELETE /api/v1/admin/products/taxonomy/[id] | src/modules/products/client/api.ts | Products module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-008 | Existing API | POST /api/v1/admin/products/taxonomy/reorder | src/modules/products/client/api.ts | Products module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-009 | Existing API | GET /api/v1/admin/inventory | src/modules/inventory/client/api.ts | Inventory module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-010 | Existing API | POST /api/v1/admin/inventory/adjustments | src/modules/inventory/client/api.ts | Inventory module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-011 | Existing API | GET /api/v1/admin/inventory/stock-movements | src/modules/inventory/client/api.ts | Inventory module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-012 | Existing API | GET /api/v1/admin/orders | src/modules/orders/client/api.ts (admin orders workspace) | Orders module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-013 | Existing API | GET,PATCH /api/v1/admin/orders/[orderId] | src/modules/orders/client/api.ts | Orders module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-014 | Existing API | POST /api/v1/admin/orders/offline-sales | src/modules/orders/client/api.ts (record-sale dialog, offline-sale-checkout.ts) | Orders module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-015 | Existing API | GET /api/v1/admin/orders/sale-customers | src/modules/orders/client/api.ts | Orders module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-016 | Existing API | GET /api/v1/admin/holds | src/modules/holds/client/api.ts (admin holds workspace) | Holds module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-017 | Existing API | GET /api/v1/admin/holds/[holdId] | src/modules/holds/client/api.ts | Holds module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-018 | Existing API | POST /api/v1/admin/holds/[holdId]/extend | src/modules/holds/client/api.ts | Holds module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-019 | Existing API | POST /api/v1/admin/holds/[holdId]/release | src/modules/holds/client/api.ts | Holds module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-020 | Existing API | POST /api/v1/admin/holds/[holdId]/convert | src/modules/holds/client/api.ts | Holds module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-021 | Existing API | GET,POST /api/v1/admin/returns | src/modules/returns/client/api.ts (admin returns workspace) | Returns module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-022 | Existing API | GET,PATCH /api/v1/admin/returns/[returnId] | src/modules/returns/client/api.ts | Returns module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-023 | Existing API | GET /api/v1/admin/returns/eligible-orders | src/modules/returns/client/api.ts | Returns module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-024 | Existing API | GET /api/v1/admin/customers | src/modules/customers/client/api.ts | Customers module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-025 | Existing API | GET /api/v1/admin/customers/[customerId] | src/modules/customers/client/api.ts | Customers module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-026 | Existing API | POST /api/v1/admin/customers/[customerId]/notes | src/modules/customers/client/api.ts | Customers module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-027 | Existing API | GET /api/v1/admin/overview | src/modules/overview/client/api.ts (admin dashboard) | Overview module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-028 | Existing API | GET,PATCH /api/v1/admin/settings | src/modules/settings/client/api.ts (incl. accepted payment methods and refund-method config) | Settings module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-029 | Existing API | POST /api/v1/admin/assets/sign | Admin media/asset upload signer (Cloudinary), features/admin consumers | Assets/media | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-030 | Existing API | POST /api/v1/auth/invitations | src/modules/auth/server/staff-invitations.ts consumer (admin invite flow) | Auth module | Admin staff session | real | Preserve — Plan 8 reconciliation only | N/A — retained baseline |
| BASE-031 | Existing API | GET /api/v1/health | Ops/uptime checks (no in-repo typed client found) | Platform/infra | Public | real | Not in the approved index — confirm disposition with planner before Plan 8 legacy-deletion closure | Ambiguous — not authorized for deletion without an explicit planner decision (see Judged classifications) |
| ACCT-001 | Target account API | GET,PATCH /api/v1/account/profile | ProfileSection (Server Component read) + updateAccountProfile Server Action (write), app/(storefront)/account/profile/{page,actions}.ts | Account/Profile (Prisma profiles, profile_details, customers) | Consumer session (Supabase) | server-direct | Plan 2 adds the versioned Route Handler transport for external/browser-refresh clients; UI already reads/writes real Prisma data | N/A — transport addition only, no fake state to remove |
| ACCT-002 | Target account API | GET,POST /api/v1/account/addresses | AddressesSection, src/features/storefront/account/sections/addresses-section.tsx (hardcoded "Ada Okafor, 18 Example Road") | Account/Addresses (new Prisma model) | Consumer session | prototype | Plan 2 | Delete the hardcoded address JSX and AddAddressModal's fake-success path once GET/POST persist and render real rows |
| ACCT-003 | Target account API | PATCH,DELETE /api/v1/account/addresses/[addressId] | AddressesSection "Edit"/"Delete"/"Make default" (explicit `TODO(button-action)` at line 78) | Account/Addresses | Consumer session | prototype | Plan 2 | Delete `toast("Changing the default address is not available yet.")` and the TODO once the mutation exists |
| ACCT-004 | Target account API | GET,POST /api/v1/account/saved-products | SavedSection + OverviewSection via useAccountProducts()/useStorefrontSavedItems() (Zustand saved-items store) | Storefront-shell client state (target: Account/SavedProducts) | Consumer session | browser-owned | Plan 2 persists saved items server-side; Zustand may remain as an optimistic browser cache only | Remove client-only-source-of-truth path once server persistence is authoritative |
| ACCT-005 | Target account API | DELETE /api/v1/account/saved-products/[productId] | Same Zustand saved-items store | Storefront-shell client state | Consumer session | browser-owned | Plan 2 | Same as ACCT-004 |
| ACCT-006 | Target account API | GET /api/v1/account/orders | AccountOrdersPage Server Component -> getAccountOrders(), modules/orders/server/account-orders.ts + Prisma | Orders module | Consumer session | server-direct | Plan 2 adds the Route Handler transport (no route exists yet under api/v1/account); Server Component usage is preserved per doctrine | N/A |
| ACCT-007 | Target account API | GET /api/v1/account/orders/[orderNumber] | AccountOrderDetailPage -> getAccountOrder(), modules/orders/server/account-orders.ts | Orders module | Consumer session | server-direct | Plan 2 | N/A |
| ACCT-008 | Target account API | POST /api/v1/account/orders/[orderNumber]/cancellation-requests | CancelItemModal, account-modals.tsx:328-406 (hardcoded "Broken-in Leather Moto", fake toast) | Orders module (rules.ts/transition-order.ts exist server-side, unused here) | Consumer session | prototype | Plan 2 | Remove the modal's client-only success path once a real cancellation-request command + route exist |
| ACCT-009 | Target account API | GET,POST /api/v1/account/returns | ReturnsSection (hardcoded #RT-0038/#RT-0021) | Returns module (queries.ts/commands.ts already power the real admin returns surface, unused here) | Consumer session | prototype | Plan 2 | Delete hardcoded return list once section fetches persisted rows; reuse existing returns commands instead of duplicating |
| ACCT-010 | Target account API | GET /api/v1/account/returns/[returnId] | ReturnDetailSection (hardcoded timeline/summary) | Returns module | Consumer session | prototype | Plan 2 | Remove `toast("Return label download is not available yet.")` and hardcoded timeline once real data/label endpoint exists |
| ACCT-011 | Target account API | POST /api/v1/account/reviews | Existing nested Server Action app/(storefront)/account/orders/[orderNumber]/items/[orderLineId]/review/actions.ts + modules/reviews/server/{repository,policy}.ts | Reviews module | Consumer session, order-line ownership + eligibility policy | server-direct | Plan 2 adds the flat /api/v1/account/reviews Route Handler wrapping the same real repository/policy | N/A — real feature; transport-gap only, not fake state |
| ACCT-012 | Target account API | PATCH,DELETE /api/v1/account/reviews/[reviewId] | Same real repository/policy (edit/withdraw intents modeled in review-page.tsx `intentFor()`) | Reviews module | Consumer session + policy | server-direct | Plan 2 | N/A |
| ACCT-013 | Target account API | GET,PATCH /api/v1/account/preferences | PreferencesSection (hardcoded communication/shopping toggles, fake `toast("Preferences saved")`, no fetch) | Account/Preferences (new) | Consumer session | prototype | Plan 3 | Remove client-only onSubmit toast once persisted |
| ACCT-014 | Target account API | GET,PATCH /api/v1/account/notification-preferences | Same PreferencesSection communication toggles — no UI currently distinguishes this from ACCT-013 | Account/Preferences (new) | Consumer session | prototype | Plan 3 — see Judged classifications (UI merge vs split) | Same as ACCT-013 |
| ACCT-015 | Target account API | GET,PATCH /api/v1/account/notifications | NotificationsSection (hardcoded items array) | Account/Notifications (new) | Consumer session | prototype | Plan 3 | Delete hardcoded `items` array + `toast("Marking all notifications as read is not available yet.")` |
| ACCT-016 | Target account API | PATCH /api/v1/account/notifications/[notificationId] | NotificationsSection row click only navigates today; no read/unread mutation exists | Account/Notifications (new) | Consumer session | prototype | Plan 3 | Same as ACCT-015 |
| ACCT-017 | Target account API | GET,POST /api/v1/account/support-tickets | SupportSection (hardcoded #SP-0119/#SP-0084) | Account/Support (new) | Consumer session | prototype | Plan 3 | Delete hardcoded ticket list once persisted |
| ACCT-018 | Target account API | GET /api/v1/account/support-tickets/[ticketId] | TicketDetailSection (hardcoded thread) | Account/Support (new) | Consumer session | prototype | Plan 3 | Delete hardcoded thread once persisted |
| ACCT-019 | Target account API | POST /api/v1/account/support-tickets/[ticketId]/messages | TicketDetailSection reply form (`toast("Reply sent")`, resets form, no persistence) | Account/Support (new) | Consumer session | prototype | Plan 3 | Remove fake onSubmit + `toast("File attachments are not available yet.")` |
| ACCT-020 | Target account API | GET,PATCH /api/v1/account/privacy-preferences | PrivacySection checkboxes — no onChange handler at all, thinner than Preferences | Account/Privacy (new) | Consumer session | prototype | Plan 3 | Wire persisted onChange once available |
| ACCT-021 | Target account API | GET,POST /api/v1/account/data-exports | PrivacySection "Request export" -> openModal("export") (fake-success pattern) | Account/DataExports (new) | Consumer session | prototype | Plan 3 | Remove fake export-request success once async export pipeline exists |
| ACCT-022 | Target account API | GET /api/v1/account/data-exports/[exportId] | No current UI beyond the request trigger | Account/DataExports (new) | Consumer session | prototype | Plan 3 | N/A until export pipeline exists |
| ACCT-023 | Target account API | GET /api/v1/account/data-exports/[exportId]/download | No current UI | Account/DataExports (new) | Consumer session | prototype | Plan 3 | N/A until export pipeline exists |
| ACCT-024 | Target account API | GET,POST,DELETE /api/v1/account/deletion-requests | PrivacySection "Review deletion" -> DeleteAccountModal, account-modals.tsx:665+ (multi-step confirm, still fake success) | Account/DeletionRequests (new) | Consumer session | prototype | Plan 3 | Remove DeleteAccountModal's fake success path once a real, policy-gated deletion-request command exists (open orders/returns/refunds/disputes must block it, currently unenforced) |
| ACCT-025 | Target account API | POST /api/v1/account/security/email-change | ChangeEmailModal, account-modals.tsx:63+ (real client validation, fake `toast("Email change started")`) | Auth module (Supabase Auth) | Consumer session | prototype | Plan 4 | Remove fake toast once Supabase email-change is actually called |
| ACCT-026 | Target account API | PATCH /api/v1/account/security/password | ChangePasswordModal, account-modals.tsx:410+ (fake `toast("Password changed")`) | Auth module (Supabase Auth) | Consumer session | prototype | Plan 4 | Same pattern as ACCT-025 |
| ACCT-027 | Target account API | GET,POST /api/v1/account/security/mfa/factors | SecuritySection "Enable 2FA" button, explicit `TODO(button-action)`: "after Supabase recent-auth and verification APIs are configured" | Auth module (Supabase MFA) | Consumer session | provider-gap | Plan 4 | Remove `toast("Two-factor authentication is not available yet.")` once Supabase MFA is configured and wired |
| ACCT-028 | Target account API | POST /api/v1/account/security/mfa/challenges | Same 2FA feature; no UI reaches this state yet | Auth module (Supabase MFA) | Consumer session | provider-gap | Plan 4 | Same as ACCT-027 |
| ACCT-029 | Target account API | POST /api/v1/account/security/mfa/challenges/[challengeId]/verify | Same 2FA feature | Auth module (Supabase MFA) | Consumer session | provider-gap | Plan 4 | Same as ACCT-027 |
| ACCT-030 | Target account API | DELETE /api/v1/account/security/mfa/factors/[factorId] | Same 2FA feature | Auth module (Supabase MFA) | Consumer session | provider-gap | Plan 4 | Same as ACCT-027 |
| ACCT-031 | Target account API | GET /api/v1/account/security/sessions | SecuritySection hardcoded device list ("Chrome on Windows", "Safari on iPhone") | Auth module (Supabase session) | Consumer session | prototype | Plan 4 — see Judged classifications (Supabase session-enumeration limitation) | Remove hardcoded list once real session enumeration is wired |
| ACCT-032 | Target account API | DELETE /api/v1/account/security/sessions/others | SecuritySection "Sign out others" -> signout-all modal, fake success | Auth module | Consumer session | prototype | Plan 4 | Remove fake success once wired |
| ACCT-033 | Target account API | GET,POST /api/v1/account/payment-methods | PaymentsSection (hardcoded Visa/Mastercard array) | Payments module (target: Paystack tokenized methods) | Consumer session | prototype | Plan 5 | Remove hardcoded `methods` array + fake "Add method" modal once Paystack tokenized-method storage exists |
| ACCT-034 | Target account API | PATCH,DELETE /api/v1/account/payment-methods/[methodId] | PaymentsSection "Replace method"/"Remove" (fake) | Payments module | Consumer session | prototype | Plan 5 | Same as ACCT-033 |
| ACCT-035 | Target account API | GET /api/v1/account/payment-methods/setup/[attemptId] | No current UI — setup-attempt concept does not exist yet | Payments module | Consumer session | prototype | Plan 5 | N/A until Paystack setup-attempt flow exists |
| ACCT-036 | Target account API | POST /api/v1/account/payment-methods/setup/[attemptId]/verify | No current UI | Payments module | Consumer session | prototype | Plan 5 | N/A until Paystack setup-attempt flow exists |
| PAY-001 | Target checkout/finance API | POST /api/v1/checkout | checkout-flow-v2.tsx `payNow()`/`markPlaced()` (opens hardcoded `https://paystack.shop/pay/1tdagzew46`, writes a fake receipt to sessionStorage, clears cart/releases holds client-side, no server order) | Checkout module (new) | Consumer session (or guest) | prototype | Plan 5 | Delete `payNow`'s static-link branch, `markPlaced`, and `writeLatestOrderReceipt` sessionStorage write once a real server-authoritative checkout + Paystack Popup continuation exist |
| PAY-002 | Target checkout/finance API | GET /api/v1/checkout/[checkoutId] | No persisted checkout entity exists to read | Checkout module (new) | Consumer session | prototype | Plan 5 | Same as PAY-001 |
| PAY-003 | Target checkout/finance API | POST /api/v1/payments/[paymentId]/verify | None yet — modules/payments/server/paystack.ts already implements a real, tested `initializePaystackTransaction()` (POSTs to `https://api.paystack.co/transaction/initialize` using `PAYSTACK_SECRET_KEY`), but nothing calls it and there is no verify counterpart | Payments module | Consumer session | provider-gap | Plan 5 | N/A — additive; existing paystack.ts is reused, not deleted |
| PAY-004 | Target checkout/finance API | POST /api/v1/payments/webhooks/paystack | None — no route, no handler anywhere in the repo | Payments module | Public, raw-body signature verification | transport-gap | Plan 5 | N/A — net-new |
| PAY-005 | Target checkout/finance API | GET /api/v1/admin/payments | None — order_payment_events rows are written by the returns-refund path (see PAY-008) but nothing reads them through an admin API/UI | Payments module | Admin staff session | transport-gap | Plan 5 | N/A — net-new |
| PAY-006 | Target checkout/finance API | GET /api/v1/admin/payments/[paymentId] | None | Payments module | Admin staff session | transport-gap | Plan 5 | N/A — net-new |
| PAY-007 | Target checkout/finance API | GET /api/v1/admin/payments/[paymentId]/timeline | None | Payments module | Admin staff session | transport-gap | Plan 5 | N/A — net-new |
| PAY-008 | Target checkout/finance API | GET,POST /api/v1/admin/refunds | None dedicated — see Judged classifications: the return-status transition to "refunded" (modules/returns/server/commands.ts:272-320, reached via the real BASE-022 PATCH route) already writes a persisted `order_payment_events` row noting "no payment provider was called" — that specific interaction is provider-gap, cross-referenced here, not double-counted | Refunds module (new) | Admin staff session | transport-gap (dedicated surface); provider-gap (existing return-driven refund bookkeeping) | Plan 6 | N/A — net-new dedicated surface |
| PAY-009 | Target checkout/finance API | GET /api/v1/admin/refunds/[refundId] | None | Refunds module (new) | Admin staff session | transport-gap | Plan 6 | N/A — net-new |
| PAY-010 | Target checkout/finance API | POST /api/v1/admin/refunds/[refundId]/retry | None | Refunds module (new) | Admin staff session | transport-gap | Plan 6 | N/A — net-new |
| PAY-011 | Target checkout/finance API | GET /api/v1/admin/disputes | None — no dispute concept anywhere in schema or UI | Disputes module (new) | Admin staff session | transport-gap | Plan 6 | N/A — net-new |
| PAY-012 | Target checkout/finance API | GET,PATCH /api/v1/admin/disputes/[disputeId] | None | Disputes module (new) | Admin staff session | transport-gap | Plan 6 | N/A — net-new |
| PAY-013 | Target checkout/finance API | POST /api/v1/admin/disputes/[disputeId]/evidence | None | Disputes module (new) | Admin staff session | transport-gap | Plan 6 | N/A — net-new |
| PAY-014 | Target checkout/finance API | POST /api/v1/admin/disputes/[disputeId]/accept | None | Disputes module (new) | Admin staff session | transport-gap | Plan 6 | N/A — net-new |
| PAY-015 | Target checkout/finance API | POST /api/v1/admin/disputes/[disputeId]/decline | None | Disputes module (new) | Admin staff session | transport-gap | Plan 6 | N/A — net-new |
| PAY-016 | Target checkout/finance API | GET /api/v1/admin/finance/balance | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-017 | Target checkout/finance API | GET /api/v1/admin/finance/ledger | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-018 | Target checkout/finance API | GET /api/v1/admin/finance/ledger/[transactionId] | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-019 | Target checkout/finance API | GET /api/v1/admin/finance/settlements | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-020 | Target checkout/finance API | GET /api/v1/admin/finance/settlements/[settlementId] | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-021 | Target checkout/finance API | GET /api/v1/admin/finance/settlements/[settlementId]/transactions | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-022 | Target checkout/finance API | GET /api/v1/admin/finance/banks | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-023 | Target checkout/finance API | POST /api/v1/admin/finance/banks/resolve | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-024 | Target checkout/finance API | GET,POST /api/v1/admin/finance/recipients | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-025 | Target checkout/finance API | GET,PATCH,DELETE /api/v1/admin/finance/recipients/[recipientId] | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-026 | Target checkout/finance API | GET,POST /api/v1/admin/finance/transfers | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-027 | Target checkout/finance API | GET /api/v1/admin/finance/transfers/[transferId] | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-028 | Target checkout/finance API | POST /api/v1/admin/finance/transfers/[transferId]/finalize | None | Finance module (new) | Admin staff session (finance capability) + OTP | transport-gap | Plan 7 | N/A — net-new |
| PAY-029 | Target checkout/finance API | POST /api/v1/admin/finance/transfers/[transferId]/resend-otp | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| PAY-030 | Target checkout/finance API | POST /api/v1/admin/finance/reconcile | None | Finance module (new) | Admin staff session (finance capability) | transport-gap | Plan 7 | N/A — net-new |
| MISC-001 | Storefront checkout | Cart line state — useStorefrontCart() (Zustand cart.store.ts) + sessionStorage/localStorage via storefront-client-state.ts/storefront-state-hydrator.tsx | Header, cart page, checkout | Storefront-shell client state | None (anonymous-safe) | browser-owned | Preserve per doctrine ("Zustand owns browser-only shared state") | N/A — by design |
| MISC-002 | Storefront checkout | Recently-viewed products — same hydrator, RECENT_STORAGE_KEY with legacy-key migration | Product cards, account overview rail | Storefront-shell client state | None | browser-owned | Preserve | N/A — by design |
| MISC-003 | Storefront checkout | Non-authoritative hold countdown intent — storefront-ui.store.ts + sessionStorage/localStorage hold keys | Product page, cart, checkout countdown UI | Storefront-shell client state | None | browser-owned | Preserve — server via BASE-016..020 remains authoritative for actual hold expiry; this is a UI countdown only | N/A — by design |
| MISC-004 | Storefront shell (site header) | Utility banner dismissal — UTILITY_STORAGE_KEY sessionStorage flag | Site header utility bar | Storefront-shell client state | None | browser-owned | Preserve | N/A — by design |
| MISC-005 | Storefront catalogue | Catalogue density toggle — product-catalogue.tsx sessionStorage key laitstyles-density | Storefront catalogue grid | Products module (storefront UI) | None | browser-owned | Preserve | N/A — by design |
| MISC-006 | Storefront checkout | Order-confirmation receipt read — order-receipt.ts reads the same sessionStorage key PAY-001 writes | order-confirmation/page.tsx | Checkout module (new) | Consumer session (or guest) | prototype — cross-referenced with PAY-001/PAY-002, not a separate gap | Plan 5 | Delete once PAY-001/002 land and the confirmation page reads a real persisted order |
| MISC-007 | Storefront account | Account toast auto-dismiss timer — account-shell.tsx window.setTimeout clearing the toast pill | All account sections | Account UI shell | Consumer session | browser-owned — UI mechanic, unrelated to persistence | Preserve | N/A — by design |
| MISC-008 | Admin inventory | Admin inventory CSV export blob cleanup — inventory-export.ts window.setTimeout(() => URL.revokeObjectURL(url), 0) | Admin inventory export button | Inventory module (admin UI) | Admin staff session | browser-owned | Preserve | N/A — by design |
| MISC-009 | Admin products | Admin product-media "copied" feedback timer — product-media-viewer.tsx setTimeout clearing copy-feedback state | Admin product media viewer | Products module (admin UI) | Admin staff session | browser-owned | Preserve | N/A — by design |
| MISC-010 | Storefront checkout | Google OAuth popup completion poll — google-oauth-popup.ts setTimeout-based popup-closed/timeout detection | Sign-in/sign-up dialogs | Auth module | None (pre-session) | browser-owned — real OAuth continuation mechanic, not a business-state fake | Preserve | N/A — by design |
| MISC-011 | Account modal/section | Mobile account-menu "Sign out" — account-mobile-menu.tsx:59-68, onClick fires toast("Current-session sign-out selected") and closes the sheet; does **not** call /auth/sign-out | Mobile account nav sheet | Auth module | Consumer session | prototype — see Judged classifications (mismatch vs. MISC-012) | Plan 4 (or an earlier targeted bugfix) | Delete the fake toast once the mobile control performs the real sign-out redirect used by MISC-012 |
| MISC-012 | Account modal/section | Desktop account-sidebar "Sign out" — account-sidebar.tsx:73, `<form action="/auth/sign-out" method="post">` POSTs to the real route, which calls endSession() and 303-redirects | Desktop account sidebar | Auth module | Consumer session | real (server-direct) | Preserve; make MISC-011 match this real path | N/A |
| MISC-013 | Storefront account | Support "Delivery" help shortcut — support-section.tsx:54, `toast("Delivery help is not available yet.")` (adjacent `TODO(button-action)`: open the delivery help article when support content routes exist) | SupportSection help-search shortcuts (distinct from the support-ticket system in ACCT-017..019) | Account/Support (new) — help-center content | Consumer session | prototype | Plan 3 | Remove `toast("Delivery help is not available yet.")` and the TODO once a delivery help-article route/content exists |
| MISC-014 | Storefront account | Support "Returns" help shortcut — support-section.tsx:61, `toast("Returns help is not available yet.")` (adjacent `TODO(button-action)`: open the returns help article when support content routes exist) | SupportSection help-search shortcuts (distinct from ACCT-017..019) | Account/Support (new) — help-center content | Consumer session | prototype | Plan 3 | Remove `toast("Returns help is not available yet.")` and the TODO once a returns help-article route/content exists |
| MISC-015 | Storefront account | Support "Sizing" help shortcut — support-section.tsx:68, `toast("Sizing help is not available yet.")` (adjacent `TODO(button-action)`: open the sizing help article when support content routes exist) | SupportSection help-search shortcuts (distinct from ACCT-017..019) | Account/Support (new) — help-center content | Consumer session | prototype | Plan 3 | Remove `toast("Sizing help is not available yet.")` and the TODO once a sizing help-article route/content exists |
| MISC-016 | Storefront account | Overview dashboard "Track order" button — overview-section.tsx:96, `toast("Carrier tracking is not available yet.")` | OverviewSection current-order card (distinct from ACCT-006/007, which return persisted order data but no carrier-tracking integration) | Orders module (carrier-tracking integration, new) | Consumer session | prototype | Plan 2 | Remove `toast("Carrier tracking is not available yet.")` once a real carrier-tracking integration/link exists |
| MISC-017 | Storefront account | Privacy "Clear" recently-viewed-history button — privacy-section.tsx:63, `toast("Clearing recently viewed history is not available yet.")` (adjacent `TODO(button-action)`: clear recently viewed history after the account history mutation is available) | PrivacySection (distinct from ACCT-020/021/024 privacy checkboxes/data-export/deletion-request rows; cross-referenced with MISC-002's browser-owned recently-viewed storage, which a real mutation would need to clear) | Account/Privacy (new) | Consumer session | prototype | Plan 3 | Remove `toast("Clearing recently viewed history is not available yet.")` and the TODO once a real clear-history mutation exists |

**Row count by category** (machine-counted from the "Current source" column of the 114 data rows above;
PAY-008 is intentionally dual-tagged `transport-gap` + `provider-gap` since it records two distinct real
findings against one target endpoint, so the category tags below sum to 115, not 114):

| Current source | Count | Rows |
| --- | --- | --- |
| real | 32 | BASE-001..031 (31), MISC-012 (1) |
| server-direct | 5 | ACCT-001, 006, 007, 011, 012 |
| prototype | 34 | ACCT-002, 003, 008, 009, 010, 013, 014, 015, 016, 017, 018, 019, 020, 021, 022, 023, 024, 025, 026, 031, 032, 033, 034, 035, 036 (25); PAY-001, 002 (2); MISC-006, 011, 013, 014, 015, 016, 017 (7) |
| provider-gap | 6 | ACCT-027, 028, 029, 030 (4); PAY-003 (1); PAY-008 (1, dual-tagged) |
| transport-gap | 27 | PAY-004 through PAY-030 excluding PAY-008 (26); PAY-008 (1, dual-tagged) |
| browser-owned | 11 | ACCT-004, 005 (2); MISC-001, 002, 003, 004, 005, 007, 008, 009, 010 (9) |

Total unique rows: 114 (31 BASE + 36 ACCT + 30 PAY + 17 MISC).

## Step 4 evidence: completeness validation

Second route/method scan (repeat of Step 1, confirming no drift during authoring):

```bash
find src/app/api/v1 -type f -name "route.ts" | wc -l   # 31, unchanged
```

Second account-section file scan:

```bash
ls src/features/storefront/account/sections   # 13 files — all 13 represented above
ls src/features/storefront/account/modals      # account-modal.tsx, account-modals.tsx, return-wizard.tsx — all represented
```

Every file under `src/app/api/v1/**/route.ts`, every file under
`src/features/storefront/account/{sections,modals}/**`, every path in the index's Existing API Baseline,
Target Account API Ledger and Target Checkout/Payment/Finance Ledger, and every non-test production match
from the Step 2 grep scan has exactly one ledger row (or is explicitly cross-referenced to the row that
covers it, never silently dropped). No ledger row uses deferred wording ("TBD", "later", "eventually") —
every "Target plan" cell names a specific plan number, and every "Deletion gate" cell either names the
exact code to delete or states `N/A` with a reason.

## Judged classifications (ambiguous calls made during this pass)

1. **`GET /api/v1/health` (BASE-031) is not in the index's Existing API Baseline list.** It is a real,
   working route (31 files exist on disk vs. 30 lines in the index). Classified `real` (it works) but
   flagged as needing an explicit planner decision on disposition before Plan 8's legacy-deletion pass,
   since the index's "Completion Definition" implies every retained endpoint should trace to an approved
   ledger entry.
2. **Refund bookkeeping already exists, but not where the target ledger expects it (PAY-008).** The
   admin returns PATCH route (`BASE-022`, real) already transitions a return to `refunded` and writes a
   persisted `order_payment_events` row explicitly noting no payment provider was called
   (`src/modules/returns/server/commands.ts:307-319`). This is a genuine `provider-gap` (real persistence,
   fake provider call) living inside the Returns domain, distinct from the dedicated `/api/v1/admin/refunds/*`
   surface (Plan 6), which has zero implementation (`transport-gap`). Both are recorded against PAY-008
   rather than creating a duplicate row, to avoid double-counting the same underlying database write.
3. **Reviews and Profile are real, but not through the target ledger's flat route shape (ACCT-001,
   011, 012).** Both already work end-to-end via Server Components/Server Actions at different URL
   shapes than `/api/v1/account/profile` and `/api/v1/account/reviews`. Classified `server-direct`
   (accurately describing what happens today) rather than `prototype`, with the Target plan noting the
   Route Handler is a transport addition, not a fake-state removal.
4. **2FA and email/password/session security items look identical in the UI** (all are `toast()`-only
   modals/buttons) but are classified differently: `ACCT-025`/`ACCT-026` (email/password) are `prototype`
   because Supabase Auth already supports these operations generically; `ACCT-027`..`030` (MFA) are
   `provider-gap` because the in-repo TODO comment explicitly ties them to a Supabase project
   configuration step ("recent-auth and verification APIs configured") that is an external dependency,
   not just unwired frontend code.
5. **Notification preferences vs. general preferences (ACCT-013/014).** The current UI has one
   `PreferencesSection` with a single "Communication" toggle group; the target ledger has two distinct
   endpoints (`/preferences` and `/notification-preferences`). Both rows are recorded against the same
   current UI rather than inventing a second, non-existent UI section — Plan 3 must decide whether to
   split the UI or keep one screen backed by two endpoints.
6. **Session enumeration (ACCT-031) may not be a straightforward Supabase capability.** Supabase Auth
   does not natively expose a "list all device sessions for this user" API in the way the hardcoded UI
   implies (`Chrome on Windows`, `Safari on iPhone`). Flagged as `prototype` (accurately describing
   today) but the report notes this may require additional session-tracking infrastructure in Plan 4,
   not just a UI/data swap.
7. **Mobile vs. desktop sign-out mismatch (MISC-011/012) is a real, user-facing inconsistency**, not
   just a documentation nuance: the desktop sidebar's sign-out button actually signs the user out
   (`POST /auth/sign-out`); the mobile menu's sign-out button only shows a toast and does nothing. This
   was not previously called out in the index and is surfaced here as a concrete, evidenced finding.
