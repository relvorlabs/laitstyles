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

async function expectTheme(page, expected) {
  await page.waitForFunction(
    (value) =>
      document.documentElement.dataset.theme === value &&
      document.documentElement.classList.contains("dark") === (value === "dark"),
    expected,
  );
}

async function expectGridColumns(page, expected) {
  const columns = await page.locator("[data-inventory-grid]").evaluate((grid) => {
    const template = getComputedStyle(grid).gridTemplateColumns.trim();
    return template ? template.split(/\s+/).length : 0;
  });
  if (columns !== expected) {
    throw new Error(`Expected ${expected} Inventory columns, received ${columns}.`);
  }
}

async function expectReadable(locator, label, minimum = 4.5) {
  const result = await locator.evaluate((element) => {
    const transparent = new Set(["transparent", "rgba(0, 0, 0, 0)"]);
    const foreground = getComputedStyle(element).color;
    let current = element;
    let background = "rgba(0, 0, 0, 0)";
    while (current) {
      const candidate = getComputedStyle(current).backgroundColor;
      if (!transparent.has(candidate)) {
        background = candidate;
        break;
      }
      current = current.parentElement;
    }

    function parse(value) {
      const values = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
      if (values.length !== 3) return null;
      return values.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
    }

    function luminance(value) {
      const channels = parse(value);
      if (!channels) return null;
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }

    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    if (foregroundLuminance === null || backgroundLuminance === null) {
      return { foreground, background, ratio: 0 };
    }
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return {
      foreground,
      background,
      ratio: (lighter + 0.05) / (darker + 0.05),
    };
  });

  if (result.ratio < minimum) {
    throw new Error(
      `${label} contrast was ${result.ratio.toFixed(2)} (${result.foreground} on ${result.background}); expected at least ${minimum}.`,
    );
  }
}

async function runDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addInitScript(() => {
    localStorage.setItem("laitstyle-theme", "light");
  });
  const page = await context.newPage();
  recordPageFailures(page, "phase 7 desktop");

  await page.goto(`${baseUrl}/admin/inventory`, { waitUntil: "networkidle" });
  await expectTheme(page, "light");
  await expectVisible(
    page.getByRole("heading", { name: "Inventory", exact: true }),
    "Inventory heading did not render in light mode.",
  );
  await expectGridColumns(page, 5);
  await expectReadable(
    page.getByRole("heading", { name: "Inventory", exact: true }),
    "Light Inventory heading",
  );

  await page
    .getByRole("button", { name: "View images for Botanical Jeans" })
    .click();
  const mediaDialog = page.locator("[data-media-viewer]");
  await expectVisible(mediaDialog, "Product media viewer did not open from the grid image.");
  await expectVisible(
    mediaDialog.getByText("Image 1 of 2", { exact: false }),
    "Media viewer did not show the initial media position.",
  );
  if (page.url().includes("product=botanical-jeans")) {
    throw new Error("Clicking the Inventory image opened product detail instead of media.");
  }

  await mediaDialog.getByRole("button", { name: "Zoom in" }).click();
  const zoomValue = await mediaDialog
    .locator("[data-media-zoom]")
    .getAttribute("data-media-zoom");
  if (zoomValue !== "1.25") {
    throw new Error(`Media zoom did not increase to 1.25; received ${zoomValue}.`);
  }

  await page.keyboard.press("ArrowRight");
  await expectVisible(
    mediaDialog.getByText("Image 2 of 2", { exact: false }),
    "ArrowRight did not move to the next product image.",
  );
  await mediaDialog.getByRole("button", { name: "Reset zoom" }).click();
  await mediaDialog.getByRole("button", { name: "Copy image link" }).click();
  await expectVisible(
    mediaDialog.getByRole("button", { name: "Link copied" }),
    "Copy-image-link success feedback was not visible.",
  );
  await expectVisible(
    mediaDialog.getByRole("link", { name: "Open original" }),
    "Open-original media action was not available.",
  );

  await page.screenshot({
    path: path.join(screenshotDir, "phase7-inventory-light-1280x800.png"),
    fullPage: true,
  });

  await page.keyboard.press("Escape");
  await mediaDialog.waitFor({ state: "hidden", timeout: 10000 });
  await page
    .getByRole("button", { name: "Open Botanical Jeans record" })
    .click();
  await expectVisible(
    page.getByText("Catalogue, stock and operational history for this product."),
    "Explicit product-record action did not open product detail.",
  );
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Change colour theme" }).first().click();
  await page.getByRole("menuitemradio", { name: /Dark/ }).click();
  await expectTheme(page, "dark");
  await expectReadable(
    page.getByRole("heading", { name: "Inventory", exact: true }),
    "Dark Inventory heading",
  );
  await page.reload({ waitUntil: "networkidle" });
  await expectTheme(page, "dark");

  await page.screenshot({
    path: path.join(screenshotDir, "phase7-inventory-dark-1280x800.png"),
    fullPage: true,
  });

  await context.close();
}

async function runWideDesktop(browser) {
  const context = await browser.newContext({
    viewport: { width: 1800, height: 1000 },
  });
  await context.addInitScript(() => {
    localStorage.setItem("laitstyle-theme", "light");
  });
  const page = await context.newPage();
  recordPageFailures(page, "phase 7 wide desktop");

  await page.goto(`${baseUrl}/admin/inventory`, { waitUntil: "networkidle" });
  await expectGridColumns(page, 6);
  await page.screenshot({
    path: path.join(screenshotDir, "phase7-inventory-grid-1800x1000.png"),
    fullPage: true,
  });
  await context.close();
}

async function runMobile(browser) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  await context.addInitScript(() => {
    localStorage.setItem("laitstyle-theme", "dark");
  });
  const page = await context.newPage();
  recordPageFailures(page, "phase 7 mobile");

  await page.goto(`${baseUrl}/admin/inventory`, { waitUntil: "networkidle" });
  await expectTheme(page, "dark");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  if (overflow) throw new Error("Mobile Inventory has horizontal page overflow.");

  await page
    .getByRole("button", { name: "View images for Botanical Jeans" })
    .click();
  const mediaDialog = page.locator("[data-media-viewer]");
  await expectVisible(mediaDialog, "Mobile product media viewer did not open.");
  const box = await mediaDialog.boundingBox();
  if (
    !box ||
    box.x > 1 ||
    box.y > 1 ||
    Math.abs(box.width - 375) > 2 ||
    Math.abs(box.height - 812) > 2
  ) {
    throw new Error(`Mobile media viewer is not full viewport: ${JSON.stringify(box)}`);
  }
  await expectVisible(
    mediaDialog.getByRole("button", { name: "Zoom in" }),
    "Mobile media zoom control was not visible.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase7-media-dark-375x812.png"),
    fullPage: false,
  });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Open Control Room navigation" }).click();
  const navigation = page.getByRole("dialog").first();
  await expectVisible(
    navigation.getByRole("button", { name: "Change colour theme" }),
    "Mobile navigation did not expose the colour-theme control.",
  );

  await context.close();
}

async function runStorefront(browser) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await context.addInitScript(() => {
    localStorage.setItem("laitstyle-theme", "dark");
  });
  const page = await context.newPage();
  recordPageFailures(page, "phase 7 storefront");

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await expectTheme(page, "dark");
  await expectVisible(
    page.getByRole("link", { name: "Laitstyle home" }).first(),
    "Approved Laitstyle brand lockup did not render in storefront chrome.",
  );
  await expectVisible(
    page.getByRole("button", { name: "Change colour theme" }).first(),
    "Storefront theme control was not visible.",
  );
  await page.screenshot({
    path: path.join(screenshotDir, "phase7-storefront-dark-1280x800.png"),
    fullPage: true,
  });
  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runDesktop(browser);
  await runWideDesktop(browser);
  await runMobile(browser);
  await runStorefront(browser);
} finally {
  await browser.close();
}

if (failures.length) {
  throw new Error(failures.join("\n"));
}

console.log("Phase 7 theme, Inventory density and media checks passed.");
