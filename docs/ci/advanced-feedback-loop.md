# Advanced CI feedback loop

The repository keeps exactly three authoritative workflows. They run on `ubuntu-latest`, execute repository-owned scripts, retain complete evidence, and expose one machine-readable feedback contract for connected debugging agents.

## What this system can and cannot do

GitHub Actions cannot attach itself to an already-open ChatGPT conversation or silently make that conversation execute code. Instead, the workflows publish redacted logs, manifests, patches, screenshots and a sticky pull-request comment. A ChatGPT session with the GitHub connector can read those artifacts and act on them in a later turn.

Optional AI analysis uses the OpenAI Responses API or a separately deployed authenticated endpoint. It diagnoses captured evidence and proposes a minimal correction. It never receives repository write credentials and never claims that it edited code or passed a check.

## Workflows

### `implementation-quality.yml`

Runs independent jobs for:

- changed-file, architecture-doctrine and agent-skill context;
- architecture/folder boundaries, strict button audit, Biome and TypeScript;
- production dependency audit as an advisory signal;
- Prisma validation, migration deployment and migration status against PostgreSQL 17;
- Vitest with coverage;
- production build and changed-scope React Doctor review;
- aggregate evidence generation, including missing-job detection.

Each command runs through `scripts/ci/run-gates.mjs`. The runner continues through every gate, applies a per-command timeout, redacts configured secrets, stores the complete log, and records exit code, signal, duration and required/advisory status.

### `playwright.yml`

Builds the production application once and then runs independent desktop, tablet and mobile Chromium jobs. Each viewport job performs:

- database migration deployment;
- Chromium and operating-system dependency installation with browser caching;
- production server readiness and process-liveness checks;
- redirect-aware HTTP page smoke checks;
- protected API status verification;
- unauthenticated CI-feedback endpoint boundary verification;
- Playwright theme, responsiveness, event, button, console, network and runtime contracts;
- JSON, JUnit, HTML, trace, screenshot and retained failure-video output;
- production server log inspection;
- an aggregate viewport manifest that detects missing jobs.

### `task-progress.yml`

Correlates the two workflows by pull-request head SHA. It downloads their artifacts, queries run/job metadata, captures failed logs, and creates a synthetic failure when GitHub terminates a job before allocating steps or logs. It then publishes one sticky PR comment and one `ci-feedback.json` artifact.

On trusted `workflow_run` or manual-dispatch events it may request optional AI diagnosis. Pull-request code never receives AI keys or endpoint secrets.

Manual dispatch also supports `safe-repair-plan`. This installs dependencies without lifecycle scripts, runs only deterministic Biome fixes and uploads a reviewable patch. It does not commit or push the patch.

## Machine-readable contract

Every command suite writes a `manifest.json`. The aggregator writes:

- `ci-feedback.json` — normalized required failures, advisory warnings, missing suites and gate metadata;
- `ci-feedback.md` — human-readable summary and failure tails;
- `ai-analysis.json` and `ai-analysis.md` when analysis is configured;
- workflow run/job metadata and failed logs;
- Playwright reports, traces, screenshots, videos and server logs;
- `context.json` and a capped changed-code patch for connected-agent review.

No skipped, unavailable, neutral or cancelled check is represented as passed.

## Optional AI configuration

Choose one route.

### Direct OpenAI Responses API

Add repository secrets:

- `OPENAI_API_KEY`
- `OPENAI_CI_MODEL`

### Deployed Laitstyles analysis endpoint

Deploy the application with server-only environment variables:

- `CI_FEEDBACK_TOKEN`
- `OPENAI_API_KEY`
- `OPENAI_CI_MODEL`

Then add repository secrets:

- `CI_FEEDBACK_ENDPOINT` — the full `/api/internal/ci/analyze` URL
- `CI_FEEDBACK_TOKEN` — the same bearer token configured on the deployment

The endpoint uses constant-time bearer-token comparison, a 256 KB request limit, strict Zod validation and `private, no-store` responses.

Optional repository variable:

- `CI_AI_INCLUDE_PATCH=true` — includes a redacted, capped patch excerpt in AI requests. It is disabled by default so source code is not sent automatically.

## Runtime repair model

AI analysis is advisory. A connected coding session may inspect `ci-feedback.json`, fetch the cited source files, implement the smallest correction, push to the PR branch, and let the workflows rerun. The CI system itself only generates a deterministic formatting patch when a maintainer explicitly dispatches `safe-repair-plan`.

This boundary prevents untrusted pull-request code, dependency scripts or model output from receiving a write-capable token and mutating the repository without review.
