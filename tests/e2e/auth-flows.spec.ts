import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { expect, test, type Locator, type Page } from "playwright/test";

const authEnabled = process.env.AUTH_E2E === "1";
const inboxUrl = process.env.AUTH_EMAIL_INBOX_URL ?? "http://127.0.0.1:54324";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const storefrontStateKey = "laitstyles-storefront:v3:client-state";

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const confirmedEmail = `auth-${runId}@example.com`;
const unconfirmedEmail = `pending-${runId}@example.com`;
const initialPassword = "Laitstyle-pass-123";
const recoveredPassword = "Laitstyle-pass-456";

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

test.describe.serial("live Supabase Auth journeys", () => {
  test.skip(
    !authEnabled || !pool || !supabase,
    "Run with pnpm test:auth:e2e so local Supabase Auth, Inbucket and PostgreSQL are available.",
  );

  test.afterAll(async () => {
    await pool?.end();
  });

  test("email signup confirms, provisions profile data, and preserves the guest bag", async ({
    page,
  }) => {
    await purgeMailbox(confirmedEmail);
    await addFirstAvailableItemToBag(page);
    const cartBeforeSignup = await storedStorefrontState(page);

    await page.goto("/auth/sign-up");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Lovelace");
    await page.getByLabel("Email address").fill(confirmedEmail);
    await page.getByLabel("Password", { exact: true }).fill(initialPassword);
    await page.getByLabel("Confirm password").fill(initialPassword);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create my account" }).click();

    await expect(page.getByText(/If this address can receive a confirmation email/i)).toBeVisible();
    expect(await storedStorefrontState(page)).toEqual(cartBeforeSignup);

    const confirmationLink = await waitForAuthLink(confirmedEmail);
    await page.goto(confirmationLink);
    await expect(page).toHaveURL(/\/account(?:$|[/?#])/);
    expect(await storedStorefrontState(page)).toEqual(cartBeforeSignup);

    const result = await pool?.query<{
      role: string;
      display_name: string | null;
      first_name: string | null;
      last_name: string | null;
      customer_id: string | null;
      customer_name: string | null;
    }>(
      `
        select
          p.role::text,
          p.display_name,
          d.first_name,
          d.last_name,
          c.id::text as customer_id,
          c.name as customer_name
        from public.profiles p
        left join public.profile_details d on d.profile_id = p.id
        left join public.customers c on c.profile_id = p.id
        where lower(p.email) = lower($1)
      `,
      [confirmedEmail],
    );

    expect(result?.rows).toEqual([
      expect.objectContaining({
        role: "consumer",
        display_name: "Ada Lovelace",
        first_name: "Ada",
        last_name: "Lovelace",
        customer_id: expect.any(String),
        customer_name: "Ada Lovelace",
      }),
    ]);
  });

  test("duplicate signup remains enumeration-safe", async ({ page }) => {
    await page.goto("/auth/sign-up");
    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Lovelace");
    await page.getByLabel("Email address").fill(confirmedEmail);
    await page.getByLabel("Password", { exact: true }).fill(initialPassword);
    await page.getByLabel("Confirm password").fill(initialPassword);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create my account" }).click();

    await expect(page.getByText(/If this address can receive a confirmation email/i)).toBeVisible();
    await expect(page.getByText(/account already exists/i)).toHaveCount(0);
  });

  test("storefront dialog keeps successful sign-in mounted and preserves the guest bag", async ({
    page,
  }) => {
    await addFirstAvailableItemToBag(page);
    const cartBeforeAuth = await storedStorefrontState(page);

    await page.addInitScript(() => {
      const key = "auth-success-document-load-count";
      const count = Number(window.sessionStorage.getItem(key) ?? "0") + 1;
      window.sessionStorage.setItem(key, String(count));
    });
    await page.goto("/?auth=signin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await page.getByLabel("Email").fill(confirmedEmail);
    await page.getByLabel("Password", { exact: true }).fill(initialPassword);

    await page.getByRole("button", { name: "Sign in", exact: true }).last().click();

    await expect(page.getByRole("heading", { name: /You.re back in/ })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect
      .poll(() =>
        page.evaluate(() => window.sessionStorage.getItem("auth-success-document-load-count")),
      )
      .toBe("1");
    expect(await storedStorefrontState(page)).toEqual(cartBeforeAuth);

    await page.getByRole("button", { name: "Go to my account" }).click();
    await expect(page).toHaveURL(/\/account(?:$|[/?#])/);
    expect(await storedStorefrontState(page)).toEqual(cartBeforeAuth);
  });

  test("storefront recovery uses its own dialog screen without rebuilding", async ({ page }) => {
    await purgeMailbox(confirmedEmail);
    await page.addInitScript(() => {
      const key = "auth-recovery-document-load-count";
      const count = Number(window.sessionStorage.getItem(key) ?? "0") + 1;
      window.sessionStorage.setItem(key, String(count));
    });
    await page.goto("/?auth=signin", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await page.getByLabel("Email").fill(confirmedEmail);

    const stableUrl = new URL(page.url());
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(confirmedEmail);

    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox." })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(stableUrl.pathname);
    expect(new URL(page.url()).search).toBe("");
    await expect
      .poll(() =>
        page.evaluate(() => window.sessionStorage.getItem("auth-recovery-document-load-count")),
      )
      .toBe("1");
    await waitForAuthLink(confirmedEmail);
  });

  test("unconfirmed email login exposes a resend path without provider details", async ({ page }) => {
    await purgeMailbox(unconfirmedEmail);
    await page.goto("/auth/sign-up");
    await page.getByLabel("First name").fill("Pending");
    await page.getByLabel("Last name").fill("Customer");
    await page.getByLabel("Email address").fill(unconfirmedEmail);
    await page.getByLabel("Password", { exact: true }).fill(initialPassword);
    await page.getByLabel("Confirm password").fill(initialPassword);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Create my account" }).click();

    await page.goto("/auth/sign-in?next=%2Fadmin");
    await page.getByLabel("Email address").fill(unconfirmedEmail);
    await page.getByLabel("Password").fill(initialPassword);
    await page.getByRole("button", { name: "Sign in to workspace" }).click();

    await expect(
      page.getByText("Confirm your email before signing in. You can request a new confirmation link."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Resend confirmation" })).toBeVisible();
    await expect(page.getByText(/email_not_confirmed|provider detail/i)).toHaveCount(0);
    await expect(page).toHaveURL(/\/auth\/sign-in\?next=%2Fadmin/);
  });

  test("storefront resend confirmation uses the dedicated dialog screen", async ({ page }) => {
    await purgeMailbox(unconfirmedEmail);
    await page.goto("/?auth=signin", { waitUntil: "domcontentloaded" });
    await page.getByLabel("Email").fill(unconfirmedEmail);
    await page.getByRole("button", { name: "Send another link" }).click();

    await expect(page.getByRole("heading", { name: "Send another confirmation" })).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue(unconfirmedEmail);
    await page.getByRole("button", { name: "Send confirmation link" }).click();
    await expect(page.getByRole("heading", { name: "Check your inbox." })).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await waitForAuthLink(unconfirmedEmail);
  });

  test("forgot-password email establishes recovery and accepts a new password", async ({ page }) => {
    await purgeMailbox(confirmedEmail);
    await page.goto("/auth/forgot-password");
    await page.getByLabel("Email address").fill(confirmedEmail);
    await page.getByRole("button", { name: "Send secure reset link" }).click();

    await expect(page.getByText(/If this address can receive a reset email/i)).toBeVisible();

    const recoveryLink = await waitForAuthLink(confirmedEmail);
    await page.goto(recoveryLink);
    await expect(page).toHaveURL(/\/auth\/reset-password(?:$|[/?#])/);

    await page.getByLabel("New password").fill(recoveredPassword);
    await page.getByLabel("Confirm new password").fill(recoveredPassword);
    await page.getByRole("button", { name: "Update password" }).click();

    await expect(
      page.getByText("Your password has been updated and other sessions have been closed."),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/reset-password(?:$|[/?#])/);

    const oldPasswordResult = await supabase?.auth.signInWithPassword({
      email: confirmedEmail,
      password: initialPassword,
    });
    expect(oldPasswordResult?.error).toBeTruthy();

    const newPasswordResult = await supabase?.auth.signInWithPassword({
      email: confirmedEmail,
      password: recoveredPassword,
    });
    expect(newPasswordResult?.error).toBeNull();
    expect(newPasswordResult?.data.user?.email).toBe(confirmedEmail);
    await supabase?.auth.signOut();
  });

  test("reset page rejects a missing or expired recovery session in place", async ({ page }) => {
    await page.goto("/auth/reset-password");
    await expect(page).toHaveURL(/\/auth\/reset-password(?:$|[/?#])/);
    await expect(
      page.getByText("This password-reset link is invalid or has expired. Request a new one."),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Request a new link" })).toBeVisible();
  });

  test("Google OAuth opens a popup and leaves the current auth page mounted", async ({ page }) => {
    test.skip(
      process.env.GOOGLE_AUTH_E2E !== "1",
      "Set GOOGLE_AUTH_E2E=1 and configure the dedicated local/test Google provider credentials.",
    );

    await page.goto("/auth/sign-up");
    const stableUrl = page.url();
    const popupPromise = page.waitForEvent("popup");
    await page.getByRole("button", { name: "Continue with Google" }).click();
    const popup = await popupPromise;

    await expect(popup).toHaveURL(/accounts\.google\.com|\/auth\/oauth-complete/);
    expect(page.url()).toBe(stableUrl);
    await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

    await popup.close();
    await expect(page.getByText("Google sign-in was closed before it finished.")).toBeVisible();

    await page.goto("/auth/callback?error=access_denied&next=%2Faccount");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByText(/sign-in link is incomplete or has expired/i)).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
  });
});

async function firstAddableCard(page: Page): Promise<Locator> {
  await page.goto("/products", { waitUntil: "domcontentloaded" });
  await expect.poll(() => page.locator("[data-card]").count()).toBeGreaterThan(0);

  const cardId = await page.locator("[data-card]").evaluateAll((cards) => {
    const card = cards.find((candidate) => {
      const buttons = [...candidate.querySelectorAll("button")];
      const action = buttons.at(-1);
      const label = action?.textContent?.replace(/\s+/g, " ").trim() ?? "";
      return Boolean(action && !action.disabled && !/Select size|Sold|Reserved/i.test(label));
    });
    return card?.getAttribute("data-card") ?? null;
  });

  expect(cardId, "the seeded catalogue must expose an addable non-variant product").toBeTruthy();
  return page.locator(`[data-card="${cardId}"]`);
}

async function addFirstAvailableItemToBag(page: Page) {
  const card = await firstAddableCard(page);
  await card.locator("button").last().click();
  await expect.poll(async () => (await storedStorefrontState(page)).cart.length).toBeGreaterThan(0);
}

async function storedStorefrontState(page: Page) {
  return page.evaluate((key) => {
    const value = window.sessionStorage.getItem(key);
    if (!value) throw new Error(`Missing ${key}`);
    return JSON.parse(value) as {
      version: number;
      cart: Array<{ productId: string; variantId: string | null; quantity: number }>;
      saved: string[];
      holds: Array<{ productId: string; expiresAt: number }>;
    };
  }, storefrontStateKey);
}

async function purgeMailbox(email: string) {
  const response = await fetch(`${inboxUrl}/api/v1/mailbox/${encodeURIComponent(mailbox(email))}`, {
    method: "DELETE",
  });
  if (!response.ok && response.status !== 404) {
    throw new Error(`Could not purge Auth inbox: ${response.status} ${response.statusText}`);
  }
}

async function waitForAuthLink(email: string) {
  const mailboxName = mailbox(email);
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    const response = await fetch(`${inboxUrl}/api/v1/mailbox/${encodeURIComponent(mailboxName)}`, {
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      const messages = (await response.json()) as Array<{ id: string; date?: string }>;
      const latest = [...messages].sort((left, right) =>
        String(right.date ?? "").localeCompare(String(left.date ?? "")),
      )[0];
      if (latest) {
        const sourceResponse = await fetch(
          `${inboxUrl}/api/v1/mailbox/${encodeURIComponent(mailboxName)}/${encodeURIComponent(latest.id)}/source`,
        );
        if (sourceResponse.ok) {
          const source = decodeEmailSource(await sourceResponse.text());
          const links = source.match(/https?:\/\/[^\s"'<>]+/g) ?? [];
          const authLink = links.find((link) => link.includes("/auth/v1/verify"));
          if (authLink) return authLink;
        }
      }
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 500));
  }

  throw new Error(`Timed out waiting for a Supabase Auth email for ${email}.`);
}

function decodeEmailSource(source: string) {
  return source.replace(/=\r?\n/g, "").replace(/=3D/gi, "=").replace(/&amp;/g, "&");
}

function mailbox(email: string) {
  return email.split("@")[0];
}
