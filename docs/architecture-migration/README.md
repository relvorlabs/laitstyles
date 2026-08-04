# Laitstyles Architecture Migration

This directory contains only current migration work. Completed phase plans, reports, ledgers, and
gate snapshots are removed once their implementation is present in source.

## Documents

- [`migration-tracker.md`](migration-tracker.md) is the only status authority. It records the
  remaining Phase 9 source work and Phase 10 acceptance gates.
- This README defines the retention policy for future migration documentation.
- Permanent architecture rules belong in `.agents/doctrine/**`, not in completed migration files.
- Validation commands and evidence rules belong in [`../ci/permanent-validation.md`](../ci/permanent-validation.md).

## Retention policy

Keep a migration document here only while at least one implementation task or required acceptance
gate remains open. When source work is integrated and its remaining permanent rules have moved to
doctrine, update the tracker and delete the completed document.

Do not retain historical implementation narratives for agent context. Git history and immutable
`ci-evidence/**` artifacts remain the historical record.
