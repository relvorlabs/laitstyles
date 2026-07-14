import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.resolve(process.env.PLAYWRIGHT_OUTPUT_DIR ?? "playwright-artifacts");
const productSlug = "archive-varsity-jacket";

const consumerRoutes = [
  { name: "home", path: "/" },
  { name: "products", path: "/products" },
  { name: "product-detail", path: `/products/${productSlug}`, productDetail: true },
  {
    name: "legacy-product-redirect",
    path: `/p/${productSlug}`,
    expectedPath: `/products/${productSlug}`,
    productDetail: true,
  },
  { name: "account", path: "/account" },
  { name: "cart", path: "/cart" },
  { name: "checkout", path: "/checkout" },
  { name: "order-confirmation", path: "/order-confirmation" },
  { name: "shop", path: "/shop" },
  { name: "shop-category", path: "/shop/category/jeans-denim" },
  { name: "collection", path: "/collections/vintage-edit" },
];

const viewports = [
  { name: "desktop", width: 1365, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const failures = [];

function destination(routePath) {
  return new URL(routePath, baseUrl).toString();
}

async function capture(page, name, viewport) {
  await page.screenshot({
    path: path.join(outputDir, `${name}-${viewport}.png`),
    fullPage: false,
  });
}

async function verifyConsumerRoute(context, route, viewport) {
  const page = await context.newPage();
  try {
    await page.goto(destination(route.path), { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
    await page.locator(".lst-lab").first().waitFor({ state: "attached", timeout: 15_000 });

    const state = await page.evaluate(() => {
      const scope = document.querySelector(".lst-lab");
      const header = document.querySelector("header#header");
      const brandSymbol = document.querySelector(".brand-symbol");
      const footer = document.querySelector("footer");
      if (!(scope instanceof HTMLElement)) throw new Error("Missing .lst-lab storefront scope");

      const scopeStyle = getComputedStyle(scope);
      const headerStyle = header instanceof HTMLElement ? getComputedStyle(header) : null;
      const brandStyle = brandSymbol instanceof HTMLElement ? getComputedStyle(brandSymbol) : null;

      return {
        scopeCount: document.querySelectorAll(".lst-lab").length,
        bone: scopeStyle.getPropertyValue("--bone").trim(),
        ink: scopeStyle.getPropertyValue("--ink").trim(),
        headerPosition: headerStyle?.position ?? null,
        brandWidth: brandStyle?.width ?? null,
        footerPresent: Boolean(footer),
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });

    assert.equal(state.scopeCount, 1, "the shared storefront scope must render exactly once");
    assert.ok(state.bone, "--bone must be inherited from home-lab.css");
    assert.ok(state.ink, "--ink must be inherited from home-lab.css");
    assert.equal(state.headerPosition, "sticky", "the shared header must receive home-lab.css");
    assert.ok(state.brandWidth && Number.parseFloat(state.brandWidth) <= 40, "brand mark must not render unstyled");
    assert.equal(state.footerPresent, true, "shared footer must render inside the storefront scope");
    assert.equal(state.horizontalOverflow, false, "route must not introduce viewport overflow");

    if (route.expectedPath) {
      assert.equal(new URL(page.url()).pathname, route.expectedPath, "legacy product URL must redirect");
    }

    if (route.productDetail) {
      assert.equal(await page.locator("main.lst-catalogue").count(), 1, "product detail shell must be styled");
      const primaryButton = page.locator(".button.button-primary").first();
      await primaryButton.waitFor({ state: "attached", timeout: 10_000 });
      const minHeight = await primaryButton.evaluate((element) => Number.parseFloat(getComputedStyle(element).minHeight));
      assert.ok(minHeight >= 48, "product detail primary action must inherit button styling");
    }

    await capture(page, route.name, viewport.name);
    console.log(`PASS ${viewport.name} ${route.path}`);
  } catch (error) {
    await capture(page, `${route.name}-failed`, viewport.name).catch(() => undefined);
    failures.push(`${viewport.name} ${route.path}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await page.close();
  }
}

async function verifyAdminExclusion(context, viewport) {
  const page = await context.newPage();
  try {
    await page.goto(destination("/admin"), { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);

    const state = await page.evaluate(() => ({
      path: window.location.pathname,
      storefrontScopeCount: document.querySelectorAll(".lst-lab").length,
      storefrontHeaderCount: document.querySelectorAll("header#header").length,
    }));

    assert.ok(
      state.path.startsWith("/admin") || state.path.startsWith("/auth"),
      `admin must remain on its standalone surface (received ${state.path})`,
    );
    assert.equal(state.storefrontScopeCount, 0, "admin/auth surfaces must stay outside .lst-lab");
    assert.equal(state.storefrontHeaderCount, 0, "admin/auth surfaces must not render storefront chrome");

    await capture(page, "admin-excluded", viewport.name);
    console.log(`PASS ${viewport.name} /admin excluded from storefront styles`);
  } catch (error) {
    await capture(page, "admin-excluded-failed", viewport.name).catch(() => undefined);
    failures.push(`${viewport.name} /admin exclusion: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await page.close();
  }
}

for (const viewport of viewports) {
  const context = await browser.newContext({ viewport });
  for (const route of consumerRoutes) await verifyConsumerRoute(context, route, viewport);
  await verifyAdminExclusion(context, viewport);
  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("\nNon-admin style inheritance failures:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`\nVerified ${consumerRoutes.length} consumer routes across ${viewports.length} viewports.`);
  console.log("Future routes rendered through SiteChrome inherit home-lab.css without route-level imports.");
}
