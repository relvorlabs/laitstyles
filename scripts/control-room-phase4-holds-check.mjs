import { chromium } from "playwright";
import path from "node:path";

const baseUrl =
  process.env.CONTROL_ROOM_BASE_URL || "http://127.0.0.1:3000";
const screenshotDir =
  process.env.CONTROL_ROOM_SCREENSHOT_DIR || "control-room-screenshots";
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

async function closeSheet(page) {
  const sheet = page.getByRole("dialog").first();
  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden", timeout: 10000 });
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "holds desktop");

  await page.goto(`${baseUrl}/admin/holds`, { waitUntil: "networkidle" });
  await expectVisible(
    page.getByRole("heading", { name: "Holds", exact: true }),
    "Holds heading did not render.",
  );
  await expectVisible(
    page.getByText(/3 holds in this view/),
    "The full Holds result count was not visible.",
  );

  await page.getByLabel("Search holds").fill("roqeebah sage");
  await expectVisible(
    page.getByText(/1 hold in this view/),
    "Hold search did not reduce the result set.",
  );
  await expectVisible(
    page.getByRole("button", { name: "Open hold-sage" }),
    "Expected searched hold was not visible.",
  );
  await page.getByLabel("Search holds").fill("");

  await page.getByRole("button", { name: "Open hold-botanical" }).click();
  let sheet = page.getByRole("dialog").first();
  await expectVisible(sheet, "Hold detail did not open.");
  await sheet.getByRole("button", { name: "+15 min" }).click();
  await expectVisible(
    page.getByText("Amara Okafor's hold was extended by 15 minutes."),
    "Hold extension feedback did not appear.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase4-holds-extended-1280x800.png"),
    fullPage: false,
  });
  await closeSheet(page);

  await page.getByRole("button", { name: "Open hold-sage" }).click();
  sheet = page.getByRole("dialog").first();
  await sheet.getByRole("button", { name: "Release hold" }).click();
  const confirmation = page.getByRole("alertdialog");
  await expectVisible(
    confirmation,
    "Releasing a hold did not require confirmation.",
  );
  await confirmation
    .getByRole("button", { name: "Keep hold active" })
    .click();
  await confirmation.waitFor({ state: "hidden", timeout: 10000 });
  await expectVisible(
    sheet.getByRole("button", { name: "Release hold" }),
    "Dismissing release confirmation changed the hold unexpectedly.",
  );
  await sheet.getByRole("button", { name: "Release hold" }).click();
  await confirmation.getByRole("button", { name: "Release stock" }).click();
  await expectVisible(
    page.getByText(/Roqeebah Bello's hold was released/),
    "Confirmed hold release feedback did not appear.",
  );
  await expectVisible(
    sheet.getByText("Released", { exact: true }).first(),
    "Released hold state did not update in the detail workspace.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase4-holds-released-1280x800.png"),
    fullPage: false,
  });
  await closeSheet(page);

  await page.getByRole("button", { name: "Open hold-tank" }).click();
  sheet = page.getByRole("dialog").first();
  await sheet.getByRole("button", { name: "Convert to order" }).click();
  const conversionDialog = page
    .getByRole("dialog")
    .filter({ hasText: "Convert hold to order" });
  await expectVisible(
    conversionDialog,
    "Hold conversion dialog did not open.",
  );
  await conversionDialog.getByRole("button", { name: "Create order" }).click();
  await expectVisible(
    page.getByText(/Chioma Eze's hold was converted to order/),
    "Hold conversion success feedback did not appear.",
  );
  await expectVisible(
    sheet.getByText("Converted", { exact: true }).first(),
    "Converted hold state did not update in the detail workspace.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase4-holds-converted-1280x800.png"),
    fullPage: false,
  });
  await closeSheet(page);

  await page.locator("aside").getByRole("link", { name: /Orders/ }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Orders", exact: true }),
    "Orders did not open after hold conversion.",
  );
  await expectVisible(
    page.getByText(/7 orders in this view/),
    "Converted hold did not appear in the shared Orders workspace.",
  );

  await context.close();
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "holds mobile");

  await page.goto(`${baseUrl}/admin/holds`, { waitUntil: "networkidle" });
  await expectVisible(
    page.getByRole("heading", { name: "Holds", exact: true }),
    "Mobile Holds heading did not render.",
  );
  await page.getByRole("button", { name: "Open hold-botanical" }).click();
  const sheet = page.getByRole("dialog").first();
  await expectVisible(sheet, "Mobile hold detail did not open.");
  await expectVisible(
    sheet.getByRole("button", { name: "Convert to order" }),
    "Mobile hold actions were not available.",
  );

  const box = await sheet.boundingBox();
  if (
    !box ||
    box.x > 1 ||
    box.y > 1 ||
    Math.abs(box.width - 375) > 2 ||
    Math.abs(box.height - 812) > 2
  ) {
    throw new Error(`Mobile hold detail is not full viewport: ${JSON.stringify(box)}`);
  }

  await page.screenshot({
    path: path.join(screenshotDir, "phase4-holds-detail-375x812.png"),
    fullPage: false,
  });

  await context.close();
}

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

console.log("Phase 4 Holds browser interaction checks passed.");
