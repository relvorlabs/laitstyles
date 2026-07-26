# Phase 1–6 Full Acceptance Ledger

## Candidate

`9f48bf2cf5fc4abb27b094c6e153f59288164ae9`

Captured at `2026-07-26T11:54:47.677Z`.

## Parent

`9da5a60bed3f7fd091fb51b21c2cde5e9971b551`

## Branch

`codex/phase-1-6-full-acceptance`

## Working tree inventory

```text
M .superpowers/sdd/progress.md
 M scripts/ci/collect-context.mjs
 M scripts/ci/lib.mjs
?? ci-evidence/
```

This is a recorded dirty candidate, not a claim that the working tree is clean.

## Tool versions

| Tool | Captured version |
| --- | --- |
| Node.js | `v25.9.0` |
| pnpm | `11.13.0` |
| Prisma (`@prisma/client`) | `^7.8.0` |
| Playwright | `^1.61.1` |

## Lockfile digest

SHA-256: `cd983738687701c53f6371aad4fbb22a9adb17eed4c39d3c2999cda92f2f506f`

## Database identity digest

`null` — no disposable database identity was supplied for this capture.

## Evidence index

- `ci-evidence/phase-1-6-full-acceptance/context/context.json` — authoritative generated context used for every evidence value in this ledger.
- `ci-evidence/phase-1-6-full-acceptance/context/context.md` — generated human-readable context companion.
- `ci-evidence/phase-1-6-full-acceptance/context/changes.patch` — generated candidate-change capture.

## Workstream verdicts

| Workstream or phase | Verdict | Basis and boundary |
| --- | --- | --- |
| WS0 | Accepted for pre-commit Steps 1–4 only | The frozen toolchain/install, lockfile integrity, required context, exact-head assertion, and secret scan passed for the candidate above. Final WS0 acceptance remains subject to the reviewer commit and a post-commit exact-HEAD recapture. |
| WS1 | Pending execution | No Phase 1 guard/import/export acceptance is claimed. |
| WS2a | Pending execution | No Phase 2 layout/provider acceptance is claimed. |
| WS2b | Pending execution | No Phase 3 HTTP-foundation acceptance is claimed. |
| Phases 1–6 overall | Not accepted | This ledger can certify Phases 1–6 only after the later plans and their same-SHA gates complete. |
| Phases 7–9 | Not accepted | These phases are outside this acceptance scope. |
| Phase 10 | Not accepted | No release-readiness claim is made. |

## Known limitations

- The evidence identifies the pre-commit candidate above. The reviewer-owned commit will change HEAD and requires a fresh context capture before WS0 can receive a final verdict.
- `databaseIdentityDigest` is `null`; real-database identity and persistence evidence are not part of this capture.
- The captured working-tree inventory predates this planner-owned ledger and therefore does not list the ledger itself. It records the shared progress change, two CI-script changes, and generated evidence; this ledger neither owns nor resolves those entries.
- No WS1, WS2a, WS2b, later Phase 1–6, browser, database, or final same-SHA certification gate is represented as complete.

## Explicit exclusions

- Phase 7 authentication consolidation.
- Phase 8 checkout and payment settlement.
- Phase 9 broad legacy deletion.
- Phase 0 recapture and Phase 10 release readiness.
- UI redesign, speculative APIs or abstractions, and dependency or framework upgrades.
- Supplier management, accounting, warehouse management, marketing automation, platform administration, and capabilities outside the controlling Phase 1–6 requirement.
- Staging, committing, post-commit recapture, generated-evidence edits, user-owned file changes, later-workstream command execution, and Task 2.
