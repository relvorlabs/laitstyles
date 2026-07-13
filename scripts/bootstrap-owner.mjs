#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env.local");
const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
    "display-name": { type: "string" },
    org: { type: "string" },
    store: { type: "string" },
    slug: { type: "string" },
    "update-password": { type: "boolean", default: false },
  },
  allowPositionals: false,
});

const requiredArgs = ["email", "password", "org", "store", "slug"];
const missingArgs = requiredArgs.filter((key) => !values[key]);

if (missingArgs.length > 0) {
  fail(`Missing required arguments: ${missingArgs.map((key) => `--${key}`).join(", ")}`);
}

const email = normalizeEmail(values.email);
const password = String(values.password);
const displayName = values["display-name"]?.trim() || email.split("@")[0];
const organizationName = String(values.org).trim();
const storeName = String(values.store).trim();
const storeSlug = String(values.slug).trim();

if (password.length < 12) {
  fail("Owner passwords must be at least 12 characters long.");
}

if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug)) {
  fail("--slug must use lowercase letters, numbers and single hyphens only.");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  fail(
    "Set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL plus SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY before bootstrapping an owner.",
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

const ownerUser = await ensureAuthUser({
  email,
  password,
  displayName,
  updatePassword: Boolean(values["update-password"]),
});

await upsertProfile(ownerUser.id, email, displayName);
const { organizationId, storeId } = await ensureOrganizationAndStore({
  organizationName,
  ownerProfileId: ownerUser.id,
  storeName,
  storeSlug,
});
await ensureOwnerMembership({ storeId, profileId: ownerUser.id });

console.log(
  [
    "Owner bootstrap complete.",
    `user_id=${ownerUser.id}`,
    `organization_id=${organizationId}`,
    `store_id=${storeId}`,
    "owner_membership_created_by_cli=true",
  ].join("\n"),
);

async function ensureAuthUser({ email, password, displayName, updatePassword }) {
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    if (updatePassword) {
      const { error } = await supabase.auth.admin.updateUserById(existingUser.id, { password });
      if (error) {
        fail(`Could not update existing owner password: ${error.message}`);
      }
    }

    return existingUser;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });

  if (error || !data.user) {
    fail(`Could not create owner auth user: ${error?.message ?? "unknown error"}`);
  }

  return data.user;
}

async function findUserByEmail(email) {
  let page = 1;

  while (page <= 10) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });

    if (error) {
      fail(`Could not list auth users: ${error.message}`);
    }

    const user = data.users.find((candidate) => normalizeEmail(candidate.email) === email);
    if (user) {
      return user;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  fail("Owner lookup exceeded 1,000 users. Use a project-scoped bootstrap key and retry.");
}

async function upsertProfile(id, email, displayName) {
  const { error } = await supabase.from("profiles").upsert(
    {
      id,
      email,
      display_name: displayName,
    },
    { onConflict: "id" },
  );

  if (error) {
    fail(`Could not upsert owner profile: ${error.message}`);
  }
}

async function ensureOrganizationAndStore({
  organizationName,
  ownerProfileId,
  storeName,
  storeSlug,
}) {
  const { data: existingStore, error: storeLookupError } = await supabase
    .from("stores")
    .select("id, organization_id")
    .eq("slug", storeSlug)
    .maybeSingle();

  if (storeLookupError) {
    fail(`Could not check existing store: ${storeLookupError.message}`);
  }

  if (existingStore) {
    await updateOrganizationOwner(existingStore.organization_id, ownerProfileId);
    return { organizationId: existingStore.organization_id, storeId: existingStore.id };
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({ name: organizationName, owner_profile_id: ownerProfileId })
    .select("id")
    .single();

  if (organizationError || !organization) {
    fail(`Could not create organization: ${organizationError?.message ?? "unknown error"}`);
  }

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .insert({ organization_id: organization.id, name: storeName, slug: storeSlug, status: "active" })
    .select("id")
    .single();

  if (storeError || !store) {
    fail(`Could not create store: ${storeError?.message ?? "unknown error"}`);
  }

  return { organizationId: organization.id, storeId: store.id };
}

async function updateOrganizationOwner(organizationId, ownerProfileId) {
  const { error } = await supabase
    .from("organizations")
    .update({ owner_profile_id: ownerProfileId })
    .eq("id", organizationId);

  if (error) {
    fail(`Could not attach owner to existing organization: ${error.message}`);
  }
}

async function ensureOwnerMembership({ storeId, profileId }) {
  const { error } = await supabase.from("store_memberships").upsert(
    {
      store_id: storeId,
      profile_id: profileId,
      role: "owner",
      status: "active",
      created_by_cli: true,
    },
    { onConflict: "store_id,profile_id" },
  );

  if (error) {
    fail(`Could not create owner membership: ${error.message}`);
  }
}

function normalizeEmail(value) {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    fail("Provide a valid --email address.");
  }

  return email;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
