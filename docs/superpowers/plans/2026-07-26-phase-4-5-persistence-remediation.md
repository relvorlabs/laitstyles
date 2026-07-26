# Phase 4–5 Persistence Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove and, only where evidence requires it, repair Phase 4 Products/Inventory and Phase 5 Orders, Holds, Returns, Customers, Settings, and Overview against a disposable real database, inherited auth boundary, fresh-process reload, and exact authorization gates.

**Architecture:** WS6a first establishes one secret-safe Supabase-local/PostgreSQL harness and deterministic actor/data contract. Phase 4 and Phase 5 then pass one independently rejectable domain gate at a time in the mandated order, using existing domain commands and `/api/v1/**` transports rather than new repositories. WS6b finally replays representative writes through a fresh server process and browser context and emits the cross-domain verdict consumed by final certification.

**Tech Stack:** Node 25.x, pnpm 11.13.0, Next.js 16.2.10, React 19.2.4, TypeScript, Vitest 4.1.x, Prisma 7.8.0, PostgreSQL 17, Supabase CLI/local Auth, Playwright 1.61.x, Zod, TanStack Query.

## Global Constraints

- The controlling design is `docs/superpowers/specs/2026-07-26-phase-1-6-full-acceptance-design.md`; repository doctrine and `update.md` Phases 1–6 remain authoritative.
- Execute on one recorded candidate SHA. A source edit creates a new candidate and invalidates later evidence produced for the old SHA.
- Use `pnpm`; install with `pnpm install --frozen-lockfile`. Do not change dependency versions or weaken frozen installation.
- Run database work only against Supabase-local or a disposable PostgreSQL 17 database. Never point these tasks at production or a shared developer database.
- Prisma is authoritative. A mocked repository, local array, fixture-backed production fallback, `Promise.resolve()` wrapper, or browser store does not prove persistence.
- Preserve the three inventory modes exactly: `unique`, `stocked`, and `variant`.
- Preserve existing HTTP envelopes, error codes, request correlation, domain contracts, API URLs, cache keys, and UI presentation.
- Every domain gate proves: authorized mutation, direct database read, authoritative query/API read, fresh-process or fresh-browser read, forbidden actor, missing-capability actor, and transaction rollback where the domain has a multi-record transition.
- Tests are written before production repairs. Repair only the root cause exposed by the failing test and only in the owning domain paths named by that task.
- React/UI files are not touched by this plan. Visual parity is handed to WS7 after WS6b.
- Small commits are required at each task boundary. Do not combine two Phase 5 domains in one commit.
- Narrow path amendment to the approved design: create `src/test/persistence-harness.ts` for shared test-only database actors/builders and `scripts/checks/phase-1-6-persistence.ts` for the cross-process verdict. These files prevent six copies of destructive setup logic; production modules may not import either file.
- A schema/migration change is exceptional. If an existing invariant cannot be satisfied, stop the domain task, hand the evidence to the data engineer, add a forward-only reviewed migration under `prisma/migrations/**`, document compatibility/rollback, and rerun WS6a before continuing.

## Explicit Exclusions

- Phase 7 authentication consolidation: do not move `src/server/auth/**`, alter auth routes/forms, change Supabase sign-in semantics, or delete auth compatibility edges.
- Phase 8 settlement: do not add payment verification, webhook settlement, paid-order transition, committed-stock settlement, delivery creation, refund settlement, or server-authoritative checkout redesign. In-person Paystack initialization remains `pending-payment`.
- Phase 9 broad deletion: do not remove remaining `src/features/**`, top-level auth server code, or compatibility exports outside a directly proven Phase 4–5 duplicate.
- No UI redesign, copy change, screenshot-baseline update, speculative endpoint, generic CRUD framework, repository-per-model layer, or dependency/framework upgrade.

## File and Interface Map

| Path | Responsibility |
| --- | --- |
| `src/test/persistence-harness.ts` | Test-only disposable-database guard, deterministic actors, seeded IDs, cleanup, and direct/fresh-process probes |
| `scripts/auth/setup-local-auth.mjs` | Start local Supabase, write secret env outside evidence, generate Prisma, deploy migrations, seed deterministic data |
| `scripts/auth/run-auth-e2e.mjs` | Start the production server and execute inherited auth plus Phase 4–5 authorization checks |
| `scripts/checks/phase-1-6-persistence.ts` | Cross-domain mutation/reload verifier and redacted JSON evidence writer |
| `scripts/ci/run-gates.mjs` | Add required `persistence` and `authorization` gates without weakening existing database gates |
| `scripts/ci/run-local-verification.mjs` | Invoke the new gates during full validation and treat missing manifests as failure |
| `src/modules/products/server/product-persistence.test.ts` | Product list/detail/write/reload and capability contract |
| `src/modules/inventory/server/inventory-persistence.test.ts` | Three-mode stock, movement, concurrency, and rollback contract |
| `src/modules/{orders,holds,returns,customers,settings}/server/*-persistence.test.ts` | One persistence/authorization gate per Phase 5 domain |
| `src/modules/overview/server/overview-persistence.test.ts` | Projection freshness over authoritative domain records |
| `docs/architecture-migration/phase-4-products-inventory-status.md` | Phase 4 evidence reconciliation only after both Phase 4 gates pass |
| `docs/architecture-migration/phase-5-admin-dummy-domain-status.md` | Ordered Phase 5 evidence ledger and per-domain verdicts |
| `docs/architecture-migration/phase-1-6-full-acceptance.md` | WS6a/WS6b evidence index, commands, SHA, database identity digest, and verdict |

The shared harness must expose this exact test-only interface:

```ts
export type AcceptanceActors = {
  admin: StaffSession;
  manager: StaffSession;
  consumerProfileId: string;
  suspendedProfileId: string;
};

export type AcceptanceSeed = {
  actors: AcceptanceActors;
  customerId: string;
  uniqueProductId: string;
  stockedProductId: string;
  variantProductId: string;
  variantId: string;
  deliveredOrderId: string;
  activeHoldId: string;
};

export function assertDisposableAcceptanceDatabase(): URL;
export async function resetAcceptanceData(): Promise<void>;
export async function seedAcceptanceData(): Promise<AcceptanceSeed>;
export async function disconnectAcceptanceDatabase(): Promise<void>;
export async function runFreshProcessProbe(
  probe: "products" | "inventory" | "orders" | "holds" | "returns" | "customers" | "settings" | "overview",
  identifiers: Record<string, string>,
): Promise<Record<string, unknown>>;
```

`runFreshProcessProbe` must launch a new Node/tsx process, not reuse the module-local Prisma singleton. Its output contains identifiers and stable domain values only—never URLs, credentials, cookies, tokens, email addresses, or personal notes.

---

### Task 1: WS6a — Disposable Database and Inherited Auth Harness

**Owner:** Data engineer for Prisma/Supabase setup; domain engineer for test-only actor/probe interfaces; reviewer for the gate manifest.

**Files:**
- Create: `src/test/persistence-harness.ts`
- Create: `scripts/checks/phase-1-6-persistence.ts`
- Modify: `scripts/auth/setup-local-auth.mjs`
- Modify: `scripts/auth/run-auth-e2e.mjs`
- Modify: `scripts/ci/run-gates.mjs`
- Modify: `scripts/ci/run-local-verification.mjs`
- Modify: `package.json`
- Test: `src/test/persistence-harness.test.ts`
- Modify after passing: `docs/architecture-migration/phase-1-6-full-acceptance.md`

**Interfaces:**
- Consumes: committed Prisma migrations, local Supabase CLI output, `DATABASE_URL`, `DIRECT_URL`, existing `db:seed:storefront`, and the current `StaffSession` contract.
- Produces: the exact `AcceptanceActors`, `AcceptanceSeed`, database guard, cleanup, disconnect, and fresh-process probe interface above; package scripts `test:persistence` and `test:authorization`; required CI suite manifests named `persistence` and `authorization`.

- [ ] **Step 1: Write the disposable-database guard tests**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertDisposableAcceptanceDatabase } from "@/test/persistence-harness";

describe("acceptance database guard", () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    process.env.DATABASE_URL = original;
    vi.unstubAllEnvs();
  });

  it("rejects an unmarked database", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:5432/laitstyles");
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "0");
    expect(() => assertDisposableAcceptanceDatabase()).toThrow("Refusing non-disposable database");
  });

  it("accepts the marked local Supabase database", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://postgres:postgres@127.0.0.1:54322/postgres");
    vi.stubEnv("LAITSTYLES_ACCEPTANCE_DATABASE", "1");
    expect(assertDisposableAcceptanceDatabase().hostname).toBe("127.0.0.1");
  });
});
```

- [ ] **Step 2: Run the guard test and verify red**

Run: `pnpm exec vitest run src/test/persistence-harness.test.ts --reporter=verbose`

Expected: FAIL because `@/test/persistence-harness` does not exist.

- [ ] **Step 3: Implement the minimal shared harness and fresh-process CLI**

Implement `assertDisposableAcceptanceDatabase()` with both the explicit `LAITSTYLES_ACCEPTANCE_DATABASE=1` marker and a deny-list for known production hosts. Implement deterministic UUID/name prefixes (`acceptance-p45-`) and cleanup in foreign-key-safe transactions. Implement actor rows for admin, manager, consumer, and suspended states, and return `StaffSession` values only for staff actors. Implement `runFreshProcessProbe()` by spawning:

```ts
spawnSync("pnpm", ["exec", "tsx", "scripts/checks/phase-1-6-persistence.ts", "--probe", probe, "--ids", JSON.stringify(identifiers)], {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf8",
  shell: process.platform === "win32",
});
```

The CLI must call the existing domain query for the named probe, print one JSON object to stdout, call `prisma.$disconnect()`, and exit non-zero on a missing record or malformed identifier.

- [ ] **Step 4: Make local Auth setup identify the database as disposable without leaking secrets**

Add `LAITSTYLES_ACCEPTANCE_DATABASE: "1"` only to `.env.auth-test.local`; keep connection strings out of `ci-evidence/**`. Add a preflight call to the database guard before migration or seed. Preserve `supabase stop --no-backup` in `finally`.

- [ ] **Step 5: Add required repository commands and suite wiring**

Add:

```json
"test:persistence": "tsx scripts/checks/phase-1-6-persistence.ts",
"test:authorization": "node scripts/auth/run-auth-e2e.mjs --authorization"
```

In `run-gates.mjs`, define required suites that execute Prisma validate/deploy/status followed by `pnpm test:persistence`, and local auth setup followed by `pnpm test:authorization`. Ensure manifests retain exit code, duration, redacted log, and candidate SHA supplied by the provenance workstream.

- [ ] **Step 6: Run WS6a focused checks**

Run:

```bash
pnpm exec vitest run src/test/persistence-harness.test.ts --reporter=verbose
pnpm auth:local:setup
pnpm prisma:validate
pnpm prisma:migrate:deploy
pnpm prisma:migrate:status
```

Expected: guard tests PASS; local setup succeeds; Prisma reports a valid schema and all committed migrations applied. If Supabase CLI is unavailable, stop and report WS6a blocked—do not substitute mocks.

- [ ] **Step 7: Record the WS6a handoff and commit**

Update only the WS6a section of `phase-1-6-full-acceptance.md` with candidate SHA, tool versions, redacted database identity digest, commands, exit codes, and artifact paths.

```bash
git add src/test/persistence-harness.ts src/test/persistence-harness.test.ts scripts/checks/phase-1-6-persistence.ts scripts/auth/setup-local-auth.mjs scripts/auth/run-auth-e2e.mjs scripts/ci/run-gates.mjs scripts/ci/run-local-verification.mjs package.json docs/architecture-migration/phase-1-6-full-acceptance.md
git commit -m "test(persistence): establish disposable phase 4-5 harness"
```

**Gate:** Reviewer rejects the task unless a real disposable database migrates and seeds, guard tests prove shared/production refusal, fresh-process probe execution is demonstrated, inherited auth setup works, and logs contain no secrets.

**Rollback/concurrency:** Stop local Supabase with `supabase stop --no-backup`; delete only acceptance-prefixed rows in the disposable database. If a migration was necessary, revert application use first and use a reviewed compensating migration—never edit an applied migration or reset a shared database.

---

### Task 2: WS3 — Products Persistence and Authorization

**Owner:** Domain engineer; data engineer only if a schema invariant fails; reviewer gates before Inventory starts.

**Files:**
- Create: `src/modules/products/server/product-persistence.test.ts`
- Modify only if the test proves a defect: `src/modules/products/server/product-commands.ts`
- Modify only if the test proves a defect: `src/modules/products/server/lifecycle-commands.ts`
- Modify only if the test proves a defect: `src/modules/products/server/queries.ts`
- Modify only if the test proves a defect: `src/app/api/v1/admin/products/route.ts`
- Modify only if the test proves a defect: `src/app/api/v1/admin/products/[id]/route.ts`
- Modify only if the test proves a defect: `src/app/api/v1/admin/products/[id]/archive/route.ts`
- Modify only if the test proves a defect: `src/app/api/v1/admin/products/[id]/restore/route.ts`

**Interfaces:**
- Consumes: WS6a `AcceptanceSeed`, `saveProduct(actor, values, intent)`, `getAdminProduct(id)`, `listAdminProducts(input)`, `archiveProduct`, `restoreProduct`, and `deleteProduct`.
- Produces: one persisted Product per inventory mode, stable admin/public reads, authorization results, and fresh-process Product probe evidence for Inventory and Phase 5 consumers.

- [ ] **Step 1: Write the failing Product persistence matrix**

Create parameterized cases for `unique`, `stocked`, and `variant`. Use the existing `ProductEditorValues` builders already exercised by `product-commands.test.ts`, replacing names and IDs with the acceptance prefix. Assert:

```ts
const saved = await saveProduct(seed.actors.admin, values, "publish");
expect(saved.ok).toBe(true);
if (!saved.ok) throw new Error(saved.error.message);

const direct = await prisma.products.findUniqueOrThrow({ where: { id: saved.value.product.id } });
expect(direct.inventory_mode).toBe(mode);
expect((await getAdminProduct(direct.id))?.name).toBe(values.name);

await disconnectAcceptanceDatabase();
const fresh = await runFreshProcessProbe("products", { productId: direct.id });
expect(fresh).toMatchObject({ productId: direct.id, inventoryMode: mode, publication: "published" });
```

Also assert manager/admin capability differences already encoded by `canManageProduct`, lifecycle persistence after archive/restore, and delete rejection while related stock/history makes deletion unsafe.

- [ ] **Step 2: Run the Product test and verify the first real failure**

Run: `pnpm exec vitest run src/modules/products/server/product-persistence.test.ts --reporter=verbose`

Expected: FAIL on the first unproven persistence, capability, lifecycle, or fresh-process assertion; record the exact assertion and database state.

- [ ] **Step 3: Repair only the evidenced Product root cause**

Keep `saveProduct` as the single transaction owner. Route handlers continue calling domain commands directly and keep Phase 3 envelopes. Do not add a repository, alternate writer, storefront fallback, or unused endpoint. Preserve cache invalidation through `invalidateProductCatalogue()`.

- [ ] **Step 4: Add authorization coverage at the HTTP boundary**

Extend the authorization mode of `scripts/auth/run-auth-e2e.mjs` to call `POST /api/v1/admin/products` with anonymous, consumer, manager, and admin sessions. Assert `401`, `403`, or success according to the existing capability table, stable error envelopes for denials, and no row creation for denied requests.

- [ ] **Step 5: Run the Product gate**

Run:

```bash
pnpm exec vitest run src/modules/products/server/product-persistence.test.ts src/modules/products/server/product-commands.test.ts src/modules/products/server/lifecycle-commands.test.ts
pnpm test:authorization -- --domain products
pnpm check:architecture
pnpm typecheck
```

Expected: all Product tests PASS; denied actors create no Product; architecture and TypeScript exit 0.

- [ ] **Step 6: Commit and hand off canonical Product IDs to Inventory**

```bash
git add src/modules/products/server/product-persistence.test.ts src/modules/products/server/product-commands.ts src/modules/products/server/lifecycle-commands.ts src/modules/products/server/queries.ts src/app/api/v1/admin/products scripts/auth/run-auth-e2e.mjs
git commit -m "test(products): prove prisma persistence and authorization"
```

**Gate:** Products list/detail/create/update/archive/restore/delete behavior is database-authoritative, all three inventory-mode definitions persist after a fresh process, denied actors cause no write, and no runtime fallback exists.

**Rollback/concurrency:** Delete only acceptance-prefixed Products in dependency-safe order. A Product write contract change reopens Inventory and all Phase 5 consumers.

---

### Task 3: WS3 — Inventory Persistence, Concurrency, and Rollback

**Owner:** Domain engineer; reviewer gate must pass before Orders starts.

**Files:**
- Create: `src/modules/inventory/server/inventory-persistence.test.ts`
- Modify only if evidenced: `src/modules/inventory/server/adjust-stock.ts`
- Modify only if evidenced: `src/modules/inventory/server/stock-write.ts`
- Modify only if evidenced: `src/modules/inventory/server/operational-stock.ts`
- Modify only if evidenced: `src/modules/inventory/server/queries.ts`
- Modify only if evidenced: `src/app/api/v1/admin/inventory/adjustments/route.ts`
- Modify after passing: `docs/architecture-migration/phase-4-products-inventory-status.md`

**Interfaces:**
- Consumes: three persisted Products from Task 2 and `adjustInventoryStock(actor, input)`.
- Produces: authoritative balances, immutable movements/audit rows, mode invariants, serializable-concurrency verdict, and Phase 4 acceptance handoff.

- [ ] **Step 1: Write the failing three-mode and atomicity tests**

```ts
const adjusted = await adjustInventoryStock(seed.actors.admin, {
  productId,
  variantId,
  quantityDelta: 2,
  note: "Phase 4 acceptance adjustment",
});
expect(adjusted.ok).toBe(true);

const [balance, movements] = await Promise.all([
  prisma.stock_levels.findFirstOrThrow({ where: { product_id: productId, variant_id: variantId } }),
  prisma.stock_movements.findMany({ where: { product_id: productId, variant_id: variantId } }),
]);
expect(balance.available).toBe(previousAvailable + 2);
expect(movements.at(-1)).toMatchObject({ kind: "adjusted", quantity: 2 });
```

Add cases proving: `unique` never exceeds one; stocked inventory rejects a variant ID; variant inventory requires an owned variant; negative availability rolls back; two concurrent updates cannot both claim the same previous balance; failure writes neither movement nor audit row.

- [ ] **Step 2: Run the Inventory test and capture red evidence**

Run: `pnpm exec vitest run src/modules/inventory/server/inventory-persistence.test.ts --reporter=verbose`

Expected: FAIL on an existing invariant, rollback, concurrency, or probe gap before any production repair.

- [ ] **Step 3: Repair the smallest Inventory defect**

Keep the existing Serializable transaction/update-many compare-and-swap design. Preserve `applyOperationalStockMutation` as the shared stock transition primitive. Do not relax unique/variant ownership or make the browser authoritative.

- [ ] **Step 4: Prove the Inventory HTTP capability boundary**

Exercise `POST /api/v1/admin/inventory/adjustments` through the inherited sessions. Assert anonymous/consumer/manager-without-required-capability denial as applicable, admin success, stable error envelope, and unchanged balance after every denial.

- [ ] **Step 5: Run and record the complete Phase 4 gate**

Run:

```bash
pnpm exec vitest run src/modules/products/server src/modules/inventory/server src/app/api/v1/admin/products src/app/api/v1/admin/inventory
pnpm test:authorization -- --domain inventory
pnpm test:persistence -- --domain phase4
pnpm prisma:validate
pnpm check:architecture
pnpm typecheck
```

Expected: all commands exit 0; fresh-process evidence shows Product and stock writes; failed transitions leave balances/movements/audits unchanged.

- [ ] **Step 6: Reconcile Phase 4 status and commit**

Record actual SHA, commands, exit codes, and artifact paths. Do not mark UI parity or full Phase 4 acceptance; WS7/WS8 own those final verdicts.

```bash
git add src/modules/inventory/server/inventory-persistence.test.ts src/modules/inventory/server/adjust-stock.ts src/modules/inventory/server/stock-write.ts src/modules/inventory/server/operational-stock.ts src/modules/inventory/server/queries.ts src/app/api/v1/admin/inventory/adjustments/route.ts docs/architecture-migration/phase-4-products-inventory-status.md
git commit -m "test(inventory): prove stock persistence and atomicity"
```

**Gate:** Phase 4 database/reload/auth passes for Products and Inventory before Orders begins.

**Rollback/concurrency:** Reverse only acceptance adjustments through compensating stock movements; never delete ledger rows to hide a failure. Any stock contract change reopens Orders, Holds, and Returns.

---

### Task 4: WS4.1 — Orders Gate

**Owner:** Domain engineer; mandatory first Phase 5 domain.

**Files:**
- Create: `src/modules/orders/server/order-persistence.test.ts`
- Modify only if evidenced: `src/modules/orders/server/transition-order.ts`
- Modify only if evidenced: `src/modules/orders/server/offline-sale-draft.ts`
- Modify only if evidenced: `src/modules/orders/server/offline-sale-checkout.ts`
- Modify only if evidenced: `src/modules/orders/server/queries.ts`
- Modify only if evidenced: `src/app/api/v1/admin/orders/[orderId]/route.ts`
- Modify only if evidenced: `src/app/api/v1/admin/orders/offline-sales/route.ts`

**Interfaces:**
- Consumes: Task 3 stock authority, `transitionOrder`, `createOfflineSaleDraft`, `finalizeInitializedCheckout`, and existing Order queries.
- Produces: persisted legal transition model and pending-payment in-person order/reservation facts consumed by Holds, Returns, Customers, and Overview.

- [ ] **Step 1: Write the failing Order persistence test**

Assert a legal transition persists order aggregate, timeline, stock state, activity, and audit rows atomically. Assert an illegal transition and an offline-sale `payment-confirmed` attempt return typed errors and change no row. Assert `createOfflineSaleDraft` plus successful initialization remains `pending-payment`, has an exact reservation, and survives `runFreshProcessProbe("orders", { orderId })`.

- [ ] **Step 2: Run red**

Run: `pnpm exec vitest run src/modules/orders/server/order-persistence.test.ts --reporter=verbose`

Expected: FAIL at the first unproven persistence/atomicity/reload assertion.

- [ ] **Step 3: Repair only the Order transaction defect**

Keep Paystack verification and settlement absent. Initialization may persist attempt/reference and reservation; no frontend callback or admin transition may mark an in-person order paid.

- [ ] **Step 4: Prove authorization and run the gate**

Run:

```bash
pnpm exec vitest run src/modules/orders/server src/app/api/v1/admin/orders
pnpm test:authorization -- --domain orders
pnpm test:persistence -- --domain orders
```

Expected: PASS; unauthorized writes leave Order, timeline, attempt, and stock rows unchanged.

- [ ] **Step 5: Commit Orders alone**

```bash
git add src/modules/orders/server/order-persistence.test.ts src/modules/orders/server/transition-order.ts src/modules/orders/server/offline-sale-draft.ts src/modules/orders/server/offline-sale-checkout.ts src/modules/orders/server/queries.ts src/app/api/v1/admin/orders
git commit -m "test(orders): prove persisted transitions and pending checkout"
```

**Gate:** Holds work cannot start until Orders passes.

**Rollback/concurrency:** Failed draft initialization cancels the exact draft and releases its exact reservation. Never use broad time-window movement lookup. Settlement remains Phase 8.

---

### Task 5: WS4.2 — Holds Gate

**Owner:** Domain engineer; starts only after Orders gate.

**Files:**
- Create: `src/modules/holds/server/hold-persistence.test.ts`
- Modify only if evidenced: `src/modules/holds/server/commands.ts`
- Modify only if evidenced: `src/modules/holds/server/queries.ts`
- Modify only if evidenced: `src/app/api/v1/admin/holds/[holdId]/extend/route.ts`
- Modify only if evidenced: `src/app/api/v1/admin/holds/[holdId]/release/route.ts`
- Modify only if evidenced: `src/app/api/v1/admin/holds/[holdId]/convert/route.ts`

**Interfaces:**
- Consumes: persisted Order/stock contracts and `extendHold`, `releaseHold`, `convertHold`.
- Produces: persisted hold/reservation facts consumed by Returns, Overview, Phase 6 browser intent joins, and WS6b.

- [ ] **Step 1: Write the hold matrix**

Assert extend uses compare-and-swap expiry, release returns exact reserved quantity, convert creates one pending Order while retaining reserved stock, concurrent release/convert has one winner, and every losing/invalid path writes neither duplicate Order nor duplicate movement.

- [ ] **Step 2: Run red**

Run: `pnpm exec vitest run src/modules/holds/server/hold-persistence.test.ts --reporter=verbose`

Expected: FAIL on the first unproven concurrency/reload assertion.

- [ ] **Step 3: Apply the minimum transaction repair and run authorization**

Preserve existing typed errors and exact hold ID linkage. Run `pnpm test:authorization -- --domain holds`; denied actors must leave hold expiry/status and stock unchanged.

- [ ] **Step 4: Run the gate and commit**

```bash
pnpm exec vitest run src/modules/holds/server src/app/api/v1/admin/holds
pnpm test:persistence -- --domain holds
git add src/modules/holds/server src/app/api/v1/admin/holds
git commit -m "test(holds): prove reservation persistence and races"
```

Expected: all tests PASS and fresh-process probe returns exactly one final hold/order state.

**Gate:** Holds extend/release/convert operations persist exactly once, concurrent operations have one winner, denied actors cause no write, and stock/order/hold records agree after a fresh process.

**Rollback/concurrency:** Use compensating stock mutation for an acceptance cleanup; retain immutable movements/audits.

---

### Task 6: WS4.3 — Returns Gate

**Owner:** Domain engineer; starts only after Holds gate.

**Files:**
- Create: `src/modules/returns/server/return-persistence.test.ts`
- Modify only if evidenced: `src/modules/returns/server/commands.ts`
- Modify only if evidenced: `src/modules/returns/server/queries.ts`
- Modify only if evidenced: `src/app/api/v1/admin/returns/route.ts`
- Modify only if evidenced: `src/app/api/v1/admin/returns/[returnId]/route.ts`

**Interfaces:**
- Consumes: delivered persisted Order lines and Inventory operational stock mutations.
- Produces: one persisted Return lifecycle with exact eligible quantities, stock outcome, activity/audit rows, and fresh-process evidence.

- [ ] **Step 1: Write the return lifecycle and locking tests**

Use a delivered acceptance Order. Assert duplicate line IDs and over-return fail without writes; concurrent creates for the same line respect the advisory lock; legal transitions persist; restocked/damaged paths update exact quantities once; illegal transitions roll back all aggregate, stock, activity, and audit changes.

- [ ] **Step 2: Run red and repair the exact failing transaction**

Run: `pnpm exec vitest run src/modules/returns/server/return-persistence.test.ts --reporter=verbose`

Expected: FAIL before repair, then PASS after the minimum change to the existing transaction/advisory-lock path.

- [ ] **Step 3: Run authorization, reload, and commit**

```bash
pnpm exec vitest run src/modules/returns/server src/app/api/v1/admin/returns
pnpm test:authorization -- --domain returns
pnpm test:persistence -- --domain returns
git add src/modules/returns/server src/app/api/v1/admin/returns
git commit -m "test(returns): prove lifecycle persistence and stock rollback"
```

Expected: denied actors and invalid transitions leave Return and Inventory state unchanged; fresh process reads the final legal state.

**Gate:** Return eligibility, lifecycle, stock outcome, authorization, advisory locking, rollback, and fresh-process reads pass before Customers starts.

**Rollback/concurrency:** Keep advisory locks and immutable stock history. Do not implement gateway refunds; Phase 5 only records the existing return/refund state contract.

---

### Task 7: WS4.4 — Customers Gate

**Owner:** Domain engineer; starts only after Returns gate.

**Files:**
- Create: `src/modules/customers/server/customer-persistence.test.ts`
- Modify only if evidenced: `src/modules/customers/server/commands.ts`
- Modify only if evidenced: `src/modules/customers/server/queries.ts`
- Modify only if evidenced: `src/app/api/v1/admin/customers/[customerId]/notes/route.ts`
- Modify only if evidenced: `src/app/api/v1/admin/customers/[customerId]/route.ts`

**Interfaces:**
- Consumes: Orders/Returns customer relationships and `addCustomerNote`.
- Produces: persisted internal note plus relationship/detail projections for Overview and WS6b.

- [ ] **Step 1: Write customer note persistence/isolation tests**

Assert empty and overlong notes write nothing; valid note persists with author and audit/activity rows; a note for customer A never appears on customer B; direct DB, `getAdminCustomer`, and fresh-process probe agree.

- [ ] **Step 2: Run red, repair, and prove authorization**

Run:

```bash
pnpm exec vitest run src/modules/customers/server/customer-persistence.test.ts --reporter=verbose
pnpm test:authorization -- --domain customers
```

Expected: first run exposes any gap; final run PASS with `customers:note` enforced at the Route Handler and no denied write.

- [ ] **Step 3: Run reload gate and commit**

```bash
pnpm exec vitest run src/modules/customers/server src/app/api/v1/admin/customers
pnpm test:persistence -- --domain customers
git add src/modules/customers/server src/app/api/v1/admin/customers
git commit -m "test(customers): prove note persistence and isolation"
```

**Gate:** customer list/detail/note reads are Prisma-backed and isolated.

**Rollback/concurrency:** Delete acceptance-prefixed note rows only; never erase customer activity/audit evidence from a non-disposable database.

---

### Task 8: WS4.5 — Settings Gate

**Owner:** Domain engineer; starts only after Customers gate.

**Files:**
- Create: `src/modules/settings/server/settings-persistence.test.ts`
- Modify only if evidenced: `src/modules/settings/server/commands.ts`
- Modify only if evidenced: `src/modules/settings/server/queries.ts`
- Modify only if evidenced: `src/app/api/v1/admin/settings/route.ts`

**Interfaces:**
- Consumes: `saveStoreSettings`, `getStoreSettings`, existing Zod/settings mapper contract.
- Produces: persisted identity/preferences/delivery zones/pickups and manager-versus-admin capability evidence.

- [ ] **Step 1: Write the Settings replacement/rollback tests**

Assert invalid settings write nothing; valid save upserts settings, preserves retained zone/pickup IDs, disables removed entries according to current contract, and survives a fresh process. Force a failure after the first child write and assert the transaction restores all prior settings/zones/pickups.

- [ ] **Step 2: Run red and repair only transaction ownership**

Run: `pnpm exec vitest run src/modules/settings/server/settings-persistence.test.ts --reporter=verbose`

Expected: FAIL at the first unproven atomicity/reload assertion, then PASS after a minimal domain-command repair.

- [ ] **Step 3: Prove capability, reload, and commit**

```bash
pnpm exec vitest run src/modules/settings/server src/app/api/v1/admin/settings
pnpm test:authorization -- --domain settings
pnpm test:persistence -- --domain settings
git add src/modules/settings/server src/app/api/v1/admin/settings
git commit -m "test(settings): prove atomic persisted configuration"
```

Expected: admin update succeeds; manager without `settings:update`, consumer, and anonymous requests fail without a row change.

**Gate:** Settings validation, atomic replacement, retained identifiers, authorization, and fresh-process reload pass before Overview starts.

**Rollback/concurrency:** Restore the previous settings snapshot only inside the disposable acceptance transaction; do not add a second settings owner or browser persistence.

---

### Task 9: WS4.6 — Overview Projection Gate and Phase 5 Handoff

**Owner:** Domain engineer; starts only after Settings gate.

**Files:**
- Create: `src/modules/overview/server/overview-persistence.test.ts`
- Modify only if evidenced: `src/modules/overview/server/queries.ts`
- Modify only if evidenced: `src/app/api/v1/admin/overview/route.ts`
- Modify after passing: `docs/architecture-migration/phase-5-admin-dummy-domain-status.md`

**Interfaces:**
- Consumes: accepted persisted Product, Inventory, Order, Hold, Return, Customer, and Settings facts.
- Produces: authoritative Overview projection and ordered Phase 5 handoff to WS6b.

- [ ] **Step 1: Write the projection freshness test**

Capture `getOverviewData()`, perform one accepted domain mutation through the existing command, query again, and assert the relevant count/value changes exactly once. Disconnect and run the fresh `overview` probe; assert it matches the second projection. Search the production import graph in `src/modules/overview/**` and `src/features/admin/overview/**` and assert no seed/AdminStore/repository owner is imported.

- [ ] **Step 2: Run red and repair only the stale projection path**

Run: `pnpm exec vitest run src/modules/overview/server/overview-persistence.test.ts --reporter=verbose`

Expected: FAIL if the projection is stale, duplicated, or fixture-backed; final test PASS after the minimal query/invalidation correction.

- [ ] **Step 3: Prove read authorization and complete ordered Phase 5 gate**

```bash
pnpm exec vitest run src/modules/orders/server src/modules/holds/server src/modules/returns/server src/modules/customers/server src/modules/settings/server src/modules/overview/server
pnpm test:authorization -- --domain phase5
pnpm test:persistence -- --domain phase5
pnpm check:architecture
pnpm typecheck
```

Expected: all commands exit 0; Phase 5 manifest records domains in Orders → Holds → Returns → Customers → Settings → Overview order.

- [ ] **Step 4: Record Phase 5 evidence and commit Overview alone**

```bash
git add src/modules/overview/server/overview-persistence.test.ts src/modules/overview/server/queries.ts src/app/api/v1/admin/overview/route.ts docs/architecture-migration/phase-5-admin-dummy-domain-status.md
git commit -m "test(overview): prove persisted phase 5 projection"
```

**Gate:** Overview has no mutation owner of its own; it must reflect accepted domain records after the documented freshness boundary. Phase 5 source is not called fully accepted until WS6b, WS7, and WS8 pass.

**Rollback/concurrency:** Revert a projection repair without touching source domain records. An interface change reopens every contributing domain test.

---

### Task 10: WS6b — Cross-Domain Restart, Reload, and Authorization Verdict

**Owner:** Domain engineer executes the matrix, data engineer verifies isolation/migration state, reviewer owns the verdict and evidence completeness.

**Files:**
- Modify: `scripts/checks/phase-1-6-persistence.ts`
- Modify: `scripts/auth/run-auth-e2e.mjs`
- Modify: `scripts/ci/run-gates.mjs`
- Modify: `scripts/ci/run-local-verification.mjs`
- Modify: `docs/architecture-migration/phase-1-6-full-acceptance.md`

**Interfaces:**
- Consumes: all accepted per-domain probes, the WS6a migrated database, deterministic inherited auth actors, production build, and one candidate SHA.
- Produces: `ci-evidence/phase-1-6-full-acceptance/database/persistence-matrix.json`, authorization manifest, redacted logs, and the WS6b pass/block verdict handed to WS7/WS8.

- [ ] **Step 1: Write the failing matrix completeness test**

Add a table containing exactly:

```ts
const requiredRows = [
  "product-create-update-lifecycle",
  "inventory-adjustment",
  "order-transition-pending-checkout",
  "hold-extend-release-convert",
  "return-create-transition",
  "customer-note",
  "settings-save",
  "overview-projection",
] as const;
```

For each row require `mutation`, `databaseRead`, `freshProcessRead`, `freshBrowserOrApiRead`, `authorization`, `rollback`, `sha`, and `status`. The test fails when any field is absent, any SHA differs, or any required status is not `passed`.

- [ ] **Step 2: Run the matrix check and verify red**

Run: `pnpm test:persistence -- --verify-matrix`

Expected: FAIL until every domain row is populated from executed evidence on the current candidate SHA.

- [ ] **Step 3: Execute mutation → DB read → server restart → fresh context → authoritative read**

The persistence CLI must:

1. assert the disposable marker;
2. deploy/status-check committed migrations;
3. seed deterministic actors/data;
4. run each representative mutation through the existing domain/API boundary;
5. query Prisma directly;
6. disconnect and start a fresh production server process;
7. read through a new API/browser context;
8. execute denied actor/capability requests and verify no DB change;
9. execute the rollback/race case;
10. write redacted matrix JSON and disconnect in `finally`.

- [ ] **Step 4: Run the complete database and authorization gates**

Run:

```bash
pnpm auth:local:setup
pnpm prisma:validate
pnpm prisma:migrate:deploy
pnpm prisma:migrate:status
pnpm test:persistence
pnpm test:authorization
pnpm exec vitest run --coverage --passWithNoTests
pnpm build
```

Expected: every command exits 0 on the same candidate SHA; matrix contains eight passed rows; no missing manifest; server restart and fresh context are recorded; coverage and build pass.

- [ ] **Step 5: Review logs for secrets and false persistence**

Search generated evidence for database URLs, passwords, service-role keys, JWTs, cookies, emails, acceptance note bodies, `Promise.resolve(`, fixture fallbacks, and seed imports from production modules. Expected: no secret/personal-data match and no production fallback edge. A match blocks the verdict and routes to the owning task.

- [ ] **Step 6: Record the WS6b verdict and commit**

Update `phase-1-6-full-acceptance.md` with actual SHA, lock digest, database identity digest, exact commands/exit codes, artifact paths/digests, warnings, limitations, and the explicit statement that WS7 visual/accessibility and WS8 final certification remain pending.

```bash
git add scripts/checks/phase-1-6-persistence.ts scripts/auth/run-auth-e2e.mjs scripts/ci/run-gates.mjs scripts/ci/run-local-verification.mjs docs/architecture-migration/phase-1-6-full-acceptance.md
git commit -m "test(persistence): certify phase 4-5 reload and authorization"
```

**Gate:** Reject WS6b for a missing domain row, mixed SHA, skipped command, shared/production database, mocked persistence, denied-write side effect, unproved rollback, secret leak, or fresh-process/read mismatch.

**Rollback/concurrency:** Destroy the disposable environment after evidence capture. If a domain repair was required, discard all later domain/WS6b evidence, freeze a new candidate SHA, rerun WS6a, rerun the changed domain and all dependent gates, then regenerate the entire WS6b matrix.

---

## Final Role Handoff

1. Data engineer supplies the passing WS6a database/auth harness, migration status, isolation proof, and rollback notes.
2. Domain engineer completes Tasks 2–9 strictly in order and publishes each stable domain interface and focused evidence before the next task begins.
3. Reviewer rejects any task with missing/failing evidence, inspects each commit for scope drift, and owns the WS6b verdict.
4. On WS6b pass, hand the unchanged UI to WS7 for Playwright/Axe/visual parity. Do not claim Phase 4–5 FULL acceptance until WS7 and WS8 certify the same SHA.

## Plan Self-Review

- Spec coverage: WS6a, Phase 4 Products/Inventory, the mandatory Phase 5 order, and WS6b are each mapped to an independently testable task and exact paths.
- Type consistency: every task consumes the single `AcceptanceSeed`/actor/probe interface defined above; probe names match the WS6b matrix.
- Scope: Phase 7 consolidation, Phase 8 settlement, Phase 9 deletion, UI redesign, dependency upgrades, and speculative APIs remain excluded.
- Evidence: every task has a red run, minimal repair, focused pass, commit boundary, role handoff, rollback rule, and downstream invalidation rule.
