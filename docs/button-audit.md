# Application Button Audit

## Status

- **Audit date:** 2026-07-14
- **Branch:** `chore/admin-theme-button-audit`
- **Base commit:** `cb17f749a6145b9e2085d0d65b69fe243706e642`
- **Primary route:** `/admin`
- **Button primitive:** `src/components/ui/button.tsx`
- **Strict command:** `pnpm audit:buttons`

The application-button migration is implemented across the mapped storefront, account and Admin surfaces. The package command invokes `scripts/audit-buttons.mjs --strict`, so any non-allowlisted application `<button>` fails the audit.

Executable repository-wide verification is still unavailable because the current GitHub Actions jobs finish with `steps: null` and no logs URL. Counts below are therefore limited to source patterns remediated or directly inspected in this PR; no unobserved repository-wide total is invented.

## Grounded counts

| Metric | Before | After | Evidence |
|---|---:|---:|---|
| Raw application `<button>` tags in remediated source patterns | 87 | 0 | Changed source and branch file inspection |
| Direct Base UI account button wrappers | 2 | 0 | Both account wrappers delegate to shared shadcn `Button` |
| Explicit `TODO(button-action)` dependencies | 0 | 13 | Changed account/storefront source |
| Real sign-out actions replacing toast-only placeholders | 0 | 1 | Account sidebar posts to `/auth/sign-out` |
| Repository-wide strict audit result | Unavailable | Unverified | Runner exposes no executable step/log evidence |

## Remediated surfaces

| Surface | Before | After | Representative files |
|---|---:|---:|---|
| Shared shell | 4 | 0 | theme toggle, cart trigger, account entry |
| Storefront | 54 | 0 | header, catalogue, product cards, product detail, cart, auth, overlays, filters and feedback |
| Account | 16 | 0 | sidebar, breadcrumb, support, addresses, payments, privacy, security, notifications and order/return detail |
| Admin | 13 | 0 | topbar, inventory, orders, holds, customers, product editor and record sale controls |
| **Total mapped source tags** | **87** | **0** | Source-tag count, not rendered instance count |

## Direct branch inspection

The following former blocker files were read from the PR branch through their full line ranges and contain shared `Button` controls rather than application-native button tags:

- `src/features/storefront/home-lab/storefront-lab.tsx`
- `src/features/storefront/home-lab/storefront-overlays.tsx`
- `src/features/storefront/shared/storefront-auth-dialog.tsx`
- `src/features/storefront/shared/storefront-feedback.tsx`
- `src/features/storefront/catalogue/mobile-filters.tsx`
- `src/components/layout/cart-sheet.tsx`
- `src/components/theme/theme-toggle.tsx`
- `src/app/admin/error.tsx`
- `src/app/auth/error/page.tsx`
- account support, payments, addresses, sidebar and breadcrumb modules

## Button contract

`src/components/ui/button.tsx` is the authoritative application interaction primitive. It provides:

- semantic foregrounds for default, outline, secondary, ghost, destructive and link variants;
- filled destructive styling with `destructive-foreground`;
- SVG inheritance through `currentColor`;
- visible focus and active states;
- readable disabled opacity;
- `data-variant` and `data-size` hooks for computed-style tests.

## Intentional native exceptions

Only low-level primitive files are allowlisted by `scripts/audit-buttons.mjs`:

- `src/components/ui/button.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/input-group.tsx`

These primitives may render a native button internally. Application feature files are not allowlisted.

## Representative inventory

| ID | Surface | File or area | Purpose | Primitive | State |
|---|---|---|---|---|---|
| BTN-SHARED-001 | Shared | `src/components/ui/button.tsx` | Application interaction contract | shadcn/Base UI wrapper | authoritative |
| BTN-SHARED-002 | Shared | `src/components/theme/theme-toggle.tsx` | Toggle light/dark theme | `Button` | migrated |
| BTN-SHARED-003 | Shared | `src/components/layout/cart-sheet.tsx` | Open bag sheet | `Button` through `SheetTrigger` | migrated |
| BTN-STOREFRONT-001 | Storefront | home/header/footer | Navigate, search, save and open sheets | `Button` | migrated |
| BTN-STOREFRONT-002 | Storefront | `storefront-lab.tsx` | Hero, category, catalogue and newsletter actions | `Button` | full branch scan clean |
| BTN-STOREFRONT-003 | Storefront | `storefront-overlays.tsx` | Search, quick view, viewer, drawers, filters and support | `Button` | full branch scan clean |
| BTN-STOREFRONT-004 | Storefront | product card/detail/cart | Save, hold, quantity, media and checkout controls | `Button` | migrated |
| BTN-ACCOUNT-001 | Account | account primitives | Reusable account actions | shared `Button` | duplicate wrappers removed |
| BTN-ACCOUNT-002 | Account | sidebar | Navigate and sign out | `Button`; real sign-out form | wired |
| BTN-ACCOUNT-003 | Account | support/payments/addresses | Open workflows or honest unavailable states | `Button` / `AcctButton` | migrated |
| BTN-ADMIN-001 | Admin | `src/features/admin/shell` | Navigation, command menu and workflows | `Button` | migrated |
| BTN-ADMIN-002 | Admin | `src/features/admin/inventory` | View, media, lifecycle, pagination and taxonomy controls | `Button` | migrated |
| BTN-ADMIN-003 | Admin | orders/holds/customers/returns | Open records, views and transitions | `Button` | migrated |
| BTN-ADMIN-004 | Admin | product editor/record sale | Step navigation and workflow actions | `Button` | migrated |

## Pending action dependencies

These controls intentionally report that their dependency is unavailable rather than showing false success:

| File | Intended action | Missing dependency |
|---|---|---|
| `src/features/storefront/account/sections/support-section.tsx` | Open Delivery help | Help content route/document |
| `src/features/storefront/account/sections/support-section.tsx` | Open Returns help | Help content route/document |
| `src/features/storefront/account/sections/support-section.tsx` | Open Sizing help | Help content route/document |
| `src/features/storefront/account/sections/payments-section.tsx` | Update billing address | Payment-provider update flow |
| `src/features/storefront/account/sections/addresses-section.tsx` | Make address default | Account address mutation |
| `src/features/storefront/account/sections/notifications-section.tsx` | Mark all read | Notification mutation |
| `src/features/storefront/account/sections/security-section.tsx` | Enable 2FA | Recent-auth enrollment/verification API |
| `src/features/storefront/account/sections/privacy-section.tsx` | Clear recently viewed history | Account-history mutation |
| `src/features/storefront/account/sections/overview-section.tsx` | Track order | Trusted fulfilment tracking URL |
| `src/features/storefront/account/sections/order-detail-section.tsx` | Download receipt | Signed receipt endpoint/file |
| `src/features/storefront/account/sections/order-detail-section.tsx` | Track shipment | Trusted fulfilment tracking URL |
| `src/features/storefront/home-lab/site-header.tsx` | Open Instagram | Verified public profile URL |
| `src/features/storefront/home-lab/site-header.tsx` | Open TikTok | Verified public profile URL |

## Verification commands

```bash
pnpm install --frozen-lockfile
pnpm audit:buttons
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

The workflows currently fail before exposing step or log evidence, so no command is represented as passing. The PR remains draft until these commands execute successfully in a working runner or local checkout.
