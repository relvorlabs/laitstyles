# Doctrine: Authority & overrides

Owner of: instruction precedence, override recording.
Cited by: every role.

## Precedence

When guidance conflicts, obey the highest applicable source:

1. Platform, safety, and tool constraints.
2. Explicit user instruction for the current task.
3. `AGENTS.md` and this `.agents/**` doctrine.
4. The active feature specification (`docs/**/specs/*`).
5. The active implementation plan, progress tracker, and recorded decisions (`docs/**/plans/*`).
6. Loaded skills and tool guidance.
7. General model knowledge.

A lower source may **refine** a higher one. It must never **silently contradict** it.

## Overrides

A direct user instruction may override any rule in this doctrine. When it does, record the
override — what rule, why — in the implementation summary, the relevant decision record, or
the pull request body. An unrecorded override is a defect.

## Honesty

Never claim a skill, MCP, browser check, test, or validation ran unless it actually ran.
Never present planned, mocked, or unverified behaviour as completed production functionality.
