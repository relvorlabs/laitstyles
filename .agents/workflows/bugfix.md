# Workflow: Bugfix (defect or unexpected behaviour)

Chained by the [orchestrator](../roles/orchestrator.md).

```
systematic-debugging → (owning engineer) → reviewer
```

1. **Diagnose first.** Load the `systematic-debugging` skill and find the root cause before
   proposing a fix — no fix-by-guessing. Identify which layer owns the defect using
   [architecture](../doctrine/architecture.md).
2. **Route to the owning engineer** by layer:
   - UI / component / interaction-state defect → [ui-engineer](../roles/ui-engineer.md).
   - Domain / action / authorization / transport defect → [domain-engineer](../roles/domain-engineer.md).
   - Schema / migration / auth-model defect → [data-engineer](../roles/data-engineer.md).
3. **Reproduce, then fix.** Prefer a failing test that reproduces the bug first (TDD), then the
   minimal fix. Keep scope to the defect (see [conventions](../doctrine/conventions.md)).
4. **reviewer** — run scope-relevant gates, confirm the reproduction now passes, check for
   regressions and scope drift. ([reviewer](../roles/reviewer.md))

**Guardrail.** Do not expand a bugfix into a refactor. If the root cause is structural, report
it and let the orchestrator decide whether to open separate work.
