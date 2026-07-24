# Laitstyles Architecture Migration

This directory is the controlling workspace for the architecture migration approved on July 24, 2026.

## Documents

- [`decision-and-migration-review.md`](decision-and-migration-review.md) — approved architecture decisions, target structure, phase plan, and acceptance gates.
- [`phase-0-baseline.md`](phase-0-baseline.md) — current baseline, UI preservation contract, route/data/state inventory, and validation status.
- [`migration-tracker.md`](migration-tracker.md) — phase and task status so work does not drift or skip gates.

## Current status

Phase 0 is **in progress**.

This first PR is intentionally documentation-only. It does not move source files, alter providers, replace data access, remove dummy data, or change UI behaviour.

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

No standalone `tanstack` skill was found in the current Agent Controller repository. TanStack rules were therefore taken from the Laitstyles `state-and-data` and `server-and-actions` doctrine plus the approved decision record.

## Non-negotiable rule

Architecture changes must preserve the existing header, footer, homepage composition, product cards, catalogue layout, PDP, typography, spacing, themes, interactions, and responsive behaviour.
