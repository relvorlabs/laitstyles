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

async function expectInsideViewport(locator, message) {
  const box = await locator.boundingBox();
  if (!box) throw new Error(message);
  const viewport = locator.page().viewportSize();
  if (
    !viewport ||
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.width > viewport.width + 1 ||
    box.y + box.height > viewport.height + 1
  ) {
    throw new Error(`${message}: ${JSON.stringify({ box, viewport })}`);
  }
}

async function recordOfflineSale(page) {
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Record sale" }).click();
  const dialog = page
    .getByRole("dialog")
    .filter({ hasText: "Record an offline sale" });
  await expectVisible(dialog, "Record Sale dialog did not open.");
  await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByRole("button", { name: "Continue" }).click();
  await dialog.getByRole("button", { name: "Confirm sale" }).click();
  await expectVisible(
    page.getByText(/Offline sale LS-\d+ was recorded for Amara Okafor\./),
    "Record Sale did not create the connected Amara purchase.",
  );
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "customers desktop");

  await recordOfflineSale(page);
  await page.locator("aside").getByRole("link", { name: /Customers/ }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Customers", exact: true }),
    "Customers heading did not render.",
  );
  await expectVisible(
    page.getByText(/4 customers in this view/),
    "The full customer result count was not visible.",
  );

  await page.getByLabel("Search customers").fill("Amara botanical");
  await expectVisible(
    page.getByText(/1 customer in this view/),
    "Customer search did not reduce the relationship list.",
  );

  await page
    .locator("table")
    .getByRole("button", { name: "Open Amara Okafor" })
    .click();
  let sheet = page.getByRole("dialog").first();
  await expectVisible(sheet, "Customer detail did not open.");
  await expectVisible(
    sheet.getByText("₦100,500", { exact: true }).first(),
    "Connected offline sale did not update Amara's relationship value.",
  );

  await sheet.getByRole("tab", { name: "Timeline" }).click();
  await expectVisible(
    sheet.getByText(/Offline sale LS-\d+/),
    "Offline sale did not appear in the customer timeline.",
  );

  await sheet.getByRole("tab", { name: "Overview" }).click();
  await sheet.getByRole("button", { name: "Save internal note" }).click();
  await expectVisible(
    sheet.getByText("Enter a useful internal note before saving."),
    "Empty note validation was not visible inside the customer sheet.",
  );
  await sheet
    .getByLabel("Add internal note")
    .fill("Confirm the longer inseam before the next denim order.");
  await sheet.getByRole("button", { name: "Save internal note" }).click();
  const success = sheet.getByText("Internal note saved", { exact: true });
  await expectVisible(
    success,
    "Customer note success feedback was not visible inside the active sheet.",
  );
  await expectInsideViewport(
    success,
    "Customer note success feedback was outside the visible viewport",
  );
  await expectVisible(
    sheet.getByText("Confirm the longer inseam before the next denim order."),
    "Saved customer note did not appear in the open relationship workspace.",
  );

  await page.screenshot({
    path: path.join(screenshotDir, "phase5-customer-detail-1280x800.png"),
    fullPage: false,
  });

  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden", timeout: 10000 });
  await page.getByLabel("Search customers").fill("");
  await page.getByRole("button", { name: /Needs attention/ }).click();
  await expectVisible(
    page.getByText(/2 customers in this view/),
    "Needs-attention view did not show the connected Amara and Nneka contexts.",
  );

  await context.close();
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "customers mobile");

  await page.goto(
    `${baseUrl}/admin/customers?customer=customer-amara`,
    { waitUntil: "networkidle" },
  );
  const sheet = page.getByRole("dialog").first();
  await expectVisible(sheet, "Mobile customer detail did not open.");
  await expectVisible(
    sheet.getByRole("tab", { name: "Delivery" }),
    "Mobile customer detail tabs were not available.",
  );

  const box = await sheet.boundingBox();
  if (
    !box ||
    box.x > 1 ||
    box.y > 1 ||
    Math.abs(box.width - 375) > 2 ||
    Math.abs(box.height - 812) > 2
  ) {
    throw new Error(`Mobile customer detail is not full viewport: ${JSON.stringify(box)}`);
  }

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (pageOverflow) {
    throw new Error("Mobile Customers route has horizontal page overflow.");
  }

  await page.screenshot({
    path: path.join(screenshotDir, "phase5-customer-detail-375x812.png"),
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

console.log("Phase 5 Customers browser checks passed.");