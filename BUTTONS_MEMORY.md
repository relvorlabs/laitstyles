# Laitstyles Button Audit Memory

> Source of truth for the storefront-to-admin button reliability remediation on `agent/button-audit-node24`.
> Update this file as controls are mapped, converted, implemented, and verified. Do not infer completion from a component-level row when individual controls have different actions.

## Audit summary

| Metric | Current count |
|---|---:|
| Controls fully mapped in this ledger | 42 |
| Native buttons converted | 36 |
| Existing shared shadcn Buttons repaired | 1 shared implementation |
| Duplicate button wrappers migrated to shared Button | 2 |
| Specialized primitive exceptions verified | 3 |
| Newly implemented actions | 0 |
| TODO + informational toast fallbacks | 2 |
| Remaining source files discovered by static search | In progress |
| Remaining unresolved items | In progress |

The final totals remain intentionally open until the residual source scan is complete. Generated output, dependencies, and static design-reference HTML under `docs/` are excluded from application-owned control counts.

## Shared-system findings

- The application uses the Base UI-backed shadcn `Button` exported by `src/components/ui/button.tsx`.
- `src/features/storefront/home-lab/home-lab.css` applies `.lst-lab button { color: inherit; }`. That selector outranks ordinary Tailwind foreground utilities and caused filled controls to inherit the surrounding ink colour.
- Filled variants now apply important semantic foregrounds; SVG descendants inherit `currentColor` and visible opacity.
- Ghost controls intentionally keep contextual foreground inheritance because they are used on both light surfaces and the inverse storefront footer.
- The account workspace no longer maintains a second direct Base UI button implementation; its visual wrappers compose the shared shadcn `Button`.

## Control inventory

| ID | Area | Route/page | Source | Label / accessible name | Control type | Current implementation | Variant/background | Purpose | Current action | Target implementation | Action status | Toast behavior | Phase | Remaining TODO | Verification |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| BTN-SYS-001 | Shared | All routes | `src/components/ui/button.tsx` | Shared Button | Primitive | shadcn Button | All variants | Canonical action primitive | Renders Base UI button/link | Central semantic foreground and SVG inheritance | Repaired | None | Styled | Verify all call-site overrides | CI pending |
| BTN-ACC-001 | Account | `/account` | `account-primitives.tsx:AcctButton` | Contextual | Wrapper | shadcn Button wrapper | Primary/secondary/danger pill | Reusable account action | Delegated handler | Shared Button composition | Repaired | Delegated | Converted | Audit all call sites | CI pending |
| BTN-ACC-002 | Account | `/account` | `account-primitives.tsx:IconButton` | Contextual aria-label | Icon action | shadcn Button wrapper | Light round ghost | Modal/menu icon actions | Delegated handler | Shared Button composition | Repaired | Delegated | Converted | Audit labels at call sites | CI pending |
| BTN-THEME-001 | Shared | Storefront/account | `src/components/theme/theme-toggle.tsx` | Use light/dark theme | Icon toggle | shadcn Button | Ghost, 44px | Toggle colour theme | `setTheme` | Shared Button | Implemented | None | Complete | None | CI pending |
| BTN-HDR-001 | Storefront | `/`, `/shop`, product routes | `site-header.tsx` | Dismiss announcement | Icon action | shadcn Button | Inverse ghost | Hide utility strip | `dismissUtility` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-002 | Storefront | Shared header | `site-header.tsx` | New arrivals | Navigation action | shadcn Button | Ghost text | Open new arrivals | `onNavNew` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-003 | Storefront | Shared header | `site-header.tsx` | Women | Navigation action | shadcn Button | Ghost text | Filter women | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-004 | Storefront | Shared header | `site-header.tsx` | Men | Navigation action | shadcn Button | Ghost text | Filter men | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-005 | Storefront | Shared header | `site-header.tsx` | Unisex | Navigation action | shadcn Button | Ghost text | Filter unisex | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-006 | Storefront | Shared header | `site-header.tsx` | One-of-one | Navigation action | shadcn Button | Ghost text | Filter one-of-one | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-007 | Storefront | Shared header | `site-header.tsx` | Open navigation | Icon action | shadcn Button | Ghost, 44px | Open mobile drawer | `open("mobileMenu")` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-008 | Storefront | Shared header | `site-header.tsx` | Laitstyles home | Navigation action | shadcn Button | Ghost brand | Return home | `onGoHome` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-009 | Storefront | Shared header | `site-header.tsx` | Search products | Icon action | shadcn Button | Ghost, 44px | Open search | `open("searchModal")` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-010 | Storefront | Shared header | `site-header.tsx` | Saved items, count | Icon action | shadcn Button | Ghost, 44px | Open saved drawer | `open("savedDrawer")` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-011 | Storefront | Mobile drawer | `site-header.tsx` | Close navigation | Icon action | shadcn Button | Ghost, 44px | Close drawer | `closeAll` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-012 | Storefront | Mobile drawer | `site-header.tsx` | New arrivals | Navigation action | shadcn Button | Ghost list row | Filter new arrivals | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-013 | Storefront | Mobile drawer | `site-header.tsx` | Women | Navigation action | shadcn Button | Ghost list row | Filter women | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-014 | Storefront | Mobile drawer | `site-header.tsx` | Men | Navigation action | shadcn Button | Ghost list row | Filter men | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-015 | Storefront | Mobile drawer | `site-header.tsx` | Unisex | Navigation action | shadcn Button | Ghost list row | Filter unisex | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-016 | Storefront | Mobile drawer | `site-header.tsx` | One-of-one | Navigation action | shadcn Button | Ghost list row | Filter one-of-one | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-017 | Storefront | Mobile drawer | `site-header.tsx` | Shop all | Navigation action | shadcn Button | Ghost list row | Open full catalogue | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-HDR-018 | Storefront | Mobile drawer | `site-header.tsx` | Vintage sportswear edit | Action | shadcn Button | Image tile ghost | Open quick view | `openQuick("p5")` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-FTR-001 | Storefront | Footer | `site-header.tsx` | New arrivals | Navigation action | shadcn Button | Inverse ghost link | Filter new arrivals | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-FTR-002 | Storefront | Footer | `site-header.tsx` | Women | Navigation action | shadcn Button | Inverse ghost link | Filter women | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-FTR-003 | Storefront | Footer | `site-header.tsx` | Men | Navigation action | shadcn Button | Inverse ghost link | Filter men | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-FTR-004 | Storefront | Footer | `site-header.tsx` | One-of-one | Navigation action | shadcn Button | Inverse ghost link | Filter one-of-one | `onNavShop` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-FTR-005 | Storefront | Footer | `site-header.tsx` | Delivery and returns | Modal trigger | shadcn Button | Inverse ghost link | Open delivery information | `open("deliveryModal")` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-FTR-006 | Storefront | Footer | `site-header.tsx` | Condition guide | Modal trigger | shadcn Button | Inverse ghost link | Open condition guide | `open("conditionModal")` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-FTR-007 | Storefront | Footer | `site-header.tsx` | Measurements | Modal trigger | shadcn Button | Inverse ghost link | Open measurement guide | `open("measureModal")` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-FTR-008 | Storefront | Footer | `site-header.tsx` | Brand labelling | Modal trigger | shadcn Button | Inverse ghost link | Open auth/labelling flow | `open("authModal")` | Shared Button | Implemented | None | Converted | None | CI pending |
| BTN-FTR-009 | Storefront | Footer | `site-header.tsx` | Instagram | External navigation placeholder | shadcn Button | Inverse ghost link | Visit Instagram | Informational fallback | TODO | Info: Instagram still being connected | Converted | Official profile URL | CI pending |
| BTN-FTR-010 | Storefront | Footer | `site-header.tsx` | TikTok | External navigation placeholder | shadcn Button | Inverse ghost link | Visit TikTok | Informational fallback | TODO | Info: TikTok still being connected | Converted | Official profile URL | CI pending |
| BTN-FTR-011 | Storefront | Footer | `site-header.tsx` | Contact | Modal trigger | shadcn Button | Inverse ghost link | Open support | `open("supportModal")` | Implemented | None | Converted | None | CI pending |
| BTN-AUTH-001 | Storefront | Auth dialog | `storefront-auth-dialog.tsx` | Sign in mode | Toggle | shadcn Button | Selected/ghost pill | Select sign-in form | `onModeChange` | Implemented | None | Converted | None | CI pending |
| BTN-AUTH-002 | Storefront | Auth dialog | `storefront-auth-dialog.tsx` | Create account mode | Toggle | shadcn Button | Selected/ghost pill | Select registration form | `onModeChange` | Implemented | None | Converted | None | CI pending |
| BTN-AUTH-003 | Storefront | Auth dialog | `storefront-auth-dialog.tsx` | Continue with Google | Action | shadcn Button | Outline | Start Google auth | `onContinueWithGoogle` | Implemented | Existing error flow | Converted | None | CI pending |
| BTN-AUTH-004 | Storefront | Auth dialog | `storefront-auth-dialog.tsx` | Show/hide password | Icon action | shadcn Button | Ghost, 44px | Toggle password visibility | `onRevealPasswordChange` | Implemented | None | Converted | None | CI pending |
| BTN-AUTH-005 | Storefront | Auth dialog | `storefront-auth-dialog.tsx` | Sign in / Create account | Async action | shadcn Button | Filled primary | Submit auth form | `onSubmit` | Implemented | Existing form error | Converted | None | CI pending; spinner uses currentColor |
| BTN-AUTH-006 | Storefront | Auth dialog | `storefront-auth-dialog.tsx` | Create one / Sign in | Toggle | shadcn Button | Ghost text | Switch auth mode | `onModeChange` | Implemented | None | Converted | None | CI pending |
| BTN-AUTH-007 | Storefront | Auth dialog | `storefront-auth-dialog.tsx` | Continue shopping / Go to my account | Action | shadcn Button | Filled primary | Finish auth state | `onFinish` | Implemented | None | Converted | None | CI pending |
| BTN-CART-001 | Storefront | Cart sheet | `storefront-cart-sheet.tsx` | Bag, count | Sheet trigger | `SheetTrigger` rendering shadcn Button | Ghost icon | Open/close bag | Sheet state | Verified specialized exception | None | Mapped | None | CI pending |
| BTN-CART-002 | Storefront | Cart sheet | `storefront-cart-sheet.tsx` | Shop the archive | Navigation | shadcn Button rendering Link | Filled primary | Navigate to shop | `/shop` | Implemented | None | Converted | None | CI pending |
| BTN-CART-003 | Storefront | Cart sheet | `storefront-cart-sheet.tsx` | Save | Action | shadcn Button | Ghost text | Save and remove cart line | Storefront state | Implemented | Existing storefront feedback | Converted | None | CI pending |
| BTN-CART-004 | Storefront | Cart sheet | `storefront-cart-sheet.tsx` | Remove | Action | shadcn Button | Ghost text | Remove cart line | Storefront state | Implemented | Existing storefront feedback | Converted | None | CI pending |
| BTN-CART-005 | Storefront | Cart sheet | `storefront-cart-sheet.tsx` | Recommended product Add | Action | shadcn Button | Ghost image tile | Add recommendation | `addToCart` | Implemented | Existing storefront feedback | Converted | None | CI pending |
| BTN-CART-006 | Storefront | Cart sheet | `storefront-cart-sheet.tsx` | Continue to checkout | Navigation | shadcn Button rendering Link | Filled primary | Navigate to checkout | `/checkout` | Implemented | None | Verified | None | CI pending |
| BTN-FDBK-001 | Storefront | Hold alert | `storefront-feedback.tsx` | Checkout | Navigation | shadcn Button rendering Link | Filled primary | Navigate to checkout | `/checkout` | Implemented | None | Styled | None | CI pending |
| BTN-FDBK-002 | Storefront | Hold alert | `storefront-feedback.tsx` | Dismiss hold alert | Icon action | shadcn Button | Inverse ghost | Hide hold alert | `onDismiss` | Implemented | None | Converted | None | CI pending |
| BTN-FDBK-003 | Storefront | Toast | `storefront-feedback.tsx` | Dismiss notification | Icon action | shadcn Button | Ghost | Hide notification | `dismiss` | Implemented | None | Converted | None | CI pending |
| BTN-MENU-001 | Storefront | Header account menu | `storefront-account-menu.tsx` | Sign in or create account | Action | shadcn Button | Ghost outline pill | Open sign-in flow | `openSignin` | Implemented | Existing auth feedback | Converted | None | CI pending |
| BTN-MENU-002 | Storefront | Header account menu | `storefront-account-menu.tsx` | Open account menu | Menu trigger | `DropdownMenuTrigger` | Specialized trigger | Open account menu | Radix/Base UI state | Verified specialized exception | None | Mapped | None | CI pending |
| BTN-DIALOG-001 | Shared | Dialogs | `src/components/ui/dialog.tsx` | Close dialog | Dialog close primitive | Specialized primitive | Icon ghost | Close dialog | Dialog state | Documented exception | None | Mapped | None | CI pending |

## Discovered remediation backlog

The following application areas were returned by the initial source scan and must be completed before final acceptance:

- Storefront home overlays, catalogue, product card, product detail, filters, error states, account sidebar, account sections, and return wizard.
- Admin/control-room shell, Inventory, product editor, Orders, Holds, Returns, Customers, Settings, tables, mobile lists, saved views, detail sheets, dialogs, pagination, and empty states.
- Residual no-op patterns (`href="#"`, placeholder social actions, console-only handlers, empty callbacks) and non-semantic click targets.

## Final verification checklist

- [ ] Update exact totals after residual source scan.
- [ ] No ordinary native `<button>` remains in application-owned source.
- [ ] Remaining native button renderings are documented primitive internals or justified exceptions.
- [ ] No action-style clickable `div` or `span` remains.
- [ ] Every no-op is implemented or has a scoped TODO plus informational toast.
- [ ] Filled variants keep visible semantic foreground in light and dark themes.
- [ ] Light/outline controls keep a dark/high-contrast semantic foreground.
- [ ] Icons and loading indicators inherit `currentColor`.
- [ ] Icon-only controls have accessible names and practical targets.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Tests pass.
- [ ] Production build passes on Node 24.
- [ ] Storefront and control-room browser workflows pass.
