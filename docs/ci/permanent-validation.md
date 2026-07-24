# Permanent validation and repair loop

Phase 1 makes validation independent of paid GitHub-hosted minutes while keeping the private
Laitstyles source private.

## Execution lanes

### Private source lane

`Implementation Quality`, `Playwright UI Contract`, and `Task Progress and GitHub Agent Feedback`
default to this runner selector:

```json
["self-hosted", "linux", "x64", "laitstyles-ci"]
```

Use a dedicated Linux runner registered only to the private `relvorlabs/laitstyles` repository.
It may run on the existing Hetzner server or another trusted machine. The runner needs:

- Docker Engine with permission for the runner service account;
- Git and `curl`;
- outbound HTTPS access to GitHub, npm, and Playwright browser downloads;
- enough disk for pnpm, Next.js, Chromium, coverage, traces, and screenshots.

Node 25 and pnpm 11.13 are installed by repository-owned setup actions. PostgreSQL 17 is created as
a workflow service container, so no shared production database is used.

### Public deployment lane

The permanent `Remote Public UI Contract` workflow in `relvorlabs/agent-controller` tests only a
public deployment URL. It does not check out or execute the private Laitstyles source because public
workflow logs and artifacts could expose source diagnostics.

The workflow was merged to `agent-controller/main` as commit
`ea33659835976c3823f4ecbf29508eb4275377b0` after run `30102855564` passed its target validation,
isolated Playwright setup, desktop/tablet/mobile browser contract, manifest, and artifact upload.

```text
Artifact ID: 8600369626
Artifact: remote-public-ui-laitstyles-pr-30102855564
Digest: sha256:0b7df9d9fcaba7df46d6951b7da276c3be273b5ea1b8e71c66a2ce9e9384326c
Expires: 2026-08-23
```

Use that lane for deployment availability, responsive screenshots, browser errors, and public
navigation smoke checks. Use the private source lane for Biome, TypeScript, Vitest, Prisma, build,
React Doctor, and source-backed Playwright.

## One-time runner registration

1. Open **Laitstyles → Settings → Actions → Runners → New self-hosted runner**.
2. Select Linux x64 and follow GitHub's current download and registration commands.
3. Add the custom label `laitstyles-ci` during configuration.
4. Install the runner as a service using the commands GitHub shows.
5. Ensure the runner service account can run `docker version` without `sudo`.
6. Keep the runner dedicated to this private repository. Do not register the same runner to a
   public repository or an organization that accepts untrusted pull requests.

The workflow runner can be changed without editing YAML by creating a repository Actions variable
named `CI_RUNNER` containing a valid JSON runner selector. Examples:

```json
["self-hosted", "linux", "x64", "laitstyles-ci"]
```

```json
"ubuntu-latest"
```

The second form restores GitHub-hosted execution only when account billing permits it.

## Local commands

```bash
pnpm biome                 # check formatting and lint rules
pnpm biome:fix             # deterministic Biome repair
pnpm typecheck             # TypeScript
pnpm test                  # Vitest
pnpm test:coverage         # Vitest with coverage
pnpm react-doctor          # pinned React Doctor 0.7.2, telemetry disabled
pnpm validate              # architecture + Biome + TypeScript + tests + React Doctor
pnpm validate:fix          # Biome repair, then the normal validation set
pnpm validate:full         # normal set + Prisma integrity + production build
pnpm validate:browser      # normal set + all Playwright viewports against PLAYWRIGHT_BASE_URL
```

`pnpm validate:full` requires a disposable PostgreSQL database through `DATABASE_URL` and
`DIRECT_URL`; the private workflow supplies PostgreSQL 17 automatically. Do not point validation at
a production database.

`pnpm validate:browser` expects an already-running application and installed Chromium. It uses
`http://127.0.0.1:3000` unless `PLAYWRIGHT_BASE_URL` is set.

Every validation command continues through its selected suites and writes evidence to:

```text
ci-evidence/local-verification/
```

A missing manifest is treated as a failure rather than a pass.

## Pull-request feedback commands

Authorized repository owners, members, and collaborators may comment:

```text
/ci analyze
/ci status
/ci rerun-failed
/ci safe-repair-plan
```

- `analyze` and `status` collect workflow runs, job metadata, failed logs, artifacts, changed files,
  and a bounded patch, then publish a sticky evidence-based handoff.
- `rerun-failed` retries the latest failed validation runs for the current PR head.
- `safe-repair-plan` installs locked dependencies without lifecycle scripts, applies only
  deterministic Biome changes, and uploads a patch. It does not push code.

Semantic implementation fixes are never guessed or auto-pushed. A human or connected GitHub agent
must inspect the evidence, change the smallest demonstrated root cause, commit it to the PR branch,
and let the full validation loop run again.

## Required merge evidence

A phase or implementation is not complete until the relevant required suites have executed and
passed. A queued runner, missing job, cancelled job, zero-step job, absent artifact, advisory
warning, or public-deployment-only test is not reported as a private source pass.
