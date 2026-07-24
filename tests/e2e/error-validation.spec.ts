import { expect, test } from "playwright/test";

test.describe("error and validation boundaries", () => {
  test("auth errors render allow-listed copy without reflecting query text", async ({ page }) => {
    await page.goto(
      "/auth/error?code=invalid-credentials&message=postgres%3A%2F%2Fsecret%40internal&next=%2F%2Fevil.example",
    );

    await expect(page.getByRole("heading", { name: "Let's try that again" })).toBeVisible();
    await expect(page.getByText("The email or password is incorrect.")).toBeVisible();
    await expect(page.getByText(/postgres|internal|evil\.example/i)).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Back to sign in" })).toHaveAttribute(
      "href",
      "/auth/sign-in?next=%2Faccount",
    );
  });

  test("unknown auth codes fall back to fixed generic copy", async ({ page }) => {
    await page.goto("/auth/error?code=database-secret&message=raw-provider-detail");

    await expect(page.getByText("We could not complete that sign-in request.")).toBeVisible();
    await expect(page.getByText("raw-provider-detail")).toHaveCount(0);
  });
});
