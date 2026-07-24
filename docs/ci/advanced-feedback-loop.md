# Permanent CI feedback loop

The repository keeps three authoritative private-source workflows. They run repository-owned
scripts on a configurable dedicated self-hosted runner, retain evidence, and expose a
machine-readable handoff that a connected GitHub session can inspect.

The separate public `agent-controller` workflow tests only a public deployment URL. It does not
check out or execute the private Laitstyles source.

No OpenAI API key, OpenAI endpoint, webhook, or deployed Next.js analysis route is required.

## Operating model

1. `Implementation Quality` runs architecture, Biome, TypeScript, dependency, Prisma, Vitest,
   production-build, and pinned React Doctor checks.
2. `Playwright UI Contract` builds the private source and tests desktop, tablet, and mobile
   Chromium against the production server.
3. `Task Progress and GitHub Agent Feedback` correlates both workflows by PR head SHA, downloads
   evidence, detects missing or zero-step work, and publishes a repair handoff.
4. A human or connected GitHub agent reads the evidence, fixes only the demonstrated root cause on
   the PR branch, and triggers the same validation again.
5. Required gates must pass before the phase or implementation is marked complete.

GitHub Actions cannot silently wake an existing chat session. The user must invoke the connected
session, but the evidence and commands remain in GitHub.

## Runner model

All three private workflows default to:

```json
["self-hosted", "linux", "x64", "laitstyles-ci"]
```

This avoids GitHub-hosted billing and keeps private diagnostics private. The selector may be
overridden with the repository Actions variable `CI_RUNNER`. Setup and security requirements are
documented in [`permanent-validation.md`](permanent-validation.md).

## `implementation-quality.yml`

Independent jobs execute repository-owned gate suites for:

- architecture boundaries, button audit, Biome, and TypeScript;
- production dependency audit as an advisory signal;
- Prisma validation, clean migration deployment, and migration status on PostgreSQL 17;
- Vitest with coverage;
- production build and React Doctor `0.7.2` with telemetry disabled;
- aggregate evidence generation and missing-suite detection.

Every command runs through `scripts/ci/run-gates.mjs`. The runner continues through each suite,
applies timeouts, redacts configured secrets, stores logs, and records exit code, signal, duration,
and required/advisory status.

## `playwright.yml`

Each desktop, tablet, and mobile job performs:

- Prisma validation and migration deployment;
- production build;
- Chromium and operating-system dependency installation with browser caching;
- production server readiness and process-liveness checks;
- redirect-aware HTTP and protected API checks;
- Playwright theme, responsive, event, button, console, network, and runtime contracts;
- JSON, JUnit, HTML, trace, screenshot, and failure-video output;
- production server-log inspection;
- aggregate viewport evidence with missing-job detection.

The public deployment workflow in `agent-controller` is an additional availability and visual-smoke
fallback. It does not replace this source-backed contract.

## `task-progress.yml`

The workflow contains executable PR resolution and authorization logic. It:

- accepts workflow completion events, manual dispatch, and authorized PR comments;
- resolves the current PR head SHA;
- queries validation runs and jobs;
- captures failed logs and downloads artifacts;
- records changed files and a bounded patch;
- merges suite manifests and flags missing evidence;
- publishes one sticky PR feedback comment and agent handoff;
- can rerun the latest failed validation workflows;
- can generate a deterministic Biome-only repair patch without pushing it.

A cancelled, neutral, missing, unavailable, or zero-step job is never represented as passed.

## Pull-request commands

Repository owners, members, and collaborators may comment:

- `/ci analyze` or `/ci status` — rebuild evidence and the sticky handoff;
- `/ci rerun-failed` — rerun the latest failed validation workflows for the current head SHA;
- `/ci safe-repair-plan` — generate a reviewable deterministic Biome patch artifact.

The same operations are available through manual workflow dispatch.

## Machine-readable contract

Each suite writes `manifest.json` and `summary.md`. Aggregation produces:

- `ci-feedback.json` and `ci-feedback.md`;
- `agent-handoff.json` and `agent-handoff.md`;
- PR metadata, changed-file inventory, and bounded patch;
- workflow run/job metadata and failed logs;
- Playwright reports, traces, screenshots, videos, and server logs.

## Connected GitHub protocol

```text
Open relvorlabs/laitstyles PR #<number>. Read the latest task-runtime-feedback artifact,
ci-feedback.json, agent-handoff.json, and failed workflow logs. Fix only evidenced root causes on
the PR branch, commit the smallest correction, inspect the new validation runs, and repeat until
every required gate passes. Do not treat missing, queued, skipped, cancelled, advisory, or zero-step
jobs as passed.
```

## Security boundary

- Private source executes only in the private repository or on a trusted dedicated runner.
- The public deployment workflow receives no private repository token or source archive.
- Pull-request code receives no repository write credential.
- PR commands are restricted to owners, members, and collaborators.
- Automated repair is limited to a reviewable deterministic Biome patch.
- Semantic fixes are committed only by an explicitly invoked connected GitHub agent or human.
