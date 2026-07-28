import { expect, test } from "playwright/test";

test("forgot-password dialog uses a dedicated local screen without rebuilding", async ({ page }) => {
  let requestBody: unknown = null;
  await page.route("**/auth/email", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        ok: true,
        value: { status: "accepted", email: "shopper@example.com" },
      }),
    });
  });
  await page.addInitScript(() => {
    const key = "dialog-support-document-load-count";
    const count = Number(window.sessionStorage.getItem(key) ?? "0") + 1;
    window.sessionStorage.setItem(key, String(count));
  });

  await page.goto("/products?auth=signin", { waitUntil: "domcontentloaded" });
  const stableUrl = page.url();
  await page.getByLabel("Email").fill("shopper@example.com");
  await page.getByRole("button", { name: "Forgot password?" }).click();

  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("shopper@example.com");
  expect(page.url()).toBe(stableUrl);

  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox." })).toBeVisible();
  expect(requestBody).toEqual({
    kind: "recovery",
    email: "shopper@example.com",
    returnTo: "/products?auth=signin&support=recovery",
  });
  expect(page.url()).toBe(stableUrl);
  await expect
    .poll(() =>
      page.evaluate(() => window.sessionStorage.getItem("dialog-support-document-load-count")),
    )
    .toBe("1");

  await page.getByRole("button", { name: "Back to sign in" }).click();
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("confirmation resend uses the same mounted dialog and endpoint", async ({ page }) => {
  let requestBody: unknown = null;
  await page.route("**/auth/email", async (route) => {
    requestBody = route.request().postDataJSON();
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({
        ok: true,
        value: { status: "accepted", email: "pending@example.com" },
      }),
    });
  });

  await page.goto("/?auth=signin", { waitUntil: "domcontentloaded" });
  const stableUrl = page.url();
  await page.getByLabel("Email").fill("pending@example.com");
  await page.getByRole("button", { name: "Send another link" }).click();

  await expect(page.getByRole("heading", { name: "Send another confirmation" })).toBeVisible();
  await page.getByRole("button", { name: "Send confirmation link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox." })).toBeVisible();
  expect(requestBody).toEqual({
    kind: "confirmation",
    email: "pending@example.com",
    returnTo: "/?auth=signin&support=confirmation",
  });
  expect(page.url()).toBe(stableUrl);
});

test("email callback errors reopen the correct support screen", async ({ page }) => {
  await page.goto(
    "/products?auth=signin&support=recovery&error=recovery-failed",
    { waitUntil: "domcontentloaded" },
  );

  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await expect(
    page.getByText("We could not send a password-reset email. Please try again."),
  ).toBeVisible();
  await expect.poll(() => new URL(page.url()).searchParams.has("support")).toBe(false);
  await expect.poll(() => new URL(page.url()).searchParams.has("error")).toBe(false);
});
