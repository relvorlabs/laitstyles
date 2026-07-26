# Phase 1–6 Full Acceptance Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute the approved Phase 1–6 remediation in phase order and produce one objective 10/10 acceptance verdict backed by same-SHA source, database, browser, accessibility, and visual evidence.

**Architecture:** This index coordinates three independently executable plans. Foundation work first makes provenance and architecture evidence trustworthy; persistence work then proves Phase 4 and Phase 5 through a disposable real database; Phase 6 and browser work finally certifies state ownership, accessibility, visual parity, and evidence aggregation. A downstream plan may inspect ahead but may not edit or claim acceptance until its predecessor handoff passes.

**Tech Stack:** Node 25.x, pnpm 11.13.0, Next.js 16.2.10, React 19.2.4, TypeScript, Prisma 7.8.0, PostgreSQL 17, Supabase local Auth, TanStack Query, Zustand 5.0.14, Vitest 4.1.x, Playwright 1.61.x, Axe, Biome 2.5.3, React Doctor 0.7.2.

## Global Constraints

- Controlling design: `docs/superpowers/specs/2026-07-26-phase-1-6-full-acceptance-design.md`.
- Controlling requirements: `update.md` Phases 1–6 and repository doctrine. The untracked user file is not staged or modified without separate authorization.
- Preserve Phase 0 presentation and every public URL. Architecture remediation is not a redesign.
- Do not absorb Phase 7 authentication consolidation, Phase 8 settlement, Phase 9 broad deletion, or Phase 10 release readiness.
- No phase is accepted from source inspection, authored tests, queued checks, advisory exits, or evidence from a different SHA.
- Use the repository-owned pnpm commands. Missing, skipped, cancelled, queued, zero-step, mixed-SHA, or unreadable evidence is failure.
- Only one active workstream owns a shared path. Ownership transfers through the handoff recorded below; plans are not implemented concurrently against the same checkout.

---

## Plan Set

1. `docs/superpowers/plans/2026-07-26-phase-1-3-foundation-remediation.md`
   - WS0 exact-head provenance.
   - WS1 Phase 1 guards, imports, exports, language, exceptions, and records.
   - WS2a Phase 2 layouts/providers.
   - WS2b Phase 3 HTTP, errors, correlation, auth/policy adapters, cancellation, pagination, and cache defaults.

2. `docs/superpowers/plans/2026-07-26-phase-4-5-persistence-remediation.md`
   - WS6a disposable database and inherited auth-test harness.
   - WS3 Phase 4 Products then Inventory.
   - WS4 Phase 5 Orders → Holds → Returns → Customers → Settings → Overview.
   - WS6b cross-domain restart/reload/authorization verdict.

3. `docs/superpowers/plans/2026-07-26-phase-6-browser-certification.md`
   - WS5 Phase 6 Zustand, URL state, hydration, hold clock, overlays, and compatibility boundaries.
   - WS7 Playwright, Axe, runtime health, responsive, theme, and visual parity.
   - WS8 exact-head full validation, evidence aggregation, reviewer verdict, and documentation reconciliation.

## Ordered Execution Gates

### Gate A: Foundation candidate

- [ ] Execute the foundation plan Tasks 1–4.
- [ ] Confirm frozen installation on Node 25.x and pnpm 11.13.0.
- [ ] Confirm the export/architecture guards distinguish external packages from internal edges and report zero real violation.
- [ ] Confirm Phase 1 records contain only exact Phase 7/8 exceptions and no obsolete Zustand blocker.
- [ ] Record the candidate SHA, lock digest, tool versions, commands, results, and redacted evidence.

**Handoff:** Reviewer passes WS0/WS1 and publishes the exact HTTP/layout work candidate. Failure returns to the owning foundation task.

### Gate B: Layout and HTTP foundation

- [ ] Execute the foundation plan Tasks 5–8.
- [ ] Confirm original routes, provider placement, and shell composition.
- [ ] Confirm standard success/error/pagination contracts, cancellation, correlation, auth/policy behavior, and admin cache defaults.
- [ ] Run the focused architecture, Biome, TypeScript, Vitest, HTTP smoke, build, React Doctor, and route/style checks named by the plan.
- [ ] Refresh provenance after the documentation commit and rerun affected evidence.

**Handoff:** Reviewer passes Phases 1–3 on the refreshed SHA. The persistence plan may not begin before this handoff.

### Gate C: Disposable database contract

- [ ] Execute persistence plan Task 1 (WS6a).
- [ ] Prove shared/production database refusal and disposable database acceptance.
- [ ] Deploy and status-check committed migrations against local/disposable PostgreSQL.
- [ ] Seed deterministic actors/data through inherited auth behavior without moving Phase 7 ownership.
- [ ] Prove a fresh process can read through existing domain queries and that evidence is secret-safe.

**Handoff:** Data engineer publishes the disposable database/auth actor interface. Domain work consumes this exact interface.

### Gate D: Phase 4

- [ ] Execute persistence plan Task 2 for Products.
- [ ] Obtain reviewer pass for Product list/detail/lifecycle, authorization, persistence, reload, cache invalidation, and unchanged UI handoff.
- [ ] Execute persistence plan Task 3 for Inventory.
- [ ] Obtain reviewer pass for all inventory modes, movements, adjustments, concurrency, rollback, authorization, persistence, and reload.
- [ ] Update Phase 4 status only from executed evidence.

**Handoff:** Canonical Product and Inventory contracts are frozen for Phase 5 and Phase 6 consumers.

### Gate E: Phase 5 serial domains

- [ ] Execute persistence plan Task 4: Orders.
- [ ] Execute persistence plan Task 5: Holds.
- [ ] Execute persistence plan Task 6: Returns.
- [ ] Execute persistence plan Task 7: Customers.
- [ ] Execute persistence plan Task 8: Settings.
- [ ] Execute persistence plan Task 9: Overview.

Each checkbox requires its own reviewer pass before the next begins. No combined Phase 5 repair commit is allowed.

**Handoff:** Phase 5 exposes persisted domain contracts and a source-complete admin UI handoff without claiming visual certification.

### Gate F: Cross-domain persistence verdict

- [ ] Execute persistence plan Task 10 (WS6b).
- [ ] Verify every required matrix row contains mutation, DB read, fresh-process read, fresh API/browser read, authorization, rollback, SHA, and passed status.
- [ ] Confirm no shared database, production fallback, seed restoration, secret leak, or mocked persistence substitutes for the verdict.
- [ ] Freeze a new candidate if any domain repair was required and rerun affected predecessor gates.

**Handoff:** Reviewer passes the database/reload/authorization certificate consumed by browser certification.

### Gate G: Phase 6 state ownership

- [ ] Execute browser plan Tasks 1–4.
- [ ] Confirm minimal Zustand payloads and versioned hydration.
- [ ] Confirm exact URL back/forward restoration and one catalogue navigation implementation.
- [ ] Confirm one hold clock and one overlay/focus/body-lock owner.
- [ ] Confirm no expanded Phase 7/8 compatibility edge or remote record ownership.

**Handoff:** UI engineer publishes a Phase 6 runtime contract; reviewer passes focused unit and desktop browser evidence.

### Gate H: Accessibility and visual parity

- [ ] Execute browser plan Tasks 5–6.
- [ ] Run actual Axe checks across the required route/overlay matrix.
- [ ] Run runtime console, page, request, HTTP, and production server-log checks.
- [ ] Exercise exactly 375×812, 768×1024, and 1280×800 in light and dark themes.
- [ ] Reviewer inspects screenshots and records no unexplained typography, spacing, colour, image, component-position, theme, animation, or responsive delta.

**Handoff:** Reviewer publishes the browser/accessibility/visual certificate tied to the current candidate SHA.

### Gate I: Final exact-head acceptance

- [ ] Execute browser plan Tasks 7–8.
- [ ] Run `pnpm install --frozen-lockfile`.
- [ ] Run `pnpm validate:full`.
- [ ] Run `pnpm validate:browser`.
- [ ] Inspect pinned React Doctor output and resolve or prove every changed-scope finding.
- [ ] Run evidence merge and handoff generation.
- [ ] Confirm all manifests, logs, database rows, screenshots, traces, reviews, lock digest, and full SHA agree.
- [ ] Reconcile Phase 1–6 status documents only after the reviewer issues PASS.

**Final result:** Phases 1–6 are marked accepted. Phases 7–10 retain their actual, separate status.

## Role Sequence

| Gate | Primary owner | Required handoff |
| --- | --- | --- |
| A | Domain engineer for guards/CI; planner for exact records | Reviewer-approved trustworthy evidence graph |
| B | UI engineer for layouts; domain engineer for HTTP | Stable route/provider and transport contracts |
| C | Data engineer | Disposable DB, migrations, deterministic inherited auth actors |
| D | Domain engineer, then UI preservation check | Canonical Product/Inventory contract |
| E | Domain engineer one domain at a time | Six independently accepted Phase 5 contracts |
| F | Data engineer + domain engineer | Cross-domain persistence/reload/auth matrix |
| G | UI engineer | Phase 6 state/hydration/overlay runtime contract |
| H | Reviewer with UI engineer repairs | Axe, runtime, responsive, theme, and visual certificate |
| I | Reviewer | Same-SHA pass verdict and completion report |

The orchestrator verifies each handoff before dispatching the next role. A blocker stops the chain; it is not bypassed by starting later-phase source work.

## Commit and Evidence Discipline

- Use the commit boundaries named inside each subsystem plan.
- After any commit, capture a new candidate SHA and invalidate all affected later evidence.
- Do not rewrite applied migrations. Use a reviewed forward/compensating migration where evidence proves schema change is necessary.
- Do not update screenshots automatically. Phase 0 remains read-only reference evidence.
- Do not mark docs complete in the same step that creates unexecuted tests; documentation records actual commands and artifacts only.
- Keep evidence redacted and out of commits where repository policy treats it as generated output.

## Master Exit Gate

- All three subsystem plan exit gates pass.
- All required evidence is readable, secret-safe, and tied to one source SHA and lock digest.
- Products, Inventory, Orders, Holds, Returns, Customers, Settings, and Overview have real persistence/reload/authorization proof.
- Phase 6 has hydration, history, overlay, accessibility, responsive, theme, and visual proof.
- Biome, architecture, TypeScript, Prisma, Vitest/coverage, build, React Doctor review, HTTP smoke, server logs, Playwright, Axe, and visual review have no unresolved required failure.
- Reviewer reports PASS with explicit Phase 7, Phase 8, Phase 9, and Phase 10 exclusions.
