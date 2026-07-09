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

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "orders desktop");

  await page.goto(`${baseUrl}/admin/orders`, { waitUntil: "networkidle" });
  await expectVisible(
    page.getByRole("heading", { name: "Orders", exact: true }),
    "Orders heading did not render.",
  );
  await expectVisible(
    page.getByText(/6 orders in this view/),
    "The full Orders result count was not visible.",
  );

  await page.getByLabel("Search orders").fill("sage tomi");
  await expectVisible(
    page.getByText(/1 order in this view/),
    "Order search did not reduce the result set.",
  );
  await expectVisible(
    page.getByRole("button", { name: "Open LS-20480" }),
    "Expected searched order was not visible.",
  );
  await page.getByLabel("Search orders").fill("");

  await page.getByRole("button", { name: "Open LS-20480" }).click();
  const sheet = page.getByRole("dialog");
  await expectVisible(sheet, "Order detail sheet did not open.");
  await expectVisible(
    sheet.getByRole("heading", { name: "LS-20480" }),
    "The selected order identity was not preserved.",
  );
  await sheet.getByRole("button", { name: "Preparing" }).click();
  await expectVisible(
    page.getByText("LS-20480 moved to preparing."),
    "Successful order transition feedback did not appear.",
  );
  await expectVisible(
    sheet.getByText("Preparing", { exact: true }).first(),
    "Order detail did not update after the transition.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase4-orders-transition-1280x800.png"),
    fullPage: false,
  });

  await page.keyboard.press("Escape");
  await sheet.waitFor({ state: "hidden", timeout: 10000 });

  await page.getByRole("button", { name: "Open LS-20481" }).click();
  const cancellationSheet = page.getByRole("dialog");
  await expectVisible(cancellationSheet, "Cancellation test order did not open.");
  await cancellationSheet.getByRole("button", { name: "Cancelled" }).click();
  const confirmation = page.getByRole("alertdialog");
  await expectVisible(
    confirmation,
    "Cancelling an order did not require confirmation.",
  );
  await confirmation
    .getByRole("button", { name: "Keep current status" })
    .click();
  await confirmation.waitFor({ state: "hidden", timeout: 10000 });
  await expectVisible(
    cancellationSheet.getByText("Preparing", { exact: true }).first(),
    "Dismissing cancellation changed the order unexpectedly.",
  );

  await cancellationSheet.getByRole("button", { name: "Cancelled" }).click();
  await confirmation.getByRole("button", { name: "Cancel order" }).click();
  await expectVisible(
    page.getByText("LS-20481 moved to cancelled."),
    "Confirmed cancellation feedback did not appear.",
  );
  await expectVisible(
    cancellationSheet.getByText("Cancelled", { exact: true }).first(),
    "Order detail did not show the cancelled state.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase4-orders-cancelled-1280x800.png"),
    fullPage: false,
  });

  await context.close();
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "orders mobile");

  await page.goto(`${baseUrl}/admin/orders`, { waitUntil: "networkidle" });
  await expectVisible(
    page.getByRole("heading", { name: "Orders", exact: true }),
    "Mobile Orders heading did not render.",
  );
  await page.getByRole("button", { name: "Open LS-20479" }).click();
  const sheet = page.getByRole("dialog");
  await expectVisible(sheet, "Mobile order detail did not open.");
  await expectVisible(
    sheet.getByRole("heading", { name: "LS-20479" }),
    "Mobile detail opened the wrong order.",
  );
  await expectVisible(
    sheet.getByRole("button", { name: "Payment confirmed" }),
    "The permitted payment-confirmation transition was not available.",
  );

  const box = await sheet.boundingBox();
  if (
    !box ||
    box.x > 1 ||
    box.y > 1 ||
    Math.abs(box.width - 375) > 2 ||
    Math.abs(box.height - 812) > 2
  ) {
    throw new Error(`Mobile order detail is not full viewport: ${JSON.stringify(box)}`);
  }

  await page.screenshot({
    path: path.join(screenshotDir, "phase4-orders-detail-375x812.png"),
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

console.log("Phase 4 Orders browser interaction checks passed.");
