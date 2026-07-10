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

async function runConnectedDesktopFlow(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "record sale and returns desktop");

  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Record sale" }).click();
  let dialog = page
    .getByRole("dialog")
    .filter({ hasText: "Record an offline sale" });
  await expectVisible(dialog, "Record Sale dialog did not open.");
  await expectVisible(
    dialog.getByText("Botanical Jeans", { exact: true }),
    "Default sellable product was not shown.",
  );

  await dialog.getByRole("button", { name: "Continue" }).click();
  await expectVisible(
    dialog.getByLabel("Sale channel"),
    "Record Sale did not advance to customer and channel details.",
  );
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expectVisible(
    dialog.getByLabel("Payment status"),
    "Record Sale did not advance to payment details.",
  );
  await dialog.getByRole("button", { name: "Continue" }).click();
  await expectVisible(
    dialog.getByText("Confirmed total", { exact: true }),
    "Record Sale review did not render.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase4-record-sale-review-1280x800.png"),
    fullPage: false,
  });
  await dialog.getByRole("button", { name: "Confirm sale" }).click();

  const success = page.getByText(
    /Offline sale LS-\d+ was recorded for Amara Okafor\./,
  );
  await expectVisible(success, "Record Sale success feedback did not appear.");
  await page.getByRole("link", { name: "Open order" }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Orders", exact: true }),
    "Record Sale did not open the generated order in Orders.",
  );
  await expectVisible(
    page.getByText(/7 orders in this view/),
    "The generated offline sale did not appear in Orders.",
  );

  await page.locator("aside").getByRole("link", { name: /Returns/ }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Returns", exact: true }),
    "Returns route did not open.",
  );
  await page.getByRole("button", { name: "Start return" }).first().click();
  dialog = page
    .getByRole("dialog")
    .filter({ hasText: "Start a customer return" });
  await expectVisible(dialog, "Create Return dialog did not open.");
  await expectVisible(
    dialog.getByText("Botanical Jeans", { exact: false }),
    "The new offline sale was not eligible for return.",
  );
  await dialog.getByLabel("Reason").fill("Fit did not work");
  await dialog.getByRole("button", { name: "Open return" }).click();

  let sheet = page.getByRole("dialog").first();
  await expectVisible(sheet, "Return detail did not open after creation.");
  await expectVisible(
    sheet.getByText("Requested", { exact: true }).first(),
    "New return did not start in Requested state.",
  );

  await sheet.getByRole("button", { name: "Approved" }).click();
  await expectVisible(
    sheet.getByText("Approved", { exact: true }).first(),
    "Return did not move to Approved.",
  );
  await sheet.getByRole("button", { name: "Received" }).click();
  await expectVisible(
    sheet.getByText("Received", { exact: true }).first(),
    "Return did not move to Received.",
  );
  await sheet.getByRole("button", { name: "Inspecting" }).click();
  await expectVisible(
    sheet.getByText("Inspecting", { exact: true }).first(),
    "Return did not move to Inspecting.",
  );
  await sheet.getByRole("button", { name: "Restocked" }).click();
  await expectVisible(
    sheet.getByText("Restocked", { exact: true }).first(),
    "Return did not move to Restocked.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase4-return-restocked-1280x800.png"),
    fullPage: false,
  });

  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden", timeout: 10000 });
  await page.locator("aside").getByRole("link", { name: /Inventory/ }).click();
  await page.getByLabel("Search inventory").fill("Botanical Jeans");
  const card = page
    .locator('[data-slot="card"]')
    .filter({ hasText: "Botanical Jeans" })
    .first();
  await expectVisible(card, "Botanical Jeans was not visible after the return.");
  await expectVisible(
    card.getByText("29", { exact: true }).first(),
    "Restocking did not restore Botanical Jeans to 29 available units.",
  );

  await context.close();
}

async function assertFullViewportDialog(page, dialog, label) {
  const box = await dialog.boundingBox();
  if (
    !box ||
    box.x > 1 ||
    box.y > 1 ||
    Math.abs(box.width - 375) > 2 ||
    Math.abs(box.height - 812) > 2
  ) {
    throw new Error(`${label} is not full viewport: ${JSON.stringify(box)}`);
  }
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "record sale and returns mobile");

  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Record sale" }).click();
  let dialog = page
    .getByRole("dialog")
    .filter({ hasText: "Record an offline sale" });
  await expectVisible(dialog, "Mobile Record Sale dialog did not open.");
  await assertFullViewportDialog(page, dialog, "Mobile Record Sale dialog");
  await page.screenshot({
    path: path.join(screenshotDir, "phase4-record-sale-375x812.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 10000 });

  await page.goto(`${baseUrl}/admin/returns`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Start return" }).first().click();
  dialog = page
    .getByRole("dialog")
    .filter({ hasText: "Start a customer return" });
  await expectVisible(dialog, "Mobile Create Return dialog did not open.");
  await assertFullViewportDialog(page, dialog, "Mobile Create Return dialog");
  await page.screenshot({
    path: path.join(screenshotDir, "phase4-create-return-375x812.png"),
    fullPage: false,
  });

  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runConnectedDesktopFlow(browser);
  await runMobile(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  throw new Error(failures.join("\n"));
}

console.log("Phase 4 Record Sale and Returns browser checks passed.");
