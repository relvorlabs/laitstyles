import { existsSync, readFileSync } from "node:fs";

import { expect, test, type Locator, type Page, type TestInfo } from "playwright/test";

const handoffPath =
  process.env.HANDOFF_HTML_PATH ??
  "C:/Users/olaitan/OneDrive/Documents/Downloads/laitstyles-product-detail-hifi.html";

const expectedCampaignRatios: Record<string, number> = {
  "mobile-chromium": 4 / 5,
  "tablet-chromium": 4 / 3,
  "desktop-chromium": 16 / 9,
};

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const value = message.text();
    if (/favicon/i.test(value)) return;
    errors.push(`console: ${value}`);
  });
  page.on("requestfailed", (request) => {
    if (!["document", "stylesheet", "font", "image", "script"].includes(request.resourceType())) {
      return;
    }
    errors.push(
      `requestfailed: ${request.resourceType()} ${request.url()} ${request.failure()?.errorText ?? "unknown"}`,
    );
  });
  return errors;
}

async function settlePage(page: Page) {
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

async function resolveProductPath(page: Page) {
  const response = await page.goto("/products", { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect
    .poll(() => page.locator('a[href^="/products/"]').count())
    .toBeGreaterThan(0);
  const href = await page
    .locator('a[href^="/products/"]')
    .evaluateAll((links) =>
      links
        .map((link) => link.getAttribute("href"))
        .find((value): value is string => Boolean(value?.match(/^\/products\/[^/?#]+$/))),
    );
  expect(href, "the catalogue must expose a canonical product-detail link").toBeTruthy();
  return href as string;
}

async function assertAlignedCardActions(section: Locator) {
  const cards = section.locator("[data-card]");
  if ((await cards.count()) === 0) return;
  await cards.first().scrollIntoViewIfNeeded();
  const geometry = await cards.evaluateAll((items) =>
    items.map((item) => {
      const card = item as HTMLElement;
      const action = [...card.querySelectorAll("button")].at(-1);
      const title = card.querySelector("h3");
      const cardRect = card.getBoundingClientRect();
      const actionRect = action?.getBoundingClientRect();
      return {
        rowTop: Math.round(cardRect.top),
        actionBottom: actionRect?.bottom ?? 0,
        lineClamp: title ? getComputedStyle(title).webkitLineClamp : "",
      };
    }),
  );

  for (const card of geometry) expect(card.lineClamp).toBe("2");

  const rows = geometry.reduce<Map<number, typeof geometry>>((groups, item) => {
    const row = groups.get(item.rowTop) ?? [];
    row.push(item);
    groups.set(item.rowTop, row);
    return groups;
  }, new Map());
  for (const row of rows.values()) {
    if (row.length < 2) continue;
    const bottoms = row.map((item) => item.actionBottom);
    expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThanOrEqual(2);
  }
}

async function capture(page: Page, locator: Locator | null, name: string, testInfo: TestInfo) {
  const path = testInfo.outputPath(`${name}.png`);
  if (locator) await locator.screenshot({ path, animations: "disabled" });
  else await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

test("PDP obeys recommendation, campaign, card, font, and runtime contracts", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  const productPath = await resolveProductPath(page);
  const runtimeErrors = collectRuntimeErrors(page);
  const response = await page.goto(productPath, { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await expect(page.locator("main#main")).toBeVisible();
  await settlePage(page);

  const styledSection = page.locator('section[aria-labelledby="styled-recommendations-title"]');
  const styledCards = styledSection.locator("[data-card]");
  expect(await styledCards.count()).toBeLessThanOrEqual(2);
  if ((await styledCards.count()) === 2) {
    const positions = await styledCards.evaluateAll((cards) => {
      const grid = cards[0].parentElement;
      return {
        columns: grid
          ? getComputedStyle(grid).gridTemplateColumns.split(" ").filter(Boolean).length
          : 0,
        cards: cards.map((card) => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, top: rect.top };
        }),
      };
    });
    expect(positions.columns).toBe(2);
    const [firstCard, secondCard] = positions.cards;
    if (!firstCard || !secondCard) throw new Error("Expected two styled recommendation cards");
    expect(Math.abs(firstCard.top - secondCard.top)).toBeLessThanOrEqual(2);
    expect(secondCard.left).toBeGreaterThan(firstCard.left);
  }

  const campaignStage = page.getByTestId("campaign-stage");
  const campaignBox = await campaignStage.boundingBox();
  expect(campaignBox).not.toBeNull();
  const expectedRatio = expectedCampaignRatios[test.info().project.name];
  expect(expectedRatio, `missing ratio for ${test.info().project.name}`).toBeTruthy();
  const actualRatio = (campaignBox?.width ?? 0) / (campaignBox?.height ?? 1);
  expect(Math.abs(actualRatio - expectedRatio) / expectedRatio).toBeLessThanOrEqual(0.02);

  await assertAlignedCardActions(styledSection);
  await assertAlignedCardActions(
    page.locator('section[aria-labelledby="related-recommendations-title"]'),
  );

  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    display: getComputedStyle(document.querySelector(".font-serif") ?? document.body).fontFamily,
    manropeLoaded: [...document.fonts].some(
      (face) => /Manrope/i.test(face.family) && face.status === "loaded",
    ),
    newsreaderLoaded: [...document.fonts].some(
      (face) => /Newsreader/i.test(face.family) && face.status === "loaded",
    ),
    brokenImages: [...document.images]
      .filter((image) => image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
  }));
  expect(fonts.body).toMatch(/Manrope/i);
  expect(fonts.display).toMatch(/Newsreader/i);
  expect(fonts.manropeLoaded).toBe(true);
  expect(fonts.newsreaderLoaded).toBe(true);
  expect(fonts.brokenImages).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    ),
  ).toBe(true);
  expect(runtimeErrors).toEqual([]);
});

test("captures paired handoff and implementation evidence", async ({ page }, testInfo) => {
  expect(existsSync(handoffPath), `Missing handoff HTML at ${handoffPath}`).toBe(true);
  await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  const productPath = await resolveProductPath(page);
  await page.goto(productPath, { waitUntil: "domcontentloaded" });
  await settlePage(page);

  const reference = await page.context().newPage();
  const referenceErrors = collectRuntimeErrors(reference);
  await reference.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
  await reference.setContent(readFileSync(handoffPath, "utf8"), {
    waitUntil: "domcontentloaded",
  });
  await reference.waitForLoadState("networkidle", { timeout: 30_000 });
  await reference.addStyleTag({
    content:
      "*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important}.reveal{opacity:1!important;transform:none!important}",
  });
  await settlePage(reference);

  await expect(reference.locator("body")).toHaveCSS("font-family", /Manrope/i);
  await expect(reference.locator("main#main")).toBeVisible();
  const referenceAssets = await reference.evaluate(() => ({
    manropeLoaded: [...document.fonts].some(
      (face) => /Manrope/i.test(face.family) && face.status === "loaded",
    ),
    newsreaderLoaded: [...document.fonts].some(
      (face) => /Newsreader/i.test(face.family) && face.status === "loaded",
    ),
    brokenImages: [...document.images]
      .filter((image) => image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src),
  }));
  expect(referenceAssets.manropeLoaded).toBe(true);
  expect(referenceAssets.newsreaderLoaded).toBe(true);
  expect(referenceAssets.brokenImages).toEqual([]);
  expect(referenceErrors).toEqual([]);

  await capture(page, null, "implementation-full", testInfo);
  await capture(reference, null, "reference-full", testInfo);

  const sectionPairs = [
    {
      name: "hero",
      implementation: page.locator("main#main > section").first(),
      handoff: reference.locator("main#main > section").first(),
    },
    {
      name: "information-complete-look",
      implementation: page.locator("main#main > section").nth(1),
      handoff: reference.locator("main#main > section").nth(1),
    },
    {
      name: "campaign",
      implementation: page.locator("#campaign"),
      handoff: reference.locator("#fashionShowcase"),
    },
    {
      name: "reviews",
      implementation: page.locator("#reviews"),
      handoff: reference.locator("#reviewsSection"),
    },
    {
      name: "service-strip",
      implementation: page.getByRole("region", { name: "Service benefits" }),
      handoff: reference.getByRole("region", { name: "Service benefits" }),
    },
    {
      name: "final-recommendations",
      implementation: page
        .getByRole("heading", { name: "You may also like" })
        .locator("xpath=ancestor::section[1]"),
      handoff: reference
        .getByRole("heading", { name: "You may also like" })
        .locator("xpath=ancestor::section[1]"),
    },
  ];

  for (const pair of sectionPairs) {
    await expect(pair.implementation).toBeVisible();
    await expect(pair.handoff).toBeVisible();
    await capture(page, pair.implementation, `implementation-${pair.name}`, testInfo);
    await capture(reference, pair.handoff, `reference-${pair.name}`, testInfo);
  }

  expect(referenceErrors).toEqual([]);
  await reference.close();
});
