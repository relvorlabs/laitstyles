# Workflow: UI change

Use when presentation, component composition, interaction, theme, responsive behavior or
accessibility changes without changing server data, authorization or wire contracts.

## Sequence

```text
orchestrator → frontend engineer → reviewer
```

## Procedure

1. Observe the real surface, user task, themes, states and viewports.
2. Confirm the existing server contract supports the intended behavior.
3. Define hierarchy, primary action, component responsibilities, responsive transformation and
   accessibility before coding.
4. Keep Server Components default and add the smallest Client Component boundary.
5. Use existing shadcn/Base UI primitives and semantic Tailwind tokens; no component CSS or inline
   styles.
6. Implement all relevant states and correct touched raw primitive reimplementations.
7. Run static/test/build/React Doctor/browser/theme/responsive/accessibility checks.
8. Reviewer evaluates against the user task and design system, not personal taste.

If new data, mutation, auth or contract behavior is required, switch to the feature workflow.
