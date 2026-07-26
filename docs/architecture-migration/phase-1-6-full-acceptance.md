# Phase 1–6 Full Acceptance Ledger

## Candidate

The authoritative candidate is `ci-evidence/phase-1-6-full-acceptance/context/context.json#candidateSha`.
The context gate must assert that value equals `git rev-parse HEAD` before evidence is accepted.

This tracked ledger intentionally does not embed a literal candidate SHA: changing a tracked SHA
changes the commit that the SHA would identify. Capture time is authoritative at
`context.json#capturedAt`.

## Parent

The authoritative parent is `context.json#parentSha`.

## Branch

`codex/phase-1-6-full-acceptance`

## Working tree inventory

The authoritative inventory is `context.json#workingTreeEntries`. A dirty candidate may be
recorded, but the evidence must describe it exactly and must not be presented as a clean checkout.

## Tool versions

| Tool | Captured version |
| --- | --- |
| Node.js | `context.json#nodeVersion` (required: Node 25.x) |
| pnpm | `context.json#pnpmVersion` (required: `11.13.0`) |
| Prisma (`@prisma/client`) | `^7.8.0` |
| Playwright | `^1.61.1` |

## Lockfile digest

Authoritative at `context.json#lockfileSha256`.

## Database identity digest

Authoritative at `context.json#databaseIdentityDigest`; `null` means no disposable database
identity was supplied for that capture and cannot support persistence acceptance.

## Execution overrides and current blocker

- **Phase 4–5 sequencing override:** At the repository owner's explicit direction, Phase 4–5
  implementation proceeds now while the known Phase 1–3 Cache Components, build, and evidence
  blockers remain carried debt. Those blockers must be combined with the Phase 4–5 results and
  resolved or reported after Phase 4–5; this sequencing does not waive them or establish Phase 4
  or Phase 5 acceptance.
- **Persistence-tooling boundary:** At the repository owner's explicit direction, Prisma owns the
  database schema and migrations, while Supabase is limited to authentication and session
  concerns. This acceptance run does not require the Supabase CLI or Docker.
- **WS6a data preflight:** The configured remote PostgreSQL identity was sanitized to digest
  `sha256:9bc727712d149210`, but the required disposable-database marker was absent. Therefore no
  database connection, validation, deployment, migration-status, seed, or cleanup command ran.
  WS6a remains blocked, and no live-database, Phase 4, or Phase 5 acceptance is claimed.
- **2026-07-26 reconciliation pass (candidate `f088430...` on `main`):** This ledger and
  `migration-tracker.md` had drifted from the real, executable state of the repository — some
  claims were stale (a Zustand lockfile blocker that no longer exists), and one guard failure was
  a script defect rather than a real architecture violation. This pass corrected both by executing
  commands, not by editing prose. Full detail lives in `migration-tracker.md`'s "Reconciliation
  evidence (2026-07-26)" section; the summary:
  - `pnpm install --frozen-lockfile`: passes; Zustand blocker is resolved.
  - `pnpm check:architecture`: now **0 errors** across all five guards, after fixing a
    `module-export-guard.mjs` blind spot (it never scanned `scripts/auth/**`) and relocating an
    orphaned test that referenced a file moved during the Phase 6 cutover. Committed as `f088430`.
  - `pnpm typecheck`: 25 phantom errors were stale `.next` build cache and disappeared once the
    cache was deleted (no source change). Seven real errors remain — `profile_details` and
    `product_variant_measurements` do not type-check as `PrismaClient` properties in five files.
    Not fixed in this pass; flagged as a data-engineer-owned Prisma/schema generation defect.
  - `pnpm build`: **fails** on the same Prisma model gap (`next build`'s TypeScript pass).
  - `pnpm biome`: passes, 0 errors, 65 pre-existing warnings.
  - `pnpm exec vitest run` (full suite): 482 passed, 6 failed, 6 skipped. None of the six failures
    are in Phase 6 storefront-state files; they are Phase 4/5-area module-boundary and
    HTTP-contract mismatches (see `migration-tracker.md` for the itemized list).
  - Playwright/browser, React Doctor, and any real-database (WS6a/WS6b) evidence were **not**
    executed in this pass.
  - This session's Node is `v26.5.0` against a required `25.x`; the previously captured WS0
    context was taken correctly on `v25.9.0` but against an ancestor SHA (`8959632...`), so it
    cannot certify the current `HEAD` regardless of Node version and must be recaptured.
  - No workstream is newly marked accepted by this pass. WS1's own guard/import/export criterion
    is now met; WS1's typecheck criterion is not, for a reason outside WS1's assigned paths.

## Evidence index

- `ci-evidence/phase-1-6-full-acceptance/context/context.json` — authoritative generated context used for every evidence value in this ledger.
- `ci-evidence/phase-1-6-full-acceptance/context/context.md` — generated human-readable context companion.
- `ci-evidence/phase-1-6-full-acceptance/context/changes.patch` — generated candidate-change capture.

## Workstream verdicts

| Workstream or phase | Verdict | Basis and boundary |
| --- | --- | --- |
| WS0 | In progress | The one captured context (`8959632...`) predates current `HEAD` (`f088430...`) by several commits; it does not certify the current candidate. Acceptance still requires a post-commit context recapture, exact-HEAD assertion, frozen toolchain/install (proven passing 2026-07-26, needs recapture on the current SHA), lockfile integrity (proven passing), and secret scan on the same candidate. |
| WS1 | In progress — partially met | `pnpm check:architecture` passes with 0 errors across all five guards as of 2026-07-26 (see Execution overrides above), meeting WS1's guard/import/export criterion. `pnpm typecheck` still fails (7 errors), which the plan's own WS1 acceptance gate lists as required — but the failure is a Prisma-client model-typing gap in Products/account-profile persistence code, not an import/export or architecture-boundary violation. WS1 is not accepted until typecheck is clean, regardless of which role owns the fix. |
| WS2a | In progress — partially met; **superseded 2026-07-27** | This row described the three-way provider split (root theme/toaster only, admin `QueryProvider` admin-only, separate storefront query/auth providers) as matching target. That split is being deliberately replaced by one shared root provider tree per direct user instruction — a recorded override of the Phase 7 auth-provider-merge exclusion. See `docs/superpowers/specs/2026-07-27-provider-centralization-design.md`. This row will be rewritten against the new shape once that implementation lands; until then, do not treat "matches the documented target tree" as current. |
| WS2b | In progress — partially met | `http-module-contract` passes (0 errors). Two HTTP-contract Vitest failures were found in this pass (`/api/v1/admin/inventory` and its `adjustments` route both expect `400` for a validation failure, actual is `422`) — this looks like a stale test expectation against the documented Phase 3 `VALIDATION_ERROR`/422 contract, not a production regression, but is recorded unresolved rather than assumed. |
| Phases 1–6 overall | Not accepted | This ledger can certify Phases 1–6 only after the later plans and their same-SHA gates complete. |
| Phases 7–9 | Not accepted | These phases are outside this acceptance scope. |
| Phase 10 | Not accepted | No release-readiness claim is made. |

## Known limitations

- Generated evidence is authoritative only when its `candidateSha` equals the current HEAD and all
  required suite manifests assert that same SHA. The one captured context manifest predates
  current `HEAD` and must be recaptured before it can support any claim on this candidate.
- A `null` `databaseIdentityDigest` cannot support real-database persistence acceptance.
- No WS1, WS2a, WS2b, later Phase 1–6, browser, database, or final same-SHA certification gate is represented as complete.
- A real, currently-failing Prisma-client model-typing defect (`profile_details`,
  `product_variant_measurements` not resolving as `PrismaClient` properties) blocks both
  `pnpm typecheck` and `pnpm build` as of 2026-07-26. It is out of scope for WS0/WS1 documentation
  reconciliation and is recorded here so it is not silently dropped; it must be resolved by a
  data-engineer pass before WS1, WS2a, or any later gate that requires a clean typecheck/build can
  be accepted.
- A full local Vitest run (2026-07-26) found six failing tests in Products/Inventory/Settings
  module-boundary and HTTP-contract areas (Phase 4/5 territory), detailed in
  `migration-tracker.md`'s reconciliation section. These predate this pass and are not fixed here.

## Explicit exclusions

- Phase 7 authentication consolidation.
- Phase 8 checkout and payment settlement.
- Phase 9 broad legacy deletion.
- Phase 0 recapture and Phase 10 release readiness.
- UI redesign, speculative APIs or abstractions, and dependency or framework upgrades.
- Supplier management, accounting, warehouse management, marketing automation, platform administration, and capabilities outside the controlling Phase 1–6 requirement.
- Staging, committing, post-commit recapture, generated-evidence edits, user-owned file changes, later-workstream command execution, and Task 2.
