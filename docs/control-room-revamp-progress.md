# Laitstyle Control Room Revamp

## Scope guard

Included:

- Full control-room navigation, visual language and responsive shell
- Operational overview focused on decisions, revenue, stock pressure, orders and holds
- Inventory for both one-of-one items and stocked styles with quantities and variants
- Add-piece stepper inside a dialog instead of a separate page
- Intake as a preparation workflow before inventory
- Orders, holds, offline sales, customers and plain-language settings
- Connected local state so offline sales affect stock and revenue while respecting holds
- Lint, TypeScript, production build and React diagnostics

Excluded:

- Real database persistence
- Authentication and production permissions
- Payment-provider callbacks
- File-upload storage
- Courier and messaging APIs
- Storefront redesign
- Deployment changes

## 1–10 implementation scale

| Score | Gate | Status |
| --- | --- | --- |
| 1 | Separate branch and scope lock | Complete |
| 2 | Current admin responsibilities audited | Complete |
| 3 | Variant-aware operational model | Complete |
| 4 | New control-room information architecture | Complete |
| 5 | Overview and inventory workspaces | Complete |
| 6 | Intake, orders, holds, offline, customers and settings | Complete |
| 7 | Responsive shell, mobile navigation and overlays | Complete |
| 8 | Interaction and accessibility hardening | In progress |
| 9 | Lint, TypeScript, tests, build and diagnostics pass | Pending |
| 10 | Live responsive browser validation and PR ready | Pending |

## Current score

**7/10**

## Product decisions

- Inventory is the source of truth for sellable styles, physical variants, quantities, media and pricing.
- Intake is not another add-product page. It is the unfinished arrival queue before inventory.
- A style can be `one-of-one` or `stocked`.
- Held units stay on hand but are removed from available stock.
- Offline sales can only consume currently available units and are included in revenue.
- Settings use customer-facing and owner-facing language rather than code or infrastructure terminology.
