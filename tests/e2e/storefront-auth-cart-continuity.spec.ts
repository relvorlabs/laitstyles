import { expect, test, type Locator, type Page } from "playwright/test";

const STATE_KEY = "laitstyles-storefront:v3:client-state";

test("a new auth callback tab restores the guest cart from the local fallback", async ({
  page,
  context,
}) => {
  const card = await firstAddableCard(page);
  const productName = (await card.locator("h3").innerText()).trim();
  await card.locator("button").last().click();

  await expect.poll(async () => (await snapshot(page, "sessionStorage")).cart.length).toBeGreaterThan(0);
  const original = await snapshot(page, "sessionStorage");
  expect(await snapshot(page, "localStorage")).toEqual(original);

  const callbackTab = await context.newPage();
  await callbackTab.goto("/cart", { waitUntil: "domcontentloaded" });

  await expect(callbackTab.getByRole("heading", { name: "Your bag" })).toBeVisible();
  await expect(callbackTab.getByText(productName, { exact: true })).toBeVisible();
  await expect.poll(async () => snapshot(callbackTab, "sessionStorage")).toEqual(original);
});

async function firstAddableCard(page: Page): Promise<Locator> {
  await page.goto("/products", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.locator("[data-card]").count()).toBeGreaterThan(0);

  const cardId = await page.locator("[data-card]").evaluateAll((cards) => {
    const card = cards.find((candidate) => {
      const buttons = [...candidate.querySelectorAll("button")];
      const action = buttons.at(-1);
      const label = action?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return Boolean(action && !action.disabled && !/Select size|Sold|Reserved/i.test(label));
    });
    return card?.getAttribute("data-card") ?? null;
  });

  expect(cardId, "the seeded catalogue must expose an addable non-variant product").toBeTruthy();
  return page.locator(`[data-card="${cardId}"]`);
}

async function snapshot(page: Page, storageName: "sessionStorage" | "localStorage") {
  return page.evaluate(
    ({ key, storage }) => {
      const serialized = window[storage].getItem(key);
      if (!serialized) throw new Error(`Missing ${storage}:${key}`);
      return JSON.parse(serialized) as {
        version: number;
        cart: Array<{ productId: string; variantId: string | null; quantity: number }>;
        saved: string[];
        holds: Array<{ productId: string; expiresAt: number }>;
      };
    },
    { key: STATE_KEY, storage: storageName },
  );
}
