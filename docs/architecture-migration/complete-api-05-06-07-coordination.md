# Complete API Plans 05, 06 and 07 Coordination

This branch is the integration branch and single pull request for three isolated plan worktrees.

## Ownership

- Plan 05 owns checkout, Paystack transaction settlement, saved payment methods, and the checkout/offline-sale consumers named in its plan.
- Plan 06 owns refund and dispute provider adapters, domain operations, transports, and admin consumers named in its plan.
- Plan 07 owns owner finance, Paystack settlements, recipient management, transfer workflow, transaction reporting, and the admin consumers named in its plan.
- The integration controller owns merges into this branch, cross-plan conflict resolution, PR comments, and the final combined validation run.

Plan 07 may consume only Plan 05/06 contracts already present on the integration branch. It must not guess or duplicate unfinished checkout/refund interfaces; dependency-bound tasks wait until the owning plan's checkpoint is integrated.

## Per-commit synchronization protocol

1. Before starting a task, each plan worktree fetches and merges `origin/codex/complete-api-05-06-08`.
2. The agent implements one coherent task, runs focused tests, commits exact owned files, and pushes its own remote branch.
3. The agent reports the commit and pauses before beginning another task.
4. The integration controller merges the commit into `codex/complete-api-05-06-08`, resolves overlap without dropping either plan, runs focused integration tests, pushes the integration branch, and posts a plan-specific PR comment.
5. The agent fetches the updated integration branch, proves it is an ancestor of its worktree branch, and only then continues.

Agents must not merge another agent's feature branch directly, force-push, rebase shared history, push directly to the integration branch, or perform broad legacy deletion outside their ownership.

## Validation policy

Each worktree runs focused tests for changed behavior and practical type checks needed to keep its task safe. It does not run Biome, React Doctor, full repository validation, full browser gates, or unrelated repository-wide suites.

After all tasks in Plans 05, 06 and 07 are integrated, the integration branch runs the combined long-running validation once.
