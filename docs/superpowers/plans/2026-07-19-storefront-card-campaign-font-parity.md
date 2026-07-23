# Storefront Card, Campaign, Font, and Handoff Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the approved storefront consistency corrections, migrate the entire application to the handoff's Manrope/Newsreader typography, and produce Playwright evidence that the product-detail page matches the attached HTML except for the explicitly approved data, theme-token, review-state, and shared-card differences.

**Architecture:** Keep recommendation selection in the existing pure presentation adapter, keep layout behavior inside the two shared product-card components and the existing PDP campaign/recommendation components, and keep typography centralized in the root `next/font` loader. Extend the existing Playwright suite with deterministic viewport assertions and screenshot capture; do not create page-local CSS or duplicate card implementations.

**Tech Stack:** Next.js 16.2 App Router, React 19.2, TypeScript 5, Tailwind CSS 4, `next/font/google`, Manrope, Newsreader, Vitest 4, Playwright 1.61, Biome, React Doctor.

## Global Constraints

- Treat `C:/Users/olaitan/OneDrive/Documents/Downloads/laitstyles-product-detail-hifi.html` as the PDP's visual and interaction source of truth.
- Preserve product data, data contracts, routing, cart, wishlist, holds, quick view, variant selection, review aggregates, empty states, and shared storefront conventions.
- Keep `src/features/storefront/shared/product-card.tsx` as the card used by both PDP recommendation regions; do not fork it.
- Use only existing semantic theme tokens and Tailwind utilities. Do not add hardcoded colours, inline presentation styles, page-local style blocks, CSS modules, or raw PDP selectors.
- Load fonts only through the central `next/font` module applied by the root layout. Do not introduce route-specific loaders or runtime Google Fonts requests.
- Keep the existing utility/mono semantic role but map it to Manrope; preserve tabular-number and tracking utilities.
- Preserve unrelated dirty work in Prisma, admin, package, asset, and migration files. Do not stage `.pnpm-store/`, `.claude/settings.local.json`, or any unrelated changes.
- Do not report literal pixel identity where canonical content, semantic token values, truthful review states, or the required shared ProductCard intentionally differ from the handoff.
- Do not claim an exact look-and-feel match until all three Playwright viewport comparisons have been captured and reviewed with no material unintentional deviations.

---

### Task 1: Cap Complete the look recommendations with a failing unit test

**Files:**
- Modify: `src/features/storefront/product/product-detail-presentation.test.ts`
- Modify: `src/features/storefront/product/product-detail-presentation.ts`

**Contract:** `selectProductRecommendations()` returns no more than two `styledWith` items while leaving the six-item `related` ranking and exclusion behavior unchanged.

- [ ] **Step 1: Strengthen the fixture so the old three-item cap is observable**

Add a third matching candidate to the existing recommendation test and assert that only the first two enter `styledWith`, while all eligible candidates remain available to `related`:

```ts
const thirdMatch = {
  ...product,
  id: "shirt-3",
  slug: "linen-shirt-3",
};

const result = selectProductRecommendations(
  [product, sameType, sameCollection, thirdMatch, unrelated],
  product,
);

expect(result.styledWith.map((candidate) => candidate.id)).toEqual([
  "shirt-2",
  "trouser-1",
]);
expect(result.related.map((candidate) => candidate.id)).toEqual([
  "shirt-2",
  "trouser-1",
  "shirt-3",
  "coat-1",
]);
```

- [ ] **Step 2: Run the focused test and record the required red state**

Run:

```text
pnpm exec vitest run src/features/storefront/product/product-detail-presentation.test.ts
```

Expected: failure because the current selector returns three `styledWith` products.

- [ ] **Step 3: Apply the smallest production change**

Change only the styled recommendation slice:

```ts
return {
  styledWith: matching.slice(0, 2),
  related: [
    ...matching,
    ...candidates.filter((candidate) => !matchingIds.has(candidate.id)),
  ].slice(0, 6),
};
```

- [ ] **Step 4: Re-run the focused test**

Run the command from Step 2.

Expected: all presentation-adapter tests pass.

- [ ] **Step 5: Commit the recommendation contract**

```text
git add src/features/storefront/product/product-detail-presentation.ts src/features/storefront/product/product-detail-presentation.test.ts
git commit -m "fix(storefront): cap styled recommendations at two"
```

---

### Task 2: Correct the PDP recommendation grid and campaign frame geometry

**Files:**
- Modify: `src/features/storefront/product/product-recommendations.tsx`
- Modify: `src/features/storefront/product/product-campaign.tsx`

**Contract:** Complete the look remains two columns at every supported width, and every campaign slide uses a consistent 4:5 mobile, 4:3 tablet, and 16:9 desktop frame.

- [ ] **Step 1: Lock Complete the look to two columns**

Replace the styled grid classes without changing the related-products grid:

```tsx
columns === "styled"
  ? "mt-5 grid grid-cols-2 gap-3"
  : "mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-6"
```

- [ ] **Step 2: Replace the fixed campaign minimum height with responsive aspect ratios**

Update the stage wrapper only:

```tsx
className="relative aspect-[4/5] min-w-0 overflow-hidden rounded-sm border border-current bg-surface-inverse sm:aspect-[4/3] lg:aspect-[16/9]"
```

Keep `next/image` with `fill` and `object-cover`; do not change carousel state, navigation, pausing, reduced-motion behavior, or captions.

- [ ] **Step 3: Run changed-file static checks**

Run:

```text
pnpm exec biome check src/features/storefront/product/product-recommendations.tsx src/features/storefront/product/product-campaign.tsx
```

Expected: exit code `0`.

- [ ] **Step 4: Commit the PDP geometry change**

```text
git add src/features/storefront/product/product-recommendations.tsx src/features/storefront/product/product-campaign.tsx
git commit -m "fix(storefront): normalize recommendation and campaign frames"
```

---

### Task 3: Align product-card actions across storefront grids

**Files:**
- Modify: `src/features/storefront/shared/product-card.tsx`
- Modify: `src/features/storefront/catalogue/product-card.tsx`

**Contract:** Both card implementations stretch to their grid row, clamp names to two lines, reserve a stable title region, and anchor the primary action to the bottom without changing behavior or labels.

- [ ] **Step 1: Make the interactive shared card a full-height flex column**

Use the existing article and information wrappers as the layout boundary:

```tsx
<article
  className={`group flex h-full min-w-0 flex-col reveal${visible ? " visible" : ""}`}
  ...
>
  ...
  <div className="flex flex-1 flex-col px-[2px] pt-[13px]">
```

- [ ] **Step 2: Clamp the shared-card title and reserve two-line height**

Preserve current type sizing while adding the shared title-height contract:

```tsx
<h3 className="m-0 line-clamp-2 min-h-[2.5em] max-w-[18rem] text-[0.96rem] font-[560] leading-[1.25] max-[600px]:text-[0.84rem]">
```

- [ ] **Step 3: Anchor availability and the Add to bag action**

Change the existing inventory/action wrapper to consume the remaining information height:

```tsx
<div className="mt-auto flex flex-col gap-[9px] pt-[11px]">
```

Do not change unavailable, hold, variant, save, or quick-view behavior.

- [ ] **Step 4: Apply the same height contract to the canonical catalogue card**

The canonical card already has a two-line title and a grid footer. Complete its outer and content height propagation:

```tsx
<article className="group/card h-full min-w-0">
  <Card className="grid h-full ... grid-rows-[1fr_auto] ...">
    <CardContent className="flex min-h-0 flex-col p-0">
```

Keep `CardFooter` as the bottom row and keep the existing `line-clamp-2 min-h-[34px]` title contract.

- [ ] **Step 5: Run changed-file static checks**

Run:

```text
pnpm exec biome check src/features/storefront/shared/product-card.tsx src/features/storefront/catalogue/product-card.tsx
```

Expected: exit code `0`.

- [ ] **Step 6: Commit the shared-card alignment**

```text
git add src/features/storefront/shared/product-card.tsx src/features/storefront/catalogue/product-card.tsx
git commit -m "fix(storefront): align product card actions"
```

---

### Task 4: Migrate the whole application to Manrope and Newsreader

**Files:**
- Create: `src/features/storefront/shared/storefront-fonts.test.ts`
- Modify: `src/features/storefront/shared/storefront-fonts.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Contract:** Root layout exposes Manrope as sans, heading, and utility/mono roles and Newsreader as serif/display; Geist and Instrument Serif are absent from the active loader.

- [ ] **Step 1: Add a font-loader contract test before changing production code**

Create a source-contract test that guards the central configuration rather than rendering Next's generated font objects:

```ts
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  fileURLToPath(new URL("./storefront-fonts.ts", import.meta.url)),
  "utf8",
);

describe("storefront font contract", () => {
  it("loads only the handoff font families", () => {
    expect(source).toContain("Manrope");
    expect(source).toContain("Newsreader");
    expect(source).not.toMatch(/Geist|Instrument_Serif/);
  });
});
```

- [ ] **Step 2: Run the font test and record the required red state**

Run:

```text
pnpm exec vitest run src/features/storefront/shared/storefront-fonts.test.ts
```

Expected: failure while the loader still imports Geist and Instrument Serif.

- [ ] **Step 3: Replace the central loader using the current Next.js 16 font contract**

Implement the two variable fonts:

```ts
import { Manrope, Newsreader } from "next/font/google";

const storefrontSans = Manrope({
  subsets: ["latin"],
  variable: "--font-storefront-sans",
});
const storefrontSerif = Newsreader({
  subsets: ["latin"],
  variable: "--font-storefront-serif",
});

export const storefrontFontClassName = `${storefrontSans.variable} ${storefrontSerif.variable}`;
```

Use the variable-font form recommended by `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`; do not duplicate the Manrope loader merely to create a second CSS variable.

- [ ] **Step 4: Alias the utility/mono role to Manrope through the existing semantic tokens**

In `src/app/globals.css`, define the role alias before the Tailwind font mappings:

```css
--font-storefront-mono: var(--font-storefront-sans);
--font-sans: var(--font-storefront-sans);
--font-serif: var(--font-storefront-serif);
--font-mono: var(--font-storefront-mono);
--font-heading: var(--font-storefront-sans);
```

Do not edit any colour token or add literal theme values.

- [ ] **Step 5: Update stale root-loader comments**

Describe the canonical set as Manrope/Newsreader and retain the current root `className` application. No layout restructuring is needed.

- [ ] **Step 6: Prove the font contract is green and stale imports are absent**

Run:

```text
pnpm exec vitest run src/features/storefront/shared/storefront-fonts.test.ts
rg -n "Geist|Geist_Mono|Instrument_Serif|Instrument Serif" src
```

Expected: test passes; `rg` returns no active source references.

- [ ] **Step 7: Run changed-file static checks**

Run:

```text
pnpm exec biome check src/features/storefront/shared/storefront-fonts.ts src/features/storefront/shared/storefront-fonts.test.ts src/app/layout.tsx
```

Expected: exit code `0`. CSS is validated later through the app build/PostCSS pipeline.

- [ ] **Step 8: Commit the application font migration**

```text
git add src/features/storefront/shared/storefront-fonts.ts src/features/storefront/shared/storefront-fonts.test.ts src/app/globals.css src/app/layout.tsx
git commit -m "feat(theme): adopt handoff typography globally"
```

---

### Task 5: Add deterministic Playwright layout and screenshot evidence

**Files:**
- Create: `tests/e2e/storefront-product-detail-parity.spec.ts`
- Reference only: `playwright.config.ts`
- Reference only: `C:/Users/olaitan/OneDrive/Documents/Downloads/laitstyles-product-detail-hifi.html`

**Contract:** The existing mobile, tablet, and desktop Chromium projects validate fonts, recommendation count, campaign ratios, card-action baselines, overflow, runtime errors, and produce full-page plus focused-section screenshots.

- [ ] **Step 1: Add deterministic page-settlement helpers**

The spec should:

```ts
async function settlePage(page: Page) {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "light" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images].map((image) =>
        image.complete ? Promise.resolve() : image.decode().catch(() => undefined),
      ),
    );
  });
  await page.waitForTimeout(150);
}
```

Collect `pageerror`, failed font/CSS/image requests, and unexpected console errors using the same pattern as `tests/e2e/admin-theme-buttons.spec.ts`.

- [ ] **Step 2: Resolve a real PDP without hardcoding fake data**

Navigate to `/products`, read the first canonical link whose path matches `/products/{slug}`, then navigate to that resolved path. Assert a non-error response and a visible product `<main>` before taking measurements.

- [ ] **Step 3: Add semantic hooks only if accessible selectors are insufficient**

Prefer existing section headings and accessible labels. If geometry cannot be selected robustly, add minimal `data-testid` attributes to the campaign stage and recommendation grids in their existing components; do not add wrapper markup or styling for the test.

- [ ] **Step 4: Assert the approved responsive contracts**

For every configured project:

- Complete the look has at most two `[data-card]` articles and, when two exist, their grid positions form two columns.
- Campaign stage measured width/height is within 2% of 4:5 at 375px, 4:3 at 768px, and 16:9 at 1280px.
- Product names expose a computed two-line clamp.
- Visible primary actions within each card-grid row have bottom edges aligned within 2px.
- `getComputedStyle(document.body).fontFamily` contains `Manrope` and a `.font-serif` heading resolves to `Newsreader`.
- The document has no horizontal page overflow.
- Runtime/console/network error collections are empty after known external image-provider noise is handled explicitly, never silently ignored.

- [ ] **Step 5: Capture implementation evidence**

Write full-page and focused screenshots to the existing ignored Playwright output directory:

```ts
await page.screenshot({
  path: `test-results/pdp-implementation-${test.info().project.name}-full.png`,
  fullPage: true,
});
```

Also capture hero, product-information/Complete-the-look, campaign, reviews, service strip, and final recommendations using locator screenshots with stable names.

- [ ] **Step 6: Capture the attached reference at identical viewport dimensions**

In a separate browser page, load the reference HTML using `readFileSync()` plus `page.setContent()`, wait for its Tailwind/font/image dependencies and `document.fonts.ready`, emulate reduced motion/light colour scheme, and capture corresponding full-page and focused-section screenshots. If the reference's external Tailwind or image dependencies cannot load, serve the file through a local static HTTP endpoint and record the blocker rather than claiming parity.

- [ ] **Step 7: Run the acceptance spec in all three projects**

Start the repository dev server in a separate terminal, then run:

```text
pnpm exec playwright test tests/e2e/storefront-product-detail-parity.spec.ts --project=mobile-chromium --project=tablet-chromium --project=desktop-chromium
```

Expected: all geometry, typography, card alignment, overflow, and runtime assertions pass; reference and implementation screenshots exist for all required viewports.

- [ ] **Step 8: Commit the acceptance coverage**

Stage only the test and any minimal test hooks actually required:

```text
git add tests/e2e/storefront-product-detail-parity.spec.ts src/features/storefront/product/product-campaign.tsx src/features/storefront/product/product-recommendations.tsx
git commit -m "test(storefront): cover product detail handoff parity"
```

Omit unchanged component paths from `git add` when no test hooks were needed.

---

### Task 6: Perform the visual comparison and correct material deviations

**Files:**
- Modify only as evidence requires: `src/features/storefront/product/*.tsx`
- Modify only as evidence requires: `src/features/storefront/shared/product-card.tsx`
- Modify only as evidence requires: `tests/e2e/storefront-product-detail-parity.spec.ts`
- Do not modify: semantic colour tokens or unrelated application surfaces

**Contract:** The implementation follows the handoff's section order, hierarchy, widths, spacing rhythm, typography, image framing, responsive transitions, controls, borders, radii, and sticky presentation, subject only to documented intentional exceptions.

- [ ] **Step 1: Review each paired full-page screenshot at original resolution**

At 375x812, 768x1024, and 1280x800, compare:

- section order and vertical rhythm;
- hero/gallery and information-column proportions;
- type family, size, line height, weight, and wrapping;
- Complete the look placement and two-card treatment;
- campaign frame/copy/control placement;
- review aggregate/empty-state hierarchy and unavailable Write a review message;
- service strip and final recommendations;
- sticky mobile/desktop purchase treatment.

- [ ] **Step 2: Review focused section pairs**

Inspect hero, information/recommendations, campaign, reviews, service strip, and final recommendations independently so full-page scaling does not conceal local deviations.

- [ ] **Step 3: Separate intentional from unintentional differences**

Record as intentional only:

- real repository product content and imagery;
- canonical semantic theme-token values;
- truthful aggregate/empty review state and unavailable submission disclosure;
- shared ProductCard presentation in both recommendation areas.

Any other material deviation blocks completion.

- [ ] **Step 4: Iterate on unintentional deviations without expanding scope**

Use existing Tailwind utilities and semantic tokens in the smallest owning component. Do not introduce raw CSS, hardcoded colours, duplicated cards, or data changes. Re-run the three-project Playwright spec after every correction.

- [ ] **Step 5: Commit evidence-driven corrections, if any**

Inspect `git diff --name-only`, stage each evidence-driven storefront or parity-test path explicitly, and commit them with:

```text
git commit -m "fix(storefront): close product detail parity gaps"
```

Skip this commit if no code correction was necessary.

---

### Task 7: Run completion gates and prepare an evidence-backed handoff

**Files:**
- Review: all commits and changed files from Tasks 1-6
- Do not modify unrelated dirty files to make repository-wide checks appear green

- [ ] **Step 1: Run focused unit and formatting checks**

```text
pnpm exec vitest run src/features/storefront/product/product-detail-presentation.test.ts src/features/storefront/shared/storefront-fonts.test.ts
pnpm exec biome check src/features/storefront/product/product-detail-presentation.ts src/features/storefront/product/product-detail-presentation.test.ts src/features/storefront/product/product-recommendations.tsx src/features/storefront/product/product-campaign.tsx src/features/storefront/shared/product-card.tsx src/features/storefront/catalogue/product-card.tsx src/features/storefront/shared/storefront-fonts.ts src/features/storefront/shared/storefront-fonts.test.ts src/app/layout.tsx tests/e2e/storefront-product-detail-parity.spec.ts
```

Expected: exit code `0` for both commands.

- [ ] **Step 2: Run repository completion checks**

```text
pnpm lint
pnpm exec tsc --noEmit --pretty false --incremental false
pnpm exec vitest run --passWithNoTests
pnpm build
pnpm dlx react-doctor@latest . --verbose --diff
```

Expected: changed-scope checks pass. If a repository-wide check is blocked by pre-existing unrelated work, report the exact file/error and independently prove the changed scope; do not edit unrelated files without authorization.

- [ ] **Step 3: Re-run the Playwright parity suite**

```text
pnpm exec playwright test tests/e2e/storefront-product-detail-parity.spec.ts --project=mobile-chromium --project=tablet-chromium --project=desktop-chromium
```

Expected: all three viewports pass with fresh paired screenshot evidence and no console/network/font/CSS/hydration failures.

- [ ] **Step 4: Review the final diff for scope and styling discipline**

Run:

```text
git diff --check
git status --short
git diff --stat HEAD~5..HEAD
```

Confirm no raw colour, inline-style, page-local CSS, product-data, commerce-logic, route, or unrelated dirty-file changes entered the implementation.

- [ ] **Step 5: Report the result precisely**

The handoff must include:

- the exact application font mapping (Manrope sans/heading/utility and Newsreader serif/display);
- confirmation of two Complete the look cards, responsive campaign ratios, and aligned card actions;
- Playwright projects and viewport results;
- paths to reference and implementation screenshots;
- intentional differences versus any unresolved unintentional differences;
- repository-wide blockers, if any, attributed to their pre-existing files;
- an exact-match statement only if the reviewed evidence supports it.
