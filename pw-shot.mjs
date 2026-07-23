import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";

const OUT = process.argv[2] || ".";
const only = process.argv[3];
const routesArg = process.argv[4];
const htmlUrl = pathToFileURL(
  path.resolve("docs/storefront-v2/card-lab/account-workspace.html"),
).href;
const appUrl = "http://localhost:4438/account";

const viewports = [
  { name: "desktop", width: 1280, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
];
const routes = routesArg
  ? routesArg.split(",")
  : [
      "overview",
      "profile",
      "orders",
      "order-detail",
      "returns",
      "addresses",
      "payments",
      "saved",
      "security",
    ];

const browser = await chromium.launch();

async function snap(url, tag) {
  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
    });
    for (const r of routes) {
      await page.goto("about:blank");
      await page.goto(`${url}#${r}`, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(1100);
      await page.screenshot({ path: `${OUT}/${tag}-${vp.name}-${r}.png`, fullPage: true });
      console.log(`${tag}-${vp.name}-${r}`);
    }
    await page.close();
  }
}

if (only !== "app") await snap(htmlUrl, "html");
if (only !== "html") await snap(appUrl, "app");
await browser.close();
console.log("done");
