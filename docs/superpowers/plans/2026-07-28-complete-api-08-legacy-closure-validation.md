# Complete API Migration Closure and Validation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every remaining storefront, account and admin transport gap, remove superseded feature/action simulations, enforce the target module architecture and produce evidence that the complete `/api/v1` surface is production-ready.

**Architecture:** Re-inventory the repository after plans 01-07, implement any ledger endpoint still missing through its owning module, migrate all active client consumers to typed API clients, then delete legacy code only after import/reference proofs. Automated architecture rules prevent regressions; reviewer evidence, including live Supabase and Paystack gates, determines completion.

**Tech Stack:** Next.js 16, TypeScript, Prisma, Supabase Auth, Paystack, TanStack Query, Vitest, Playwright, Biome, React Doctor.

## Global Constraints

- Rebase this plan against the dirty worktree and completed plan commits before touching overlapping account, returns, products or admin files.
- Do not delete a feature/action/server file until `rg` and architecture tests prove it has no runtime consumer.
- Server Components may call module query functions directly; client components use typed API adapters/hooks.
- No pass-through endpoint is required merely to mirror a page. Add only resource operations named in the approved ledger or discovered as an active client gap.
- A mocked provider test does not satisfy a live integration acceptance gate.

---

### Task 1: Reconcile the Final API and Consumer Ledger

**Owner:** Laitstyles planner

**Files:**
- Modify: `docs/architecture-migration/api-account-payments-ledger.md`
- Create: `docs/architecture-migration/api-consumer-map.md`
- Modify: `docs/architecture-migration/README.md`

- [ ] **Step 1: Inventory every implemented Route Handler**

Run:

```bash
rg --files src/app/api | sort
rg -n "export async function (GET|POST|PUT|PATCH|DELETE)" src/app/api
```

Record method, path, auth/capability, domain operation, consumer, cache policy, tests and current status. Compare it line-by-line with the approved index ledger.

- [ ] **Step 2: Inventory every browser data boundary and simulation**

Run:

```bash
rg -n "fetch\(|useQuery|useMutation|toast\.|setTimeout\(|Math\.random|demo|mock|dummy|simulat" src/app src/components src/features src/modules src/stores
rg -n "use server|from ['\"].*/actions|from ['\"].*/server" src/app src/components src/features src/modules
```

Classify each result as typed API consumption, valid Server Component query, valid command bridge, development fixture/story, or migration defect. List each migration defect with its exact replacement module/API.

- [ ] **Step 3: Freeze the zero-gap ledger**

Every active browser mutation/read must map to an implemented API or be explicitly classified as local ephemeral UI state. Every API must map to at least one authorized use case or documented external integration such as Paystack webhooks.

- [ ] **Step 4: Commit**

```bash
git add docs/architecture-migration/api-account-payments-ledger.md docs/architecture-migration/api-consumer-map.md docs/architecture-migration/README.md
git commit -m "docs(architecture): reconcile final API consumer ledger"
```

### Task 2: Close Remaining Storefront Resource Gaps

**Owner:** Laitstyles domain engineer

**Files:**
- Modify/create only the `src/modules/*/{schema,types,server,client}/**` and `src/app/api/v1/**` files explicitly marked missing in the reconciled ledger.
- Create focused `*.test.ts` files adjacent to each missing domain operation and Route Handler.

- [ ] **Step 1: Add a failing contract test per missing operation**

For each ledger row, test method/path, input schema, authorization/ownership, response projection, cache header and error envelope before implementation. Do not combine unrelated resource behavior in one handler.

- [ ] **Step 2: Implement module operation, thin handler and typed client**

Follow the established API response helpers and identity/capability middleware. Keep Prisma access in module server code, not Route Handlers or client adapters.

- [ ] **Step 3: Verify all storefront APIs**

```bash
pnpm test src/app/api/v1 src/modules
pnpm check:architecture
pnpm typecheck
```

- [ ] **Step 4: Commit the exact ledger rows closed**

Stage only the listed operation/route/client/test files and the ledger status changes.

```bash
git commit -m "feat(api): close remaining storefront resource gaps"
```

### Task 3: Close Remaining Admin Resource Gaps

**Owner:** Laitstyles domain engineer

**Files:**
- Modify/create only admin-facing module operations, clients and `src/app/api/v1/**` handlers marked missing in the reconciled ledger.
- Modify adjacent API/module tests.

- [ ] **Step 1: Write failing capability and contract tests**

Exercise owner/admin/staff boundaries separately. Include bulk-action limits, pagination/filter schemas, optimistic-concurrency/version conflicts and audit records for sensitive mutations.

- [ ] **Step 2: Implement through existing resource groupings**

Extend resource routes such as customers, orders, inventory, returns, assets and settings instead of mirroring admin page folders. Reuse the same operation when storefront and admin read the same resource with different projections/capabilities.

- [ ] **Step 3: Verify and commit**

```bash
pnpm test src/app/api/v1 src/modules
pnpm check:architecture
pnpm typecheck
git add src/app/api/v1 src/modules docs/architecture-migration/api-account-payments-ledger.md
git commit -m "feat(api): close remaining admin resource gaps"
```

### Task 4: Migrate Remaining Client Consumers into Modules

**Owner:** Laitstyles UI engineer

**Files:**
- Move active `src/features/storefront/**` UI to owning `src/modules/*/ui/**` directories according to the consumer map.
- Move active `src/features/admin/**` UI to owning `src/modules/*/ui/**` directories according to the consumer map.
- Modify corresponding route segments under `src/app/**`.
- Modify `src/stores/**` only for genuinely client-owned ephemeral/cart/session state.

- [ ] **Step 1: Write or retain interaction tests before each move**

Capture current accessible labels, loading/empty/error/success states, pagination/filter behavior and mutation confirmation. A move must not silently redesign the screen.

- [ ] **Step 2: Connect typed clients and canonical cache keys**

Remove direct client imports of Prisma, server modules and Server Actions. Use query keys owned by the resource module and invalidate exact affected keys after confirmed mutations.

- [ ] **Step 3: Remove dummy behavior from active UI**

Delete fake success delays, local-only persistence, fixed demo rows and generated transaction/receipt values. Keep fixture data only in tests, Storybook stories or explicit development fixtures excluded from production paths.

- [ ] **Step 4: Verify and commit in bounded module groups**

```bash
pnpm test src/modules src/app
pnpm check:architecture
pnpm typecheck
git add src/app src/modules src/features src/stores
git commit -m "refactor(ui): complete module and API consumer migration"
```

### Task 5: Delete Superseded Actions, Features and Server Roots

**Owner:** Laitstyles domain engineer with UI engineer review

**Files:**
- Delete only superseded files under `src/features/**`, legacy `src/server/**` and account/storefront Server Actions identified in the consumer map.
- Modify: `src/modules/architecture.test.ts`
- Modify: repository import-boundary configuration used by `pnpm check:architecture`.

- [ ] **Step 1: Prove each deletion target is unreferenced**

Run `rg -n` for the import path, exported symbols and filenames. Record the zero-consumer evidence in the consumer map before deleting.

- [ ] **Step 2: Delete in small ownership batches**

After each batch run focused tests and typecheck. If a consumer appears, migrate it or retain the file and update the ledger; never replace it with a compatibility re-export that perpetuates the boundary.

- [ ] **Step 3: Strengthen architecture rules**

Fail when client code imports Prisma/server-only modules, when Route Handlers import Server Actions, when new active code is added to retired `src/features/**` or legacy `src/server/**`, or when browser code constructs undeclared ad hoc API URLs outside typed clients.

- [ ] **Step 4: Verify and commit**

```bash
pnpm check:architecture
pnpm typecheck
pnpm test
git add src/features src/server src/modules/architecture.test.ts src/app src/modules docs/architecture-migration/api-consumer-map.md
git commit -m "refactor(architecture): remove superseded application boundaries"
```

### Task 6: Validate Database and Migration State with Prisma

**Owner:** Laitstyles data engineer

**Files:**
- Modify migration documentation/status files under `docs/architecture-migration/**` with executed evidence only.

- [ ] **Step 1: Validate schema and generated client**

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate:status
```

- [ ] **Step 2: Execute migrations in the configured validation database**

Use the repository Prisma migration command and the configured non-production validation database. Do not use Supabase CLI. Run the migration from a clean schema and verify all indexes, unique constraints, foreign keys and encrypted-field requirements introduced in plan 01.

- [ ] **Step 3: Run persistence integration tests**

Exercise address/default races, notification uniqueness, export/deletion jobs, checkout settlement replay, refund ceilings, webhook inbox uniqueness, one-default-payment-method and transfer idempotency.

- [ ] **Step 4: Record truth and commit**

Document exact commands, database class, pass/fail and limitations. Do not include credentials or connection strings.

```bash
git add docs/architecture-migration
git commit -m "docs(data): record API migration database validation"
```

### Task 7: Run Full Automated and Browser Gates

**Owner:** Laitstyles reviewer

- [ ] **Step 1: Run repository gates**

```bash
pnpm check:architecture
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
```

- [ ] **Step 2: Run Playwright journeys**

Cover guest storefront browsing/cart/checkout; authenticated profile/address/order/return/review/payment-method/preferences/privacy/notification/support/export/deletion flows; admin resource flows; and owner finance/refund/dispute/settlement/recipient/transfer flows. Test required mobile/desktop viewports, light/dark themes, keyboard operation and visible focus.

- [ ] **Step 3: Run concurrency and replay suites**

Execute concurrent checkout, settlement replay, duplicate webhook, refund ceiling, one-default invariants, export/deletion duplication and transfer double-submit/reversal tests against the validation database.

- [ ] **Step 4: Classify failures**

Fix in-scope regressions through the owning role and rerun the failed gate. Report pre-existing failures with command/output and ownership; do not silently waive them.

### Task 8: Run Live Supabase and Paystack Acceptance Gates

**Owner:** Laitstyles reviewer

- [ ] Execute email change, password change, MFA enrol/challenge/unenrol and supported session invalidation against the configured Supabase Auth project.
- [ ] Execute Paystack test-mode checkout/Popup/verify/webhook, saved authorization/setup refund, transaction/list/detail, refund, available dispute operations, balance, settlements, bank resolution, recipient and transfer/OTP/event flows.
- [ ] Verify invalid signatures, replayed events, popup cancellation, provider timeout and recovery-by-reference.
- [ ] Redact all captured evidence and report unavailable provider capabilities as blocked acceptance rows.

### Task 9: Publish the Completion Report

**Owner:** Laitstyles reviewer

**Files:**
- Create: `docs/architecture-migration/complete-api-account-payments-completion.md`
- Modify: `docs/architecture-migration/api-account-payments-ledger.md`
- Modify: `docs/architecture-migration/README.md`

- [ ] **Step 1: Record final evidence**

Include route/method count, consumer-map closure, migration status, automated command results, browser journeys, live-provider results, known limitations and remaining blocked rows.

- [ ] **Step 2: Confirm zero unclassified production simulations**

Re-run the inventory searches from Task 1. Every match must have a documented valid classification; otherwise the migration remains incomplete.

- [ ] **Step 3: Commit the report**

```bash
git add docs/architecture-migration/complete-api-account-payments-completion.md docs/architecture-migration/api-account-payments-ledger.md docs/architecture-migration/README.md
git commit -m "docs(architecture): report complete API migration"
```

- [ ] **Step 4: Apply completion rule**

Mark the program complete only when every required ledger row and reviewer gate passes. If a live provider environment is unavailable, report implementation complete but provider acceptance blocked, naming the exact unexecuted flows.
