# GitHub-only CI feedback loop

The repository keeps exactly three authoritative workflows. They run on `ubuntu-latest`, execute repository-owned scripts, retain complete evidence, and expose a machine-readable handoff that any connected ChatGPT/Codex GitHub session can inspect.

No OpenAI API key, OpenAI endpoint, webhook, or deployed Next.js analysis route is required or used.

## Operating model

GitHub Actions runs the validation jobs and stores their results. A connected GitHub chat can then:

1. open the pull request;
2. read workflow runs, jobs, failed logs, artifacts, `ci-feedback.json`, and `agent-handoff.json`;
3. inspect the changed implementation;
4. fix the smallest evidenced root cause on the PR branch;
5. commit and push the correction;
6. inspect the new workflow runs;
7. rerun failed jobs when the code did not change;
8. repeat until every required check passes.

GitHub Actions cannot silently wake an existing chat session. The chat must be invoked by the user, but it does not need an API key because it uses the connected GitHub integration.

## Workflows

### `implementation-quality.yml`

Runs independent jobs for:

- changed-file, architecture-doctrine, and agent-skill context;
- architecture and folder boundaries;
- strict button audit, Biome, and TypeScript;
- production dependency audit as an advisory signal;
- Prisma validation, migration deployment, and migration status against PostgreSQL 17;
- Vitest with coverage;
- production build and changed-scope React Doctor review;
- aggregate evidence generation, including missing-job detection.

Each command runs through `scripts/ci/run-gates.mjs`. The runner continues through every gate, applies a per-command timeout, redacts configured secrets, stores complete logs, and records exit code, signal, duration, and required/advisory status.

### `playwright.yml`

Builds the production application once and then runs independent desktop, tablet, and mobile Chromium jobs. Each viewport job performs:

- database migration deployment;
- Chromium and operating-system dependency installation with browser caching;
- production server readiness and process-liveness checks;
- redirect-aware HTTP page smoke checks;
- protected API status verification;
- Playwright theme, responsiveness, event, button, console, network, and runtime contracts;
- JSON, JUnit, HTML, trace, screenshot, and retained failure-video output;
- production server log inspection;
- an aggregate viewport manifest that detects missing jobs.

### `task-progress.yml`

Correlates implementation and browser workflows by pull-request head SHA. It downloads artifacts, queries run and job metadata, captures failed logs, and creates explicit failures when GitHub returns no jobs or terminates a job before allocating steps.

It publishes:

- one sticky PR comment;
- `ci-feedback.json` and `ci-feedback.md`;
- `agent-handoff.json` and `agent-handoff.md`;
- pull-request context and changed-file patches;
- workflow run metadata and failed logs.

No skipped, missing, cancelled, neutral, unavailable, or zero-step job is represented as passed.

## Pull-request commands

Repository owners, members, and collaborators may comment on a pull request:

- `/ci analyze` or `/ci status` — rebuild the evidence bundle and sticky agent handoff;
- `/ci rerun-failed` — rerun the latest failed Implementation Quality and Playwright UI Contract runs for the current head SHA.

The workflow also supports manual dispatch modes:

- `analyze`;
- `rerun-failed`;
- `safe-repair-plan`.

`safe-repair-plan` installs dependencies without lifecycle scripts, runs deterministic Biome fixes, and uploads a reviewable patch. It does not commit or push automatically.

## Machine-readable contract

Every command suite writes a `manifest.json`. The aggregator writes:

- `ci-feedback.json` — required failures, advisory warnings, missing suites, and gate metadata;
- `ci-feedback.md` — human-readable summary and failure tails;
- `agent-handoff.json` — PR identity, head SHA, failures, warnings, missing evidence, changed files, diff summary, capped patch, and the fix-and-verify protocol;
- `agent-handoff.md` — a ready-to-use prompt for any connected GitHub chat;
- workflow run and job metadata plus failed logs;
- Playwright reports, traces, screenshots, videos, and server logs;
- `context.json` and the changed-code patch for repository review.

## Connected chat protocol

Use this instruction in any ChatGPT/Codex conversation with GitHub access:

```text
Open relvorlabs/laitstyles PR #<number>. Read the latest task-runtime-feedback artifact, ci-feedback.json, agent-handoff.json and failed GitHub Actions logs. Fix only evidenced root causes on the PR branch, commit the changes, inspect the new workflow runs, rerun failed jobs when appropriate, and repeat until every required check is green. Do not treat missing or skipped jobs as passed.
```

The connected chat performs the semantic code changes. GitHub Actions remains the execution authority. Git stores the code; it does not replace the Actions runner.

## Security boundary

- No OpenAI or external AI secrets exist in this CI design.
- Pull-request code receives no repository write credential.
- Comment commands are restricted to owners, members, and collaborators.
- Automatic repair is limited to a reviewable deterministic formatter patch.
- Semantic fixes are committed only by an explicitly invoked connected GitHub chat or a human contributor.
