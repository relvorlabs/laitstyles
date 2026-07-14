# Application Button Audit

## Summary

- **Audit date:** 2026-07-14
- **Branch:** `chore/admin-theme-button-audit`
- **Base commit:** `cb17f749a6145b9e2085d0d65b69fe243706e642` (`main` at branch creation)
- **Pre-document head reviewed:** `5b78cb6263968e7af2f252c9639b5971206d3dc1`
- **Scope:** Node/Vercel runtime alignment, Admin naming, global theme consolidation, shared Button contrast, application-button migration, action integrity, and Playwright replacement.

### Grounded counts

The repository-wide mapper could not persist a trustworthy baseline because every available GitHub Actions runner invocation failed before exposing step data or downloadable logs. The connected GitHub API reports failed jobs with an empty step list and returns `BlobNotFound` for the job logs. No independent repository checkout was available, so repository-wide totals are not invented.

| Metric | Before | After | Status |
|---|---:|---:|---|
| Raw application `<button>` tags in files remediated by this PR | 87 | 0 | Verified from the replaced source patterns in this PR |
| Shared account button implementations | 2 direct Base UI wrappers | 0 direct wrappers; both delegate to shadcn `Button` | Verified in `account-primitives.tsx` |
| Explicit `TODO(button-action)` dependencies introduced | 0 | 13 | Verified in changed application source |
| Real sign-out actions replacing toast-only placeholders | 0 | 1 | Verified in `account-sidebar.tsx` |
| Repository-wide raw `<button>` total | Not reproducibly measured | Not reproducibly measured | Blocked by runner/log infrastructure |
| Repository-wide shadcn `<Button>` total | Not reproducibly measured | Not reproducibly measured | Blocked by runner/log infrastructure |

### Remediated raw source tags by surface

| Surface | Before | After | Representative areas |
|---|---:|---:|---|
| Shared shell | 4 | 0 | theme toggle, cart trigger, signed-out account entry, shared Button contract |
| Storefront | 54 | 0 | header, mobile navigation, footer, catalogue, product card, cart, auth, filters, feedback |
| Account | 16 | 0 | sidebar, breadcrumb, support, addresses, payments, privacy, security, notifications, overview, order detail |
| Admin | 13 | 0 | topbar, inventory presentation/cards/mobile list/saved views, orders, holds, customer/order saved views |
| **Total** | **87** | **0** | Source-tag count in remediated files, not rendered instance count |

The no-regression check at `scripts/audit-buttons.mjs` compares application files against `main` and fails when new raw application buttons are introduced. `node scripts/audit-buttons.mjs --strict` is reserved for the final repository-wide zero-raw migration.

## Theme and Button architecture

`src/app/theme-entry.css` is the single root stylesheet entry. `src/app/globals.css` is the authoritative light/dark token source for storefront, account, and Admin. `home-lab.css` remains only as a scoped storefront layout/motion stylesheet; its local names alias the global semantic tokens rather than defining a competing palette.

`src/components/ui/button.tsx` is the authoritative interactive primitive. It provides:

- explicit semantic foregrounds for default, outline, secondary, ghost, destructive, and link variants;
- filled destructive styling with `destructive-foreground`;
- SVG inheritance through `currentColor`;
- visible focus rings and active states;
- readable disabled opacity;
- `data-variant` and `data-size` hooks for computed-style tests.

## Button inventory

Reusable components and repeated list-row patterns are documented once with their usage locations.

| ID | Surface | Route | File | Component or label | Purpose | Primitive | Variant/background | Expected foreground | Icon | Action/handler | Implementation phase | TODO status | Toast behavior | Test coverage | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BTN-SHARED-001 | Shared | all | `src/components/ui/button.tsx` | `Button` | Application interaction primitive | Base UI through shadcn wrapper | semantic variants | explicit semantic foreground; SVG `currentColor` | inherited | component contract | shared primitive | none | n/a | computed-style Playwright assertions | Internal native element is intentional |
| BTN-SHARED-002 | Shared | all | `src/components/theme/theme-toggle.tsx` | Theme toggle | Switch light/dark mode | shadcn `Button` | ghost | contextual semantic foreground | moon/sun | `setTheme` | migrated | none | none | keyboard theme test | Accessible name changes with state |
| BTN-SHARED-003 | Shared | global | `src/components/layout/cart-sheet.tsx` | Bag | Open cart sheet | shadcn `Button` through `SheetTrigger` | ghost | contextual semantic foreground | bag | sheet trigger | migrated | none | none | route smoke/icon assertions | Empty state preserved |
| BTN-SHARED-004 | Shared | global | `src/components/layout/storefront-account-menu.tsx` | Sign in | Open auth flow | shadcn `Button` | outline | `control-foreground` | user | `openSignin` | migrated | none | none | storefront smoke | Signed-in dropdown unchanged |
| BTN-STOREFRONT-001 | Storefront | global | `src/features/storefront/home-lab/site-header.tsx` | announcement/header/mobile navigation | Dismiss, search, save, navigate and open drawers | shadcn `Button` | ghost/contextual | contextual light/dark foreground | menu/search/heart/close | existing storefront handlers | migrated | none | none | desktop/mobile smoke and icon assertions | Original mobile feature DOM preserved |
| BTN-STOREFRONT-002 | Storefront | global footer | `src/features/storefront/home-lab/site-header.tsx` | shop/care/contact links | Navigate or open existing information dialogs | shadcn `Button` | ghost on inverse footer | inherited footer foreground | none | `onNavShop` / `open` | migrated | none | none | storefront smoke | Existing modal/navigation behavior preserved |
| BTN-STOREFRONT-003 | Storefront | global footer | `src/features/storefront/home-lab/site-header.tsx` | Instagram/TikTok | Open verified social profile | shadcn `Button` | ghost on inverse footer | inherited footer foreground | none | blocked by public URL | temporary-toast-and-todo | 2 TODOs | explicit “not available yet” | toast path covered by inventory-selected deterministic testing | No fake external navigation |
| BTN-STOREFRONT-004 | Storefront | `/shop` | `src/features/storefront/home-lab/catalogue-lab.tsx` | quick links/filter/sort/density/chips/pagination | Refine and paginate catalogue | shadcn `Button` | ghost/outline/default/secondary | semantic | filter/grid/arrows | existing state handlers | migrated | none | none | mobile/desktop catalogue coverage configured | `aria-pressed`/`aria-current` added |
| BTN-STOREFRONT-005 | Storefront | product grids | `src/features/storefront/home-lab/product-card.tsx` | image/save/hold/bag | Open quick view, save, hold and add | shadcn `Button` | ghost/default/contextual | semantic/currentColor | heart/bag | existing product handlers | migrated | none | existing hold/cart toasts | computed contrast/icon checks | Product link remains an anchor |
| BTN-STOREFRONT-006 | Storefront | cart drawer | `src/components/layout/storefront-cart-sheet.tsx` | quantity/save/remove/recommendation | Edit cart and add recommendations | shadcn `Button` | ghost/link | contextual | heart/plus/minus | existing cart handlers | migrated | none | existing cart feedback | storefront smoke | Checkout remains a link-rendered Button |
| BTN-STOREFRONT-007 | Storefront | `/shop` | `src/features/storefront/catalogue/mobile-filters.tsx` | Filters | Open mobile filter sheet | shadcn `Button` through trigger | outline | `control-foreground` | none | sheet trigger | migrated | none | none | mobile smoke | Active-count badge preserved |
| BTN-STOREFRONT-008 | Storefront | auth dialog | `src/features/storefront/shared/storefront-auth-dialog.tsx` | auth tabs/password/footer switch | Change auth mode and password visibility | shadcn `Button` | default/ghost/link | semantic | eye | existing auth handlers | migrated | none | none | accessible-name assertions | `aria-pressed` added |
| BTN-STOREFRONT-009 | Storefront | global | `src/features/storefront/shared/storefront-feedback.tsx` | Checkout/dismiss | Navigate to checkout or close feedback | shadcn `Button` | default/ghost | primary foreground/contextual inverse | X | link/dismiss | migrated and contrast-fixed | none | none | computed-style assertions | Removed `text-primary` from primary background |
| BTN-ACCOUNT-001 | Account | `/account/**` | `src/features/storefront/account/components/account-primitives.tsx` | `AcctButton` / `IconButton` | Reusable account action primitives | shared shadcn `Button` | default/outline/destructive | global semantic aliases | inherited | caller supplied | shared-wrapper migration | none | caller dependent | account smoke/icon assertions | Replaces two direct Base UI wrappers |
| BTN-ACCOUNT-002 | Account | `/account/**` | `src/features/storefront/account/components/account-sidebar.tsx` | navigation/sign out | Change section or end session | shadcn `Button` | default/ghost | account semantic aliases | none | `navigate`; POST `/auth/sign-out` | migrated/wired | none | none | account smoke; logout excluded from auto-click | Replaced toast-only sign-out |
| BTN-ACCOUNT-003 | Account | `/account/support` | `src/features/storefront/account/sections/support-section.tsx` | Delivery/Returns/Sizing | Open help content | `AcctButton` | outline | semantic | none | blocked by content routes | temporary-toast-and-todo | 3 TODOs | explicit unavailable | account smoke | Ticket rows navigate normally |
| BTN-ACCOUNT-004 | Account | `/account/payments` | `src/features/storefront/account/sections/payments-section.tsx` | Update billing | Open provider billing editor | shadcn `Button` | link | contextual | none | blocked by provider flow | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | Remove uses existing confirmation modal |
| BTN-ACCOUNT-005 | Account | `/account/addresses` | `src/features/storefront/account/sections/addresses-section.tsx` | Edit/Delete/Make default | Manage addresses | shadcn/`AcctButton` | link/outline | contextual/destructive | none | existing modals; pending mutation | mixed | 1 TODO | explicit unavailable for default mutation | account smoke | Fake success removed |
| BTN-ACCOUNT-006 | Account | `/account/notifications` | `src/features/storefront/account/sections/notifications-section.tsx` | rows/Mark all read | Navigate or persist read state | shadcn/`AcctButton` | ghost/outline | semantic | unread dot | navigate; pending mutation | mixed | 1 TODO | explicit unavailable for bulk mutation | account smoke | Fake success removed |
| BTN-ACCOUNT-007 | Account | `/account/security` | `src/features/storefront/account/sections/security-section.tsx` | Enable 2FA/Revoke | Enroll or revoke session | `AcctButton`/shadcn | default/destructive link | semantic | none | pending API; existing modal | mixed | 1 TODO | explicit unavailable for 2FA | account smoke | Destructive action excluded from auto-click |
| BTN-ACCOUNT-008 | Account | `/account/privacy` | `src/features/storefront/account/sections/privacy-section.tsx` | Clear history | Clear recently viewed data | shadcn `Button` | link | contextual | none | pending history mutation | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | Fake success removed |
| BTN-ACCOUNT-009 | Account | `/account` | `src/features/storefront/account/sections/overview-section.tsx` | quick actions/Track order | Navigate, open workflows or track | shadcn/`AcctButton` | ghost/default | semantic | arrow | existing handlers; pending URL | mixed | 1 TODO | explicit unavailable for tracking | account smoke | Four quick actions share one pattern |
| BTN-ACCOUNT-010 | Account | `/account/order-detail` | `src/features/storefront/account/sections/order-detail-section.tsx` | Back/Cancel/Receipt/Track | Navigate, confirm cancellation, download or track | shadcn/`AcctButton` | link/outline/default | semantic/destructive | none | existing handlers; two blocked dependencies | mixed | 2 TODOs | explicit unavailable for receipt/tracking | account smoke | No fake download/tracking success |
| BTN-ADMIN-001 | Admin | `/admin/**` | `src/features/control-room/shell/control-room-topbar.tsx` | search/navigation/actions | Open Admin navigation/search and existing workflows | shadcn `Button` | outline/default | semantic | menu/search/add/store | existing handlers/forms | migrated | none | none | Admin smoke/focus | Visible copy renamed Admin |
| BTN-ADMIN-002 | Admin | `/admin/inventory` | `src/features/control-room/inventory/inventory-controls.tsx` | Grid/Table | Switch presentation | shadcn `Button` | default/ghost | semantic | none | `onPresentationChange` | migrated | none | none | Admin computed-style coverage | `aria-pressed` preserved |
| BTN-ADMIN-003 | Admin | `/admin/inventory` | `inventory-product-card.tsx`, `inventory-mobile-list.tsx` | media/product record actions | Preview media, select and open product | shadcn `Button` | ghost/link/outline | semantic | expand/arrow | existing handlers | migrated | none | none | Admin mobile/desktop coverage configured | Checkbox remains semantic checkbox |
| BTN-ADMIN-004 | Admin | `/admin/inventory` | `inventory-saved-views.tsx` | saved views | Change inventory view | shadcn `Button` | ghost with active semantic count | semantic | none | `onChange` | migrated | none | none | Admin smoke | `aria-current` retained |
| BTN-ADMIN-005 | Admin | `/admin/orders` | `order-saved-views.tsx`, `orders-table.tsx`, `orders-mobile-list.tsx` | view tabs/order entries | Change view or open order | shadcn `Button` | default/ghost/link/outline | semantic | arrow | existing handlers | migrated | none | none | Admin responsive coverage configured | Accessible icon labels added |
| BTN-ADMIN-006 | Admin | `/admin/holds` | `holds-table.tsx`, `holds-mobile-list.tsx` | hold entries | Open hold record | shadcn `Button` | link/ghost/outline | semantic | arrow | existing handler | migrated | none | none | Admin responsive coverage configured | Accessible icon labels added |
| BTN-ADMIN-007 | Admin | `/admin/customers` | `customer-saved-views.tsx` | saved views | Change customer view | shadcn `Button` | default/ghost | semantic | none | `onChange` | migrated | none | none | Admin smoke | `aria-pressed` retained |

## Intentional exceptions

### Native primitive buttons

The following low-level primitive files may ultimately render a native button and are allowlisted by `scripts/audit-buttons.mjs`:

- `src/components/ui/button.tsx` — application Button primitive;
- `src/components/ui/dialog.tsx` — Base UI dialog close primitive;
- `src/components/ui/sheet.tsx` — Base UI sheet close primitive;
- `src/components/ui/input-group.tsx` — low-level input-group affordance.

### Compatibility route

`src/app/control-room/[[...path]]/page.tsx` intentionally retains the former route segment only to redirect old bookmarks to the equivalent `/admin` path. It does not mount a second application.

### Scoped stylesheet

`src/features/storefront/home-lab/home-lab.css` remains because it contains the scoped storefront layout, motion, and component-style port. Its theme names resolve to `globals.css`; it is not an independent theme source.

### Draft blockers, not permanent exceptions

1. Internal directories, imports, symbols, types, tests, scripts, and documentation still contain `control-room` / `ControlRoom`. Visible product naming and primary routes are Admin, but the atomic internal domain rename remains incomplete.
2. Legacy raw application buttons remain in large files not safely replaceable through partial connector output, especially `storefront-overlays.tsx` and `storefront-lab.tsx`. The no-regression audit prevents new raw buttons, but strict zero-raw mode is not achieved.
3. GitHub Actions does not expose runnable step/log evidence in the current environment, so install, lint, typecheck, build, and Playwright results remain unverified.

## Follow-up button tasks

| Exact file | Intended action | Missing dependency | Recommended next step |
|---|---|---|---|
| `src/features/storefront/account/sections/support-section.tsx` | Open Delivery help | Help content route/document | Add route and navigate to it |
| `src/features/storefront/account/sections/support-section.tsx` | Open Returns help | Help content route/document | Add route and navigate to it |
| `src/features/storefront/account/sections/support-section.tsx` | Open Sizing help | Help content route/document | Add route and navigate to it |
| `src/features/storefront/account/sections/payments-section.tsx` | Update billing address | Payment-provider update flow | Launch provider-owned editor with error handling |
| `src/features/storefront/account/sections/addresses-section.tsx` | Make address default | Account address mutation | Add mutation, loading lock, cache update, and error handling |
| `src/features/storefront/account/sections/notifications-section.tsx` | Mark all read | Notification mutation | Add idempotent bulk mutation and update cache |
| `src/features/storefront/account/sections/security-section.tsx` | Enable 2FA | Recent-auth plus enrollment/verification API | Implement complete verified lifecycle |
| `src/features/storefront/account/sections/privacy-section.tsx` | Clear recently viewed history | Account-history mutation | Clear server/client history atomically |
| `src/features/storefront/account/sections/overview-section.tsx` | Track order | Trusted fulfillment tracking URL | Read signed/trusted carrier URL from fulfillment data |
| `src/features/storefront/account/sections/order-detail-section.tsx` | Download receipt | Signed receipt endpoint/file | Generate, authorize and download a real receipt |
| `src/features/storefront/account/sections/order-detail-section.tsx` | Track shipment | Trusted fulfillment tracking URL | Open URL from order fulfillment data |
| `src/features/storefront/home-lab/site-header.tsx` | Open Instagram | Verified public profile URL | Configure URL and render a real external link |
| `src/features/storefront/home-lab/site-header.tsx` | Open TikTok | Verified public profile URL | Configure URL and render a real external link |

## Verification status

The branch defines the intended commands and CI flow:

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

GitHub Actions currently fails before useful execution evidence is available. Example jobs are reported failed with no step list, while the log endpoint returns `BlobNotFound`. The PR therefore remains a draft; no check is represented as passing without evidence.
