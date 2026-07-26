# Phase 1-3 Foundation Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce exact-head, reviewable acceptance evidence for WS0, WS1, WS2a, and WS2b by repairing only demonstrated provenance, architecture-guard, layout/provider, and typed-HTTP foundation defects.

**Architecture:** Work proceeds in the mandatory order WS0 -> WS1 -> WS2a -> WS2b. Cross-cutting evidence and guards remain in `scripts/**` and `docs/**`; Next.js composition remains in `src/app/**` and `src/providers/**`; reusable transport, error, query-client, and logging infrastructure remains in `src/lib/**`; the health proof remains split across `src/modules/health/{client,server}/**` and a thin `src/app/api/v1/health/route.ts` adapter. A changed interface reopens every downstream gate, and every code change creates a new candidate SHA that must be recaptured before evidence is accepted.

**Tech Stack:** Node 25.x, pnpm 11.13.0, Next.js 16.2.10, React 19.2.4, TypeScript 5, Vitest 4.1.10, Zod 4.4.3, TanStack Query 5.101.2, Prisma 7.8.0, Playwright 1.61.x, Biome 2.5.3, React Doctor 0.7.2.

## Global Constraints

- Treat `docs/superpowers/specs/2026-07-26-phase-1-6-full-acceptance-design.md` as the approved design and `update.md` as the user-provided controlling requirement; record but never stage or modify the untracked `update.md`.
- Use Node 25.x and pnpm 11.13.0. Keep Next.js 16.2.10, React 19.2.4, Prisma 7.8.0, Playwright 1.61.x, React Doctor 0.7.2, and the existing dependency set; do not upgrade frameworks or dependencies.
- Preserve the Phase 0 baseline commit `6f5087f4aa08a5d9bce5989bad7b230344cdb493`, public URLs, route redirects, shell composition, JSX, styling, themes, responsiveness, focus behavior, and interactions.
- Run workstreams in order. WS2b cannot be accepted before WS2a; WS2a cannot be accepted before WS1; WS1 cannot be accepted before WS0.
- A passing historical result is diagnostic only. Every accepted result must identify the same immutable 40-character `candidateSha` and `lockfileDigest` as the current WS0 context manifest.
- Never edit generated evidence by hand. Regenerate `ci-evidence/phase-1-6-full-acceptance/context/**` from repository scripts.
- Preserve the target dependency direction: app adapters compose modules; module client code uses `src/lib/http`; module server code uses server infrastructure; Client Components never import Prisma or server modules; Route Handlers and TanStack hooks never import Server Actions; Server Components read domain queries directly rather than internal APIs.
- Use British `catalogue` for changed production ownership. Allow exact external/database legacy names only when the guard proves they are not new domain debt.
- Repairs are limited to the exact files assigned below. A production failure outside an owned path is reported to that path's owning workstream; it is not repaired here.
- Keep commits workstream-local and conventional. Do not create empty commits. Do not combine generated evidence with an unrelated source repair.
- React Doctor is advisory at process exit, but every finding in changed scope must be fixed or documented with file-level proof that it predates the candidate.
- Missing manifests, mismatched SHAs, skipped commands, queued jobs, deployment-only results, and required failures are failures, never acceptance evidence.

## Planning Baseline

- Branch inspected: `main`.
- HEAD inspected while authoring this plan: `9da5a60bed3f7fd091fb51b21c2cde5e9971b551`; its parent is the design-observed head `418f7d44e2a6f903d1a067cd96143b062047fed7`.
- User-owned working-tree entries observed: `.claude/settings.local.json` and `update.md`; neither belongs to implementation staging.
- This observation is not an acceptance candidate. Task 1 freezes and records the implementation HEAD after each workstream commit.

---

## File and Layer Map

| Workstream | Layer and role | Files | Responsibility |
| --- | --- | --- | --- |
| WS0 | `scripts/ci/**`, `docs/**`; reviewer then planner | `scripts/ci/collect-context.mjs`, `scripts/ci/lib.mjs`, `docs/architecture-migration/phase-1-6-full-acceptance.md`, generated `ci-evidence/phase-1-6-full-acceptance/context/**` | Capture immutable Git, tool, lockfile, working-tree, and redacted database provenance. |
| WS1 | `scripts/checks/**`, boundary tests, `docs/**`; reviewer and owning engineer, then planner | Six architecture checks, six focused boundary tests, Phase 1 status/exception documents, Phase 1 row of the tracker | Enforce imports, exports, language, fixtures, transport boundaries, legacy ownership, and exact Phase 7/8 compatibility edges. |
| WS2a | `src/app/**`, `src/providers/**`, `src/lib/query/**`; UI engineer, then reviewer | Root/storefront/admin layouts, storefront boundaries, providers, query-client factories, Phase 2 status | Preserve routes and presentation while proving provider placement and single-shell composition. |
| WS2b | `src/lib/**`, `src/modules/health/**`, `src/app/api/v1/health/**`; domain engineer, then reviewer and planner | HTTP contracts/adapters/tests, canonical API error, logger, admin query defaults/tests, health proof, Phase 3 documents | Provide stable envelopes, request validation/correlation, inherited auth/policy adapters, pagination, cancellable browser fetch, and runtime proof. |

## Stable Interfaces Between Workstreams

```ts
type AcceptanceContext = {
  candidateSha: string;
  parentSha: string;
  branch: string;
  workingTreeEntries: string[];
  nodeVersion: string;
  pnpmVersion: string;
  prismaVersion: string;
  playwrightVersion: string;
  lockfileDigest: string;
  databaseIdentityDigest: string | null;
  capturedAt: string;
};
```

```ts
type LegacyArchitectureException = {
  importer: string;
  imported: string;
  kind: "phase-7-auth" | "phase-8-checkout";
  reason: string;
  owner: "domain-engineer" | "ui-engineer";
  removalPhase: 7 | 8;
};
```

```ts
type ApiSuccess<TData, TMeta extends Record<string, unknown> = Record<string, unknown>> = {
  data: TData;
  meta?: TMeta;
};

type ApiFailure = {
  error: { code: string; message: string; fieldErrors?: Record<string, string> };
};

type ApiPaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};
```

The WS0 manifest is consumed by every later task. WS1 produces a zero-error architecture/export report and an exact exception ledger. WS2a produces unchanged public routes plus stable provider placement. WS2b produces the API types above, `apiRequest`, `handleApiRequest`, request/auth/policy/pagination helpers, `ADMIN_QUERY_DEFAULTS`, and the versioned health proof consumed by later Phase 4-6 work.

### Task 1: Freeze and Capture the WS0 Candidate

**Owner and handoff:** Reviewer owns command execution and `scripts/ci/**`; planner owns the live ledger. Handoff to WS1 only after the context assertion and secret scan pass.

**Files:**
- Create: `docs/architecture-migration/phase-1-6-full-acceptance.md`
- Modify only on a demonstrated provenance defect: `scripts/ci/collect-context.mjs`
- Modify only on a demonstrated redaction or digest defect: `scripts/ci/lib.mjs`
- Generate, never hand-edit: `ci-evidence/phase-1-6-full-acceptance/context/context.json`
- Generate, never hand-edit: `ci-evidence/phase-1-6-full-acceptance/context/context.md`
- Generate, never hand-edit: `ci-evidence/phase-1-6-full-acceptance/context/changes.patch`

**Interfaces:**
- Consumes: `git rev-parse HEAD`, `git rev-parse HEAD^`, `git branch --show-current`, `git status --short`, `package.json`, `pnpm-lock.yaml`, tool versions, and sanitized `DATABASE_URL`/`DIRECT_URL` endpoint identity.
- Produces: `AcceptanceContext` with the exact field names in the stable interface block. `databaseIdentityDigest` is `null` only when no disposable database has been supplied yet; no raw URL, username, password, token, key, or cookie is emitted.

- [ ] **Step 1: Verify the mandated toolchain before generating evidence**

Run:

```powershell
node --version
pnpm --version
pnpm install --frozen-lockfile
git diff --exit-code -- pnpm-lock.yaml
```

Expected: Node prints `v25.x`; pnpm prints `11.13.0`; frozen installation exits `0`; the lockfile diff exits `0` with no output. A different pnpm version is a toolchain blocker and cannot certify WS0.

- [ ] **Step 2: Run the existing collector and prove its current schema is insufficient**

Run:

```powershell
pnpm ci:context -- --output ci-evidence/phase-1-6-full-acceptance/context
node -e "const c=require('./ci-evidence/phase-1-6-full-acceptance/context/context.json'); const required=['candidateSha','parentSha','branch','workingTreeEntries','nodeVersion','pnpmVersion','prismaVersion','playwrightVersion','lockfileDigest','databaseIdentityDigest','capturedAt']; const missing=required.filter(k=>!(k in c)); if(!missing.length) process.exit(1); console.error('missing provenance fields: '+missing.join(', '));"
```

Expected: collection itself exits `0`; the assertion exits `0` and reports the currently absent acceptance fields. If the assertion exits `1`, the collector already satisfies this schema and `scripts/ci/collect-context.mjs` remains unchanged.

- [ ] **Step 3: Add the minimal deterministic provenance helpers when Step 2 exposes missing fields**

In `scripts/ci/collect-context.mjs`, retain the existing implementation-context payload and add the following acceptance fields using command output rather than hand-entered values:

```js
const candidateSha = git(["rev-parse", "HEAD"]);
const parentSha = git(["rev-parse", "HEAD^"]);
const workingTreeEntries = git(["status", "--short"])
  .split(/\r?\n/)
  .map((entry) => entry.trimEnd())
  .filter(Boolean);
const lockfile = await readFile("pnpm-lock.yaml", "utf8");
const databaseIdentity = [process.env.DATABASE_URL, process.env.DIRECT_URL]
  .filter(Boolean)
  .map((value) => {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}:${url.port || "default"}/${url.pathname.replace(/^\//, "")}`;
  })
  .join("|");

Object.assign(context, {
  candidateSha,
  parentSha,
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git(["branch", "--show-current"]),
  workingTreeEntries,
  nodeVersion: process.version,
  pnpmVersion: execFileSync("pnpm", ["--version"], { encoding: "utf8" }).trim(),
  prismaVersion: packageJson.dependencies["@prisma/client"],
  playwrightVersion: packageJson.devDependencies["@playwright/test"],
  lockfileDigest: sha256(lockfile),
  databaseIdentityDigest: databaseIdentity ? sha256(databaseIdentity) : null,
  capturedAt: new Date().toISOString(),
});
```

Use `redact()` before any database-related diagnostic is written. Resolve any pnpm version discrepancy in the execution environment before acceptance so the recorded version is exactly `11.13.0`.

- [ ] **Step 4: Regenerate and validate exact-head context**

Run:

```powershell
pnpm ci:context -- --output ci-evidence/phase-1-6-full-acceptance/context
node -e "const fs=require('node:fs'); const crypto=require('node:crypto'); const cp=require('node:child_process'); const c=require('./ci-evidence/phase-1-6-full-acceptance/context/context.json'); const sha=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); const parent=cp.execFileSync('git',['rev-parse','HEAD^'],{encoding:'utf8'}).trim(); const lock=crypto.createHash('sha256').update(fs.readFileSync('pnpm-lock.yaml','utf8')).digest('hex'); if(c.candidateSha!==sha||c.parentSha!==parent||c.lockfileDigest!==lock||!/^[0-9a-f]{40}$/.test(c.candidateSha)||c.pnpmVersion!=='11.13.0') throw new Error('context does not match exact head/toolchain');"
rg -n "postgres(?:ql)?://|Bearer [A-Za-z0-9]|DATABASE_URL=|DIRECT_URL=|password=|token=|cookie=" ci-evidence/phase-1-6-full-acceptance/context
```

Expected: assertion exits `0`; `rg` exits `1` with no matches. The manifest SHA equals the checked-out immutable commit, and `workingTreeEntries` includes user-owned untracked files such as `update.md` without staging or changing them.

- [ ] **Step 5: Create the live acceptance ledger from generated values**

Create `docs/architecture-migration/phase-1-6-full-acceptance.md` with these sections and only evidence read from `context.json`: `Candidate`, `Parent`, `Branch`, `Working tree inventory`, `Tool versions`, `Lockfile digest`, `Database identity digest`, `Evidence index`, `Workstream verdicts`, `Known limitations`, and `Explicit exclusions`. Set WS0 to accepted only after Steps 1-4 pass; set WS1, WS2a, and WS2b to `Pending execution`. State that the ledger certifies Phases 1-6 only after the later plans complete and does not accept Phases 7-9 or Phase 10.

- [ ] **Step 6: Commit the provenance contract without user-owned files or generated evidence**

Run:

```powershell
git add scripts/ci/collect-context.mjs scripts/ci/lib.mjs docs/architecture-migration/phase-1-6-full-acceptance.md
git diff --cached --check
git diff --cached --name-only
git commit -m "chore(ci): capture exact-head acceptance provenance"
```

Expected: staged paths contain only files actually changed by this task; `update.md`, `.claude/settings.local.json`, and generated `ci-evidence/**` are absent; commit succeeds. Regenerate WS0 immediately because the commit changes `candidateSha`.

### Task 2: Make Phase 1 Compatibility Exceptions Exact and Machine-Readable

**Owner and handoff:** Reviewer owns the guards; domain engineer owns exact auth compatibility declarations; UI engineer owns the checkout compatibility declaration; planner reconciles the Phase 1 records. Handoff only the exception data and zero-error report, never permission to move auth or checkout code.

**Files:**
- Modify: `scripts/checks/architecture-legacy-exceptions.mjs`
- Modify: `scripts/checks/architecture-guard.mjs`
- Modify: `src/lib/boundaries/server-client-boundary.test.ts`
- Modify: `src/modules/products/product-module-boundaries.test.ts`
- Modify: `docs/architecture-migration/phase-1-legacy-exceptions.md`

**Interfaces:**
- Consumes: WS0 `candidateSha`, the current import graph, existing `src/server/auth/{session,profile}.ts`, `src/features/storefront/checkout/**`, and the type-only `src/features/storefront/shared/catalogue-data.ts` shim.
- Produces: `legacyArchitectureExceptions: readonly LegacyArchitectureException[]`; the guard fails when an importer, imported path, runtime/type character, owner, or removal phase expands or when an entry becomes stale.

- [ ] **Step 1: Add failing assertions for bounded exceptions**

Replace local ad hoc exception sets in the two boundary tests with imports from `scripts/checks/architecture-legacy-exceptions.mjs`, and assert:

```ts
expect(legacyArchitectureExceptions.every((entry) =>
  entry.importer.length > 0 &&
  entry.imported.length > 0 &&
  (entry.removalPhase === 7 || entry.removalPhase === 8) &&
  (entry.owner === "domain-engineer" || entry.owner === "ui-engineer")
)).toBe(true);
expect(new Set(legacyArchitectureExceptions.map((entry) =>
  `${entry.importer}->${entry.imported}`
)).size).toBe(legacyArchitectureExceptions.length);
```

The Phase 7 entries must cover each current production importer returned by `rg -l "@/server/auth/(session|profile)" src --glob "!**/*.test.*"`. The Phase 8 entries must cover only the route-level imports from `(storefront)/checkout/page.tsx` and `(storefront)/order-confirmation/page.tsx`. Keep the existing `storefront-auth-dialog.tsx` type-only Product shim explicitly bounded and reject `export *` or runtime exports.

- [ ] **Step 2: Run the focused tests to verify the central exception export is missing**

Run:

```powershell
pnpm exec vitest run src/lib/boundaries/server-client-boundary.test.ts src/modules/products/product-module-boundaries.test.ts --reporter=verbose
```

Expected: FAIL because `legacyArchitectureExceptions` is not exported and the existing local allowlists cannot prove exact ownership/removal metadata.

- [ ] **Step 3: Define the exception contract and exact current edges**

In `scripts/checks/architecture-legacy-exceptions.mjs`, replace the empty map with:

```js
const phase7SessionImporters = [
  "src/app/storefront-route-boundary.tsx",
  "src/app/auth/sign-in/page.tsx",
  "src/app/admin/layout.tsx",
  "src/app/admin/inventory/page.tsx",
  "src/app/(storefront)/account/profile/page.tsx",
  "src/app/(storefront)/account/profile/actions.ts",
  "src/app/(storefront)/account/orders/page.tsx",
  "src/app/(storefront)/account/orders/[orderNumber]/page.tsx",
  "src/app/(storefront)/account/orders/[orderNumber]/items/[orderLineId]/review/actions.ts",
  "src/app/(storefront)/account/orders/[orderNumber]/items/[orderLineId]/review/page.tsx",
  "src/lib/http/auth.ts",
  "src/modules/customers/server/commands.ts",
  "src/modules/holds/server/commands.ts",
  "src/modules/inventory/server/adjust-stock.ts",
  "src/modules/inventory/server/stock-write.ts",
  "src/modules/orders/server/offline-sale-checkout.ts",
  "src/modules/orders/server/offline-sale-draft.ts",
  "src/modules/orders/server/offline-sale.ts",
  "src/modules/orders/server/transition-order.ts",
  "src/modules/products/server/lifecycle-commands.ts",
  "src/modules/products/server/product-commands.ts",
  "src/modules/products/server/rules.ts",
  "src/modules/products/server/taxonomy-commands.ts",
  "src/modules/returns/server/commands.ts",
  "src/modules/settings/server/commands.ts",
];

const phase7ProfileImporters = [
  "src/app/auth/callback/route.ts",
  "src/server/auth/session.ts",
];

const phase8Edges = [
  {
    importer: "src/app/(storefront)/checkout/page.tsx",
    imported: "@/features/storefront/checkout/checkout-flow-v2",
  },
  {
    importer: "src/app/(storefront)/order-confirmation/page.tsx",
    imported: "@/features/storefront/checkout/order-receipt",
  },
];

export const legacyArchitectureExceptions = Object.freeze([
  ...phase7SessionImporters.map((importer) => ({
    importer,
    imported: "@/server/auth/session",
    kind: "phase-7-auth",
    reason: "Phase 1-6 reuses the inherited session boundary; auth ownership moves in Phase 7.",
    owner: "domain-engineer",
    removalPhase: 7,
  })),
  ...phase7ProfileImporters.map((importer) => ({
    importer,
    imported: "@/server/auth/profile",
    kind: "phase-7-auth",
    reason: "Phase 1-6 reuses the inherited profile boundary; auth ownership moves in Phase 7.",
    owner: "domain-engineer",
    removalPhase: 7,
  })),
  ...phase8Edges.map((edge) => ({
    ...edge,
    kind: "phase-8-checkout",
    reason: "Phase 2 preserves the existing checkout presentation; settlement authority moves in Phase 8.",
    owner: "ui-engineer",
    removalPhase: 8,
  })),
]);

export const legacyTopLevelServerFiles = new Set([
  "src/server/auth/session.ts",
  "src/server/auth/profile.ts",
]);
```

Each concrete object must use this complete shape:

```js
{
  importer: "src/lib/http/auth.ts",
  imported: "@/server/auth/session",
  kind: "phase-7-auth",
  reason: "Phase 3 reuses the inherited session boundary; auth ownership moves in Phase 7.",
  owner: "domain-engineer",
  removalPhase: 7,
}
```

For checkout, use `kind: "phase-8-checkout"`, `owner: "ui-engineer"`, `removalPhase: 8`, and the reason `Phase 2 preserves the existing checkout presentation; settlement authority moves in Phase 8.` Do not use glob importers, directory-only allowlists, wildcard exports, or a generic `temporary` reason. Export a derived `legacyTopLevelServerFiles` set containing exactly `src/server/auth/session.ts` and `src/server/auth/profile.ts`; the guard must reject any third production file under `src/server/auth/**`.

- [ ] **Step 4: Make the architecture guard consume and validate the exception list**

Import `legacyArchitectureExceptions` and `legacyTopLevelServerFiles` into `scripts/checks/architecture-guard.mjs`. For every matching edge, verify the exact importer and imported specifier; for every declared edge, verify the source still imports that exact specifier. Replace the blanket `!file.startsWith("src/server/auth/")` bypass with membership in `legacyTopLevelServerFiles`. Emit `Stale architecture exception:` and `Undocumented compatibility edge:` diagnostics so failures identify the exact edge.

- [ ] **Step 5: Run the focused contract and prove stale entries fail closed**

Run:

```powershell
pnpm exec vitest run src/lib/boundaries/server-client-boundary.test.ts src/modules/products/product-module-boundaries.test.ts --reporter=verbose
node scripts/checks/architecture-legacy-exceptions.mjs
node scripts/checks/architecture-guard.mjs
```

Expected: all Vitest tests pass; both scripts exit `0`; the architecture summary reports `Errors: 0`. Temporarily changing one copied exception importer in the working tree must make the guard exit `1` with `Stale architecture exception:`; restore that deliberate mutation before continuing.

- [ ] **Step 6: Reconcile the exception document**

Update `phase-1-legacy-exceptions.md` so its table is generated conceptually from the same exact importer/imported pairs, names Phase 7 auth and Phase 8 checkout ownership separately, identifies the type-only Product shim, and removes the obsolete Phase 4 TanStack-to-Server-Action exception already absent from the machine map. State that the list may only shrink and that removing an edge and its entry occurs in one commit.

- [ ] **Step 7: Commit the bounded exception contract**

Run:

```powershell
git add scripts/checks/architecture-legacy-exceptions.mjs scripts/checks/architecture-guard.mjs src/lib/boundaries/server-client-boundary.test.ts src/modules/products/product-module-boundaries.test.ts docs/architecture-migration/phase-1-legacy-exceptions.md
git diff --cached --check
git commit -m "test(architecture): bound deferred compatibility edges"
```

Expected: one independently reviewable WS1 commit. Regenerate WS0 against the new SHA before treating subsequent output as evidence.

### Task 3: Make Phase 1 Import, Export, Fixture, Language, and Transport Guards Trustworthy

**Owner and handoff:** Reviewer owns all check scripts and boundary tests. A failure in production source is handed to the role owning that source path; WS1 does not repair unrelated module implementations.

**Files:**
- Modify: `scripts/checks/module-export-guard.mjs`
- Modify: `scripts/checks/architecture-guard.mjs`
- Modify: `scripts/checks/error-validation-contract.mjs`
- Modify: `scripts/checks/layout-provider-contract.mjs`
- Modify: `scripts/checks/http-module-contract.mjs`
- Modify: `src/lib/boundaries/app-provider-boundary.test.ts`
- Modify: `src/lib/boundaries/server-client-boundary.test.ts`
- Modify: `src/lib/boundaries/storefront-state-boundary.test.ts`
- Modify: `src/modules/admin-persistence-boundary.test.ts`
- Modify: `src/modules/products/product-module-boundaries.test.ts`
- Modify: `scripts/checks/storefront-server-boundary.test.ts`

**Interfaces:**
- Consumes: WS1 exact exceptions plus every `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, and `.cjs` internal module reachable under `src/**`.
- Produces: deterministic zero-error reports for module resolution/export shape, legacy ownership, client/server imports, fixture imports, TanStack/Route Handler-to-Server-Action coupling, Server Component internal API calls, British catalogue ownership, Phase 2 layout/provider contracts, and Phase 3 HTTP contracts.

- [ ] **Step 1: Add characterization cases that defeat text-only guards**

Add table-driven fixtures in the existing boundary tests using temporary source strings and exported pure classifier functions from the guard modules. Cover alias and relative imports, multiline named imports, `import type`, named re-exports, default exports, dynamic imports, comments containing forbidden text, external package names containing `catalog`, database field identifiers that retain legacy spelling, `fetch(new URL("/api/v1/health", origin))` in a Server Component, TanStack importing a Server Action through a relative path, and a Route Handler importing an action through an index re-export.

The expected classifier result shape is:

```ts
type GuardViolation = {
  rule: string;
  importer: string;
  imported?: string;
  detail: string;
};
```

- [ ] **Step 2: Run focused guard tests and capture the false negatives/positives**

Run:

```powershell
pnpm exec vitest run src/lib/boundaries/app-provider-boundary.test.ts src/lib/boundaries/server-client-boundary.test.ts src/lib/boundaries/storefront-state-boundary.test.ts src/modules/admin-persistence-boundary.test.ts src/modules/products/product-module-boundaries.test.ts scripts/checks/storefront-server-boundary.test.ts --reporter=verbose
```

Expected: new characterization cases FAIL against the current regex-only behavior. Existing production-boundary cases must remain green; record each new failing rule name in the WS1 ledger section.

- [ ] **Step 3: Extract deterministic parsing/classification without adding a dependency**

Keep the guards dependency-free. Export focused helpers from the existing `.mjs` files for test use, and keep CLI execution behind:

```js
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = runGuard(process.cwd());
}
```

`module-export-guard.mjs` must resolve alias and relative files, default/named/type exports, named re-exports, and star re-exports without claiming that a missing module exports a symbol. `architecture-guard.mjs` must analyze parsed import specifiers and executable calls rather than comments. Continue to compare newly added `catalog` debt against the deterministic Git range, but exempt unchanged database fields and external package specifiers rather than suppressing the rule globally.

- [ ] **Step 4: Make each specialized contract check fail closed**

Keep each check's narrow ownership:

- `error-validation-contract.mjs`: exactly one canonical `Result` implementation; typed allow-listed auth failures; server-side structured diagnostics; no raw provider message reflection.
- `layout-provider-contract.mjs`: one root, one storefront route-group layout, one admin layout, no legacy route duplicates, no root/admin/storefront query-provider duplication.
- `http-module-contract.mjs`: required shared HTTP files and tests, stable envelopes, server-only adapters, cancellation, request ID, pagination, scoped query defaults, thin `/api/v1/**` handlers, preserved `/api/health` compatibility.

Each script must return non-zero when a required file is absent and print the exact file/rule. Do not broaden these checks into Phase 4-6 business invariants.

- [ ] **Step 5: Run all Phase 1 guards**

Run:

```powershell
pnpm check:architecture
pnpm typecheck
pnpm exec vitest run src/lib/boundaries/app-provider-boundary.test.ts src/lib/boundaries/server-client-boundary.test.ts src/lib/boundaries/storefront-state-boundary.test.ts src/modules/admin-persistence-boundary.test.ts src/modules/products/product-module-boundaries.test.ts scripts/checks/storefront-server-boundary.test.ts --reporter=verbose
```

Expected: every command exits `0`; module export and architecture summaries each report `Errors: 0`; all focused Vitest cases pass. Any source-specific failure is assigned to its owning role and blocks this commit until repaired in a separate path-owned commit.

- [ ] **Step 6: Commit trustworthy guards**

Run:

```powershell
git add scripts/checks/architecture-guard.mjs scripts/checks/module-export-guard.mjs scripts/checks/error-validation-contract.mjs scripts/checks/layout-provider-contract.mjs scripts/checks/http-module-contract.mjs src/lib/boundaries/app-provider-boundary.test.ts src/lib/boundaries/server-client-boundary.test.ts src/lib/boundaries/storefront-state-boundary.test.ts src/modules/admin-persistence-boundary.test.ts src/modules/products/product-module-boundaries.test.ts scripts/checks/storefront-server-boundary.test.ts
git diff --cached --check
git commit -m "test(architecture): harden foundation guards"
```

Expected: commit contains guards and their focused tests only. Regenerate WS0 against the resulting SHA.

### Task 4: Reconcile Phase 1 Architecture Records Against the Passing Graph

**Owner and handoff:** Planner owns documents; reviewer supplies exact command output and artifact paths. Handoff to WS2a is the passing WS1 gate plus the exact exception ledger.

**Files:**
- Modify: `docs/architecture-migration/phase-1-domain-status.md`
- Modify: `docs/architecture-migration/phase-1-legacy-exceptions.md`
- Modify only the Phase 1 row/evidence links: `docs/architecture-migration/migration-tracker.md`
- Modify the WS1 section only: `docs/architecture-migration/phase-1-6-full-acceptance.md`

**Interfaces:**
- Consumes: exact-head WS0 manifest, Task 2 exception list, Task 3 zero-error reports, and actual lockfile inspection.
- Produces: a current Phase 1 ownership/status table, exact exceptions, command/evidence links, and an honest WS1 verdict.

- [ ] **Step 1: Verify documentation assertions against current source**

Run:

```powershell
rg -n "Merged with debt|blocked|Zustand|runner|Phase 1|Phase 7|Phase 8" docs/architecture-migration/phase-1-domain-status.md docs/architecture-migration/phase-1-legacy-exceptions.md docs/architecture-migration/migration-tracker.md
rg -n "zustand" package.json pnpm-lock.yaml
pnpm check:architecture
pnpm typecheck
```

Expected: the first command identifies stale/historical language for reconciliation; the second proves `zustand@5.0.14` exists in manifest and lockfile; architecture and typecheck exit `0` on the same candidate SHA.

- [ ] **Step 2: Update only facts proved by executed evidence**

In `phase-1-domain-status.md`, retain the authoritative domain language and current ownership, update source paths/statuses that have actually migrated, and preserve Phase 7 auth and Phase 8 checkout assignments. In the tracker and live ledger, record the exact SHA, command, exit code, duration, and evidence path. Remove the obsolete Zustand lockfile blocker. Do not mark Phase 2 or Phase 3 accepted in this task.

- [ ] **Step 3: Commit Phase 1 evidence reconciliation**

Run:

```powershell
git add docs/architecture-migration/phase-1-domain-status.md docs/architecture-migration/phase-1-legacy-exceptions.md docs/architecture-migration/migration-tracker.md docs/architecture-migration/phase-1-6-full-acceptance.md
git diff --cached --check
git commit -m "docs(architecture): reconcile Phase 1 evidence"
```

Expected: a documentation-only commit. Regenerate WS0 once more; WS1 is accepted only if the refreshed exact-head guard and typecheck results remain green.

### Task 5: Characterize and Repair the WS2a Layout and Provider Contract

**Owner and handoff:** UI engineer owns layout/provider/query-client composition; reviewer owns the gate and route/browser evidence. Handoff to WS2b includes the unchanged public route map and provider tree.

**Files:**
- Modify only when a focused test proves a defect: `src/app/layout.tsx`
- Modify only when a focused test proves a defect: `src/app/(storefront)/layout.tsx`
- Modify only when a focused test proves a defect: `src/app/admin/layout.tsx`
- Modify only when a focused test proves a defect: `src/app/storefront-route-boundary.tsx`
- Modify only when a focused test proves a defect: `src/app/storefront-client-boundary.tsx`
- Modify only when a focused test proves a defect: `src/providers/providers.tsx`
- Modify only when a focused test proves a defect: `src/providers/theme-provider.tsx`
- Modify only when a focused test proves a defect: `src/providers/query-provider.tsx`
- Modify only when a focused test proves a defect: `src/providers/storefront-query-provider.tsx`
- Modify only when a focused test proves a defect: `src/lib/query/create-query-client.ts`
- Modify only when a focused test proves a defect: `src/lib/query/admin-query-client.ts`
- Modify only when a focused test proves a defect: `src/lib/query/storefront-query-client.ts`
- Modify: `src/lib/boundaries/app-provider-boundary.test.ts`
- Modify: `scripts/checks/layout-provider-contract.mjs`
- Modify: `docs/architecture-migration/phase-2-layout-provider-status.md`

**Interfaces:**
- Consumes: passing WS1 guards and the Phase 0 route/presentation baseline.
- Produces: `RootLayout -> AppProvider(theme + toaster)`, `AdminLayout -> QueryProvider -> AdminShell`, and `(storefront)/layout -> StorefrontRouteBoundary -> StorefrontClientBoundary -> StorefrontQueryProvider`, with the nested account layout owning only `AccountShell`.

- [ ] **Step 1: Add failing route/provider multiplicity assertions**

Extend the existing boundary test and layout guard so they count mounts/imports rather than only search for substrings. Assert exactly one `AppProvider` root mount, one admin `QueryProvider` mount, one storefront route boundary, one storefront query provider under `storefront-client-boundary.tsx`, no `StorefrontRouteBoundary` in the account layout, and no legacy top-level storefront segment. Assert all listed route files exist under `(storefront)` and their route-group segments do not alter URLs.

- [ ] **Step 2: Run the focused WS2a tests before production edits**

Run:

```powershell
node scripts/checks/layout-provider-contract.mjs
pnpm exec vitest run src/lib/boundaries/app-provider-boundary.test.ts src/lib/boundaries/storefront-state-boundary.test.ts --reporter=verbose
```

Expected: if a multiplicity or placement defect exists, FAIL with its exact provider or route path. If both commands pass, do not rewrite production layout/provider code; retain the green characterization and proceed to validation/documentation.

- [ ] **Step 3: Apply the minimal composition repair only for a demonstrated failure**

Preserve these exact ownership calls and signatures:

```tsx
<AppProvider>{children}</AppProvider>
<QueryProvider><AdminShell role={access.role}>{children}</AdminShell></QueryProvider>
<StorefrontRouteBoundary>{children}</StorefrontRouteBoundary>
```

`AppProvider` contains `ThemeProvider` and `Toaster`, but no query provider. `QueryProvider` calls `getAdminQueryClient()`. `StorefrontQueryProvider` calls `makeStorefrontQueryClient()` and seeds `storefrontCatalogueQueryKey` with `StorefrontShellCataloguePayload`. Do not move route content, rewrite shell JSX/classes, alter authentication redirects, or merge admin/storefront QueryClients.

- [ ] **Step 4: Run WS2a static and build gates**

Run:

```powershell
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm exec vitest run src/lib/boundaries/app-provider-boundary.test.ts src/lib/boundaries/storefront-state-boundary.test.ts --reporter=verbose
pnpm build
```

Expected: all commands exit `0`; the build lists `/`, `/products`, `/products/[slug]`, `/collections/[slug]`, `/cart`, `/checkout`, `/order-confirmation`, `/account/**`, and `/admin` without duplicate route errors or server/client boundary errors.

- [ ] **Step 5: Run source-backed route smoke at the required viewports**

With the production build running at `PLAYWRIGHT_BASE_URL`, run:

```powershell
pnpm test:styles:e2e
pnpm exec playwright test --project=desktop-chromium --grep "route|layout|provider|shell"
pnpm exec playwright test --project=tablet-chromium --grep "route|layout|provider|shell"
pnpm exec playwright test --project=mobile-chromium --grep "route|layout|provider|shell"
```

Expected: each command exits `0`; public URLs and redirects remain unchanged; there are no hydration warnings, duplicate header/footer shells, portal failures, console errors, page errors, or failed requests. This task records route/shell evidence only; broad visual acceptance belongs to WS7.

- [ ] **Step 6: Commit WS2a code/tests, then its evidence record**

Run:

```powershell
git add src/app/layout.tsx 'src/app/(storefront)/layout.tsx' src/app/admin/layout.tsx src/app/storefront-route-boundary.tsx src/app/storefront-client-boundary.tsx src/providers/providers.tsx src/providers/theme-provider.tsx src/providers/query-provider.tsx src/providers/storefront-query-provider.tsx src/lib/query/create-query-client.ts src/lib/query/admin-query-client.ts src/lib/query/storefront-query-client.ts src/lib/boundaries/app-provider-boundary.test.ts scripts/checks/layout-provider-contract.mjs
git diff --cached --check
git commit -m "fix(layout): enforce scoped provider ownership"
git add docs/architecture-migration/phase-2-layout-provider-status.md docs/architecture-migration/phase-1-6-full-acceptance.md
git diff --cached --check
git commit -m "docs(architecture): record Phase 2 foundation evidence"
```

Expected: omit unchanged files from staging and skip the first commit if no production/test repair was needed. The status document records actual commands/results and preserves unresolved broader browser/visual evidence for WS7. Refresh WS0 after the final WS2a commit.

### Task 6: Prove the WS2b HTTP Envelopes, Errors, Request Parsing, Correlation, Auth, Policy, and Pagination

**Owner and handoff:** Domain engineer owns `src/lib/http/**`, errors, logger, and health server transport; reviewer owns contract execution. Auth remains an inherited Phase 7 adapter, not migrated ownership.

**Files:**
- Modify only on a failing focused test: `src/lib/http/contracts.ts`
- Modify only on a failing focused test: `src/lib/http/request.ts`
- Modify only on a failing focused test: `src/lib/http/request-context.ts`
- Modify only on a failing focused test: `src/lib/http/server.ts`
- Modify only on a failing focused test: `src/lib/http/auth.ts`
- Modify only on a failing focused test: `src/lib/http/policy.ts`
- Modify only on a failing focused test: `src/lib/http/pagination.ts`
- Modify only on a failing focused test: `src/lib/errors/api-error.ts`
- Modify only on a failing focused test: `src/lib/errors/index.ts`
- Modify only on a failing focused test: `src/lib/logger.ts`
- Test: `src/lib/http/server.test.ts`
- Test: `src/lib/http/request.test.ts`
- Test: `src/lib/http/auth.test.ts`
- Test: `src/lib/http/policy.test.ts`
- Test: `src/lib/http/pagination.test.ts`

**Interfaces:**
- Consumes: passing WS2a provider/layout gate, Zod schemas, inherited `getCurrentSession()` and capability policy.
- Produces: `ApiSuccess`, `ApiFailure`, `ApiPaginationMeta`, `ApiError`, `handleApiRequest(request, operation)`, `parseJsonBody(request, schema)`, `parseSearchParams(request, schema)`, `createApiRequestContext(request?)`, `requireApiSession()`, `requireApiConsumer()`, `requireApiStaff(capability?)`, `requireApiPermission(allowed, options?)`, and `createPaginationMeta(input)`.

- [ ] **Step 1: Add missing edge cases to the existing colocated tests**

Cover optional `meta`, one stable string per field error, invalid/missing JSON content type, malformed JSON, repeated search parameters, safe incoming request IDs, generated IDs for invalid values, request IDs on success and every error, preserved caller headers, sanitized `INTERNAL_ERROR`, anonymous/suspended/unavailable/wrong-kind/missing-capability sessions, concealed `404` permission denial, page defaults `1/25`, page-size maximum `100`, zero totals, and rejection of negative/non-integer totals.

- [ ] **Step 2: Run the focused server contract tests before implementation edits**

Run:

```powershell
pnpm exec vitest run src/lib/http/server.test.ts src/lib/http/request.test.ts src/lib/http/auth.test.ts src/lib/http/policy.test.ts src/lib/http/pagination.test.ts --reporter=verbose
```

Expected: every newly exposed defect fails with a stable contract assertion. If all cases pass, leave the corresponding production files unchanged.

- [ ] **Step 3: Restore only the documented function-based contract**

The minimal passing implementation must retain these exact shapes:

```ts
handleApiRequest<TData, TMeta>(request: Request, operation: (context: ApiRequestContext) => ApiRouteResult<TData, TMeta> | Promise<ApiRouteResult<TData, TMeta>>)
parseJsonBody<TSchema extends z.ZodType>(request: Request, schema: TSchema): Promise<z.output<TSchema>>
parseSearchParams<TSchema extends z.ZodType>(request: Request, schema: TSchema): z.output<TSchema>
requireApiStaff(capability: StaffCapability = "admin:access"): Promise<StaffSession>
requireApiPermission(allowed: boolean, options?: { code?: string; message?: string; status?: 403 | 404 }): asserts allowed
createPaginationMeta(input: PaginationQuery & { total: number }): ApiPaginationMeta
```

Expected failures map to typed `ApiError`; Zod maps to `VALIDATION_ERROR`/422; unexpected failures log request ID, method, pathname, and error name but return only `INTERNAL_ERROR` and `The request could not be completed.` Do not add a service class, repository layer, domain rules, or a second error/result implementation.

- [ ] **Step 4: Re-run the server contract and architecture gates**

Run:

```powershell
pnpm exec vitest run src/lib/http/server.test.ts src/lib/http/request.test.ts src/lib/http/auth.test.ts src/lib/http/policy.test.ts src/lib/http/pagination.test.ts --reporter=verbose
node scripts/checks/http-module-contract.mjs
pnpm check:architecture
pnpm typecheck
```

Expected: all commands exit `0`; the HTTP contract reports `Errors: 0`; test logs contain no raw provider errors, secrets, or unexpected stack content in response payloads.

- [ ] **Step 5: Commit the server-side HTTP contract**

Run:

```powershell
git add src/lib/http/contracts.ts src/lib/http/request.ts src/lib/http/request-context.ts src/lib/http/server.ts src/lib/http/auth.ts src/lib/http/policy.ts src/lib/http/pagination.ts src/lib/errors/api-error.ts src/lib/errors/index.ts src/lib/logger.ts src/lib/http/server.test.ts src/lib/http/request.test.ts src/lib/http/auth.test.ts src/lib/http/policy.test.ts src/lib/http/pagination.test.ts
git diff --cached --check
git commit -m "fix(http): enforce typed server transport contracts"
```

Expected: one WS2b server-contract commit containing only changed files. Refresh WS0 before accepting its evidence.

### Task 7: Prove Browser Cancellation, Admin Cache Defaults, and the Versioned Health Slice

**Owner and handoff:** Domain engineer owns browser HTTP and health contracts; UI engineer owns provider consumption of the admin query client; reviewer owns HTTP smoke and build evidence.

**Files:**
- Modify only on a failing focused test: `src/lib/http/client.ts`
- Test: `src/lib/http/client.test.ts`
- Modify only on a failing focused test: `src/lib/query/admin-query-client.ts`
- Test: `src/lib/query/admin-query-client.test.ts`
- Modify only on a failing focused test: `src/providers/query-provider.tsx`
- Modify only on a failing focused test: `src/modules/health/schema.ts`
- Modify only on a failing focused test: `src/modules/health/server/queries.ts`
- Modify only on a failing focused test: `src/modules/health/client/api.ts`
- Modify only on a failing focused test: `src/app/api/v1/health/route.ts`
- Test: `src/app/api/v1/health/route.test.ts`
- Existing runtime verifier, edit only if its documented Phase 3 assertion is absent: `scripts/ci/http-smoke.mjs`

**Interfaces:**
- Consumes: Task 6 envelopes/server adapter and WS2a admin provider placement.
- Produces: `apiRequest<TData,TMeta>(input, init?)`, `ApiClientError`, `ADMIN_QUERY_DEFAULTS`, `makeAdminQueryClient()`, `getAdminQueryClient()`, `fetchHealthStatus(signal?)`, and `GET(request)` for `/api/v1/health`.

- [ ] **Step 1: Add browser and health characterization cases**

Assert that `apiRequest` sends `Accept: application/json`, accepts `{data, meta?}`, maps contract failures to `ApiClientError`, maps fetch failures to `NETWORK_ERROR`, maps unreadable/malformed responses to `INVALID_API_RESPONSE`, and rethrows the original abort failure when `AbortSignal` is cancelled. Assert `ADMIN_QUERY_DEFAULTS` equals:

```ts
{
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
}
```

Assert the health route returns `{ data: { status: "ok", service: "laitstyles", timestamp }, meta: { version: "v1" } }`, `Cache-Control: no-store`, and the same safe incoming `x-request-id`.

- [ ] **Step 2: Run focused client/query/route tests before implementation edits**

Run:

```powershell
pnpm exec vitest run src/lib/http/client.test.ts src/lib/query/admin-query-client.test.ts src/app/api/v1/health/route.test.ts --reporter=verbose
```

Expected: newly exposed contract defects fail. Already satisfied cases pass and do not justify production rewrites.

- [ ] **Step 3: Apply the smallest repair while preserving dependency direction**

Keep these exact calls:

```ts
apiRequest<HealthStatus, HealthMeta>("/api/v1/health", { cache: "no-store", signal })
handleApiRequest(request, async () => ({
  data: getHealthStatus(),
  meta: { version: "v1" } satisfies HealthMeta,
  headers: { "Cache-Control": "no-store" },
}))
```

The client may import only client-compatible HTTP and schema contracts. The route imports `getHealthStatus` directly, never a Server Action. `QueryProvider` continues to call `getAdminQueryClient()`; no root or storefront consumer uses the admin client.

- [ ] **Step 4: Run focused, static, build, and production HTTP smoke gates**

Run:

```powershell
pnpm exec vitest run src/lib/http/client.test.ts src/lib/query/admin-query-client.test.ts src/app/api/v1/health/route.test.ts --reporter=verbose
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm build
pnpm ci:http-smoke
pnpm ci:server-log
```

Expected: all commands exit `0`; `/api/v1/health` returns HTTP 200, a valid typed envelope, `meta.version === "v1"`, and `x-request-id`; cancellation tests preserve `AbortError`; production server logs contain no unexplained errors. The compatibility `/api/health` endpoint remains present.

- [ ] **Step 5: Commit the client/cache/health proof**

Run:

```powershell
git add src/lib/http/client.ts src/lib/http/client.test.ts src/lib/query/admin-query-client.ts src/lib/query/admin-query-client.test.ts src/providers/query-provider.tsx src/modules/health/schema.ts src/modules/health/server/queries.ts src/modules/health/client/api.ts src/app/api/v1/health/route.ts src/app/api/v1/health/route.test.ts scripts/ci/http-smoke.mjs
git diff --cached --check
git commit -m "fix(http): certify browser and health foundations"
```

Expected: one independently reviewable WS2b commit with no Phase 4 endpoint or consumer. Refresh WS0 against the new SHA.

### Task 8: Reconcile Phase 3 Contracts and Issue the Foundation Handoff

**Owner and handoff:** Planner owns Phase 3 documents; reviewer owns final WS0-WS2b verification. The orchestrator may dispatch WS6a/WS3 only after every gate in this plan is accepted.

**Files:**
- Modify: `docs/architecture-migration/phase-3-cache-invalidation-contract.md`
- Modify: `docs/architecture-migration/phase-3-http-module-status.md`
- Modify: `docs/architecture-migration/phase-1-6-full-acceptance.md`
- Modify only Phase 1-3 evidence/verdict rows: `docs/architecture-migration/migration-tracker.md`

**Interfaces:**
- Consumes: refreshed WS0 manifest, passing WS1/WS2a/WS2b gates, server/client HTTP signatures, route/provider map, and actual evidence artifact paths.
- Produces: an exact-head foundation handoff containing candidate/lock digests, accepted interfaces, actual commands and results, warnings, limitations, rollback commits, and explicit Phase 7-9/UI exclusions.

- [ ] **Step 1: Re-run all foundation gates on one immutable SHA**

Run:

```powershell
pnpm install --frozen-lockfile
pnpm ci:context -- --output ci-evidence/phase-1-6-full-acceptance/context
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm exec vitest run src/lib/http src/lib/query/admin-query-client.test.ts src/app/api/v1/health/route.test.ts src/lib/boundaries scripts/checks/storefront-server-boundary.test.ts --reporter=verbose
pnpm build
pnpm react-doctor
pnpm ci:http-smoke
pnpm ci:server-log
```

Expected: all required commands exit `0`; React Doctor may exit advisory only if every changed-scope finding is resolved or documented as pre-existing. Every generated manifest/log identifies the refreshed WS0 SHA and lock digest.

- [ ] **Step 2: Validate evidence consistency and absence of secrets**

Run:

```powershell
node -e "const cp=require('node:child_process'); const c=require('./ci-evidence/phase-1-6-full-acceptance/context/context.json'); const sha=cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(); if(c.candidateSha!==sha) throw new Error('WS0 candidate mismatch');"
rg -n "postgres(?:ql)?://|Bearer [A-Za-z0-9]|DATABASE_URL=|DIRECT_URL=|password=|token=|cookie=" ci-evidence/phase-1-6-full-acceptance
git diff --exit-code -- package.json pnpm-lock.yaml
```

Expected: SHA assertion exits `0`; secret scan exits `1` with no matches; package manifest and lockfile diff exits `0`.

- [ ] **Step 3: Reconcile Phase 3 documentation from executed output**

Keep the cache contract exact: admin `staleTime` 30 seconds, `gcTime` 5 minutes, global retries disabled, window-focus refetch disabled, reconnect refetch enabled; every query passes TanStack's `AbortSignal`; keys include every result-affecting identifier/filter/sort/page/pageSize; successful mutations prefer authoritative replacement then targeted awaited invalidation; optimistic stock/payment/reservation updates are not the default. In the Phase 3 status, record actual SHA, commands, exit codes, durations, artifacts, HTTP smoke results, warnings, and limitations. Do not claim later product/inventory consumers are certified by the health proof.

- [ ] **Step 4: Record workstream acceptance and the role handoff**

In `phase-1-6-full-acceptance.md` and the Phase 1-3 tracker rows, mark a workstream accepted only when its same-SHA gate passed. Record:

- WS0 -> reviewer: candidate SHA, parent SHA, branch, dirty inventory, tool versions, lock/database identity digests.
- WS1 -> UI/domain engineers: zero-error graph plus exact Phase 7 auth and Phase 8 checkout exceptions.
- WS2a -> domain engineer: unchanged public route map and provider tree.
- WS2b -> WS6a/WS3: envelopes, cancellable `apiRequest`, auth/policy adapters, request IDs, pagination, admin cache defaults, health proof.

State that any interface change reopens affected consumer gates and any new commit reopens WS0.

- [ ] **Step 5: Commit the foundation evidence record**

Run:

```powershell
git add docs/architecture-migration/phase-3-cache-invalidation-contract.md docs/architecture-migration/phase-3-http-module-status.md docs/architecture-migration/phase-1-6-full-acceptance.md docs/architecture-migration/migration-tracker.md
git diff --cached --check
git commit -m "docs(architecture): record Phase 1-3 foundation acceptance"
```

Expected: documentation-only commit. Because this changes HEAD, regenerate the WS0 context and rerun at minimum `pnpm check:architecture`, `pnpm typecheck`, and the documentation/evidence consistency assertion before the reviewer issues the handoff. Do not call Phase 1-3 accepted if that final refresh is absent.

## Workstream Acceptance Gates

| Gate | Required result before handoff |
| --- | --- |
| WS0 | pnpm 11.13.0 frozen install succeeds without lock changes; context, Git, and evidence path agree on one 40-character SHA; working-tree inventory is recorded; secret scan is empty. |
| WS1 | `pnpm check:architecture` and `pnpm typecheck` pass; focused boundary tests pass; no stale/broad exception remains; Phase 1 docs reflect current source and the Zustand blocker is removed. |
| WS2a | One root/storefront/admin layout contract passes; providers are scoped correctly; public URLs/redirects are unchanged; focused tests, Biome, TypeScript, build, and source-backed route smoke pass without hydration/shell duplication. |
| WS2b | Stable HTTP envelopes and errors, validation, inherited auth/policy, correlation, pagination, cancellation, admin cache defaults, health route, build, HTTP smoke, and server-log checks pass; no generic service/repository abstraction appears. |

## Rollback

- Revert by complete workstream commit, newest dependency first. Do not partially restore a layout/provider tree or retain `/api/v1/health` without its shared HTTP contract.
- A WS0 collector regression is rolled back with its provenance commit; retain raw historical evidence but do not merge it into a current certificate.
- A WS1 guard regression is rolled back with its test/guard commit; restore only the prior exact exception list, never a blanket folder bypass.
- A WS2a regression is rolled back as the complete layout/provider commit so duplicate storefront boundaries or QueryClients cannot coexist.
- A WS2b regression is rolled back in reverse order: client/cache/health proof, then server HTTP contract. Downstream WS3+ gates that consumed changed interfaces are invalidated.
- Database migrations are outside this plan. Never use destructive database reset as rollback for WS0-WS2b.
- After any rollback, freeze the new HEAD, regenerate WS0, and rerun every affected gate before updating documentation.

## Explicit Exclusions

- **Phase 7:** no auth consolidation, no move of `src/server/auth/**` to `src/modules/auth/**`, no provider merge, no auth form/route redesign, no Supabase sign-in semantic change, and no deletion of exact auth compatibility edges.
- **Phase 8:** no checkout/payment settlement, webhook settlement, payment-success authority, confirmed-payment stock commitment, delivery creation, refund settlement, or server-authoritative checkout redesign.
- **Phase 9:** no broad deletion of `src/features/**`, top-level `src/server/**`, compatibility exports, legacy assets, or shell code. Only a stale exact exception may be removed with proof that its edge is gone.
- **UI redesign:** no new layout, visual language, card, typography, color, spacing, animation, dialog system, navigation model, copy refresh, or responsive redesign. WS2a moves/repairs composition only when a focused test proves a defect.
- No Phase 4-6 product, inventory, order, hold, return, customer, settings, overview, storefront-state, persistence, or authorization implementation belongs in this plan.
- No WS6 disposable-database harness, WS7 broad Playwright/Axe/visual matrix, WS8 full Phase 1-6 certificate, Phase 0 recapture, or Phase 10 release claim belongs in this plan.
- No new business endpoint beyond the existing `/api/v1/health` proof; no generic CRUD framework, service-class layer, repository-per-model, polling infrastructure, or browser API for a Server Component-only read.
- No dependency upgrade, lockfile drift, unrelated audit remediation, drive-by formatting, or speculative refactor.
