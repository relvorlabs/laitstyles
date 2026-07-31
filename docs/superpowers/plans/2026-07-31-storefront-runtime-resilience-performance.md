# Storefront Runtime Resilience and Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert observed adapter/database outages into safe recoverable states and remove avoidable catalogue query pressure, broken assets, and genuine above-the-fold image warnings.

**Architecture:** The shared HTTP boundary classifies a bounded nested cause chain. Storefront shell data uses a dedicated lightweight query and aggregate category counts. Runtime/tooling warnings are reproduced under the supported Node version before source changes are made.

**Tech Stack:** Next.js 16, React 19, Prisma 7 with `@prisma/adapter-pg`, PostgreSQL/Supabase, TanStack Query, TypeScript, Vitest, Playwright.

## Global Constraints

- Use Node 25.x for executable evidence.
- Do not expose database messages, hosts, SQL, table names, columns, or secrets.
- Do not treat unknown programming errors as database unavailability.
- Do not add `setMaxListeners` or suppress AbortErrors without identifying their owner.
- Do not globally eager-load product images.
- Use focused query shapes and preserve public contracts.
- Every change starts with a failing test and ends with an independent commit.

---

### Task 1: Classify nested driver-adapter failures

**Owner:** `laitstyles-domain-engineer`

**Files:**
- Modify: `src/lib/http/server.ts`
- Modify: `src/lib/http/server.test.ts`

**Interfaces:**

```ts
function collectSafeDatabaseCodes(error: unknown, maxDepth?: number): {
  errorCode: string | null;
  databaseCode: string | null;
};
```

- [ ] **Step 1: Add failing tests for observed errors**

Construct errors matching the runtime shape:

```ts
const error = Object.assign(new Error("redacted"), {
  name: "DriverAdapterError",
  cause: { originalCode: "08006", code: "08006", kind: "postgres" },
});
```

Assert HTTP 503 `DATABASE_UNAVAILABLE`, safe structured codes, and no raw message in response/log arguments. Add a second test for nested `originalCode: "EAUTHTIMEOUT"`.

- [ ] **Step 2: Run and confirm RED**

```bash
pnpm exec vitest run src/lib/http/server.test.ts
```

- [ ] **Step 3: Implement bounded cause traversal**

Depth maximum three. Read only code fields from each object and its `meta`; never serialize the object.

- [ ] **Step 4: Confirm GREEN**
- [ ] **Step 5: Commit**

```bash
git commit -m "fix(http): classify nested database adapter failures"
```

### Task 2: Replace the shell full-detail query

**Owner:** `laitstyles-domain-engineer`; data engineer reviews Prisma selection and indexes.

**Files:**
- Create: `src/modules/products/server/storefront/shell-repository.ts`
- Create: `src/modules/products/server/storefront/shell-repository.test.ts`
- Modify: `src/modules/products/server/storefront/catalogue-loader.ts`
- Modify: `src/modules/products/server/storefront/catalogue-projection.ts`
- Modify: `src/modules/products/server/storefront/mappers.ts` only if a dedicated mapper is required
- Verify: `src/modules/products/storefront/catalogue-contract.ts`

**Interfaces:**

```ts
export async function queryStorefrontShellCatalogue(): Promise<StorefrontCataloguePayload>;
```

- [ ] **Step 1: Write a failing repository contract test**

Mock Prisma and assert the shell repository does not request descriptions, all detail media, measurements, reviews, care instructions, or flaw notes. It must request cover, summary identity, stock and variant options.

- [ ] **Step 2: Confirm RED**
- [ ] **Step 3: Implement a dedicated Prisma select/include**

Do not call `listPublishedProductDetails(300)` for the shell.

- [ ] **Step 4: Preserve the public shell payload**

Map the lightweight rows into the existing contract with empty detail-only fields where the contract requires them.

- [ ] **Step 5: Run shell projection/loader tests**

```bash
pnpm exec vitest run src/modules/products/server/storefront/shell-repository.test.ts src/modules/products/server/storefront/catalogue-loader.failure.test.ts
```

- [ ] **Step 6: Commit**

```bash
git commit -m "perf(storefront): load a lightweight shell catalogue"
```

### Task 3: Remove category count N+1 queries

**Owner:** `laitstyles-domain-engineer`

**Files:**
- Modify: `src/modules/products/server/storefront/queries.ts` or move the method to `shell-repository.ts`
- Create or modify: `src/modules/products/server/storefront/categories.test.ts`

- [ ] **Step 1: Write a failing test asserting one category query and one aggregate product query**
- [ ] **Step 2: Confirm RED**
- [ ] **Step 3: Replace per-category counts with `groupBy({ by: ["category_id"] })`**
- [ ] **Step 4: Confirm output parity and GREEN**
- [ ] **Step 5: Commit**

```bash
git commit -m "perf(storefront): aggregate category product counts"
```

### Task 4: Bound catalogue page outage behaviour

**Owner:** `laitstyles-domain-engineer`

**Files:**
- Modify: `src/modules/products/server/storefront/page.ts`
- Modify: relevant route/page boundary under `src/app/(storefront)/products/**`
- Create: `src/modules/products/server/storefront/page.failure.test.ts`

- [ ] **Step 1: Write a failing test using a nested `08006` adapter failure**

Expected result: an explicit unavailable state handled by the route boundary, not a repeated unbounded retry or raw exception details.

- [ ] **Step 2: Confirm RED**
- [ ] **Step 3: Implement classified failure handling at the owning boundary**

Re-throw unknown errors. Do not cache an outage as successful catalogue data for an excessive period.

- [ ] **Step 4: Confirm GREEN**
- [ ] **Step 5: Commit**

```bash
git commit -m "fix(storefront): bound catalogue outage recovery"
```

### Task 5: Repair placeholder assets

**Owner:** `laitstyles-ui-engineer` with domain mapper edits reviewed by domain engineer.

**Files:**
- Modify: `src/modules/customers/server/mappers.ts`
- Modify: `src/modules/overview/server/queries.ts`
- Audit: every result of repository search for `"/placeholder.svg"`
- Verify or create: `public/product-placeholder.svg`
- Add focused mapper tests

- [ ] **Step 1: Write failing assertions that all fallback URLs equal `/product-placeholder.svg` or `null`**
- [ ] **Step 2: Confirm RED**
- [ ] **Step 3: Replace the broken path and avoid requests where inline empty UI exists**
- [ ] **Step 4: Confirm GREEN**
- [ ] **Step 5: Commit**

```bash
git commit -m "fix(media): use the canonical product placeholder"
```

### Task 6: Fix the genuine LCP image warning

**Owner:** `laitstyles-ui-engineer`

**Required skill:** `next-best-practices` image guidance.

**Files:**
- Inspect and modify the exact home/product component rendering the logged Cloudinary asset above the fold
- Modify: `src/components/ui/cloud-image.tsx` only if it does not expose the required `loading`/priority contract
- Add or modify the component test

- [ ] **Step 1: Reproduce and identify the exact LCP component in a clean browser**
- [ ] **Step 2: Write a failing component assertion for eager loading on only the designated hero image**
- [ ] **Step 3: Pass `loading="eager"` or the wrapper's equivalent only for that image**
- [ ] **Step 4: Confirm other product cards remain lazy**
- [ ] **Step 5: Commit**

```bash
git commit -m "perf(media): eagerly load the storefront LCP image"
```

### Task 7: Clean-runtime diagnostic pass

**Owner:** `laitstyles-reviewer`; implementation is dispatched only for reproduced application defects.

- [ ] **Step 1: Switch to Node 25 and clean generated state**

```powershell
fnm use 25
Remove-Item -Recurse -Force .next
pnpm prisma:generate
```

- [ ] **Step 2: Run one clean dev server with React DevTools disabled**

Capture:

- React instrumentation errors
- generated source-map warnings
- AbortErrors
- MaxListeners warnings
- route timings

- [ ] **Step 3: Classify evidence**

- extension-only React stack: document as external/dev-only
- navigation/query cancellation AbortError: document if bounded
- persistent MaxListeners warning: trace listeners before changing code
- persistent generated source-map warning under Node 25: isolate Next/Prisma generated-code reproduction

- [ ] **Step 4: Do not commit suppression workarounds**

### Task 8: Database and performance verification

**Owner:** `laitstyles-data-engineer` for connection evidence; reviewer for verdict.

- [ ] **Step 1: Validate migrations and client**

```bash
pnpm prisma:validate
pnpm prisma:migrate:status
pnpm prisma:generate
```

- [ ] **Step 2: Verify redacted runtime/migration connection roles**

Record only endpoint category and port; do not commit credentials.

- [ ] **Step 3: Run focused tests and static gates**

```bash
pnpm check:architecture
pnpm check:storefront-production
pnpm biome
pnpm typecheck
pnpm exec vitest run src/lib/http/server.test.ts src/modules/products/server/storefront
```

- [ ] **Step 4: Run full gates**

```bash
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:browser
```

- [ ] **Step 5: Capture before/after evidence**

Record shell query count, response payload size, warm `/api/v1/products`, `/products`, `/`, and `/api/v1/admin/products` timings with a healthy database and during one controlled outage.

- [ ] **Step 6: Update PR #64 with a pass/block verdict**

No check is reported as passing unless its current command output and exit code are available.
