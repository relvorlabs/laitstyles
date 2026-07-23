import { defineConfig, devices } from "playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results";
const reportDir = process.env.PLAYWRIGHT_REPORT_DIR ?? "playwright-report";
const jsonOutput = process.env.PLAYWRIGHT_JSON_OUTPUT ?? `${outputDir}/results.json`;
const junitOutput = process.env.PLAYWRIGHT_JUNIT_OUTPUT ?? `${outputDir}/junit.xml`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ["line"],
        ["html", { outputFolder: reportDir, open: "never" }],
        ["json", { outputFile: jsonOutput }],
        ["junit", { outputFile: junitOutput }],
      ]
    : [["list"], ["html", { outputFolder: reportDir, open: "never" }]],
  outputDir,
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "tablet-chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 768, height: 1024 },
      },
    },
  ],
});
