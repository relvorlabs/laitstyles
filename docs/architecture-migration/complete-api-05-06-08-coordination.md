# Complete API Plans 05, 06 and 08 Coordination

This branch is the integration branch and single pull request for three isolated plan worktrees.

## Ownership

- Plan 05 owns checkout, Paystack transaction settlement, saved payment methods, and the checkout/offline-sale consumers named in its plan.
- Plan 06 owns refund and dispute provider adapters, domain operations, transports, and admin consumers named in its plan.
- Plan 08 owns the final API/consumer ledger, remaining non-payment storefront/admin gaps, module-boundary migration, and evidence documents.
- The integration controller owns merges into this branch, cross-plan conflict resolution, PR comments, and the final combined validation run.

Plan 08 must not delete or declare closed any surface that depends on unfinished Plan 05, Plan 06, or Plan 07 work. Plan 07 is not part of this execution batch, so Plan 08's final finance-dependent closure remains pending until Plan 07 is integrated.

## Per-commit synchronization protocol

1. Before starting a task, each plan worktree fetches and merges `origin/codex/complete-api-05-06-08`.
2. The agent implements one coherent task, runs focused tests, commits exact owned files, and pushes its own remote branch.
3. The agent reports the commit and pauses before beginning another task.
4. The integration controller merges the commit into `codex/complete-api-05-06-08`, resolves overlap without dropping either plan, runs focused integration tests, pushes the integration branch, and posts a plan-specific PR comment.
5. The agent fetches the updated integration branch, proves it is an ancestor of its worktree branch, and only then continues.

Agents must not merge another agent's feature branch directly, force-push, rebase shared history, push directly to the integration branch, or perform broad legacy deletion outside their ownership.

## Validation policy

Each worktree runs focused tests for changed behavior and practical type checks needed to keep its task safe. It does not run Biome, React Doctor, full repository validation, full browser gates, or unrelated repository-wide suites.

After all available tasks in Plans 05, 06 and the non-blocked portion of Plan 08 are integrated, the integration branch runs the combined long-running validation once. Any Plan 08 acceptance row blocked by missing Plan 07 remains explicitly pending rather than being presented as complete.
