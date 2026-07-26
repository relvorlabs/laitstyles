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

## Evidence index

- `ci-evidence/phase-1-6-full-acceptance/context/context.json` — authoritative generated context used for every evidence value in this ledger.
- `ci-evidence/phase-1-6-full-acceptance/context/context.md` — generated human-readable context companion.
- `ci-evidence/phase-1-6-full-acceptance/context/changes.patch` — generated candidate-change capture.

## Workstream verdicts

| Workstream or phase | Verdict | Basis and boundary |
| --- | --- | --- |
| WS0 | In progress | Acceptance requires a post-commit context recapture, exact-HEAD assertion, frozen toolchain/install, lockfile integrity, and secret scan on the same candidate. |
| WS1 | Pending execution | No Phase 1 guard/import/export acceptance is claimed. |
| WS2a | Pending execution | No Phase 2 layout/provider acceptance is claimed. |
| WS2b | Pending execution | No Phase 3 HTTP-foundation acceptance is claimed. |
| Phases 1–6 overall | Not accepted | This ledger can certify Phases 1–6 only after the later plans and their same-SHA gates complete. |
| Phases 7–9 | Not accepted | These phases are outside this acceptance scope. |
| Phase 10 | Not accepted | No release-readiness claim is made. |

## Known limitations

- Generated evidence is authoritative only when its `candidateSha` equals the current HEAD and all
  required suite manifests assert that same SHA.
- A `null` `databaseIdentityDigest` cannot support real-database persistence acceptance.
- No WS1, WS2a, WS2b, later Phase 1–6, browser, database, or final same-SHA certification gate is represented as complete.

## Explicit exclusions

- Phase 7 authentication consolidation.
- Phase 8 checkout and payment settlement.
- Phase 9 broad legacy deletion.
- Phase 0 recapture and Phase 10 release readiness.
- UI redesign, speculative APIs or abstractions, and dependency or framework upgrades.
- Supplier management, accounting, warehouse management, marketing automation, platform administration, and capabilities outside the controlling Phase 1–6 requirement.
- Staging, committing, post-commit recapture, generated-evidence edits, user-owned file changes, later-workstream command execution, and Task 2.
