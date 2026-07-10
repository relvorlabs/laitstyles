import { chromium } from "playwright";
import path from "node:path";

const baseUrl = process.env.CONTROL_ROOM_BASE_URL || "http://127.0.0.1:3000";
const screenshotDir =
  process.env.CONTROL_ROOM_SCREENSHOT_DIR || "control-room-screenshots";
const failures = [];

function watchPage(page, label) {
  page.on("pageerror", (error) => failures.push(`${label} page error: ${error.message}`));
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

async function expectNoHorizontalOverflow(page, label) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (overflow) throw new Error(`${label} has horizontal page overflow.`);
}

async function chooseTheme(page, label, expectedResolved, expectedStored) {
  await page.getByRole("button", { name: "Change colour theme" }).first().click();
  await page.getByRole("menuitemradio", { name: new RegExp(label) }).click();
  await page.waitForFunction(
    ({ resolved, stored }) =>
      document.documentElement.dataset.theme === resolved &&
      localStorage.getItem("laitstyle-theme") === stored,
    { resolved: expectedResolved, stored: expectedStored },
  );
}

async function runThemeAndCommand(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: "dark",
  });
  await context.addInitScript(() => localStorage.setItem("laitstyle-theme", "light"));
  const page = await context.newPage();
  watchPage(page, "phase 8 theme and command");

  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await chooseTheme(page, "Light", "light", "light");
  await chooseTheme(page, "Dark", "dark", "dark");
  await chooseTheme(page, "System", "dark", "system");

  await page.keyboard.press("Control+K");
  const command = page.getByRole("dialog").last();
  await expectVisible(command, "Control Room command palette did not open.");
  const input = command.getByPlaceholder("Search products, orders, customers or tasks…");
  await input.fill("Botanical Jeans");
  await expectVisible(
    command.getByText("Botanical Jeans", { exact: true }),
    "Command search did not return a live product record.",
  );
  await command.getByText("Botanical Jeans", { exact: true }).click();
  await page.waitForURL(/\/admin\/inventory\?product=botanical-jeans/);

  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
  await page.keyboard.press("Control+K");
  const customerCommand = page.getByRole("dialog").last();
  await customerCommand
    .getByPlaceholder("Search products, orders, customers or tasks…")
    .fill("Amara");
  await expectVisible(
    customerCommand.getByText(/Amara/, { exact: false }).first(),
    "Command search did not return a live customer record.",
  );
  await page.keyboard.press("Escape");
  await context.close();
}

async function runSidebarHeights(browser) {
  for (const height of [800, 700, 600]) {
    const context = await browser.newContext({ viewport: { width: 1280, height } });
    const page = await context.newPage();
    watchPage(page, `phase 8 sidebar ${height}`);
    await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });

    const sidebar = page.locator("aside");
    const scrollRegion = sidebar.locator(".overflow-y-auto");
    const settings = sidebar.getByRole("link", { name: /Settings/ });
    const themeButton = sidebar.getByRole("button", { name: "Change colour theme" });

    await expectVisible(sidebar, `Desktop sidebar was not visible at ${height}px.`);
    await expectVisible(scrollRegion, `Sidebar scroll region was missing at ${height}px.`);
    await settings.scrollIntoViewIfNeeded();
    await expectVisible(settings, `Settings was unreachable at ${height}px.`);
    await expectVisible(themeButton, `Fixed appearance control was unreachable at ${height}px.`);

    const geometry = await sidebar.evaluate((element) => {
      const scroll = element.querySelector(".overflow-y-auto");
      const footer = scroll?.nextElementSibling;
      return {
        sidebarHeight: element.getBoundingClientRect().height,
        scrollClientHeight: scroll?.clientHeight ?? 0,
        scrollHeight: scroll?.scrollHeight ?? 0,
        footerBottom: footer?.getBoundingClientRect().bottom ?? 0,
      };
    });
    if (geometry.footerBottom > height + 1 || geometry.scrollClientHeight <= 0) {
      throw new Error(`Sidebar geometry failed at ${height}px: ${JSON.stringify(geometry)}`);
    }

    await context.close();
  }
}

async function runOverview(browser) {
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await desktop.addInitScript(() => localStorage.setItem("laitstyle-theme", "light"));
  const page = await desktop.newPage();
  watchPage(page, "phase 8 Overview desktop");
  await page.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });

  await expectVisible(page.getByText("Priority queue", { exact: true }), "Attention queue is missing.");
  await expectVisible(
    page.getByText("Orders still in motion", { exact: true }),
    "Open-orders preview is missing.",
  );
  await expectVisible(
    page.getByText("Continue working", { exact: false }).first(),
    "Continue-working rail is missing.",
  );
  await expectVisible(
    page.getByText("Fulfilment", { exact: false }).first(),
    "Fulfilment rail is missing.",
  );
  await expectNoHorizontalOverflow(page, "Desktop Overview");

  const attentionBox = await page.locator("#attention").boundingBox();
  const openOrdersBox = await page.locator("#open-orders").boundingBox();
  const continueBox = await page.getByText("Continue working", { exact: false }).first().boundingBox();
  if (!attentionBox || !openOrdersBox || !continueBox) {
    throw new Error("Overview hierarchy boxes could not be measured.");
  }
  if (continueBox.x <= attentionBox.x || openOrdersBox.y <= attentionBox.y) {
    throw new Error("Overview desktop hierarchy did not form a main workspace and supporting rail.");
  }

  await page.screenshot({
    path: path.join(screenshotDir, "phase8-overview-light-1280x800.png"),
    fullPage: true,
  });
  await chooseTheme(page, "Dark", "dark", "dark");
  await page.screenshot({
    path: path.join(screenshotDir, "phase8-overview-dark-1280x800.png"),
    fullPage: true,
  });
  await desktop.close();

  for (const viewport of [
    { width: 768, height: 1024, label: "768x1024" },
    { width: 375, height: 812, label: "375x812" },
  ]) {
    const context = await browser.newContext({ viewport });
    const mobilePage = await context.newPage();
    watchPage(mobilePage, `phase 8 Overview ${viewport.label}`);
    await mobilePage.goto(`${baseUrl}/admin`, { waitUntil: "networkidle" });
    await expectNoHorizontalOverflow(mobilePage, `Overview ${viewport.label}`);
    await mobilePage.screenshot({
      path: path.join(screenshotDir, `phase8-overview-${viewport.label}.png`),
      fullPage: true,
    });
    await context.close();
  }
}

async function runInventoryTable(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  watchPage(page, "phase 8 Inventory table");
  await page.goto(`${baseUrl}/admin/inventory?presentation=table`, {
    waitUntil: "networkidle",
  });

  const preview = page.getByRole("button", {
    name: "Preview images for Botanical Jeans",
  });
  await expectVisible(preview, "Inventory table did not expose a media-preview action.");
  await preview.click();
  const media = page.locator("[data-media-viewer]");
  await expectVisible(media, "Table image preview did not open the shared media viewer.");
  if (page.url().includes("product=")) {
    throw new Error("Table media preview opened product detail instead of media.");
  }
  await page.screenshot({
    path: path.join(screenshotDir, "phase8-inventory-table-media-1280x800.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");
  await expectVisible(
    page.getByRole("button", { name: "Open Botanical Jeans" }),
    "Inventory record action was lost after adding table media preview.",
  );
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runThemeAndCommand(browser);
  await runSidebarHeights(browser);
  await runOverview(browser);
  await runInventoryTable(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  throw new Error(failures.join("\n"));
}

console.log("Phase 8 shell, Overview, theme and Inventory checks passed.");
