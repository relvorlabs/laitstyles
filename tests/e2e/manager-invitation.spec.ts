import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import { expect, test } from "playwright/test";

const authEnabled = process.env.AUTH_E2E === "1";
const inboxUrl = process.env.AUTH_EMAIL_INBOX_URL ?? "http://127.0.0.1:54324";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;

const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const ownerEmail = `owner-invite-${runId}@example.com`;
const managerEmail = `manager-invite-${runId}@example.com`;
const ownerPassword = "Laitstyle-owner-pass-123";
const managerPassword = "Laitstyle-manager-pass-123";

const pool = databaseUrl ? new Pool({ connectionString: databaseUrl }) : null;
const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
      })
    : null;

test.describe.serial("store-manager invitation", () => {
  test.skip(
    !authEnabled || !pool || !supabaseAdmin,
    "Run with pnpm test:auth:e2e so disposable Supabase Auth, PostgreSQL and the mailbox are available.",
  );

  test.afterAll(async () => {
    await cleanupAccount(ownerEmail);
    await cleanupAccount(managerEmail);
    await pool?.end();
  });

  test("the owner invites a manager who completes setup without receiving owner access", async ({
    page,
  }) => {
    await purgeMailbox(managerEmail);
    await provisionOwner();

    await page.goto("/auth/sign-in?next=%2Fadmin%2Fteam");
    await page.getByLabel("Email address").fill(ownerEmail);
    await page.getByLabel("Password").fill(ownerPassword);
    await page.getByRole("button", { name: "Sign in to workspace" }).click();
    await expect(page).toHaveURL(/\/admin\/team(?:$|[/?#])/);

    await page.getByLabel("First name").fill("Ada");
    await page.getByLabel("Last name").fill("Manager");
    await page.getByLabel("Work email").fill(managerEmail);
    await page.getByRole("button", { name: "Send manager invitation" }).click();

    await expect(
      page.getByText(
        "Invitation sent. The manager can set a password and finish their profile from the email link.",
      ),
    ).toBeVisible();
    await expect(page.getByText(managerEmail)).toBeVisible();
    await expect(page.getByText("Invite sent")).toBeVisible();

    const invitationLink = await waitForAuthLink(managerEmail);
    await page.goto(invitationLink);
    await expect(page.getByRole("heading", { name: "Complete your manager account" })).toBeVisible();
    await expect(page.getByLabel("First name")).toHaveValue("Ada");
    await expect(page.getByLabel("Last name")).toHaveValue("Manager");

    await page.getByLabel("Create password").fill(managerPassword);
    await page.getByLabel("Confirm password").fill(managerPassword);
    await page.getByRole("button", { name: "Join as store manager" }).click();
    await expect(page).toHaveURL(/\/admin(?:$|[/?#])/);

    const result = await pool?.query<{
      role: string;
      status: string;
      display_name: string | null;
      customer_id: string | null;
    }>(
      `
        select
          p.role::text,
          p.status::text,
          p.display_name,
          c.id::text as customer_id
        from public.profiles p
        left join public.customers c on c.profile_id = p.id
        where lower(p.email) = lower($1)
      `,
      [managerEmail],
    );

    expect(result?.rows).toEqual([
      {
        role: "manager",
        status: "active",
        display_name: "Ada Manager",
        customer_id: null,
      },
    ]);

    await page.goto("/admin/team");
    await expect(page).toHaveURL(/\/admin(?:$|[/?#])/);
    await expect(page).not.toHaveURL(/\/admin\/team/);
  });
});

async function provisionOwner() {
  if (!supabaseAdmin || !pool) throw new Error("Disposable Auth environment is unavailable.");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: ownerEmail,
    password: ownerPassword,
    email_confirm: true,
    user_metadata: { first_name: "Store", last_name: "Owner", full_name: "Store Owner" },
  });
  if (error || !data.user) throw new Error(`Could not provision invitation owner: ${error?.message}`);

  await pool.query(
    `
      insert into public.profiles (id, email, role, status, display_name)
      values ($1::uuid, $2, 'admin', 'active', 'Store Owner')
      on conflict (id) do update
        set email = excluded.email,
            role = 'admin',
            status = 'active',
            display_name = excluded.display_name
    `,
    [data.user.id, ownerEmail],
  );
  await pool.query("delete from public.customers where profile_id = $1::uuid", [data.user.id]);
}

async function cleanupAccount(email: string) {
  if (!supabaseAdmin || !pool) return;
  const authUser = await findAuthUser(email);
  if (authUser) {
    await pool.query("delete from public.customers where profile_id = $1::uuid", [authUser.id]);
    await pool.query("delete from public.profile_details where profile_id = $1::uuid", [authUser.id]);
    await pool.query("delete from public.profiles where id = $1::uuid", [authUser.id]);
    await supabaseAdmin.auth.admin.deleteUser(authUser.id);
  }
}

async function findAuthUser(email: string) {
  if (!supabaseAdmin) return null;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error(`Could not inspect disposable Auth users: ${error.message}`);
    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;
    if (data.users.length < 100) return null;
  }
  return null;
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

  throw new Error(`Timed out waiting for a Supabase Auth invitation for ${email}.`);
}

function decodeEmailSource(source: string) {
  return source.replace(/=\r?\n/g, "").replace(/=3D/gi, "=").replace(/&amp;/g, "&");
}

function mailbox(email: string) {
  return email.split("@")[0];
}
