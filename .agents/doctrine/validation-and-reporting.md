# Doctrine: Validation gates & completion reporting

Owner of: what must pass before "done", and what every completion report must state.
Cited by: reviewer, and every role at handoff.

## Gates

Run focused checks while implementing. Before marking a substantial task complete, run the
checks relevant to the changed scope and — unless the task explicitly limits validation — run:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm exec vitest run --passWithNoTests
pnpm build
pnpm dlx react-doctor@latest . --verbose --diff
```

Also:

- Review changed UI files against the current Web Interface Guidelines.
- Run the Playwright acceptance scripts relevant to the changed workflow.
- Validate the required viewports and interactions with available browser tooling (see
  [toolchain-and-skills](toolchain-and-skills.md)).
- Inspect console and network errors for changed workflows.
- Generate and visually review screenshots for UI work.
- Inspect the final diff for scope drift, dead navigation, incomplete interactions,
  accidental dependency changes, and oversized files.
- Confirm documentation and decision records match the implementation.

`react-doctor` is a supplemental check — it does not replace lint, TypeScript, tests, build,
or browser validation.

## Blocking rules

- Repo-wide failures block completion unless proven to predate the task and documented.
- No newly introduced failure is waivable.
- Changed-scope React Doctor findings must be resolved; pre-existing findings outside the
  changed scope are documented but do not auto-block.
- Never report a check as passing when it was skipped, unavailable, or failed.

## Completion report

Every implementation summary states:

- what changed and why;
- important files/modules affected;
- validations actually run;
- validations blocked or skipped (and why);
- known limitations and prototype boundaries;
- any intentional deviation from doctrine or the active spec (with the recorded override —
  see [00-authority](00-authority.md)).

Be precise about prototype boundaries, incomplete integrations, and remaining risks.
