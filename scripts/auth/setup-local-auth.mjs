#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { config as loadEnv } from "dotenv";

import { assertDisposableAcceptanceDatabase } from "../../src/test/persistence-harness.ts";

const root = resolve(import.meta.dirname, "../..");
const envPath = resolve(root, ".env.auth-test.local");

if (existsSync(envPath)) loadEnv({ path: envPath, override: true, quiet: true });

const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  throw new Error(
    `Pre-provisioned auth test environment is incomplete: missing ${missing.join(", ")}`,
  );
}

assertDisposableAcceptanceDatabase();
assertSafeAuthHost(process.env.NEXT_PUBLIC_SUPABASE_URL);

console.log("Pre-provisioned disposable database and Auth test environment passed safety checks.");

function assertSafeAuthHost(rawUrl) {
  let authUrl;
  try {
    authUrl = new URL(rawUrl);
  } catch {
    throw new Error("Pre-provisioned auth test environment has an invalid Auth URL");
  }

  const hostname = authUrl.hostname.toLowerCase();
  const local = new Set(["127.0.0.1", "::1", "localhost"]);
  const allowed = new Set(
    (process.env.LAITSTYLES_ACCEPTANCE_AUTH_HOSTS ?? "")
      .split(",")
      .map((host) => host.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!local.has(hostname) && !allowed.has(hostname)) {
    throw new Error("Pre-provisioned auth test environment is not explicitly disposable");
  }
}
