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
  const viewport = locator.page().viewportSize();
  if (
    !box ||
    !viewport ||
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.width > viewport.width + 1 ||
    box.y + box.height > viewport.height + 1
  ) {
    throw new Error(`${message}: ${JSON.stringify({ box, viewport })}`);
  }
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "settings desktop");

  await page.goto(`${baseUrl}/admin/settings`, { waitUntil: "networkidle" });
  await expectVisible(
    page.getByRole("heading", { name: "Settings", exact: true }),
    "Settings heading did not render.",
  );
  await expectVisible(
    page.getByRole("heading", { name: "Store identity", exact: true }),
    "Store identity did not render as the default section.",
  );

  await page.getByLabel("Store name").fill("L");
  await page.getByRole("button", { name: "Save store settings" }).click();
  await expectVisible(
    page.getByText("Enter a store name with at least 2 characters."),
    "Store identity validation did not appear.",
  );
  await page.getByLabel("Store name").fill("Laitstyle Studio");

  await page.getByRole("button", { name: /Selling preferences/ }).click();
  if (!page.url().includes("section=selling")) {
    throw new Error("Desktop settings section was not written to the URL.");
  }
  await page.getByLabel("Default hold duration").fill("25");

  await page.getByRole("button", { name: /Delivery/ }).click();
  await page.getByRole("button", { name: /Selling preferences/ }).click();
  const preservedHold = await page.getByLabel("Default hold duration").inputValue();
  if (preservedHold !== "25") {
    throw new Error("Unsaved selling values were lost after changing sections.");
  }

  await page.getByRole("button", { name: /Payments/ }).click();
  const acceptPayOnDelivery = page.getByRole("checkbox", {
    name: "Accept Pay on delivery",
  });
  await acceptPayOnDelivery.click();
  await page.getByRole("button", { name: /Selling preferences/ }).click();
  const offerPayOnDelivery = page.getByRole("checkbox", {
    name: "Offer pay on delivery",
  });
  if (!(await offerPayOnDelivery.isChecked())) {
    throw new Error("Pay on delivery did not stay synchronized across sections.");
  }

  await page.getByRole("button", { name: /Team/ }).click();
  await page.getByRole("button", { name: "Add team member" }).click();
  await page.getByLabel("Name").nth(1).fill("Tomi Adeyemi");
  await page.getByLabel("Email").nth(1).fill("tomi@example.com");
  await page
    .getByLabel("Store responsibility")
    .nth(1)
    .fill("Coordinates product intake and delivery handoff.");
  await expectVisible(
    page.getByText("Prototype invite", { exact: true }),
    "New team member did not retain the truthful prototype-invite boundary.",
  );

  await page.getByRole("button", { name: "Save store settings" }).click();
  await expectVisible(
    page.getByText("Store settings saved", { exact: true }),
    "Settings save feedback did not appear.",
  );
  await expectVisible(
    page.getByText("All changes saved", { exact: true }),
    "Settings form did not reset its dirty state after saving.",
  );

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (pageOverflow) {
    throw new Error("Desktop Settings route has horizontal page overflow.");
  }

  await page.screenshot({
    path: path.join(screenshotDir, "phase6-settings-team-1280x800.png"),
    fullPage: false,
  });

  await context.close();
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const page = await context.newPage();
  recordPageFailures(page, "settings mobile");

  await page.goto(`${baseUrl}/admin/settings?section=payments`, {
    waitUntil: "networkidle",
  });
  await expectVisible(
    page.getByRole("heading", { name: "Payments", exact: true }),
    "Mobile Settings route did not honour the requested section.",
  );
  const sectionSelect = page.getByLabel("Choose settings section");
  await expectVisible(sectionSelect, "Mobile settings section selector was not visible.");
  await sectionSelect.click();
  await page.getByRole("option", { name: /Notifications/ }).click();
  await expectVisible(
    page.getByRole("heading", { name: "Notifications", exact: true }),
    "Mobile settings section navigation did not change content.",
  );
  if (!page.url().includes("section=notifications")) {
    throw new Error("Mobile settings navigation did not update the URL.");
  }

  const saveButton = page.getByRole("button", { name: "Save store settings" });
  await expectVisible(saveButton, "Mobile settings save action was not available.");
  await expectInsideViewport(
    saveButton,
    "Mobile settings save action was outside the visible viewport",
  );

  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (pageOverflow) {
    throw new Error("Mobile Settings route has horizontal page overflow.");
  }

  await page.screenshot({
    path: path.join(screenshotDir, "phase6-settings-notifications-375x812.png"),
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

console.log("Phase 6 Settings browser checks passed.");
