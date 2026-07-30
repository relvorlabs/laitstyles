# Complete API Plan 05 — Paystack Checkout and Methods Gate

**Plan:** `docs/superpowers/plans/2026-07-28-complete-api-05-paystack-checkout-methods.md`  
**Spec:** `docs/superpowers/specs/2026-07-28-complete-api-account-payments-design.md`  
**Reviewed branch:** `codex/plan-05-paystack-checkout`  
**Reviewed implementation head:** `53ca45db3249cc8c30a60291bc5e265cfbf58f18`  
**Reviewer verdict:** **IMPLEMENTATION COMPLETE; VALIDATION GATE BLOCKED**

## Agent workflow used

The implementation and review followed the repository roles introduced by commit
`66433b46e164c60a5e1821de21ef964a4f6d7ba8`:

1. **Orchestrator** — maintained the Plan 05 branch and integrated every checkpoint into PR #58.
2. **Planner** — reconciled the code against the approved Plan 05 and account/payments specification.
3. **Data engineer** — restored the Prisma/Supabase ownership boundary and payment authorization uniqueness.
4. **Domain engineer** — closed setup-charge lifecycle, ownership, refund and account-isolation gaps.
5. **UI engineer** — completed checkout refresh recovery, retry states and saved-method interaction coverage.
6. **Reviewer** — inspected architecture boundaries, split the oversized payment-method command and recorded this gate.

These were explicit sequential role handoffs in one controlled execution. They were not represented as independent parallel processes.

## Plan implementation status

### Task 1 — Paystack provider adapter: implemented

- Server-only Paystack request boundary with configuration checks, timeouts and sanitized provider errors.
- Transaction initialization, verification and normalized authorization/customer projections.
- Signed raw-body webhook parsing and supported event normalization.
- Refund and authorization deactivation adapters used by Plan 05.

### Task 2 — Authoritative checkout and settlement: implemented

- Serializable checkout draft creation reloads owned address, delivery zone, catalogue and stock facts.
- Server computes all amounts and persists order, order lines, holds and payment attempt before Paystack initialization.
- One settlement operation validates reference, amount, currency and customer before payment/order/stock transition.
- Replayed verification and webhook settlement return the existing terminal state without duplicating stock transitions.

### Task 3 — APIs and typed clients: implemented

- Authenticated checkout creation and owned checkout-status routes.
- Server verification accepts only the payment identifier, never a client amount.
- Paystack webhook reads the untouched body, verifies the signature and uses a durable single-claim inbox.
- Checkout query and mutation keys target canonical checkout, order and account resources.

### Task 4 — Reusable payment methods: implemented

- Fixed NGN 50 server-created setup charge.
- Customer/email, amount, currency and reusable-authorization verification.
- Encrypted authorization code and masked descriptor persistence, including country code.
- Database-enforced provider/signature ownership.
- Same-customer duplicate tombstoning and transactional one-default-method invariant.
- Matching refund record created before the provider call; only one concurrent verifier claims provider refund execution.
- Setup initialization and terminal verification failure close payment, authorization, internal order and idempotency state.
- Default and deactivation routes enforce ownership; pending placeholders are never sent to Paystack.

### Task 5 — Storefront checkout and account payments UI: implemented

- Browser-only Paystack Popup boundary uses the server-issued access code.
- Popup completion never marks a payment successful locally.
- Checkout creation persists the owned checkout ID in the URL.
- Refresh loads the canonical server checkout and enters a recovery view for pending/failed/abandoned/reversed/review states.
- Recovery retries the recorded checkout and clears cart/holds only after server-confirmed success.
- Saved-method UI uses API/TanStack flows for setup, default selection and deletion.
- Internal `LS-METHOD-*` setup orders are excluded from merchandise order history, detail and cancellation surfaces.

### Task 6 — Offline sales convergence: implemented

- Paystack in-person sales create pending orders, payment attempts and reserved stock.
- Access codes are returned only through the authenticated staff flow.
- Popup return invokes server verification and converges on the same settlement operation as storefront checkout/webhooks.
- No admin browser path directly marks an order paid.

## Reviewer corrections integrated

- Fixed the record-sale `payment.messae` compile typo.
- Replaced webhook find/create races with durable upsert plus conditional processing claim.
- Hardened setup idempotency for concurrent and cross-account key reuse.
- Enforced one owner per Paystack provider signature in both application and database layers.
- Removed unsupported Paystack InlineJS `onClose` usage.
- Added authorization country persistence and migration constraint.
- Restored the repository's Prisma/Supabase ownership boundary after the initial P4002 workaround proved incorrect:
  - Prisma remains scoped to `schemas = ["public"]`;
  - Prisma commands use the repository's normal multi-file schema directly;
  - the temporary `auth` schema injector and shadow `auth.users` table were removed;
  - Supabase SQL drops `profiles_auth_user_fk` and owns auth-user deletion synchronization through an `auth.users` trigger.
- Split `payment-methods.ts` from 762 lines to 579 lines into idempotency, lifecycle and projection responsibilities.

## Checks actually executed in the reviewer environment

| Check | Result | Evidence |
| --- | --- | --- |
| Prisma ownership boundary | PASS by inspection | Datasource remains public-only; no runtime auth schema injection or Prisma-managed auth table exists. |
| TypeScript parser — transformed `payment-methods.ts` | PASS | Exact transformed source parsed with TypeScript 5.8.3 before publication. |
| TypeScript parser — checkout recovery component | PASS | Authored recovery TSX parsed before publication. |
| Architecture line threshold | PASS by inspection | `payment-methods.ts` reduced to 579 lines; production error is >800 and warning is >600. |
| Exact-head branch synchronization | PASS | Plan 05 and shared PR branch advanced through every checkpoint. |

## Commands not executed here

The following authoritative repository commands were **not** run in this execution environment:

```bash
pnpm prisma:validate
pnpm prisma:migrate:status
pnpm test src/app/api/v1/checkout src/app/api/v1/payments src/modules/checkout \
  src/modules/payments src/modules/orders src/app/api/v1/account/payment-methods \
  src/app/api/v1/admin/orders/offline-sales
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm build
pnpm react-doctor
```

Reason:

- the private repository checkout and its installed dependencies are not mounted in this local container;
- the container has Node 22, no `pnpm` and no Prisma CLI, while the repository requires Node 25;
- GitHub Actions jobs are pinned to an unavailable self-hosted runner;
- a temporary GitHub-hosted source-export workflow was attempted, but the organization prevented the job from starting before any step executed.

Queued or failed-to-start workflow state is **not** accepted as validation evidence.

## Provider/browser acceptance still required

The final reviewer gate remains blocked until a Node 25 local checkout runs the commands above and records:

- identical manual verification and webhook replay proving one payment/order/stock transition;
- Popup success, cancellation, callback error, failed retry and refresh recovery at required themes/viewports;
- saved-method setup/default/delete interaction tests;
- Paystack test-mode initialization, verification, signed webhook delivery, reusable authorization and NGN 50 setup-refund lifecycle.

If Paystack credentials or webhook delivery are unavailable, the live portion must remain explicitly blocked; mocked unit coverage alone does not satisfy that part of Task 7.

## Current verdict

Tasks 1–6 are implemented and the identified integration defects are repaired. Task 7 is **not passed** because the authoritative repository, browser and live-provider commands have not run successfully on this exact head.
