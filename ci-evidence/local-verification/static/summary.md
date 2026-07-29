## static

**Result:** failed

| Gate | Required | Result | Duration |
| --- | --- | --- | ---: |
| architecture | yes | failed | 57.3s |
| button-audit | yes | failed | 12.8s |
| biome | yes | failed | 19.0s |
| typescript | yes | passed | 154.3s |
| dependency-audit | advisory | warning | 10.6s |

### Diagnostics

<details><summary>❌ architecture</summary>

```text
[WARN] Unsupported engine: wanted: {"node":"25.x"} (current: {"node":"v26.5.0","pnpm":"11.13.0"})
$ node scripts/checks/module-export-guard.mjs && node scripts/checks/architecture-guard.mjs && node scripts/checks/error-validation-contract.mjs && node scripts/checks/layout-provider-contract.mjs && node scripts/checks/http-module-contract.mjs
## Module export guard

- Source files scanned: 796
- Errors: 0
## Architecture guard

- Source files scanned: 796
- Server Action modules indexed: 3
- Errors: 1
- Warnings: 1

### Warnings
- src/modules/auth/ui/auth-dialog.tsx has 642 lines and needs a responsibility review.

### Failures
- [god-module] src/features/storefront/account/modals/account-modals.tsx: src/features/storefront/account/modals/account-modals.tsx has 963 lines; split the god module.
[ELIFECYCLE] Command failed with exit code 1.

```
</details>

<details><summary>❌ button-audit</summary>

```text
[WARN] Unsupported engine: wanted: {"node":"25.x"} (current: {"node":"v26.5.0","pnpm":"11.13.0"})
$ node scripts/audit-buttons.mjs
Application raw-button audit
Mode: no-regression baseline
- src/modules/products/ui/admin/catalogue/catalogue-structure-workspace.test.tsx: 1 raw button(s); main baseline 0; violation
- src/modules/products/ui/admin/import/product-import-queue.tsx: 1 raw button(s); main baseline 0; violation
- src/modules/products/ui/admin/import/product-import-session.test.tsx: 1 raw button(s); main baseline 0; violation
- src/modules/products/ui/storefront/product-campaign.tsx: 2 raw button(s); main baseline 2; legacy-baseline
- src/modules/products/ui/storefront/product-purchase-panel.tsx: 1 raw button(s); main baseline 1; legacy-baseline
- src/providers/session-provider.test.tsx: 2 raw button(s); main baseline 2; legacy-baseline

Raw application buttons require shadcn <Button> migration:
  src/modules/products/ui/admin/catalogue/catalogue-structure-workspace.test.tsx: current=1, allowed=0
  src/modules/products/ui/admin/import/product-import-queue.tsx: current=1, allowed=0
  src/modules/products/ui/admin/import/product-import-session.test.tsx: current=1, allowed=0
[ELIFECYCLE] Command failed with exit code 1.

```
</details>

<details><summary>❌ biome</summary>

```text
    32 │             ))}
  
  i The order of the items may change, and this also affects performances and component state.
  
  i Check the React documentation. 
  

src\app\api\v1\auth\invitations\route.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Formatter would have printed the following content:
  
     7  7 │       payload = await request.json();␍
     8  8 │     } catch {␍
     9    │ - ····return·NextResponse.json({·ok:·false,·message:·"Enter·the·manager·invitation·details."·},·{·status:·400·});␍
        9 │ + ····return·NextResponse.json(␍
       10 │ + ······{·ok:·false,·message:·"Enter·the·manager·invitation·details."·},␍
       11 │ + ······{·status:·400·},␍
       12 │ + ····);␍
    10 13 │     }␍
    11 14 │   ␍
    12 15 │     if (!payload || typeof payload !== "object" || Array.isArray(payload)) {␍
    13    │ - ····return·NextResponse.json({·ok:·false,·message:·"Enter·the·manager·invitation·details."·},·{·status:·400·});␍
       16 │ + ····return·NextResponse.json(␍
       17 │ + ······{·ok:·false,·message:·"Enter·the·manager·invitation·details."·},␍
       18 │ + ······{·status:·400·},␍
       19 │ + ····);␍
    14 20 │     }␍
    15 21 │   ␍
  

src\app\auth\actions.test.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Formatter would have printed the following content:
  
    324 324 │     it("returns email workflow success in place instead of navigating", async () => {␍
    325 325 │       await expect(␍
    326     │ - ······requestPasswordResetWithRedirect(␍
    327     │ - ········idleState,␍
    328     │ - ········formData({·email:·"shopper@example.com"·}),␍
    329     │ - ······),␍
        326 │ + ······requestPasswordResetWithRedirect(idleState,·formData({·email:·"shopper@example.com"·})),␍
    330 327 │       ).resolves.toEqual({␍
    331 328 │         status: "success",␍
    ······· │ 
    349 346 │     it("keeps confirmation-required signup success on the same page", async () => {␍
    350 347 │       await expect(␍
    351     │ - ······signUpWithPassword(␍
    352     │ - ········idleState,␍
    353     │ - ········signupData({·next:·"/account",·returnTo:·"/auth/sign-up"·}),␍
    354     │ - ······),␍
        348 │ + ······signUpWithPassword(idleState,·signupData({·next:·"/account",·returnTo:·"/auth/sign-up"·})),␍
    355 349 │       ).resolves.toEqual({␍
    356 350 │         status: "success",␍
  

src\app\auth\actions.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Formatter would have printed the following content:
  
    211 211 │   }␍
    212 212 │   ␍
    213     │ - function·pageActionError(␍
    214     │ - ··error:·PasswordAuthActionError,␍
    215     │ - ··formData:·FormData,␍
    216     │ - ):·AuthPageActionState·{␍
        213 │ + function·pageActionError(error:·PasswordAuthActionError,·formData:·FormData):·AuthPageActionState·{␍
    217 214 │     return {␍
    218 215 │       status: "error",␍
  

src\app\auth\forgot-password\page.tsx format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Formatter would have printed the following content:
  
     2  2 │   import Link from "next/link";␍
     3  3 │   import { requestPasswordResetWithRedirect } from "@/app/auth/actions";␍
     4    │ - import·{␍
     5    │ - ··getAuthFlowErrorMessage,␍
     6    │ - ··isAuthFlowErrorCode,␍
     7    │ - }·from·"@/modules/auth/server/diagnostics";␍
        4 │ + import·{·getAuthFlowErrorMessage,·isAuthFlowErrorCode·}·from·"@/modules/auth/server/diagnostics";␍
     8  5 │   import { AuthEmailForm } from "@/modules/auth/ui/auth-email-form";␍
     9  6 │   import { AuthPageShell } from "@/modules/auth/ui/auth-page-shell";␍
  

src\app\auth\invite\finalize\route.ts format ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Formatter would have printed the following content:
  
     7  7 │       payload = await request.json();␍
     8  8 │     } catch {␍
     9    │ - ····return·NextResponse.json({·ok:·false,·message:·"Enter·your·account·setup·details."·},·{·status:·400·});␍
        9 │ + ····return·NextResponse.json(␍
       10 │ + ······{·ok:·false,·message:·"Enter·your·account·setup·details."·},␍
       11 │ + ······{·status:·400·},␍
       12 │ + ····);␍
    10 13 │     }␍
    11 14 │   ␍
    12 15 │     if (!payload || typeof payload !== "object" || Array.isArray(payload)) {␍
    13    │ - ····return·NextResponse.json({·ok:·false,·message:·"Enter·your·account·setup·details."·},·{·status:·400·});␍
       16 │ + ····return·NextResponse.json(␍
       17 │ + ······{·ok:·false,·message:·"Enter·your·account·setup·details."·},␍
       18 │ + ······{·status:·400·},␍
       19 │ + ····);␍
    14 20 │     }␍
    15 21 │   ␍
  

The number of diagnostics exceeds the limit allowed. Use --max-diagnostics to increase it.
Diagnostics not shown: 77.
Checked 811 files in 6s. No fixes applied.
Found 34 errors.
Found 63 warnings.
check ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Some errors were emitted while running checks.
  

[ELIFECYCLE] Command failed with exit code 1.

```
</details>

<details><summary>⚠️ dependency-audit</summary>

```text
│                     │                                                        │
│                     │ .>next                                                 │
│                     │                                                        │
│                     │ .>next-cloudinary>next                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-6gpp-xcg3-4w24      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ Next.js: Denial of Service in App Router using Server  │
│                     │ Actions                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ next                                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=16.0.0 <16.2.11                                      │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=16.2.11                                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>@vercel/analytics>next                               │
│                     │                                                        │
│                     │ .>next                                                 │
│                     │                                                        │
│                     │ .>next-cloudinary>next                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-m99w-x7hq-7vfj      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ Next.js: Server-Side Request Forgery in Server Actions │
│                     │ on custom servers                                      │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ next                                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=16.0.0 <16.2.11                                      │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=16.2.11                                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>@vercel/analytics>next                               │
│                     │                                                        │
│                     │ .>next                                                 │
│                     │                                                        │
│                     │ .>next-cloudinary>next                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-89xv-2m56-2m9x      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ Next.js: Server-Side Request Forgery in rewrites via   │
│                     │ attacker-controlled destination hostname               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ next                                                   │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ >=16.0.0 <16.2.11                                      │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=16.2.11                                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>@vercel/analytics>next                               │
│                     │                                                        │
│                     │ .>next                                                 │
│                     │                                                        │
│                     │ .>next-cloudinary>next                                 │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-p9j2-gv94-2wf4      │
└─────────────────────┴────────────────────────────────────────────────────────┘
┌─────────────────────┬────────────────────────────────────────────────────────┐
│ high                │ PostCSS: Arbitrary file read and information           │
│                     │ disclosure via attacker-controlled sourceMappingURL in │
│                     │ CSS comments                                           │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Package             │ postcss                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Vulnerable versions │ <=8.5.11                                               │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=8.5.12                                               │
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
│ Vulnerable versions │ <=5.0.7                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Patched versions    │ >=5.0.8                                                │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ Paths               │ .>shadcn>ts-morph>@ts-morph/common>minimatch>brace-    │
│                     │ expansion                                              │
├─────────────────────┼────────────────────────────────────────────────────────┤
│ More info           │ https://github.com/advisories/GHSA-mh99-v99m-4gvg      │
└─────────────────────┴────────────────────────────────────────────────────────┘
18 vulnerabilities found
Severity: 9 moderate | 9 high

```
</details>
