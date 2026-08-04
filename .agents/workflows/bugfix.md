# Workflow: Bugfix

Use for a defect, regression, hydration/type/runtime failure, visual inconsistency, auth issue or
unexpected behavior.

## Sequence

```text
orchestrator → owning engineer(s) → reviewer
```

Use the planner only for a multi-system defect or migration/deployment strategy.

## Diagnostic order

For a browser-visible issue, inspect:

1. current server/domain operation and database/auth availability;
2. Route Handler status and runtime contract;
3. browser request, credentials and parser;
4. TanStack Query key/cache/mutation behavior;
5. Server/Client boundary and hydration;
6. view-model/component state;
7. shadcn primitive, Tailwind token, theme, responsive and accessibility behavior.

Route the root cause to the server-side or frontend engineer. Use the backend engineer only when the
defect is in an explicitly active NestJS surface.

## Procedure

1. Reproduce with the smallest reliable evidence.
2. Add or identify a failing regression check where practical.
3. Implement the smallest complete root-cause fix.
4. Do not weaken schemas, auth, types, lint, styling or accessibility to hide the defect.
5. Run targeted and affected integration/build/browser gates.
6. Reviewer confirms the original reproduction passes and no boundary was bypassed.

Do not expand the bugfix into an unrelated redesign or migration.
