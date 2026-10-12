## static

**Result:** failed

| Gate | Required | Result | Duration |
| --- | --- | --- | ---: |
| architecture | yes | failed | 82.0s |
| button-audit | yes | passed | 34.2s |
| biome | yes | failed | 29.2s |
| typescript | yes | passed | 651.7s |
| dependency-audit | advisory | warning | 19.8s |

### Diagnostics

<details><summary>❌ architecture</summary>

```text
$ node scripts/checks/module-export-guard.mjs && node scripts/checks/architecture-guard.mjs && node scripts/checks/error-validation-contract.mjs && node scripts/checks/layout-provider-contract.mjs && node scripts/checks/http-module-contract.mjs && pnpm check:storefront-production
## Module export guard

- Source files scanned: 1176
- Errors: 0
## Architecture guard

- Source files scanned: 1176
- Server Action modules indexed: 3
- Errors: 1
- Warnings: 4

### Warnings
- src/modules/auth/ui/account-security-modals.tsx has 614 lines and needs a responsibility review.
- src/modules/auth/ui/auth-dialog.tsx has 640 lines and needs a responsibility review.
- src/modules/checkout/server/create-checkout.ts has 623 lines and needs a responsibility review.
- src/modules/payments/server/transfers.ts has 649 lines and needs a responsibility review.

### Failures
- [god-module] src/modules/checkout/ui/storefront/checkout-sheet.tsx: src/modules/checkout/ui/storefront/checkout-sheet.tsx has 848 lines; split the god module.
[ELIFECYCLE] Command failed with exit code 1.

```
</details>

<details><summary>❌ biome</summary>

```text
    <fieldset>
  
    32 │     <div
    33 │       data-slot="input-group"
  > 34 │       role="group"
       │       ^^^^^^^^^^^^
    35 │       className={cn(inputGroupVariants({ groupSize }), className)}
    36 │       {...props}
  
  i For examples and more information, see WAI-ARIA Roles
  
  i Replace with one of these elements:
  
  - <fieldset>
  

src\components\ui\input-group.tsx:66:5 lint/a11y/useKeyWithClickEvents ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ! Enforce to have the onClick mouse event with the onKeyUp, the onKeyDown, or the onKeyPress keyboard event.
  
    64 │ }: React.ComponentProps<"div"> & VariantProps<typeof inputGroupAddonVariants>) {
    65 │   return (
  > 66 │     <div
       │     ^^^^
  > 67 │       role="group"
        ...
  > 77 │       {...props}
  > 78 │     />
       │     ^^
    79 │   );
    80 │ }
  
  i Actions triggered using mouse events should have corresponding keyboard events to account for keyboard-only navigation.
  

src\components\ui\input-group.tsx:67:7 lint/a11y/useSemanticElements ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ! The elements with this role can be changed to the following elements:
    <fieldset>
  
    65 │   return (
    66 │     <div
  > 67 │       role="group"
       │       ^^^^^^^^^^^^
    68 │       data-slot="input-group-addon"
    69 │       data-align={align}
  
  i For examples and more information, see WAI-ARIA Roles
  
  i Replace with one of these elements:
  
  - <fieldset>
  

src\app\admin\inventory\page.tsx:1:1 assist/source/organizeImports  FIXABLE  ━━━━━━━━━━━━━━━━━━━━━━━

  × Sort these imports.
  
   > 1 │ import { defaultInventoryPageSize } from "@/modules/inventory/ui/admin/inventory-url";
       │ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
   > 2 │ import { InventoryWorkspace } from "@/modules/inventory/ui/admin/inventory-workspace";
   > 3 │ import { AdminAccessDenied } from "@/features/admin/shell/admin-access-denied";
   > 4 │ import {
        ...
  > 15 │ } from "@/lib/admin/shared/types";
  > 16 │ import { getStaffAccess } from "@/modules/auth/server/session";
       │ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    17 │ import { productIdSchema } from "@/modules/products/schema";
    18 │ 
  
  i Safe fix: Organize imports and exports (Biome)
  
      1     │ - import·{·defaultInventoryPageSize·}·from·"@/modules/inventory/ui/admin/inventory-url";␍
      2     │ - import·{·InventoryWorkspace·}·from·"@/modules/inventory/ui/admin/inventory-workspace";␍
      3     │ - import·{·AdminAccessDenied·}·from·"@/features/admin/shell/admin-access-denied";␍
      4     │ - import·{␍
      5     │ - ··defaultInventoryQuery,␍
      6     │ - ··inventorySavedViews,␍
      7     │ - ··inventorySortOptions,␍
      8     │ - }·from·"@/lib/admin/inventory/inventory-selectors";␍
      9     │ - import·type·{␍
     10     │ - ··CatalogueChannel,␍
     11     │ - ··InventoryModeFilter,␍
     12     │ - ··InventorySavedView,␍
     13     │ - ··InventorySortKey,␍
     14     │ - ··InventoryStockFilter,␍
     15     │ - }·from·"@/lib/admin/shared/types";␍
     16     │ - import·{·getStaffAccess·}·from·"@/modules/auth/server/session";␍
          1 │ + import·{·AdminAccessDenied·}·from·"@/features/admin/shell/admin-access-denied";␍
          2 │ + import·{␍
          3 │ + ··defaultInventoryQuery,␍
          4 │ + ··inventorThe number of diagnostics exceeds the limit allowed. Use --max-diagnostics to increase it.
Diagnostics not shown: 84.
Checked 1191 files in 9s. No fixes applied.
Found 16 errors.
Found 88 warnings.
ySavedViews,␍
          5 │ + ··inventorySortOptions,␍
          6 │ + }·from·"@/lib/admin/inventory/inventory-selectors";␍
          7 │ + import·type·{␍
          8 │ + ··CatalogueChannel,␍
          9 │ + ··InventoryModeFilter,␍
         10 │ + ··InventorySavedView,␍
         11 │ + ··InventorySortKey,␍
         12 │ + ··InventoryStockFilter,␍
         13 │ + }·from·"@/lib/admin/shared/types";␍
         14 │ + import·{·getStaffAccess·}·from·"@/modules/auth/server/session";
         15 │ + import·{·defaultInventoryPageSize·}·from·"@/modules/inventory/ui/admin/inventory-url";␍
         16 │ + import·{·InventoryWorkspace·}·from·"@/modules/inventory/ui/admin/inventory-workspace";␍
     17  17 │   import { productIdSchema } from "@/modules/products/schema";␍
     18  18 │   ␍
  

check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while running checks.
  

[ELIFECYCLE] Command failed with exit code 1.

```
</details>

<details><summary>⚠️ dependency-audit</summary>

```text
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>@vercel/analytics>next>postcss                       │
│                     │                                                        │
│                     │ .>next>postcss                                         │
│                     │                                                        │
│                     │ .>next-cloudinary>next>postcss                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-6g55-p6wh-862q      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ PostCSS: Path Traversal in Previous Source Map         │
│                     │ Auto-Loading (sourceMappingURL) leads to Arbitrary     │
│                     │ .map File Disclosure                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ postcss                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <=8.5.17                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=8.5.18                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>@vercel/analytics>next>postcss                       │
│                     │                                                        │
│                     │ .>next>postcss                                         │
│                     │                                                        │
│                     │ .>next-cloudinary>next>postcss                         │
│                     │                                                        │
│                     │ ... Found 4 paths, run `pnpm why postcss` for more     │
│                     │ information                                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-r28c-9q8g-f849      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ brace-expansion: DoS via unbounded expansion length    │
│                     │ causing an out-of-memory process crash                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ brace-expansion                                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=4.0.0 <5.0.8                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=5.0.8                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>shadcn>ts-morph>@ts-morph/common>minimatch>brace-    │
│                     │ expansion                                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-mh99-v99m-4gvg      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ undici vulnerable to cross-user information disclosure │
│                     │ and parse-time crash via degenerate private cache      │
│                     │ directives                                             │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ undici                                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=7.0.0 <7.29.0                                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=7.29.0                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>shadcn>@dotenvx/dotenvx>undici                       │
│                     │                                                        │
│                     │ .>shadcn>undici                                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-4cwx-7wf7-3272      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ fast-uri vulnerable to host confusion via backslash    │
│                     │ authority introducer                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ fast-uri                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=3.0.0 <3.1.5                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=3.1.5                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>@prisma/client>prisma>@prisma/dev>@prisma/streams-   │
│                     │ local>ajv>fast-uri                                     │
│                     │                                                        │
│                     │ .>shadcn>@dotenvx/dotenvx>conf>ajv>fast-uri            │
│                     │                                                        │
│                     │ .>shadcn>@dotenvx/dotenvx>conf>ajv-formats>ajv>fast-   │
│                     │ uri                                                    │
│                     │                                                        │
│                     │ ... Found 5 paths, run `pnpm why fast-uri` for more    │
│                     │ information                                            │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-7p8r-x3mc-p8w7      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ ip-address: Address4 decodes leading-zero octets as    │
│                     │ decimal while resolvers decode them as octal, allowing │
│                     │ SSRF and trust-boundary bypass                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ ip-address                                             │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <=10.3.0                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=10.3.1                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>shadcn>@modelcontextprotocol/sdk>express-rate-       │
│                     │ limit>ip-address                                       │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-mwp4-54f8-5fhr      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ brace-expansion: DoS via unbounded intermediate        │
│                     │ arrays, bypassing the CVE-2026-14257 mitigation        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ brace-expansion                                        │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=4.0.0 <5.0.9                                         │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=5.0.9                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>shadcn>ts-morph>@ts-morph/common>minimatch>brace-    │
│                     │ expansion                                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-rgw5-rvv9-x895      │
└─────────────────────┴────────────────────────────────────────────────────────┘
30 vulnerabilities found
Severity: 17 moderate | 13 high

```
</details>
