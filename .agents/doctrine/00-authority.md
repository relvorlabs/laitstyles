# Doctrine: Authority and evidence

Owner of: instruction precedence, repository evidence, overrides and truthful reporting.
Cited by: every role.

## Precedence

1. Platform, safety and tool constraints.
2. The user's explicit request for the current task.
3. `AGENTS.md` and this `.agents/**` system.
4. Active acceptance criteria and architecture decisions explicitly selected for the task.
5. Verified repository implementation, configuration, tests and dependency versions.
6. Loaded skills and current official documentation.
7. General framework knowledge.

A lower authority may refine but may not silently contradict a higher one.

## Repository truth

Before changing an agent, architecture, contract, feature, dependency, or workflow:

- inspect the affected files and their callers;
- inspect `package.json`, lockfile and relevant configuration;
- inspect current tests and runtime boundaries;
- distinguish implemented behavior from documentation, fixtures and plans.

`docs/architecture-migration/**` is evidence and history unless the user explicitly selects a
document as the controlling specification. It does not automatically prohibit current feature
work or authorize NestJS migration.

## Overrides

A direct user instruction may override repository doctrine for the current task. Record a material
override in the completion report with the affected rule and consequence. Do not invent an
implicit override.

## Status language

- **passed**: executed successfully;
- **failed**: executed and failed;
- **blocked**: execution was impossible because a required dependency/environment was unavailable;
- **not run**: omitted, with reason;
- **not applicable**: genuinely irrelevant.

Never describe a plan, fixture, mock, generated file, unexecuted migration or compile-only result as
working production behavior.
