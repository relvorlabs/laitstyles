import { expect, test, type Page } from "playwright/test";

const surfaces = [
  { name: "storefront", path: "/" },
  { name: "account", path: "/account" },
  { name: "admin", path: "/admin" },
] as const;
const themes = ["light", "dark"] as const;

function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/favicon|Failed to load resource/i.test(text)) return;
    errors.push(`console: ${text}`);
  });
  return errors;
}

async function setTheme(page: Page, theme: (typeof themes)[number]) {
  await page.addInitScript((nextTheme) => {
    window.localStorage.setItem("laitstyle-theme", nextTheme);
  }, theme);
}

async function assertButtonPresentation(page: Page) {
  const results = await page.locator('[data-slot="button"]:visible').evaluateAll((buttons) => {
    type Rgb = { r: number; g: number; b: number; a: number };
    const parse = (value: string): Rgb | null => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(/[\s,/]+/).filter(Boolean).map(Number);
      if (parts.length < 3 || parts.some(Number.isNaN)) return null;
      return { r: parts[0], g: parts[1], b: parts[2], a: parts[3] ?? 1 };
    };
    const luminance = ({ r, g, b }: Rgb) => {
      const linear = [r, g, b].map((channel) => {
        const value = channel / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const contrast = (a: Rgb, b: Rgb) => {
      const high = Math.max(luminance(a), luminance(b));
      const low = Math.min(luminance(a), luminance(b));
      return (high + 0.05) / (low + 0.05);
    };
    const backgroundFor = (element: Element): Rgb | null => {
      let node: Element | null = element;
      while (node) {
        const parsed = parse(getComputedStyle(node).backgroundColor);
        if (parsed && parsed.a > 0.05) return parsed;
        node = node.parentElement;
      }
      return parse(getComputedStyle(document.body).backgroundColor);
    };

    return buttons.map((button, index) => {
      const element = button as HTMLElement;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const foreground = parse(style.color);
      const background = backgroundFor(element);
      const text = element.innerText.trim();
      const accessibleName = element.getAttribute("aria-label") || element.getAttribute("title") || text;
      const icons = [...element.querySelectorAll("svg")].map((icon) => {
        const iconRect = icon.getBoundingClientRect();
        const iconColor = parse(getComputedStyle(icon).color);
        return {
          width: iconRect.width,
          height: iconRect.height,
          visibleColor: Boolean(iconColor && iconColor.a > 0.05),
          contrast: iconColor && background ? contrast(iconColor, background) : null,
        };
      });
      return {
        index,
        variant: element.dataset.variant ?? null,
        text,
        accessibleName,
        onscreen:
          rect.width > 0 &&
          rect.height > 0 &&
          rect.bottom > 0 &&
          rect.right > 0 &&
          rect.top < window.innerHeight &&
          rect.left < window.innerWidth,
        foregroundVisible: Boolean(foreground && foreground.a > 0.05),
        foregroundLuminance: foreground ? luminance(foreground) : null,
        backgroundLuminance: background ? luminance(background) : null,
        contrast: foreground && background ? contrast(foreground, background) : null,
        icons,
      };
    });
  });

  for (const result of results.filter((item) => item.onscreen)) {
    expect.soft(result.accessibleName, `button ${result.index} must have an accessible name`).toBeTruthy();
    expect.soft(result.foregroundVisible, `button ${result.accessibleName} must have visible text`).toBe(true);
    if (result.contrast != null) {
      expect.soft(result.contrast, `button ${result.accessibleName} text contrast`).toBeGreaterThanOrEqual(4.5);
    }
    if (
      (result.variant === "default" || result.variant === "destructive") &&
      result.backgroundLuminance != null &&
      result.backgroundLuminance < 0.35
    ) {
      expect.soft(result.foregroundLuminance, `filled ${result.variant} foreground must be light`).toBeGreaterThan(0.75);
    }
    for (const icon of result.icons) {
      expect.soft(icon.width, `button ${result.accessibleName} icon width`).toBeGreaterThan(0);
      expect.soft(icon.height, `button ${result.accessibleName} icon height`).toBeGreaterThan(0);
      expect.soft(icon.visibleColor, `button ${result.accessibleName} icon color`).toBe(true);
      if (icon.contrast != null) {
        expect.soft(icon.contrast, `button ${result.accessibleName} icon contrast`).toBeGreaterThanOrEqual(3);
      }
    }
  }
}

for (const surface of surfaces) {
  for (const theme of themes) {
    test(`${surface.name} loads in ${theme} theme with accessible button contrast`, async ({ page }) => {
      const runtimeErrors = collectRuntimeErrors(page);
      await setTheme(page, theme);
      const response = await page.goto(surface.path, { waitUntil: "domcontentloaded" });
      expect(response?.status() ?? 200).toBeLessThan(500);
      await expect(page.locator("body")).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.classList.contains("dark")))
        .toBe(theme === "dark");
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1))
        .toBe(true);

      await assertButtonPresentation(page);

      const firstButton = page.locator('[data-slot="button"]:visible:enabled').first();
      if ((await firstButton.count()) > 0) {
        await firstButton.focus();
        const focusStyle = await firstButton.evaluate((element) => {
          const style = getComputedStyle(element);
          return `${style.outlineStyle}|${style.boxShadow}|${style.borderColor}`;
        });
        expect(focusStyle).not.toBe("none|none|rgba(0, 0, 0, 0)");
      }

      expect(runtimeErrors).toEqual([]);
      await page.screenshot({
        path: `test-results/${surface.name}-${theme}-${test.info().project.name}.png`,
        fullPage: false,
      });
    });
  }
}

test("legacy Control Room URL redirects to the Admin destination", async ({ page }) => {
  await page.goto("/control-room/inventory", { waitUntil: "domcontentloaded" });
  const url = new URL(page.url());
  const redirectedToAdmin = url.pathname.startsWith("/admin");
  const redirectedToAuthForAdmin =
    url.pathname === "/auth/sign-in" && url.searchParams.get("next") === "/admin/inventory";
  expect(redirectedToAdmin || redirectedToAuthForAdmin).toBe(true);
});

test("theme toggle remains keyboard operable", async ({ page }) => {
  await setTheme(page, "light");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const toggle = page.getByRole("button", { name: "Use dark theme" }).first();
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
});
