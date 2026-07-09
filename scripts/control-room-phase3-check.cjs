const { chromium } = require("playwright");
const path = require("node:path");

const baseUrl = process.env.CONTROL_ROOM_BASE_URL || "http://127.0.0.1:3000";
const screenshotDir = process.env.CONTROL_ROOM_SCREENSHOT_DIR || "control-room-screenshots";
const failures = [];

function recordPageFailures(page, label) {
  page.on("pageerror", (error) => {
    failures.push(`${label} page error: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      failures.push(`${label} console error: ${message.text()}`);
    }
  });
}

async function expectVisible(locator, message) {
  await locator.waitFor({ state: "visible", timeout: 10000 }).catch(() => {
    throw new Error(message);
  });
}

async function runDesktop(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  recordPageFailures(page, "desktop");

  await page.goto(`${baseUrl}/admin/inventory`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add product" }).click();
  const dialog = page.getByRole("dialog");
  await expectVisible(dialog, "Add product dialog did not open on desktop.");
  await page.screenshot({
    path: path.join(screenshotDir, "phase3-editor-type-1280x800.png"),
    fullPage: false,
  });

  await page.getByRole("button", { name: /Stocked product/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  const productName = "Phase Three Browser Draft";
  await page.getByLabel("Product name").fill(productName);
  await page.getByLabel("Internal reference").fill("LS-P3-BROWSER");
  await page.getByLabel("Category").fill("Shirts");
  await page.getByLabel("Brand or label").fill("Laitstyle Studio");
  await page
    .getByLabel("Product description")
    .fill("A browser-verified stocked shirt draft created by the Phase 3 acceptance flow.");

  await page.screenshot({
    path: path.join(screenshotDir, "phase3-editor-identity-1280x800.png"),
    fullPage: false,
  });

  await page.keyboard.press("Escape");
  const discardDialog = page.getByRole("alertdialog");
  await expectVisible(discardDialog, "Dirty-close confirmation did not appear.");
  await discardDialog.getByRole("button", { name: "Keep editing" }).click();
  await expectVisible(dialog, "Product editor did not remain open after Keep editing.");

  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  const preservedName = await page.getByLabel("Product name").inputValue();
  if (preservedName !== productName) {
    throw new Error("Back/Next did not preserve the product name.");
  }

  await page.getByRole("button", { name: "Save draft" }).click();
  await dialog.waitFor({ state: "hidden", timeout: 10000 });
  await expectVisible(
    page.getByText(`${productName} saved as a draft.`),
    "Draft success feedback did not appear.",
  );

  await page.getByLabel("Search Inventory").fill(productName);
  await expectVisible(
    page.getByText(productName, { exact: true }).first(),
    "Saved draft did not appear in the live Inventory result set.",
  );

  await page.goto(`${baseUrl}/admin/inventory?view=intake`, {
    waitUntil: "networkidle",
  });
  await expectVisible(page.getByRole("heading", { name: "Intake queue" }), "Intake queue did not render.");
  await expectVisible(page.getByText("Ivory Wrap Skirt", { exact: true }), "Expected Intake product was missing.");
  await page.screenshot({
    path: path.join(screenshotDir, "phase3-intake-before-1280x800.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /Next stage/ }).click();
  await expectVisible(
    page.getByText("pricing review", { exact: true }).first(),
    "Intake did not move to the adjacent pricing-review stage.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase3-intake-after-1280x800.png"),
    fullPage: true,
  });

  await page.getByRole("button", { name: /Continue product/ }).click();
  await expectVisible(page.getByRole("dialog"), "Existing Intake product did not open in the editor.");
  await expectVisible(
    page.getByRole("heading", { name: "Ivory Wrap Skirt" }),
    "The editor did not retain the Intake product identity.",
  );

  await context.close();
}

async function runMobile(browser) {
  const context = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  recordPageFailures(page, "mobile");

  await page.goto(`${baseUrl}/admin/inventory`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add product" }).click();
  const dialog = page.getByRole("dialog");
  await expectVisible(dialog, "Add product dialog did not open on mobile.");

  const box = await dialog.boundingBox();
  if (!box || box.x > 1 || box.y > 1 || Math.abs(box.width - 375) > 2 || Math.abs(box.height - 812) > 2) {
    throw new Error(`Mobile editor is not full viewport: ${JSON.stringify(box)}`);
  }

  await page.screenshot({
    path: path.join(screenshotDir, "phase3-editor-type-375x812.png"),
    fullPage: false,
  });
  await page.getByRole("button", { name: /Product with variants/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.screenshot({
    path: path.join(screenshotDir, "phase3-editor-identity-375x812.png"),
    fullPage: false,
  });

  await context.close();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    await runDesktop(browser);
    await runMobile(browser);
  } finally {
    await browser.close();
  }

  if (failures.length) {
    throw new Error(failures.join("\n"));
  }

  console.log("Phase 3 browser interaction checks passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
