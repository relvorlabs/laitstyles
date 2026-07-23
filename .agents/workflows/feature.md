# Workflow: Feature (new or changed capability)

Chained by the [orchestrator](../roles/orchestrator.md). Skip stages a small change does not
need, but never skip the reviewer gate.

```
spec → planner → data-engineer → domain-engineer → ui-engineer → reviewer
```

1. **planner** — read the spec + affected code, produce the step plan and explicit
   exclusions, name the layers/roles touched. ([planner](../roles/planner.md))
2. **data-engineer** — *only if* the schema or auth model changes: migrate, regenerate types,
   document concurrency implications. ([data-engineer](../roles/data-engineer.md))
3. **domain-engineer** — implement domain logic, transports (Server Actions / route handlers),
   authorization, and tests; publish the data contract. ([domain-engineer](../roles/domain-engineer.md))
4. **ui-engineer** — build the screens/components against that contract, with explicit
   loading/empty/error states and the state ladder respected. ([ui-engineer](../roles/ui-engineer.md))
5. **reviewer** — run gates, review diff, verify a11y/responsive, write the completion report
   and PR body. ([reviewer](../roles/reviewer.md))

**Barriers.** The orchestrator verifies each stage's declared handoff exists before starting
the next. A data-model change lands and types regenerate before domain code depends on it.
The UI does not start until the domain data contract is stated.
