import { expect, test } from "playwright/test";

async function installDocumentCounter(page: Parameters<typeof test>[0] extends never ? never : never) {
  void page;
}

test("signup validation stays on the mounted auth page", async ({ page }) => {
  await page.addInitScript(() => {
    const key = "signup-document-load-count";
    const count = Number(window.sessionStorage.getItem(key) ?? "0") + 1;
    window.sessionStorage.setItem(key, String(count));
  });
  await page.goto("/auth/sign-up", { waitUntil: "domcontentloaded" });

  const stableUrl = page.url();
  await page.getByRole("button", { name: "Create my account" }).click();

  await expect(page.getByText("Check the highlighted fields and try again.")).toBeVisible();
  await expect(page.getByText("Enter your first name.")).toBeVisible();
  await expect(page.getByText("Enter your last name.")).toBeVisible();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  await expect(page.getByText("Enter your password.")).toBeVisible();
  expect(page.url()).toBe(stableUrl);
  await expect
    .poll(() => page.evaluate(() => window.sessionStorage.getItem("signup-document-load-count")))
    .toBe("1");
});

test("password recovery validation stays on the mounted auth page", async ({ page }) => {
  await page.addInitScript(() => {
    const key = "recovery-document-load-count";
    const count = Number(window.sessionStorage.getItem(key) ?? "0") + 1;
    window.sessionStorage.setItem(key, String(count));
  });
  await page.goto("/auth/forgot-password", { waitUntil: "domcontentloaded" });

  const stableUrl = page.url();
  await page.getByRole("button", { name: "Send secure reset link" }).click();

  await expect(page.getByText("Check the highlighted fields and try again.")).toBeVisible();
  await expect(page.getByText("Enter your email address.")).toBeVisible();
  expect(page.url()).toBe(stableUrl);
  await expect
    .poll(() => page.evaluate(() => window.sessionStorage.getItem("recovery-document-load-count")))
    .toBe("1");
});
