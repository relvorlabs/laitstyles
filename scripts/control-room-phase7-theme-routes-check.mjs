import { chromium } from "playwright";
import path from "node:path";

const baseUrl =
  process.env.CONTROL_ROOM_BASE_URL || "http://127.0.0.1:3000";
const screenshotDir =
  process.env.CONTROL_ROOM_SCREENSHOT_DIR || "control-room-screenshots";
const failures = [];

const routes = [
  {
    slug: "overview",
    href: "/admin",
    heading: "See the store clearly before deciding what to do next.",
  },
  { slug: "inventory", href: "/admin/inventory", heading: "Inventory" },
  { slug: "orders", href: "/admin/orders", heading: "Orders" },
  { slug: "holds", href: "/admin/holds", heading: "Holds" },
  { slug: "returns", href: "/admin/returns", heading: "Returns" },
  { slug: "customers", href: "/admin/customers", heading: "Customers" },
  { slug: "settings", href: "/admin/settings", heading: "Settings" },
];

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

async function expectTheme(page, expected) {
  await page.waitForFunction(
    (value) =>
      document.documentElement.dataset.theme === value &&
      document.documentElement.classList.contains("dark") ===
        (value === "dark"),
    expected,
  );
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

async function expectReadable(locator, label, minimum = 4.5) {
  const result = await locator.evaluate((element) => {
    function parse(value) {
      const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
      if (numbers.length < 3) return null;
      return {
        red: numbers[0] / 255,
        green: numbers[1] / 255,
        blue: numbers[2] / 255,
        alpha: numbers[3] ?? 1,
      };
    }

    function composite(foreground, background) {
      const alpha = foreground.alpha + background.alpha * (1 - foreground.alpha);
      if (!alpha) return { red: 1, green: 1, blue: 1, alpha: 1 };
      return {
        red:
          (foreground.red * foreground.alpha +
            background.red * background.alpha * (1 - foreground.alpha)) /
          alpha,
        green:
          (foreground.green * foreground.alpha +
            background.green * background.alpha * (1 - foreground.alpha)) /
          alpha,
        blue:
          (foreground.blue * foreground.alpha +
            background.blue * background.alpha * (1 - foreground.alpha)) /
          alpha,
        alpha,
      };
    }

    function effectiveBackground(node) {
      const layers = [];
      let current = node;
      while (current) {
        const parsed = parse(getComputedStyle(current).backgroundColor);
        if (parsed && parsed.alpha > 0) layers.push(parsed);
        current = current.parentElement;
      }
      let result = { red: 1, green: 1, blue: 1, alpha: 1 };
      for (const layer of layers.reverse()) result = composite(layer, result);
      return result;
    }

    function channel(value) {
      return value <= 0.04045
        ? value / 12.92
        : ((value + 0.055) / 1.055) ** 2.4;
    }

    function luminance(value) {
      return (
        channel(value.red) * 0.2126 +
        channel(value.green) * 0.7152 +
        channel(value.blue) * 0.0722
      );
    }

    const foreground = parse(getComputedStyle(element).color);
    const background = effectiveBackground(element);
    if (!foreground) return { ratio: 0, foreground: "unknown", background };
    const foregroundLuminance = luminance(foreground);
    const backgroundLuminance = luminance(background);
    const lighter = Math.max(foregroundLuminance, backgroundLuminance);
    const darker = Math.min(foregroundLuminance, backgroundLuminance);
    return {
      ratio: (lighter + 0.05) / (darker + 0.05),
      foreground: getComputedStyle(element).color,
      background,
    };
  });

  if (result.ratio < minimum) {
    throw new Error(
      `${label} contrast was ${result.ratio.toFixed(2)}; expected at least ${minimum}.`,
    );
  }
}

async function runThemeMatrix(browser, theme) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await context.addInitScript((preference) => {
    localStorage.setItem("laitstyle-theme", preference);
  }, theme);
  const page = await context.newPage();
  recordPageFailures(page, `phase 7 ${theme} route matrix`);

  for (const route of routes) {
    await page.goto(`${baseUrl}${route.href}`, {
      waitUntil: "domcontentloaded",
    });
    await expectTheme(page, theme);
    const heading = page.getByRole("heading", {
      name: route.heading,
      exact: true,
    });
    await expectVisible(
      heading,
      `${route.slug} heading did not render in ${theme} mode.`,
    );
    await expectReadable(heading, `${theme} ${route.slug} heading`);
    await expectNoHorizontalOverflow(page, `${theme} ${route.slug}`);

    const primarySurface = page.locator("main [data-slot='card']").first();
    if (await primarySurface.count()) {
      const surfaceText = primarySurface
        .locator("h2, h3, p, [data-slot='card-title']")
        .filter({ visible: true })
        .first();
      if (await surfaceText.count()) {
        await expectReadable(
          surfaceText,
          `${theme} ${route.slug} primary card text`,
          3,
        );
      }
    }

    await page.screenshot({
      path: path.join(
        screenshotDir,
        `phase7-${route.slug}-${theme}-1280x800.png`,
      ),
      fullPage: true,
    });
  }

  await context.close();
}

const browser = await chromium.launch({ headless: true });
try {
  await runThemeMatrix(browser, "light");
  await runThemeMatrix(browser, "dark");
} finally {
  await browser.close();
}

if (failures.length) throw new Error(failures.join("\n"));

console.log("Phase 7 light and dark Admin route matrix passed.");
