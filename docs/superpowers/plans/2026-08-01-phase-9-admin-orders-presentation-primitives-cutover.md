# Phase 9 Admin Orders Presentation Primitives Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move two legacy Orders presentation primitives into Orders-owned admin UI and repoint exactly their seven live consumers without changing any observable presentation or interaction contract.

**Architecture:** `src/modules/orders/ui/admin/**` owns these staff-facing Orders presentation primitives; legacy `src/features/admin/**` continues to compose the existing screens. The cutover is an identity-preserving move: only the primitives’ allowed type/internal-import paths and seven concrete consumer import specifiers change. No server, client, data, state, transport, or business-rule layer participates.

**Tech Stack:** Next.js 16.2.10, React 19.2.4, TypeScript 5, Vitest 4.1.10, Playwright 1.61.1, Biome 2.5.3, pnpm 11.13.0, Node 25.x.

## Global Constraints

- Execute only on `agent/storefront-checkout-delivery-promotions-redesign`; the frozen live baseline is `3786d33c17457cd5a9f126dcc965adbcb590eaff`. Do not switch branches. The approved design’s historical baseline is `d1ba9821`; it is provenance, not the execution baseline.
- The repository contract is Node `25.x` and `pnpm@11.13.0`; do not edit `package.json`, engines, dependencies, or `pnpm-lock.yaml` to accommodate a host. At planning time `node` was not on `PATH`, `pnpm --version` was `11.9.0`, and `pnpm` reported Node `v24.14.0`; these are unsupported and make execution validation blocked, never passed.
- Source identity baseline: `src/features/admin/orders/order-labels.ts` is 1,871 bytes, 55 lines, SHA-256 `91635b3236224a85d8353d96d33d11245bc96dc687534b1db5dd83b6afb31e6c`; `src/features/admin/orders/order-status-badge.tsx` is 1,222 bytes, 32 lines, SHA-256 `4402e5e297e0a074eaef326f45926d7a651895cd30c41e949db593a6a129e39c`.
- The baseline destinations `src/modules/orders/ui/admin/order-labels.ts` and `src/modules/orders/ui/admin/order-status-badge.tsx` are absent. All nine scoped existing source paths are clean and byte-identical to `HEAD` before work begins; reconfirm that condition before touching them.
- Preserve all label strings, status-tone classification, `Intl.DateTimeFormat` configuration and output, class names, badge variants, DOM, exports, prop types, server compatibility, accessibility, responsive behaviour, and existing error/empty/pending behaviour. `order-status-badge.tsx` remains server-compatible: do not add `"use client"`.
- Retarget only the primitives’ types to canonical `@/modules/orders/types`: `OrderStatus`, `PaymentStatus`, and `SalesChannel` are already structurally and semantically identical to the legacy unions. Do not translate, duplicate, re-export, or change `src/lib/admin/shared/types.ts` or any source contract behind it.
- Update exactly the seven named consumers in the file map. Do not add a shim, barrel, alias, forwarding module, facade, re-export, or duplicate copy; the old primitive paths must be absent after the move.
- Do not edit tests, guards, configuration, generated output, styles/tokens, app routes, module server/client code, data/persistence/auth/cache code, Prisma, Supabase, progress trackers, or any source outside the two primitive paths and seven listed consumer import sites. No formatting or source refactor is authorized beyond this design.
- The shared worktree has unrelated modified and untracked work, including Orders server and storefront files. Before editing and staging, inspect all status entries; never format, stage, commit, restore, overwrite, delete, or classify unrelated work as part of this slice.
- The user explicitly approved sequencing this independent Orders slice while Promotions validation remains blocked. Record that decision in the reviewer report exactly as unresolved validation debt; do not call it passed, cleared, waived, repaired, or pre-existing.
- A missing runner, unsupported toolchain, credentials, controlled data, browser, logs, manifest, a skipped command, or a failed command is blocked/skipped evidence, never a pass. A broader failure is pre-existing only after it reproduces on the unchanged frozen baseline under the same supported environment.

## File and ownership map

| Architecture layer | File | Change | Owner |
| --- | --- | --- | --- |
| Orders domain UI | `src/features/admin/orders/order-labels.ts` → `src/modules/orders/ui/admin/order-labels.ts` | Move label maps, formatter, and tone helpers; change only the type-import module path | UI engineer |
| Orders domain UI | `src/features/admin/orders/order-status-badge.tsx` → `src/modules/orders/ui/admin/order-status-badge.tsx` | Move both badges; change only the helper and type-import module paths | UI engineer |
| Legacy Admin Orders composition | `src/features/admin/orders/orders-table.tsx` | Repoint labels and both badge imports | UI engineer |
| Legacy Admin Orders composition | `src/features/admin/orders/orders-mobile-list.tsx` | Repoint labels/date formatter and both badge imports | UI engineer |
| Legacy Admin Orders composition | `src/features/admin/orders/order-transition-controls.tsx` | Repoint `orderStatusLabels` import | UI engineer |
| Legacy Admin Orders composition | `src/features/admin/orders/order-timeline.tsx` | Repoint labels/date formatter import | UI engineer |
| Legacy Admin Orders composition | `src/features/admin/orders/order-detail-sheet.tsx` | Repoint labels/date formatter and both badge imports | UI engineer |
| Legacy Admin Customers composition | `src/features/admin/customers/customer-delivery-panel.tsx` | Repoint `orderStatusLabels` import | UI engineer |
| Legacy Admin Overview composition | `src/features/admin/overview/open-orders-preview.tsx` | Repoint `OrderStatusBadge` import | UI engineer |
| Orders types | `src/modules/orders/types.ts` | Unchanged canonical type source | Not required |
| Legacy admin shared types | `src/lib/admin/shared/types.ts` | Unchanged duplicate unions outside this slice | Not required |
| Validation/evidence | No source file | Identity, import graph, exact-head gates, browser parity, dirty-work isolation, causality | Reviewer |

## Exact interfaces and import graph

The moved `order-labels.ts` retains these exact public exports:

```ts
export const orderStatusLabels: Record<OrderStatus, string>;
export const paymentStatusLabels: Record<PaymentStatus, string>;
export const channelLabels: Record<SalesChannel, string>;
export function formatOrderDate(value: string): string;
export function getOrderStatusTone(status: OrderStatus): "closed" | "warning" | "success" | "active";
export function getPaymentTone(status: PaymentStatus): "danger" | "warning" | "success" | "active";
```

The moved `order-status-badge.tsx` retains these exact public component contracts:

```ts
export function OrderStatusBadge({ status }: { status: OrderStatus }): React.JSX.Element;
export function PaymentStatusBadge({ status }: { status: PaymentStatus }): React.JSX.Element;
```

Its only moved-internal presentation dependency is `@/modules/orders/ui/admin/order-labels`; its type-only dependency is `@/modules/orders/types`. It continues to depend only on `Badge`, `cn`, and those Orders UI/type imports—never a server module, Prisma, action, query hook, store, provider, HTTP client, or mutation.

| Consumer | Required import(s) after cutover |
| --- | --- |
| `orders-table.tsx` | `channelLabels` from `@/modules/orders/ui/admin/order-labels`; `OrderStatusBadge`, `PaymentStatusBadge` from `@/modules/orders/ui/admin/order-status-badge` |
| `orders-mobile-list.tsx` | `channelLabels`, `formatOrderDate` from `@/modules/orders/ui/admin/order-labels`; both badges from `@/modules/orders/ui/admin/order-status-badge` |
| `order-transition-controls.tsx` | `orderStatusLabels` from `@/modules/orders/ui/admin/order-labels` |
| `order-timeline.tsx` | `formatOrderDate`, `orderStatusLabels` from `@/modules/orders/ui/admin/order-labels` |
| `order-detail-sheet.tsx` | `channelLabels`, `formatOrderDate`, `paymentStatusLabels` from `@/modules/orders/ui/admin/order-labels`; both badges from `@/modules/orders/ui/admin/order-status-badge` |
| `customer-delivery-panel.tsx` | `orderStatusLabels` from `@/modules/orders/ui/admin/order-labels` |
| `open-orders-preview.tsx` | `OrderStatusBadge` from `@/modules/orders/ui/admin/order-status-badge` |

Baseline tracked-object identities for scope review are: `order-labels.ts` `abf380a83ad00a19534d9a6c53a7a24d44152a45`; `order-status-badge.tsx` `b2b12f3fed4e8a4ba99f7ce54edaef1c2d105283`; `orders-table.tsx` `0bfcf85bb3f570bb7c25db3fca139d86eae61852`; `orders-mobile-list.tsx` `7ff0924255ae22d74c1e2ae4c416efcbd16c3382`; `order-transition-controls.tsx` `70c244d3f96a50fd4641e1ec065de28eb2c8b5cf`; `order-timeline.tsx` `0e42f1e5415443c3b155e849e699e9d276019bde`; `order-detail-sheet.tsx` `bef8ad38b8c969d845269ce80dfcffc4d7f0bc08`; `customer-delivery-panel.tsx` `bc978f351dbff71ad289ed867f93b5caa8e77817`; `open-orders-preview.tsx` `de519076a73a5a7f8035ed67e6ddbf510eddd6b2`.

## Explicit exclusions

- No broader Orders workspace move, selector/control/sheet/route migration, Admin composition redesign, or later Phase 9 work.
- No change to copy, labels, date formatting, tones, imports other than the prescribed ones, props, JSX, classes, DOM, state, transitions, callbacks, query/cache keys, loading/error/empty behaviour, authorization, redirects, request/response, or persistence.
- No test creation, test change, test refactor, test-count claim, shared component change, type-facade/legacy-union cleanup, source contract change, dependency update, lockfile/configuration change, migration tracker/progress update, or compatibility layer.
- No remediation, reclassification, or clearance of Promotions validation debt, unrelated validation debt, or concurrent dirty work.

---

### Task 1: Perform the constrained Orders presentation ownership cutover

**Owner:** UI engineer

**Files:**
- Move: `src/features/admin/orders/order-labels.ts` → `src/modules/orders/ui/admin/order-labels.ts`
- Move: `src/features/admin/orders/order-status-badge.tsx` → `src/modules/orders/ui/admin/order-status-badge.tsx`
- Modify import declarations only: the seven consumers in the file and ownership map
- Test: No test file changes; this identity-preserving move has no focused primitive test file in the baseline

**Interfaces:**
- Consumes: the existing canonical `OrderStatus`, `PaymentStatus`, and `SalesChannel` exports from `@/modules/orders/types`; the existing `Badge` and `cn` primitives.
- Produces: the exact seven label/formatter/tone exports and two badge component contracts shown above at the two concrete `@/modules/orders/ui/admin/*` paths.
- Preserves: each consumer’s current props, local state, callbacks, data records, DOM, and error/pending/empty presentation; no new interface is introduced.

- [ ] **Step 1: Freeze the supported-toolchain status and verify the clean scoped baseline**

Run:

```powershell
$scope = @(
  'src/features/admin/orders/order-labels.ts',
  'src/features/admin/orders/order-status-badge.tsx',
  'src/features/admin/orders/orders-table.tsx',
  'src/features/admin/orders/orders-mobile-list.tsx',
  'src/features/admin/orders/order-transition-controls.tsx',
  'src/features/admin/orders/order-timeline.tsx',
  'src/features/admin/orders/order-detail-sheet.tsx',
  'src/features/admin/customers/customer-delivery-panel.tsx',
  'src/features/admin/overview/open-orders-preview.tsx',
  'src/modules/orders/ui/admin/order-labels.ts',
  'src/modules/orders/ui/admin/order-status-badge.tsx'
)
git branch --show-current
git rev-parse HEAD
$node = Get-Command node -ErrorAction SilentlyContinue
if ($null -eq $node) { 'node|NOT_ON_PATH' } else { node --version }
pnpm --version
git status --short --untracked-files=all
git status --short -- $scope
foreach ($path in $scope[0..8]) {
  $head = (git rev-parse "HEAD`:$path").Trim()
  $worktree = (git hash-object $path).Trim()
  "$path|HEAD=$head|WORKTREE=$worktree|MATCH=$($head -eq $worktree)"
}
(Get-FileHash 'src/features/admin/orders/order-labels.ts' -Algorithm SHA256).Hash.ToLower()
(Get-Item 'src/features/admin/orders/order-labels.ts').Length
(Get-Content 'src/features/admin/orders/order-labels.ts' | Measure-Object -Line).Lines
(Get-FileHash 'src/features/admin/orders/order-status-badge.tsx' -Algorithm SHA256).Hash.ToLower()
(Get-Item 'src/features/admin/orders/order-status-badge.tsx').Length
(Get-Content 'src/features/admin/orders/order-status-badge.tsx' | Measure-Object -Line).Lines
Test-Path 'src/modules/orders/ui/admin/order-labels.ts'
Test-Path 'src/modules/orders/ui/admin/order-status-badge.tsx'
rg -n -g '*.ts' -g '*.tsx' 'order-labels|order-status-badge' src
```

Expected: branch `agent/storefront-checkout-delivery-promotions-redesign`; HEAD `3786d33c17457cd5a9f126dcc965adbcb590eaff`; no output from scoped `git status`; all nine tracked files report `MATCH=True`; primitive SHA-256/size/line values match Global Constraints; both destinations are `False`; and the only legacy primitive references are the badge’s internal labels import plus the seven consumer entries in the exact import graph. Record every unrelated status entry without altering it. Node `25.x` and pnpm `11.13.0` are prerequisites for a passing execution gate; any other result, including the recorded planning host, stops validation as blocked. Stop and return to the orchestrator if the branch, baseline, scoped cleanliness, source identity, destination absence, or importer graph differs.

- [ ] **Step 2: Move the two primitives and make only their permitted internal references canonical**

Run:

```powershell
New-Item -ItemType Directory -Force -Path 'src/modules/orders/ui/admin' | Out-Null
Move-Item -LiteralPath 'src/features/admin/orders/order-labels.ts' -Destination 'src/modules/orders/ui/admin/order-labels.ts'
Move-Item -LiteralPath 'src/features/admin/orders/order-status-badge.tsx' -Destination 'src/modules/orders/ui/admin/order-status-badge.tsx'
```

Apply exactly these import replacements, and no other text change, in the moved files:

```diff
--- a/src/features/admin/orders/order-labels.ts
+++ b/src/modules/orders/ui/admin/order-labels.ts
-import type { OrderStatus, PaymentStatus, SalesChannel } from "@/lib/admin/shared/types";
+import type { OrderStatus, PaymentStatus, SalesChannel } from "@/modules/orders/types";

--- a/src/features/admin/orders/order-status-badge.tsx
+++ b/src/modules/orders/ui/admin/order-status-badge.tsx
-} from "@/features/admin/orders/order-labels";
-import type { OrderStatus, PaymentStatus } from "@/lib/admin/shared/types";
+} from "@/modules/orders/ui/admin/order-labels";
+import type { OrderStatus, PaymentStatus } from "@/modules/orders/types";
```

Expected: both legacy paths are absent; both module destinations exist; the moved badge has no `"use client"`; every non-import byte and line remains intact. Do not run a write formatter or edit the legacy type file.

- [ ] **Step 3: Replace only the seven prescribed consumer import specifiers**

Apply these exact import-target diffs; preserve imported identifiers, import grouping, all other imports, and every consumer statement/JSX byte:

```diff
--- a/src/features/admin/orders/orders-table.tsx
+++ b/src/features/admin/orders/orders-table.tsx
-import { channelLabels } from "@/features/admin/orders/order-labels";
+import { channelLabels } from "@/modules/orders/ui/admin/order-labels";
-import { OrderStatusBadge, PaymentStatusBadge } from "@/features/admin/orders/order-status-badge";
+import { OrderStatusBadge, PaymentStatusBadge } from "@/modules/orders/ui/admin/order-status-badge";

--- a/src/features/admin/orders/orders-mobile-list.tsx
+++ b/src/features/admin/orders/orders-mobile-list.tsx
-import { channelLabels, formatOrderDate } from "@/features/admin/orders/order-labels";
+import { channelLabels, formatOrderDate } from "@/modules/orders/ui/admin/order-labels";
-import { OrderStatusBadge, PaymentStatusBadge } from "@/features/admin/orders/order-status-badge";
+import { OrderStatusBadge, PaymentStatusBadge } from "@/modules/orders/ui/admin/order-status-badge";

--- a/src/features/admin/orders/order-transition-controls.tsx
+++ b/src/features/admin/orders/order-transition-controls.tsx
-import { orderStatusLabels } from "@/features/admin/orders/order-labels";
+import { orderStatusLabels } from "@/modules/orders/ui/admin/order-labels";

--- a/src/features/admin/orders/order-timeline.tsx
+++ b/src/features/admin/orders/order-timeline.tsx
-import { formatOrderDate, orderStatusLabels } from "@/features/admin/orders/order-labels";
+import { formatOrderDate, orderStatusLabels } from "@/modules/orders/ui/admin/order-labels";

--- a/src/features/admin/orders/order-detail-sheet.tsx
+++ b/src/features/admin/orders/order-detail-sheet.tsx
-} from "@/features/admin/orders/order-labels";
+} from "@/modules/orders/ui/admin/order-labels";
-import { OrderStatusBadge, PaymentStatusBadge } from "@/features/admin/orders/order-status-badge";
+import { OrderStatusBadge, PaymentStatusBadge } from "@/modules/orders/ui/admin/order-status-badge";

--- a/src/features/admin/customers/customer-delivery-panel.tsx
+++ b/src/features/admin/customers/customer-delivery-panel.tsx
-import { orderStatusLabels } from "@/features/admin/orders/order-labels";
+import { orderStatusLabels } from "@/modules/orders/ui/admin/order-labels";

--- a/src/features/admin/overview/open-orders-preview.tsx
+++ b/src/features/admin/overview/open-orders-preview.tsx
-import { OrderStatusBadge } from "@/features/admin/orders/order-status-badge";
+import { OrderStatusBadge } from "@/modules/orders/ui/admin/order-status-badge";
```

Expected: exactly seven consumer files change, and each resolves the exact imports in the import graph. No import to either old legacy primitive remains.

- [ ] **Step 4: Prove normalized primitive identity, canonical type imports, exact seven-consumer cutover, and zero compatibility edges**

Run:

```powershell
$scope = @(
  'src/features/admin/orders/order-labels.ts',
  'src/features/admin/orders/order-status-badge.tsx',
  'src/modules/orders/ui/admin/order-labels.ts',
  'src/modules/orders/ui/admin/order-status-badge.tsx',
  'src/features/admin/orders/orders-table.tsx',
  'src/features/admin/orders/orders-mobile-list.tsx',
  'src/features/admin/orders/order-transition-controls.tsx',
  'src/features/admin/orders/order-timeline.tsx',
  'src/features/admin/orders/order-detail-sheet.tsx',
  'src/features/admin/customers/customer-delivery-panel.tsx',
  'src/features/admin/overview/open-orders-preview.tsx'
)
function Get-Utf8Sha256([string]$value) {
  $sha = [System.Security.Cryptography.SHA256]::Create()
  try {
    ([System.BitConverter]::ToString($sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($value)))).Replace('-', '').ToLower()
  } finally {
    $sha.Dispose()
  }
}

$labels = Get-Content -Raw 'src/modules/orders/ui/admin/order-labels.ts'
$normalLabels = $labels.Replace('from "@/modules/orders/types"', 'from "@/lib/admin/shared/types"')
"normalized-labels-sha256=$(Get-Utf8Sha256 $normalLabels)"

$badge = Get-Content -Raw 'src/modules/orders/ui/admin/order-status-badge.tsx'
$normalBadge = $badge.Replace('from "@/modules/orders/ui/admin/order-labels"', 'from "@/features/admin/orders/order-labels"').Replace('from "@/modules/orders/types"', 'from "@/lib/admin/shared/types"')
"normalized-badge-sha256=$(Get-Utf8Sha256 $normalBadge)"

rg -n --fixed-strings 'import type { OrderStatus, PaymentStatus, SalesChannel } from "@/modules/orders/types";' 'src/modules/orders/ui/admin/order-labels.ts'
rg -n --fixed-strings 'import type { OrderStatus, PaymentStatus } from "@/modules/orders/types";' 'src/modules/orders/ui/admin/order-status-badge.tsx'
rg -n --fixed-strings '@/lib/admin/shared/types' 'src/modules/orders/ui/admin/order-labels.ts' 'src/modules/orders/ui/admin/order-status-badge.tsx'
rg -n --fixed-strings '@/features/admin/orders/order-labels' src tests scripts
rg -n --fixed-strings '@/features/admin/orders/order-status-badge' src tests scripts
rg -n --fixed-strings '@/modules/orders/ui/admin/order-labels' src
rg -n --fixed-strings '@/modules/orders/ui/admin/order-status-badge' src
rg --files src | rg '(^|[\\/])(order-labels\.ts|order-status-badge\.tsx)$'
Test-Path 'src/features/admin/orders/order-labels.ts'
Test-Path 'src/features/admin/orders/order-status-badge.tsx'
git diff --check -- $scope
git diff --name-only -- $scope
git diff --stat -- $scope
```

Expected: normalized labels SHA-256 is `91635b3236224a85d8353d96d33d11245bc96dc687534b1db5dd83b6afb31e6c`; normalized badge SHA-256 is `4402e5e297e0a074eaef326f45926d7a651895cd30c41e949db593a6a129e39c`; each canonical type-import search returns its one exact line; the legacy shared-type search returns no matches; the two legacy primitive-import searches return no matches; the module-label path occurs in the moved badge plus the six direct-label consumers, and the module-badge path occurs in the four badge consumers; filename discovery reports only the two module destinations. Both legacy `Test-Path` calls are `False`; `git diff --check` is clean; and the diff names are exactly the two legacy deletes, two module adds, and seven consumers. Any extra match, file, or diff line is a scope blocker—do not clean it up speculatively.

- [ ] **Step 5: Run focused static verification without rewriting source**

After confirming Node `25.x` and pnpm `11.13.0`, run:

```powershell
pnpm exec biome check `
  src/modules/orders/ui/admin/order-labels.ts `
  src/modules/orders/ui/admin/order-status-badge.tsx `
  src/features/admin/orders/orders-table.tsx `
  src/features/admin/orders/orders-mobile-list.tsx `
  src/features/admin/orders/order-transition-controls.tsx `
  src/features/admin/orders/order-timeline.tsx `
  src/features/admin/orders/order-detail-sheet.tsx `
  src/features/admin/customers/customer-delivery-panel.tsx `
  src/features/admin/overview/open-orders-preview.tsx
pnpm check:architecture
pnpm typecheck
```

Expected: each command exits `0` on the supported toolchain. No primitive-focused baseline test exists, so do not invent one or claim a test count; the structural identity and import-graph checks above are the focused proof for this move. If `pnpm exec biome` cannot resolve, use only `./node_modules/.bin/biome.cmd check` with the same paths and record the failure and fallback. If Biome proposes any write, or any command fails under the supported toolchain, do not run a broad formatter or refactor source: preserve the evidence and return the blocker to the reviewer.

- [ ] **Step 6: Stage only this slice, verify the independent diff, and create the implementation commit**

Run:

```powershell
$commitPaths = @(
  'src/features/admin/orders/order-labels.ts',
  'src/features/admin/orders/order-status-badge.tsx',
  'src/modules/orders/ui/admin/order-labels.ts',
  'src/modules/orders/ui/admin/order-status-badge.tsx',
  'src/features/admin/orders/orders-table.tsx',
  'src/features/admin/orders/orders-mobile-list.tsx',
  'src/features/admin/orders/order-transition-controls.tsx',
  'src/features/admin/orders/order-timeline.tsx',
  'src/features/admin/orders/order-detail-sheet.tsx',
  'src/features/admin/customers/customer-delivery-panel.tsx',
  'src/features/admin/overview/open-orders-preview.tsx'
)
git status --short --untracked-files=all
git diff --cached --name-only
git add -- $commitPaths
git diff --cached --check -- $commitPaths
git diff --cached --summary --find-renames=50% -- $commitPaths
git diff --cached --name-only -- $commitPaths
git diff --cached -- $commitPaths
git commit --only -m "refactor(orders): move admin presentation primitives" -- $commitPaths
git rev-parse HEAD
git status --short --untracked-files=all
```

Expected: record any pre-existing staged paths before `git add`; never unstage them. The scoped cached diff has clean whitespace and contains only the eleven paths listed in `$commitPaths`, with the two old paths deleted, two module paths added, and seven import-only consumer modifications. Rename detection may report a similarity below 100% because the three approved internal import paths changed; normalized structural hashes—not a rename percentage—are the identity authority. `git commit --only` creates one independent implementation commit while preserving unrelated staged, modified, and untracked work. Do not stage this plan or any other documentation in that commit.

### Task 2: Apply exact-head reviewer gates, causality, and browser parity review

**Owner:** Reviewer

**Files:**
- Review: the eleven committed Task 1 paths and the two legacy paths now absent
- Review: `src/modules/orders/types.ts` and `src/lib/admin/shared/types.ts` only as unchanged contract evidence
- Modify: None

**Interfaces:**
- Consumes: Task 1’s commit SHA; frozen hashes/blob identities; zero-legacy-import and canonical-type-import proof; the exact seven-consumer map; and the preserved unrelated-work status.
- Produces: an evidence-backed pass/block verdict that distinguishes passed, failed, blocked, skipped, advisory, and comparably pre-existing results. No reviewer source repair is authorized.

- [ ] **Step 1: Reconfirm exact-head scope, identity, and protected dirty-work isolation**

Run:

```powershell
$commitPaths = @(
  'src/features/admin/orders/order-labels.ts',
  'src/features/admin/orders/order-status-badge.tsx',
  'src/modules/orders/ui/admin/order-labels.ts',
  'src/modules/orders/ui/admin/order-status-badge.tsx',
  'src/features/admin/orders/orders-table.tsx',
  'src/features/admin/orders/orders-mobile-list.tsx',
  'src/features/admin/orders/order-transition-controls.tsx',
  'src/features/admin/orders/order-timeline.tsx',
  'src/features/admin/orders/order-detail-sheet.tsx',
  'src/features/admin/customers/customer-delivery-panel.tsx',
  'src/features/admin/overview/open-orders-preview.tsx'
)
git show --summary --stat --find-renames=50% HEAD
git show --check HEAD
git diff HEAD^ HEAD --name-only
git diff HEAD^ HEAD -- $commitPaths
git status --short --untracked-files=all
Test-Path 'src/features/admin/orders/order-labels.ts'
Test-Path 'src/features/admin/orders/order-status-badge.tsx'
rg -n --fixed-strings '@/features/admin/orders/order-labels' src tests scripts
rg -n --fixed-strings '@/features/admin/orders/order-status-badge' src tests scripts
```

Expected: the commit changes only `$commitPaths`; whitespace is clean; the old paths are absent; neither legacy import has a match; and unrelated dirty/untracked entries remain outside the commit. Re-run Task 1 Step 4’s normalized identity and canonical-type proof against `HEAD`; it must produce the two frozen SHA-256 values and the exact module import graph.

- [ ] **Step 2: Run repository-owned exact-head gates separately on a supported toolchain**

Run each command separately after recording `node --version` and `pnpm --version`:

```powershell
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
pnpm validate:browser
```

Expected: retain the actual exit code, full output, summary/manifest location, duration, and redacted log for every command; do not state an unverified test count. `react-doctor` is advisory at process exit, but a finding involving either moved primitive, a named consumer, Orders UI ownership, or a client/server boundary blocks this slice. `validate:full` and `validate:browser` require source-backed evidence; queued, cancelled, zero-step, missing-manifest, deployment-only, unsupported-toolchain, or skipped output is blocked/skipped, never passing. The known Promotions checkpoint remains explicitly blocked debt under the user-approved sequencing decision.

- [ ] **Step 3: Establish baseline causality for every failed or unavailable repository-wide gate**

For each non-passing gate, preserve its output, then use a separate clean worktree rather than touching the shared worktree:

```powershell
$baseline = '3786d33c17457cd5a9f126dcc965adbcb590eaff'
$baselinePath = Join-Path $env:TEMP "laitstyles-orders-baseline-$baseline"
if (Test-Path $baselinePath) { throw "Baseline evidence path already exists: $baselinePath" }
git worktree add --detach $baselinePath $baseline
Push-Location $baselinePath
git rev-parse HEAD
node --version
pnpm --version
pnpm check:architecture
pnpm biome
pnpm typecheck
pnpm test
pnpm build
pnpm react-doctor
pnpm validate:full
pnpm validate:browser
Pop-Location
```

Expected: compare only commands that did not pass in Step 2 with their same-command baseline result; retain all results without labelling an unneeded baseline command as part of this slice’s pass evidence. A failure that mentions a moved primitive, either canonical type import, a named consumer, Orders UI ownership, client/server boundary, or changed import resolution is new and blocks. A broader failure is pre-existing only when the identical command and failure reproduce at the frozen baseline; otherwise it blocks. Keep the detached worktree as evidence until review completion; do not use stash, reset, restore, broad cleanup, or an in-place checkout.

- [ ] **Step 4: Perform staff-authorized browser, accessibility, and responsive parity review**

Against an authorized staff session, inspect `/admin/orders`, the customer delivery surface, and the admin overview in light and dark themes at `375x812`, `768x1024`, and `1280x800`. Capture before/after screenshots where the baseline environment is available; inspect console output, failed requests, and available server logs. Exercise the existing orders table/list and mobile layout, detail sheet, timeline, permitted transition and destructive-confirmation flow, customer delivery history, and overview open-order states where controlled data permits. Verify exact labels, date strings, badge tones, DOM/accessibility tree, accessible names, keyboard/focus behaviour, colour-independent status meaning, responsive layout, absence of overflow, and unchanged authorization/redirect behaviour.

Expected: no runtime, DOM, accessibility-tree, style, responsive, request/response, authorization, cache, or persistence difference is attributable to the move. Missing credentials, controlled data, runner, browser, screenshots, or logs blocks/skips that named inspection and is reported honestly; it does not authorize source changes or a passing verdict.

- [ ] **Step 5: Issue the reviewer verdict and completion report without changing source**

Report the implementation SHA; all eleven source paths; legacy-file absence; normalized SHA-256 proof; canonical type-import proof; exact seven-consumer graph; actual Node/pnpm versions; every command’s result and evidence location; baseline-causality results; screenshots/themes/viewports/states; console/network/log observations; protected dirty-work status; and all failed/advisory/blocked/skipped evidence. State: “Promotions validation remains blocked validation debt; the user approved independent Orders-slice sequencing, not a pass, clearance, or waiver.” Confirm no shim, test edit, type-facade change, server/data/configuration/dependency change, or unrecorded override occurred.

Expected: approve only when the available required evidence passes and no new failure exists. Otherwise return the exact blocker to the orchestrator, with no source modification.

## Rollback

Rollback is source-only and must not use `git reset`, a broad checkout, or a directory deletion. First repoint only the seven consumer imports back to the two `@/features/admin/orders/*` primitive paths, then restore the moved badge’s internal labels import and both primitives’ legacy shared-type imports. Only after every consumer resolves may the files be moved back:

```powershell
Move-Item -LiteralPath 'src/modules/orders/ui/admin/order-labels.ts' -Destination 'src/features/admin/orders/order-labels.ts'
Move-Item -LiteralPath 'src/modules/orders/ui/admin/order-status-badge.tsx' -Destination 'src/features/admin/orders/order-status-badge.tsx'
```

Re-run Task 1 Step 4 with the import normalization reversed, the zero-module-consumer/zero-duplicate searches, scoped static checks, exact-head gates, and browser parity checks. Stage and commit only the same eleven source paths with `git commit --only`; preserve unrelated dirty and staged work. Do not leave a duplicate, alias, forwarding module, shim, barrel, or partially restored import graph.
