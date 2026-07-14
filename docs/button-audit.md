# Application Button Audit

## Summary

- **Audit date:** 2026-07-14
- **Branch:** `chore/admin-theme-button-audit`
- **Base commit:** `cb17f749a6145b9e2085d0d65b69fe243706e642` (`main` at branch creation)
- **Head reviewed before this document update:** `8d88d3f9e404d44f94bf8c5737cb160a858966a4`
- **Scope:** Node/Vercel runtime alignment, Admin naming, global theme consolidation, shared Button contrast, representative application-button migration, action integrity, and Playwright replacement.

### Grounded counts

The repository-wide mapper could not produce a trustworthy persisted baseline because every available GitHub Actions runner invocation failed before exposing step data or downloadable logs. The connected GitHub API reports failed jobs with no steps and returns `BlobNotFound` for logs. No repository checkout was available outside Actions, so this document does **not** invent repository-wide totals.

| Metric | Before | After | Status |
|---|---:|---:|---|
| Raw application `<button>` tags in files remediated by this PR | 30 | 0 | Verified from the PR diff |
| Shared account button implementations | 2 direct Base UI wrappers | 0 direct wrappers; both delegate to shadcn `Button` | Verified from the PR diff |
| Explicit pending-action TODOs introduced | 0 | 12 | Verified in changed source |
| Real sign-out actions replacing toast-only placeholders | 0 | 1 | Verified in `account-sidebar.tsx` |
| Repository-wide raw `<button>` total | Not reproducibly measured | Not reproducibly measured | Blocked by runner/log infrastructure |
| Repository-wide shadcn `<Button>` total | Not reproducibly measured | Not reproducibly measured | Blocked by runner/log infrastructure |

### Remediated source-button patterns by surface

| Surface | Raw source tags removed | Representative areas |
|---|---:|---|
| Shared shell | 4 | theme toggle, cart trigger, signed-out account entry, shared Button contract |
| Storefront | 8 | mobile filters, auth mode/password controls, hold alert, notification toast |
| Account | 16 | sidebar, breadcrumb, support, addresses, payments, privacy, security, notifications, overview, order detail |
| Admin | 2 | global search trigger, inventory grid/table switcher |
| **Total** | **30** | Source-tag count, not runtime instance count |

The no-regression check at `scripts/audit-buttons.mjs` compares each application file against `main` and fails when a new raw application button is introduced. `--strict` is available for the final zero-raw migration once the remaining legacy files are converted.

## Shared Button contract

`src/components/ui/button.tsx` is the authoritative interactive primitive. It now provides:

- explicit semantic foregrounds for default, outline, secondary, ghost, destructive, and link variants;
- filled destructive styling with `destructive-foreground`;
- SVG inheritance through `currentColor`;
- visible focus rings and active states;
- readable disabled opacity;
- `data-variant` and `data-size` hooks for automated computed-style checks.

`src/app/theme-entry.css` is the single root CSS import. `src/app/globals.css` remains the authoritative palette/token source. `home-lab.css` is intentionally retained only as a scoped storefront layout/animation stylesheet; its local names alias global semantic tokens and do not define a competing light/dark palette.

## Button inventory

Stable IDs describe a distinct button or reusable pattern. Repeated list rows produced from one component are documented once with their usage locations.

| ID | Surface | Route | File | Component or label | Purpose | Primitive | Variant/background | Expected foreground | Icon | Action/handler | Implementation phase | TODO status | Toast behavior | Test coverage | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BTN-SHARED-001 | Shared | all | `src/components/ui/button.tsx` | `Button` | Application-wide interaction primitive | Base UI via shadcn wrapper | semantic variants | explicit semantic foreground; SVG `currentColor` | inherited | component contract | shared primitive | none | n/a | computed-style Playwright assertions | Native element remains internal by design |
| BTN-SHARED-002 | Shared | all | `src/components/theme/theme-toggle.tsx` | Theme toggle | Switch light/dark mode | shadcn `Button` | ghost | contextual foreground | moon/sun | `setTheme` | migrated | none | none | keyboard theme test | Accessible name changes with state |
| BTN-SHARED-003 | Shared | global header | `src/components/layout/cart-sheet.tsx` | Bag | Open cart sheet | shadcn `Button` through `SheetTrigger` | ghost | contextual foreground | bag | Base UI sheet trigger | migrated | none | none | route smoke and icon checks | Empty state retained |
| BTN-SHARED-004 | Storefront | global header | `src/components/layout/storefront-account-menu.tsx` | Sign in | Open authentication dialog | shadcn `Button` | outline | `control-foreground` | user | `openSignin` | migrated | none | none | route smoke | Signed-in dropdown behavior unchanged |
| BTN-ADMIN-001 | Admin | `/admin/**` | `src/features/control-room/shell/control-room-topbar.tsx` | Search everything | Open Admin command menu | shadcn `Button` | outline/raised | accessible dark/light foreground | search | `onOpenSearch` | migrated | none | none | Admin smoke/focus | Desktop and mobile triggers share handler |
| BTN-ADMIN-002 | Admin | `/admin/inventory` | `src/features/control-room/inventory/inventory-controls.tsx` | Grid/Table | Switch inventory presentation | shadcn `Button` | default when active; ghost otherwise | semantic | none | `onPresentationChange` | migrated | none | none | Admin computed-style coverage | `aria-pressed` preserved |
| BTN-STOREFRONT-001 | Storefront | `/shop` | `src/features/storefront/catalogue/mobile-filters.tsx` | Filters | Open mobile filter sheet | shadcn `Button` through `SheetTrigger` | outline | `control-foreground` | none | sheet trigger | migrated | none | none | mobile route smoke | Active-count badge preserved |
| BTN-STOREFRONT-002 | Storefront | auth dialog | `src/features/storefront/shared/storefront-auth-dialog.tsx` | Sign in/Create account tabs | Switch auth mode | shadcn `Button` | default/ghost | semantic | none | `onModeChange` | migrated | none | none | computed-style assertions | `aria-pressed` added |
| BTN-STOREFRONT-003 | Storefront | auth dialog | `src/features/storefront/shared/storefront-auth-dialog.tsx` | Show/Hide password | Toggle input visibility | shadcn `Button` | ghost icon | contextual | eye | `onRevealPasswordChange` | migrated | none | none | icon accessible-name assertion | State-specific accessible name added |
| BTN-STOREFRONT-004 | Storefront | auth dialog | `src/features/storefront/shared/storefront-auth-dialog.tsx` | Sign in/Create one footer link | Switch auth mode | shadcn `Button` | link | contextual | none | `onModeChange` | migrated | none | none | route smoke | Navigation semantics remain in-dialog action |
| BTN-STOREFRONT-005 | Storefront | global | `src/features/storefront/shared/storefront-feedback.tsx` | Checkout | Navigate to checkout while hold is active | shadcn `Button` rendered as link | default | `primary-foreground` | none | `/checkout` | contrast fix | none | none | computed-style coverage | Removed `text-primary` that could match its background |
| BTN-STOREFRONT-006 | Storefront | global | `src/features/storefront/shared/storefront-feedback.tsx` | Dismiss hold alert | Close hold banner | shadcn `Button` | ghost icon on inverse surface | inherited white/contextual | X | `onDismiss` | migrated | none | none | icon checks | Contextual ghost foreground retained |
| BTN-STOREFRONT-007 | Storefront | global | `src/features/storefront/shared/storefront-feedback.tsx` | Dismiss notification | Close storefront toast | shadcn `Button` | ghost icon | muted semantic | X | `dismiss` | migrated | none | none | icon checks | Accessible name retained |
| BTN-ACCOUNT-001 | Account | `/account` | `src/features/storefront/account/components/account-primitives.tsx` | `AcctButton` | Reusable account pill action | shadcn `Button` wrapper | default/outline/destructive | global semantic roles | inherited | caller supplied | shared wrapper migration | none | caller dependent | account route smoke | Replaces duplicate direct Base UI wrapper |
| BTN-ACCOUNT-002 | Account | `/account` | `src/features/storefront/account/components/account-primitives.tsx` | `IconButton` | Reusable account icon action | shadcn `Button` wrapper | outline icon | global semantic roles | inherited | caller supplied | shared wrapper migration | none | caller dependent | icon checks | Replaces duplicate direct Base UI wrapper |
| BTN-ACCOUNT-003 | Account | `/account/**` | `src/features/storefront/account/components/account-sidebar.tsx` | Account navigation | Change account section | shadcn `Button` | default/ghost | account semantic aliases | none | `navigate` | migrated | none | none | account route smoke | `aria-current` retained |
| BTN-ACCOUNT-004 | Account | `/account/**` | `src/features/storefront/account/components/account-sidebar.tsx` | Sign out | End Supabase session | shadcn `Button` in form | ghost | oxblood semantic | none | POST `/auth/sign-out` | wired to existing action | none | none | deterministic action excluded from auto-click | Replaces toast-only placeholder |
| BTN-ACCOUNT-005 | Account | `/account/**` | `src/features/storefront/account/components/account-breadcrumb.tsx` | Account | Return to overview | shadcn `Button` | link | contextual | none | `navigate("overview")` | migrated | none | none | route smoke | Home remains a link |
| BTN-ACCOUNT-006 | Account | `/account/support` | `src/features/storefront/account/sections/support-section.tsx` | Delivery/Returns/Sizing help | Open help content | `AcctButton` | outline | semantic | none | pending content route | temporary-toast-and-todo | 3 TODOs | explicit “not available yet” | account smoke | No fake article-opened success |
| BTN-ACCOUNT-007 | Account | `/account/support` | `src/features/storefront/account/sections/support-section.tsx` | Ticket rows | Open ticket detail | shadcn `Button` | ghost row | contextual | none | `navigate("ticket-detail")` | migrated | none | none | account smoke | One reusable row pattern |
| BTN-ACCOUNT-008 | Account | `/account/payments` | `src/features/storefront/account/sections/payments-section.tsx` | Update billing | Edit provider billing address | shadcn `Button` | link | contextual | none | pending provider flow | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | Remove action still opens existing confirmation modal |
| BTN-ACCOUNT-009 | Account | `/account/addresses` | `src/features/storefront/account/sections/addresses-section.tsx` | Edit/Delete | Open existing address dialogs | shadcn `Button` | link | contextual/destructive | none | `openModal` | migrated | none | none | account smoke | Existing modal behavior retained |
| BTN-ACCOUNT-010 | Account | `/account/addresses` | `src/features/storefront/account/sections/addresses-section.tsx` | Make default | Persist default address | `AcctButton` | outline | semantic | none | pending account mutation | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | Removed fake success toast |
| BTN-ACCOUNT-011 | Account | `/account/notifications` | `src/features/storefront/account/sections/notifications-section.tsx` | Notification row | Navigate to related record | shadcn `Button` | ghost row | contextual | unread dot | `navigate` | migrated | none | none | account smoke | One pattern used by all notification rows |
| BTN-ACCOUNT-012 | Account | `/account/notifications` | `src/features/storefront/account/sections/notifications-section.tsx` | Mark all read | Persist read state | `AcctButton` | outline | semantic | none | pending notification mutation | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | Removed fake success toast |
| BTN-ACCOUNT-013 | Account | `/account/security` | `src/features/storefront/account/sections/security-section.tsx` | Enable 2FA | Begin enrollment | `AcctButton` | default | semantic | none | pending recent-auth and verification APIs | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | Does not pretend enrollment started |
| BTN-ACCOUNT-014 | Account | `/account/security` | `src/features/storefront/account/sections/security-section.tsx` | Revoke | Open existing session confirmation | shadcn `Button` | destructive link | oxblood semantic | none | `openModal("revoke")` | migrated | none | none | destructive auto-click excluded | Existing confirmation preserved |
| BTN-ACCOUNT-015 | Account | `/account/privacy` | `src/features/storefront/account/sections/privacy-section.tsx` | Clear history | Clear recently viewed data | shadcn `Button` | link | contextual | none | pending history mutation | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | Removed fake success toast |
| BTN-ACCOUNT-016 | Account | `/account` | `src/features/storefront/account/sections/overview-section.tsx` | Quick-action rows | Navigate/open existing workflows | shadcn `Button` | ghost row | contextual | arrow | `navigate` / `openModal` | migrated | none | none | account smoke | One pattern covers four deterministic actions |
| BTN-ACCOUNT-017 | Account | `/account` | `src/features/storefront/account/sections/overview-section.tsx` | Track order | Open carrier tracking | `AcctButton` | default | semantic | none | pending trusted tracking URL | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | Removed vague simulated behavior |
| BTN-ACCOUNT-018 | Account | `/account/order-detail` | `src/features/storefront/account/sections/order-detail-section.tsx` | Back/Cancel item | Navigate or open cancellation modal | shadcn `Button` | link/destructive link | contextual | none | `navigate` / `openModal` | migrated | none | none | destructive auto-click excluded | Existing eligibility text retained |
| BTN-ACCOUNT-019 | Account | `/account/order-detail` | `src/features/storefront/account/sections/order-detail-section.tsx` | Receipt | Download signed receipt | `AcctButton` | outline | semantic | none | pending receipt endpoint/file | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | No fake download success |
| BTN-ACCOUNT-020 | Account | `/account/order-detail` | `src/features/storefront/account/sections/order-detail-section.tsx` | Track shipment | Open carrier tracking | `AcctButton` | default | semantic | none | pending trusted tracking URL | temporary-toast-and-todo | 1 TODO | explicit unavailable | account smoke | No fake tracking success |

## Intentional exceptions

### Native buttons

The following low-level primitive files may ultimately render a native button and are allowlisted by `scripts/audit-buttons.mjs`:

- `src/components/ui/button.tsx` — application Button primitive;
- `src/components/ui/dialog.tsx` — Base UI dialog close primitive;
- `src/components/ui/sheet.tsx` — Base UI sheet close primitive;
- `src/components/ui/input-group.tsx` — low-level input-group affordance.

### Compatibility route

`src/app/control-room/[[...path]]/page.tsx` intentionally retains the former route segment solely to redirect old bookmarks to the equivalent `/admin` path. It does not mount a second Admin application.

### Scoped stylesheet

`src/features/storefront/home-lab/home-lab.css` remains because it contains a large scoped storefront layout, motion, and component-style port. Its theme variable names are aliases over `globals.css`; it is not an independent theme source.

### Unfinished repository-wide migration

This draft PR does **not** yet claim full acceptance for either of these repository-wide requirements:

1. Internal directories, symbols, imports, tests, scripts, and documentation still contain `control-room` / `ControlRoom` identifiers. Visible labels and the primary route are Admin, but the mechanical domain rename remains incomplete.
2. Legacy raw application buttons remain in files not listed as remediated above. The no-regression audit prevents the count from increasing, but strict zero-raw mode is not yet achieved.

These are blockers, not intentional permanent exceptions. The PR remains a draft.

## Follow-up tasks

| File | Intended action | Missing dependency | Recommended next step |
|---|---|---|---|
| `src/features/storefront/account/sections/support-section.tsx` | Open Delivery help | Support content route/document | Add a real help route and navigate to it |
| `src/features/storefront/account/sections/support-section.tsx` | Open Returns help | Support content route/document | Add a real help route and navigate to it |
| `src/features/storefront/account/sections/support-section.tsx` | Open Sizing help | Support content route/document | Add a real help route and navigate to it |
| `src/features/storefront/account/sections/payments-section.tsx` | Update billing address | Payment-provider update flow | Launch the provider-owned billing editor and handle errors |
| `src/features/storefront/account/sections/addresses-section.tsx` | Make address default | Account address mutation | Add mutation, optimistic disable/loading, and error handling |
| `src/features/storefront/account/sections/notifications-section.tsx` | Mark all read | Notification read-state mutation | Add idempotent bulk mutation and update cache |
| `src/features/storefront/account/sections/security-section.tsx` | Enable 2FA | Recent-auth plus enrollment/verification API | Implement full verified enrollment lifecycle |
| `src/features/storefront/account/sections/privacy-section.tsx` | Clear recently viewed history | Account-history mutation | Clear server/client history atomically and refresh state |
| `src/features/storefront/account/sections/overview-section.tsx` | Track order | Trusted fulfillment tracking URL | Read carrier URL from fulfillment event and open safely |
| `src/features/storefront/account/sections/order-detail-section.tsx` | Download receipt | Signed receipt endpoint or file | Generate/authorize a receipt and trigger a real download |
| `src/features/storefront/account/sections/order-detail-section.tsx` | Track shipment | Trusted fulfillment tracking URL | Read carrier URL from order data and open safely |
| Repository-wide | Complete Control Room → Admin internal rename | Working checkout/runner for atomic file moves and import repair | Rename directories/symbols in one branch, run typecheck/tests, retain only redirect note |
| Repository-wide | Convert remaining legacy raw buttons | Working checkout/runner and strict audit | Run mapper, migrate each pattern, then enforce `node scripts/audit-buttons.mjs --strict` |

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

GitHub Actions currently fails before useful execution evidence is available. For example, parity job `87186645196` in run `29362737383` is reported failed with no step list, while the log endpoint returns `BlobNotFound`. Earlier existing and temporary branch workflows showed the same behavior. Until a runner exposes normal steps/logs, lint, typecheck, build, and Playwright results are **not verified** and the PR must remain a draft.
