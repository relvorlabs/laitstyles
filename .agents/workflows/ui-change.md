# Workflow: UI change (visual or interaction only)

Chained by the [orchestrator](../roles/orchestrator.md). Use when no domain logic, schema, or
authorization changes — purely presentational or interaction work.

```
(design) → ui-engineer → reviewer
```

1. **Design intent** — for new or reshaped visuals, load `frontend-design` /
   `ui-ux-pro-max` and set the aesthetic direction within the
   [ui-and-design-system](../doctrine/ui-and-design-system.md) bar (premium, editorial,
   fashion-specific; no generic-SaaS defaults).
2. **ui-engineer** — implement by composing existing shadcn / Base UI primitives; keep
   interactivity to the smallest segment; apply the state ladder from
   [state-and-data](../doctrine/state-and-data.md); no new business data or domain rules.
   ([ui-engineer](../roles/ui-engineer.md))
3. **reviewer** — verify the 375×812 / 768×1024 / 1280×800 gates, a11y, light/dark parity,
   reduced-motion, and generate/review screenshots as evidence.
   ([reviewer](../roles/reviewer.md))

**Guardrail.** If the change turns out to need server data or a new domain contract, stop and
escalate to the [feature](feature.md) workflow — do not smuggle domain work into a UI change.
