# Storefront Footer Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the storefront's generic, low-contrast footer and invented logo with a responsive fashion-led editorial footer, canonical woven branding, and accessible social icon controls.

**Architecture:** Keep the change inside the storefront shell. Split the footer out of the already-large header module, reuse the shared `LaitstyleSymbol`, give the footer stable semantic theme roles in the existing storefront stylesheet, and add focused Playwright acceptance coverage. Existing catalogue navigation and overlay actions remain the data/interaction boundary.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Base UI Button, HugeIcons, next-themes, Playwright, axe-core.

## Global Constraints

- Use `pnpm@11.13.0`; do not install dependencies.
- Do not use `thrift`, `used`, `second-hand`, `pre-owned`, `pass it on`, or bargain-coded footer copy.
- Use HugeIcons for Instagram, Facebook, TikTok, Pinterest, and YouTube; do not invent external account URLs.
- Use the canonical `LaitstyleSymbol` from `src/components/brand/laitstyle-symbol.tsx` in header, mobile navigation, and footer.
- Design light and dark as paired systems using semantic footer roles; do not use fixed pale RGBA text colors.
- All icon-only controls require accessible names and at least 44 by 44 CSS-pixel targets.
- Use Playwright only for browser/UI validation, per explicit user instruction.
- Preserve unrelated dirty-worktree edits and do not dispatch subagents, per explicit user instruction.

---

## File map

- Modify `src/modules/storefront-shell/ui/site-header.tsx`: replace `BrandMark` with the canonical shared mark and remove footer ownership.
- Create `src/modules/storefront-shell/ui/site-footer.tsx`: own footer content, semantic navigation, social icon rail, catalogue actions, and support-overlay actions.
- Modify `src/modules/storefront-shell/ui/site-chrome.tsx`: import `SiteFooter` from its new focused module.
- Delete `src/modules/storefront-shell/ui/brand-mark.tsx`: remove the obsolete invented storefront logo after all consumers are migrated.
- Modify `src/features/storefront/shared/storefront.css`: define paired footer roles and responsive editorial layout classes; remove obsolete footer rules.
- Create `tests/e2e/storefront-footer.spec.ts`: verify branding, copy, actions, contrast, accessibility, themes, and responsive overflow.

---

### Task 1: Canonical storefront branding

**Files:**
- Modify: `src/modules/storefront-shell/ui/site-header.tsx`
- Delete: `src/modules/storefront-shell/ui/brand-mark.tsx`
- Test: `tests/e2e/storefront-footer.spec.ts`

**Interfaces:**
- Consumes: `LaitstyleSymbol(props: LaitstyleSymbolProps)` from `@/components/brand/laitstyle-symbol`.
- Produces: header and mobile-menu brand controls marked with `data-storefront-logo="woven"` for focused browser acceptance.

- [ ] **Step 1: Write the failing Playwright branding assertion**

Create `tests/e2e/storefront-footer.spec.ts` with the first test:

```ts
import { expect, test } from "playwright/test";

test("storefront chrome uses the canonical woven logo", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-storefront-logo="woven"]:visible').first()).toBeVisible();
  await expect(page.locator('svg[viewBox="0 0 612 792"]')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec playwright test tests/e2e/storefront-footer.spec.ts --project=desktop-chromium`

Expected: FAIL because the `data-storefront-logo="woven"` marker does not exist and the old `612 792` mark is still rendered.

- [ ] **Step 3: Replace the old mark in header and mobile navigation**

In `site-header.tsx`, replace the `BrandMark` import with:

```ts
import { LaitstyleSymbol } from "@/components/brand/laitstyle-symbol";
```

Replace both existing `BrandMark` render sites with the canonical decorative mark:

```tsx
<LaitstyleSymbol
  aria-hidden="true"
  className="h-full w-full"
  data-storefront-logo="woven"
  focusable="false"
  title=""
/>
```

Keep the desktop home button's `aria-label="Laitstyles home"` and keep visible `LAITSTYLES` text in both brand controls. Remove the `BrandMark` import and delete `brand-mark.tsx` once `rg -n "BrandMark|brand-mark" src` returns no consumers.

- [ ] **Step 4: Run the branding test and verify it passes**

Run: `pnpm exec playwright test tests/e2e/storefront-footer.spec.ts --project=desktop-chromium`

Expected: PASS for the canonical woven logo assertion.

- [ ] **Step 5: Commit the branding slice**

```powershell
git add -- src/modules/storefront-shell/ui/site-header.tsx src/modules/storefront-shell/ui/brand-mark.tsx tests/e2e/storefront-footer.spec.ts
git commit -m "fix(storefront): use canonical woven logo"
```

---

### Task 2: Fashion-led semantic footer

**Files:**
- Create: `src/modules/storefront-shell/ui/site-footer.tsx`
- Modify: `src/modules/storefront-shell/ui/site-header.tsx`
- Modify: `src/modules/storefront-shell/ui/site-chrome.tsx`
- Modify: `src/features/storefront/shared/storefront.css`
- Test: `tests/e2e/storefront-footer.spec.ts`

**Interfaces:**
- Consumes: `NavShop` from `site-header.tsx`, `useStorefrontOverlay()`, `showStorefrontToast()`, Base UI `Button`, `LaitstyleSymbol`, and HugeIcons social glyph objects.
- Produces: `SiteFooter({ onNavShop }: { onNavShop: NavShop })`, one semantic `footer[data-site-footer]`, two labelled navigation regions, and five truthful social icon controls.

- [ ] **Step 1: Add failing content, semantics, and social-control assertions**

Append to `tests/e2e/storefront-footer.spec.ts`:

```ts
test("footer is fashion-led, semantic, and socially accessible", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const footer = page.locator("footer[data-site-footer]");
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeVisible();
  await expect(footer.getByText("Style, selected with intention.")).toBeVisible();
  await expect(footer.getByRole("navigation", { name: "Discover" })).toBeVisible();
  await expect(footer.getByRole("navigation", { name: "Client services" })).toBeVisible();
  await expect(footer.getByText(/pre-owned|second-hand|thrift|used|pass it on/i)).toHaveCount(0);

  for (const platform of ["Instagram", "Facebook", "TikTok", "Pinterest", "YouTube"]) {
    const control = footer.getByRole("button", { name: `Follow Laitstyles on ${platform}` });
    await expect(control).toBeVisible();
    await expect(control.locator("svg")).toBeVisible();
    const box = await control.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
});

test("footer catalogue and client-service actions remain operable", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const footer = page.locator("footer[data-site-footer]");
  await footer.scrollIntoViewIfNeeded();
  await footer.getByRole("button", { name: "Women" }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("category")).toBe("Women");

  await footer.getByRole("button", { name: "Delivery & returns" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm exec playwright test tests/e2e/storefront-footer.spec.ts --project=desktop-chromium`

Expected: FAIL because the editorial footer, labelled navigation, and icon rail do not exist.

- [ ] **Step 3: Create the focused footer component**

Create `site-footer.tsx` as a Client Component. Import `InstagramIcon`, `Facebook02Icon`, `TiktokIcon`, `PinterestIcon`, and `YoutubeIcon` from `@hugeicons/core-free-icons`, render each through `HugeiconsIcon`, and define:

```ts
const socialPlatforms = [
  { label: "Instagram", icon: InstagramIcon },
  { label: "Facebook", icon: Facebook02Icon },
  { label: "TikTok", icon: TiktokIcon },
  { label: "Pinterest", icon: PinterestIcon },
  { label: "YouTube", icon: YoutubeIcon },
] as const;
```

Render social platforms as icon-only `Button` controls rather than invented links:

```tsx
<Button
  aria-label={`Follow Laitstyles on ${platform.label}`}
  className="footer-social"
  key={platform.label}
  onClick={() => showStorefrontToast(`${platform.label} details are coming soon.`)}
  size="icon-lg"
  type="button"
  variant="ghost"
>
  <HugeiconsIcon aria-hidden="true" icon={platform.icon} size={20} strokeWidth={1.6} />
</Button>
```

Use existing actions exactly: new arrivals uses `{ collection: "new" }`, Women uses `{ category: "Women" }`, Men uses `{ category: "Men" }`, The edit uses `{ collection: "one-of-one" }`, Delivery & returns opens `deliveryModal`, Size & fit opens `measureModal`, Quality standards opens `conditionModal`, and Contact opens `supportModal`.

Build the approved content and semantic structure with `footer[data-site-footer]`, `nav[aria-label="Discover"]`, `nav[aria-label="Client services"]`, the canonical decorative mark, trust notes, location/currency, and plain copyright text. Do not fake privacy/terms links because routes do not exist.

- [ ] **Step 4: Wire the new module and remove old footer ownership**

Remove `SiteFooter`, `headingClass`, footer-specific `showStorefrontToast` usage, and social icon logic from `site-header.tsx`. In `site-chrome.tsx`, change the import boundary to:

```ts
import { type NavShop, SiteHeader } from "@/modules/storefront-shell/ui/site-header";
import { SiteFooter } from "@/modules/storefront-shell/ui/site-footer";
```

- [ ] **Step 5: Add paired footer theme roles and responsive layout**

In `.lst-storefront`, add stable light-role defaults:

```css
--footer-surface: #171916;
--footer-foreground: #f7f4ee;
--footer-muted: #c7c5bc;
--footer-border: rgba(247, 244, 238, 0.22);
--footer-accent: #d6e4a6;
--footer-accent-foreground: #171916;
```

Add `.dark .lst-storefront` roles:

```css
--footer-surface: #10120f;
--footer-foreground: #f3f0e8;
--footer-muted: #bbb9b0;
--footer-border: rgba(243, 240, 232, 0.2);
--footer-accent: #c0c99e;
--footer-accent-foreground: #10120f;
```

Replace `.footer-brand` and `.footer-links` legacy rules with `.site-footer`, `.footer-layout`, `.footer-statement`, `.footer-logo`, `.footer-nav`, `.footer-link`, `.footer-socials`, `.footer-social`, `.footer-trust`, and `.footer-meta` rules. Use CSS grid breakpoints at 860px and 600px, 44px minimum targets, `color: var(--footer-foreground)`/`var(--footer-muted)`, `background: var(--footer-surface)`, `border-color: var(--footer-border)`, and `outline-color: var(--footer-accent)`. Do not introduce raw pale RGBA text colors.

- [ ] **Step 6: Run focused Playwright and source checks**

Run:

```powershell
pnpm exec playwright test tests/e2e/storefront-footer.spec.ts --project=desktop-chromium
rg -n "BrandMark|brand-mark|rgba\(243,240,232" src/modules/storefront-shell src/features/storefront/shared/storefront.css
```

Expected: Playwright PASS; ripgrep returns no old brand implementation or footer pale-RGBA text styling.

- [ ] **Step 7: Commit the footer slice**

```powershell
git add -- src/modules/storefront-shell/ui/site-footer.tsx src/modules/storefront-shell/ui/site-header.tsx src/modules/storefront-shell/ui/site-chrome.tsx src/features/storefront/shared/storefront.css tests/e2e/storefront-footer.spec.ts
git commit -m "feat(storefront): redesign editorial footer"
```

---

### Task 3: Responsive, theme, contrast, and accessibility acceptance

**Files:**
- Modify: `tests/e2e/storefront-footer.spec.ts`
- Modify if a defect is found: `src/modules/storefront-shell/ui/site-footer.tsx`
- Modify if a defect is found: `src/features/storefront/shared/storefront.css`

**Interfaces:**
- Consumes: `expectNoRequiredAxeViolations(page, context)` from `tests/e2e/support/accessibility.ts`.
- Produces: repeatable Playwright evidence across the repository's desktop, tablet, and mobile projects plus explicit light/dark contrast checks.

- [ ] **Step 1: Add theme, overflow, focus, contrast, and axe assertions**

Append to `tests/e2e/storefront-footer.spec.ts`:

```ts
import { expectNoRequiredAxeViolations } from "./support/accessibility";

for (const theme of ["light", "dark"] as const) {
  test(`footer remains readable and accessible in ${theme} theme`, async ({ page }) => {
    await page.addInitScript((nextTheme) => {
      window.localStorage.setItem("laitstyle-theme", nextTheme);
    }, theme);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const footer = page.locator("footer[data-site-footer]");
    await footer.scrollIntoViewIfNeeded();
    await expect(footer).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);

    const contrast = await footer.evaluate((element) => {
      const parse = (value: string) => value.match(/[\d.]+/g)?.map(Number) ?? [];
      const rgb = (value: string) => {
        const [r, g, b] = parse(value);
        return [r, g, b].map((channel) => {
          const n = channel / 255;
          return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
        });
      };
      const luminance = (value: string) => {
        const [r, g, b] = rgb(value);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const style = getComputedStyle(element);
      const foreground = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
    });
    expect(contrast).toBeGreaterThanOrEqual(4.5);

    const firstLink = footer.getByRole("button").first();
    await firstLink.focus();
    await expect(firstLink).toBeFocused();
    await expectNoRequiredAxeViolations(page, { route: "/", surface: `footer-${theme}` });
  });
}
```

- [ ] **Step 2: Run all required Playwright viewport projects**

Run: `pnpm exec playwright test tests/e2e/storefront-footer.spec.ts`

Expected: PASS in `desktop-chromium` (1280x800), `tablet-chromium` (768x1024), and `mobile-chromium` (375x812).

- [ ] **Step 3: Run the wide-desktop Playwright acceptance**

Run:

```powershell
pnpm exec playwright test tests/e2e/storefront-footer.spec.ts --project=desktop-chromium --headed=false
```

Then use Playwright's page API in the test temporarily or `playwright-cli resize 1440 900` against the running app to capture `test-results/storefront-footer-wide-light.png` and `test-results/storefront-footer-wide-dark.png`. Keep only repeatable test code in the repository.

Expected: no overflow, no clipped social controls, and an editorial split with the statement visually dominant.

- [ ] **Step 4: Run non-browser source gates relevant to the changed code**

Run:

```powershell
pnpm biome src/modules/storefront-shell/ui/site-header.tsx src/modules/storefront-shell/ui/site-footer.tsx src/modules/storefront-shell/ui/site-chrome.tsx src/features/storefront/shared/storefront.css tests/e2e/storefront-footer.spec.ts
pnpm typecheck
```

Expected: both commands exit 0. These are source checks, not additional UI test tools.

- [ ] **Step 5: Commit final acceptance coverage**

```powershell
git add -- tests/e2e/storefront-footer.spec.ts src/modules/storefront-shell/ui/site-footer.tsx src/features/storefront/shared/storefront.css
git commit -m "test(storefront): cover footer accessibility and themes"
```

## Plan self-review

- Spec coverage: canonical logo, editorial fashion copy, social icons, semantic navigation, paired themes, contrast, focus, touch targets, responsive layouts, and Playwright/axe acceptance each map to an explicit task.
- Placeholder scan: no TODO, TBD, deferred implementation, or undefined interface remains.
- Type consistency: `SiteFooter`, `NavShop`, `socialPlatforms`, and `expectNoRequiredAxeViolations` use the same names and signatures throughout.
- Scope: changes remain within the storefront shell, shared storefront styling, and focused Playwright tests.
