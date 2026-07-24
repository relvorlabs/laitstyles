# Doctrine: Validation gates & completion reporting

Owner of: what must pass before "done", and what every completion report must state.
Cited by: reviewer, and every role at handoff.

## Authoritative command surface

Run focused checks while implementing. The repository-owned commands are the authority; do not
replace them with remembered one-off invocations:

```bash
pnpm biome
pnpm biome:fix
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm react-doctor
pnpm validate
pnpm validate:fix
pnpm validate:full
pnpm validate:browser
```

`react-doctor` is pinned by `package.json` and runs with telemetry disabled. It is supplemental and
does not replace architecture guards, Biome, TypeScript, Vitest, Prisma validation, build, or
browser testing.

The same suite definitions run locally and in GitHub through `scripts/ci/run-gates.mjs`. Every
suite writes a manifest, summary, exit code, duration, and redacted log. Missing evidence is a
failure, not an implied pass.

## Execution authority

Private source validation runs on the dedicated configurable self-hosted runner described in
`docs/ci/permanent-validation.md`. The public `agent-controller` workaround is limited to testing
a public deployment URL and does not count as a private source check.

Before marking a substantial task complete, run the checks relevant to the changed scope and,
unless the task explicitly limits validation, run `pnpm validate:full`. For UI or interaction
changes, also run source-backed Playwright through the private runner or `pnpm validate:browser`.

Also:

- Review changed UI files against the current Web Interface Guidelines.
- Validate required viewports, themes, navigation, events, forms, and button behaviour.
- Inspect browser console, failed requests, and production server logs.
- Generate and visually review screenshots for UI work.
- Inspect the final diff for scope drift, dead navigation, incomplete interactions, accidental
  dependency changes, and oversized files.
- Confirm documentation and decision records match the implementation.

## Blocking rules

- Repo-wide required failures block completion unless proven to predate the task and documented.
- No newly introduced failure is waivable.
- React Doctor remains advisory at process exit because legacy findings exist, but every finding
  touching the changed scope must be resolved or explicitly proved pre-existing.
- A queued runner, unavailable runner, cancelled job, zero-step job, missing manifest, skipped
  command, or deployment-only browser run is not a passing source validation.
- Deterministic Biome repairs may be generated automatically as a reviewable patch. Semantic code
  changes must be based on evidence and committed by a human or explicitly invoked connected agent.
- Never report a check as passing when it was skipped, unavailable, or failed.

## Completion report

Every implementation summary states:

- what changed and why;
- important files/modules affected;
- validations actually run;
- validations blocked or skipped and why;
- required failures and advisory warnings;
- known limitations and prototype boundaries;
- any intentional deviation from doctrine or the active specification, with the recorded override.

Be precise about prototype boundaries, incomplete integrations, and remaining risks.
