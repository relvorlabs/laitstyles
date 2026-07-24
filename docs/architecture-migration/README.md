# Laitstyles Architecture Migration

This directory is the controlling workspace for the architecture migration approved on July 24, 2026.

## Documents

- [`decision-and-migration-review.md`](decision-and-migration-review.md) — approved architecture decisions, target structure, phase plan, and acceptance gates.
- [`phase-0-baseline.md`](phase-0-baseline.md) — completed source and runtime baseline, UI preservation contract, routes, data/state inventory, and validation status.
- [`phase-0-source-inventory.md`](phase-0-source-inventory.md) — production seed/in-memory imports and provider, store, context, query-cache, and persistence ownership.
- [`phase-0-playwright-evidence.md`](phase-0-playwright-evidence.md) — external-runner method, 15-test result, artifact metadata, screenshots, route manifest, errors, interactions, and limitations.
- [`migration-tracker.md`](migration-tracker.md) — phase and task status so work does not drift or skip gates.

## Current status

Phase 0 is **complete — 10/10 evidence checklist**.

This PR remains architecture-baseline work. It does not move production source files, alter providers, replace data access, remove dummy data, or change UI behaviour.

### Runtime evidence

```text
Target: https://laitstyles.vercel.app/
Runner: relvorlabs/agent-controller
Workflow run: 30099471635
Playwright: 15 passed, 0 failed
Artifact ID: 8599046423
Artifact digest: sha256:26ccedc1296d92480be077a327f1b9a0fbe813e5bbd663cd8266f101f7ffa6c3
Artifact expiry: 2026-08-23
```

The external runner was used because private-repository GitHub jobs were billing-blocked before checkout. It tested only the public deployment and did not copy or expose private source.

The runtime manifest recorded existing deployment/source discrepancies, including account/auth/control-room/health routes returning 404 on the tested public deployment. These findings are baseline evidence, not hidden or fixed in Phase 0.

## Explicit doctrine override

The approved user direction supersedes current repository doctrine where the doctrine describes `features/**`, top-level `server/**`, and `server/commerce/**` as the permanent target architecture.

The old doctrine continues to protect the current implementation until Phase 1 updates the rules and guards. Implementers must not silently apply both architectures at once.

## Skills and review criteria used

The Phase 0 setup was reviewed against:

- repository `AGENTS.md` and `.agents/**` doctrine;
- Agent Controller `next-best-practices`;
- Agent Controller `vercel-react-best-practices`;
- Agent Controller `react-doctor`;
- Agent Controller `typescript-advanced-types`;
- Agent Controller `error-handling-patterns`;
- Agent Controller `create-pr`.

No standalone `tanstack` skill was found in the current Agent Controller repository. TanStack rules were taken from the Laitstyles `state-and-data` and `server-and-actions` doctrine plus the approved decision record.

## Non-negotiable rule

Architecture changes must preserve the existing header, footer, homepage composition, product cards, catalogue layout, PDP, typography, spacing, themes, interactions, and responsive behaviour.

## Next phase

Phase 1 may update doctrine and architecture guards after PR #37 is reviewed. It must carry forward the Phase 0 screenshots, route manifest, interaction baseline, and documented limitations without turning architecture work into a redesign.
