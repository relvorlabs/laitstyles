# Doctrine: Toolchain & skills

Owner of: skill resolution, MCP/browser tooling, package runner.
Cited by: every role.

## Skills

Use skills deliberately — do not load every available skill for every task.

Resolution order:

1. Prefer the current repository-local skill when one exists (`.agents/skills/**`).
2. If not available locally, load the current version from `relvorlabs/agent-controller`.
3. Use `find-skills` only when the capability cannot be found under its expected name.
4. Load `create-pr` only when creating/updating a pull request.
5. Load design, database, testing, or framework skills only when the task requires them.
6. When the runtime supports skills and `using-superpowers` is available, load it before
   other implementation skills; use `brainstorming` before creative work and
   `systematic-debugging` before fixing a bug.

Do not load both local and remote copies of the same skill unless comparing; the local copy
wins. Never claim a skill was used unless it was actually loaded.

Repo-local skills present: `.agents/skills/supabase`, `.agents/skills/supabase-postgres-best-practices`.

## Toolchain

- Package manager: `pnpm` (see [conventions](conventions.md)).
- MCP config: `.ai/mcp/mcp.json`. Report unavailable MCPs honestly rather than pretending.
- Read local Next.js docs in `node_modules/next/dist/docs/` before using unfamiliar or
  recently changed Next.js APIs. Use current official docs for dependencies whose APIs may
  have changed.

## Browser validation tooling

- Chrome DevTools MCP is preferred for runtime inspection, performance profiling, and network
  analysis when available. Its absence does not block all browser validation.
- Playwright acceptance scripts and screenshot review may satisfy functional and responsive
  checks. If no approved browser-validation path is available, mark that validation blocked.

See [validation-and-reporting](validation-and-reporting.md) for how these feed the gates.
