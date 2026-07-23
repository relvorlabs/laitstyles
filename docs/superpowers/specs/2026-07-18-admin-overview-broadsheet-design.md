# Admin Overview — editorial broadsheet redesign

Date: 2026-07-18 · Branch: `feat/admin-overview-broadsheet` · Status: approved (user accepted the
wireframe direction and typed `--fidelity`, then "implement it").

## Problem and direction

The Overview's sections are right, but everything below the fold flattens into similar-weight
cards, so the decision hierarchy the headline promises is not expressed structurally. Approved
direction: **editorial broadsheet** — a morning paper for the store owner. Masthead, one lead
story (today's money), a dominant decisions column, and a narrow "margin notes" rail.
Considered and set aside: decision-cockpit (attention as hero — leads with an empty box on quiet
days) and atelier-timeline (poor scannability for "did money move").

## Locked decisions

- Type: Instrument Serif (`font-serif`) display with one italic accent phrase; Geist (`font-sans`)
  UI; Geist Mono (`font-mono`) for kickers (+0.08em uppercase), order ids, timestamps;
  `tabular-nums` on every changing figure. All already loaded — no font imports.
- Color: existing role tokens only. Oxblood is the single signal accent (urgent severity, focus).
  Sage = positive/selection. Chart tokens for the pulse bars. Light and dark are paired systems.
- Today band: editorial-light tonal ledger on canvas — hairline `border-y`, SVG feTurbulence
  grain at ~4%, no radius, no shadow. Replaces the dark primary card and its blur orbs.
  This band is the page's signature element; everything else stays quiet.
- Radius: 14px panels (`rounded-md` scale), 9px controls, `rounded-full` pills. Nothing else.
- Elevation: hairline rules first. Continue-working is the one raised card in the rail.
- Motion: `var(--ease)` 250ms/150ms, transform+opacity only. Band mounts with the existing
  `leemRise` keyframe; lead figure uses a `motion` spring counter (motion@12 is installed),
  gated by `useReducedMotion`. No scroll reveals, no stagger, no chart entrance animation.

## Layout

- Masthead: mono kicker "OWNER OPERATIONS · {reportingLabel}" + "● Storefront live" pill
  (moved out of TodayStrip); serif headline "The store, before you decide *anything*." spanning
  ~7/12; actions right — outline "Preview storefront", primary ★ "Review attention (n)" with
  live count from `snapshot.attention.length`.
- Ledger band: serif lead "{formatNaira(total)} moved through the store today."; one ledger line
  Orders │ Units sold │ Active holds │ Offline share (hairline verticals, mono labels, serif
  figures); Online/Offline split as dotted-leader rows.
- Asymmetric grid (xl): left ~2fr — Needs a decision (numbered 01/02/03 by operational risk,
  numbering encodes priority), Open orders (+ ghost "All orders →" footer), Sales pulse.
  Right rail ~1fr — Continue working (raised card), Fulfilment lane (dotted-leader list),
  Inventory watch, Activity (mono timestamps) as unboxed hairline sections with mono kickers.
- Mobile 375: single column in decision order (attention → continue → orders → fulfilment →
  pulse → inventory → activity) via grid `order-*`, same technique the page already uses.

## States

Default as specified; empty attention is the page's success moment (sage `bg-accent` reward panel,
serif "Nothing needs you right now.", ghost "Review open orders"); other sections keep quiet
one-line zero-states. Loading/error remain route-level concerns (deterministic prototype data —
no fake latency added). Known adaptation: attention items are links to their resolution pages,
not in-place actions, so the "row exit on resolve" motion from the hi-fi prompt does not apply
yet; it becomes relevant when a mutation path exists.

## Scope

Restyle/restructure of `src/features/admin/overview/*` only. `OverviewSnapshot` contract,
selectors, and shared components (`SectionHeading` untouched — overview sections use local
broadsheet headers instead). No new data, no new dependencies, no fake latency.

## Verification

`pnpm lint` · `pnpm exec tsc --noEmit` · `pnpm exec vitest run --passWithNoTests` · `pnpm build`;
review 375×812 / 768×1024 / 1280×800 in light and dark. Python-based tooling and `react-doctor`
are blocked on this machine (no Python runtime) — reported as blocked, not passed.
