# Complete API Plan 06 — Refunds and Disputes Gate

**Plan:** `docs/superpowers/plans/2026-07-28-complete-api-06-refunds-disputes.md`  
**Spec:** `docs/superpowers/specs/2026-07-28-complete-api-account-payments-design.md`  
**Reviewed branch:** `codex/plan-06-refunds-disputes`  
**Review date:** 2026-07-30  
**Reviewer verdict:** **IMPLEMENTATION COMPLETE; VALIDATION GATE BLOCKED**

## Agent workflow used

The implementation followed the fixed six-role Laitstyles agent system introduced by commit
`66433b46e164c60a5e1821de21ef964a4f6d7ba8`:

1. **Orchestrator** — classified Plan 06 as a data/domain/API/UI/reviewer workflow, kept scope on refunds and disputes, and enforced handoffs.
2. **Planner** — reconciled the active branch with the approved Plan 06 and account/payments specification before implementation continued.
3. **Data engineer** — extended the existing payment refund and dispute ledger instead of creating parallel records, and added the lifecycle migration.
4. **Domain engineer** — implemented provider adapters, local-first commands, idempotent reconciliation, authorization, APIs and typed clients.
5. **UI engineer** — implemented API-backed refund and dispute workspaces in the existing admin shell without redesigning the product.
6. **Reviewer** — reviewed provider contracts, financial invariants, dependency direction, file-size thresholds, security boundaries and acceptance evidence.

These were explicit sequential role handoffs in one controlled execution. They were not represented as six independently running background processes.

## Plan implementation status

### Task 1 — Paystack refund adapter: implemented

- Creates, fetches and lists Paystack refunds through the shared server-only client.
- Uses integer minor units and explicit NGN boundaries.
- Preserves provider status, customer note and merchant correlation note.
- Normalizes unknown provider states without exposing secret or unrestricted provider payloads.
- Provider-contract tests cover create/fetch/list, pagination, partial amounts and normalized errors.

### Task 2 — Refund domain operations: implemented

- Creates the local refund command and immutable audit event before calling Paystack.
- Uses a serializable transaction to calculate the remaining captured amount across pending, processing, needs-attention and processed refunds.
- Enforces owner-only `payments:refund`; managers retain `finance:read` visibility.
- Supports full, partial, return-linked and order-line-allocated refunds.
- A repeated payment/idempotency identity returns the original command.
- Concurrent refund requests cannot reserve more than the captured amount.
- Only provider-confirmed `processed` state updates order totals, order-line refund facts, linked return totals and payment events.
- Processed refunds are terminal; late failed or out-of-order provider events cannot regress financial state.
- Retry first resolves known provider truth. A refund without a provider reference uses a compare-and-set claim so only one concurrent caller can execute another provider request.

### Task 3 — Refund and payment APIs/clients: implemented

- Admin payment list, detail and timeline routes expose finance-safe local/provider reconciliation projections.
- Refund list, create, detail and retry routes use thin authenticated handlers.
- Reads require `finance:read`; provider money movement requires `payments:refund`.
- Mutations require a trusted same-origin request and an `Idempotency-Key` header.
- Responses are `private, no-store` and exclude raw provider responses, authorizations and secrets.
- Typed TanStack clients invalidate refund, payment, order and return resources after canonical mutations.
- The shared payment timeline includes provider transitions, operator identities and immutable refund/dispute audit events.

### Task 4 — Paystack dispute adapter and domain: implemented

- Implements list, fetch, update, evidence metadata, signed upload URL, accept and decline operations.
- Uses the current documented Paystack resolution values and preserves unknown/new provider states.
- Accepts documented partial nested transaction/customer response shapes without weakening the top-level customer projection.
- Signed evidence upload URLs are validated before use.
- Evidence files are restricted to PDF, PNG or JPEG and a 5 MB maximum.
- Provider disputes correlate to local payments by provider transaction ID or transaction reference.
- Signed provider events upsert one local dispute and replay identical state without duplicate order or audit transitions.
- Locally submitted evidence descriptors are retained separately in metadata and survive later provider refreshes.
- Active disputes place the order in `review_required`; terminal resolution restores the correct paid, partially-refunded or refunded aggregate state.
- Archived provider disputes are treated as terminal while the raw provider status remains available for audit.

### Task 5 — Dispute APIs and typed clients: implemented

- Publishes list, detail/update, evidence, accept and decline admin routes.
- Reads require `finance:read`; evidence and decisions require `payments:refund`.
- Mutation routes enforce same-origin and idempotency identities.
- The evidence endpoint rejects missing/unbounded content length, oversized bodies, malformed multipart input and unsupported file types before provider upload.
- Query clients retain prior list pages and invalidate dispute, payment and order summaries after mutation.
- The Paystack webhook inbox now handles refund and dispute financial events through the same durable upsert and conditional processing claim used by checkout settlement.

### Task 6 — Admin refund and dispute workspaces: implemented

- `/admin/payments` provides captured-payment selection, remaining-refundable amount, full/partial commands, over-refund prevention and failed/needs-attention retry visibility.
- The refund workspace distinguishes submitted, processing and processed states and never optimistically changes financial totals.
- `/admin/disputes` provides due-date ordering, provider status, bounded evidence upload and explicit accept/decline confirmation.
- Managers receive read-only finance workspaces; owner/admin capability is required for provider mutations.
- Both workspaces render the shared actor/provider/audit timeline.
- Existing admin layout, navigation, components and responsive visual language are preserved.
- Interaction tests cover full/partial refunds, over-refund prevention, submitted-vs-processed copy, retry visibility, evidence validation, decision confirmation and read-only manager controls.

## Reviewer corrections integrated

- Added refund/dispute lifecycle fields and uniqueness to the existing Prisma ledger rather than duplicating payment records.
- Preserved Paystack merchant/customer refund notes so webhook correlation can recover the local command identity.
- Added same-origin checks to refund and dispute mutations.
- Added mandatory operation idempotency headers.
- Replaced unsafe refund retry execution with a compare-and-set provider claim.
- Made processed refund state terminal in both the core domain and webhook correlation boundary.
- Added durable refund/dispute webhook routing to the existing provider inbox claim mechanism.
- Accepted Paystack's documented partial nested dispute transaction customer shape.
- Added signed-upload host validation and pre-buffer upload size/type enforcement.
- Preserved locally submitted evidence metadata across provider refreshes.
- Prevented terminal disputes from resetting partially-refunded/refunded orders to paid.
- Normalized archived disputes as terminal while retaining the raw provider status.
- Added operator/audit facts to the existing payment timeline instead of introducing a second history store.
- Split refund and dispute projection, line allocation, evidence and idempotency responsibilities so the production coordinators remain below the repository architecture warning threshold.
- Removed the type-only dependency cycle between the dispute coordinator and idempotency helper.

## Checks performed in this execution

| Check | Result | Evidence |
| --- | --- | --- |
| Plan/spec reconciliation | PASS by inspection | Tasks and constraints were mapped directly to the approved Plan 06 and account/payments specification. |
| Agent-role contract | PASS by inspection | All six roles from commit `66433b46...` were used as sequential handoffs. |
| Provider contract review | PASS by official-document inspection | Refund/dispute endpoints, resolution values, webhook names, evidence metadata and signed-upload flow were checked against current Paystack documentation. |
| Ledger ownership | PASS by inspection | Existing payments, refunds, disputes, returns, order lines, audit events and webhook inbox are extended; no parallel payment ledger was added. |
| Authorization boundary | PASS by inspection | Finance reads and owner-only refund/decision capabilities are server-enforced. |
| Mutation transport security | PASS by inspection | Same-origin and idempotency checks are applied to refund/dispute mutations. |
| Financial state invariants | PASS by code/test inspection | Refund ceilings, terminal processed state, replay no-op and post-dispute aggregate order reconciliation are covered. |
| Architecture file threshold | PASS by inspection | Refund/dispute coordinators were split below the production warning threshold; no guard was weakened. |
| UI ownership | PASS by inspection | New production UI is under `src/modules/payments/ui/**` and current admin route ownership is preserved. |

## Authoritative commands not executed here

The following repository commands were not run successfully in this execution environment:

```bash
pnpm prisma:validate
pnpm prisma:migrate:status
pnpm test \
  src/modules/payments/server/paystack/refunds.test.ts \
  src/modules/payments/server/paystack/disputes.test.ts \
  src/modules/payments/server/refunds.test.ts \
  src/modules/payments/server/refund-retry.test.ts \
  src/modules/payments/server/refund-webhooks.test.ts \
  src/modules/payments/server/disputes.test.ts \
  src/modules/payments/server/dispute-order-state.test.ts \
  src/app/api/v1/admin/payments \
  src/app/api/v1/admin/refunds \
  src/app/api/v1/admin/disputes \
  src/app/api/v1/payments/webhooks/paystack \
  src/modules/payments/client \
  src/modules/payments/ui
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm build
pnpm react-doctor
```

Reason:

- the private repository checkout and installed dependency tree are not mounted in the execution container;
- the available container does not provide the repository's required Node 25/pnpm/Prisma toolchain;
- direct container access to the private GitHub repository is unavailable;
- repository Actions are dependent on runner/organization availability and queued or failed-to-start jobs are not accepted as validation evidence.

No skipped or unavailable command is reported as passing.

## Provider and browser acceptance still required

Task 7 remains blocked until a Node 25 checkout records:

- focused tests, architecture, Biome, typecheck, build and React Doctor on this exact implementation head;
- a real database concurrency replay showing partial/full refund ceiling safety;
- repeated processed/failed refund webhook delivery proving one financial transition;
- repeated dispute create/remind/resolve delivery proving one local transition;
- keyboard-only and responsive browser checks at 375×812, 768×1024 and 1280×800 in required themes;
- Paystack test-mode refund create/list/detail and available dispute/evidence/decision operations;
- evidence signed-upload behavior through the deployed proxy/runtime;
- confirmation that order and return financial facts change only after authoritative processed refund events.

If Paystack test credentials, dispute fixtures or webhook delivery are unavailable, that live portion must remain explicitly blocked. Mocked unit coverage alone does not satisfy the provider gate.

## Current verdict

Tasks 1–6 are implemented and the reviewer-identified integration defects are repaired. Task 7 is **not passed** because authoritative repository, browser, database-concurrency and live-provider acceptance have not executed successfully on this exact branch head.
