# Storefront footer and brand-mark redesign

**Date:** 2026-07-28  
**Status:** Approved for implementation pending written-spec review  
**Surface:** Storefront header and footer only

## Objective

Redesign the storefront footer as a premium, fashion-led editorial surface that helps customers
shop and get support without framing Laitstyles as a thrift, used, second-hand, or compromise
purchase. Replace the storefront's invented chrome mark with the canonical woven L/S symbol used
by the Admin settings experience.

## Recorded user overrides

- The user explicitly requested direct execution without role/subagent dispatch. This overrides
  the repository's normal UI-change dispatch and reviewer handoff for this task.
- The user explicitly requested Playwright as the only UI/browser test tool. Browser verification
  will therefore use Playwright only; no Chrome DevTools UI validation will be claimed.

## Brand and content direction

The footer presents Laitstyles as a fashion destination defined by taste, selection, styling, and
confidence. It must not use `thrift`, `used`, `second-hand`, `pre-owned`, `pass it on`, bargain
language, or copy that could make a customer feel that the purchase is socially or financially
lesser.

Primary copy:

- Eyebrow: `Laitstyles / The fashion edit`
- Lead: `Style, selected with intention.`
- Support: `Distinctive fashion for considered wardrobes—curated for quality, character and
  confident dressing.`

Navigation content:

- **Discover:** New arrivals, Women, Men, The edit
- **Client services:** Delivery & returns, Size & fit, Quality standards, Contact
- **Trust notes:** Curated selection, Detailed fit notes, Nationwide delivery

The existing unavailable social text buttons are removed. Social presence is shown with genuine
HugeIcons marks, accessible names, visible focus, and external-link semantics when a real
destination is available. Instagram, Facebook, TikTok, Pinterest, and YouTube are the intended
set. An account without a confirmed destination must not be represented as a working external
link.

## Layout

Use an editorial split rather than a conventional equal-column sitemap.

```text
┌──────────────────────────────────────────────────────────────────────┐
│ [woven L/S]  LAITSTYLES / THE FASHION EDIT                         │
│                                                                      │
│ Style, selected                DISCOVER       CLIENT SERVICES        │
│ with intention.                New arrivals   Delivery & returns     │
│                                Women          Size & fit              │
│ Supporting fashion copy       Men            Quality standards      │
│ [social icon rail]             The edit       Contact                │
├──────────────────────────────────────────────────────────────────────┤
│ Curated selection  ·  Detailed fit notes  ·  Nationwide delivery    │
├──────────────────────────────────────────────────────────────────────┤
│ © 2026 Laitstyles       Nigeria / NGN       Privacy       Terms      │
└──────────────────────────────────────────────────────────────────────┘
```

Desktop uses a wide editorial statement balanced by two compact link groups. Tablet converts the
statement to a full-width opening row with two columns below. Mobile becomes one clear vertical
reading order, keeps links comfortably tappable, and allows the trust notes to wrap without page
overflow.

The signature element is the canonical woven mark used at a larger, quieter scale beside the lead
statement. It provides fashion identity without decorative filler. The rest of the footer stays
precise and restrained.

## Logo contract

Delete the storefront-only `BrandMark` usage from header, mobile menu, and footer. Reuse
`LaitstyleSymbol` from `src/components/brand/laitstyle-symbol.tsx`, the approved woven mark already
used in the Admin store-identity experience. The header's home control keeps an explicit
`aria-label`; decorative instances of the mark are hidden from assistive technology so the brand
name is not announced twice.

## Theme and contrast

The footer consumes semantic paired-theme roles rather than raw pale RGBA values. It receives its
own role aliases for footer surface, primary text, muted text, borders, interactive hover, and
focus, derived from the existing global brand tokens.

- Light theme: a deep ink fashion surface with bone foreground and restrained sage interaction.
- Dark theme: a raised dark surface distinct from the page canvas, with warm bone foreground and
  adjusted muted/border values—not a mechanical light footer inversion.
- Body copy, labels, links, and controls must meet WCAG AA contrast.
- Focus rings remain visible against both footer themes.
- Hover is not the only interaction cue; focus-visible and accessible names are present.

## Interaction and accessibility

- The footer is a semantic `footer` with labelled `nav` regions.
- Navigation controls keep accurate button semantics for in-app catalogue/overlay actions.
- Social destinations use anchors, open in a new tab, and include `rel="noreferrer"`.
- Icon-only social links have concise accessible names and at least 44×44 CSS-pixel targets.
- No unavailable feature is presented as a working link.
- Heading levels follow page structure without using headings purely for styling.
- Keyboard order matches the visual order.
- Reduced-motion remains respected; the redesign adds no required animation.
- Copyright, location/currency, privacy, and terms remain readable and independently actionable
  where routes exist. Missing policy routes are not faked.

## Scope and boundaries

In scope:

- Storefront footer structure, content, responsive layout, theme roles, and interaction styling.
- Canonical logo replacement in the storefront desktop header, mobile navigation, and footer.
- Removal of the obsolete storefront-only brand-mark component if no consumers remain.
- Focused Playwright coverage/evidence for footer behaviour, responsive layouts, themes, and
  accessibility.

Out of scope:

- Admin shell redesign.
- New social-account persistence fields or Admin settings forms.
- New policy/help routes, newsletter systems, or external integrations.
- Changes to catalogue, checkout, authentication, or product-domain behaviour.

## Playwright acceptance

Use Playwright only for UI validation at 375×812, 768×1024, 1280×800, and a wide desktop viewport.
Verify:

1. The woven logo appears in desktop header, mobile menu, and footer; the old chrome mark does not.
2. Footer content contains no disallowed thrift/used framing.
3. All footer buttons and available links have accessible names and keyboard-visible focus.
4. Catalogue and support actions still open or navigate to their intended existing destinations.
5. Light and dark screenshots have readable text, distinct surfaces, and no low-contrast raw-RGBA
   remnants.
6. Icon-only social controls use genuine social glyphs and expose their platform names to the
   accessibility tree.
7. No horizontal overflow occurs at required viewports.
8. Playwright + axe reports no serious or critical footer accessibility violations.

## Self-review

- No placeholders or TODOs remain.
- Copy, layout, scope, and acceptance checks agree on the fashion-first direction.
- The social-link rule prevents invented destinations while allowing the requested icon set.
- The work is confined to the storefront shell and its styling/tests.
