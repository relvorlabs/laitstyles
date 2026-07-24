#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const envPath = resolve(root, ".env.auth-test.local");

run("supabase", ["start"]);

const status = run("supabase", ["status", "-o", "env"], { capture: true });
const values = parseEnv(status.stdout);
const apiUrl = values.API_URL ?? values.SUPABASE_URL;
const anonKey = values.PUBLISHABLE_KEY ?? values.ANON_KEY;
const serviceRoleKey = values.SECRET_KEY ?? values.SERVICE_ROLE_KEY;
const databaseUrl = values.DB_URL;

if (!apiUrl || !anonKey || !serviceRoleKey || !databaseUrl) {
  throw new Error(
    "Supabase status did not return API_URL, an anonymous/publishable key, a service-role key and DB_URL.",
  );
}

const authEnv = {
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
  NEXT_PUBLIC_SUPABASE_URL: apiUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: anonKey,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  AUTH_EMAIL_INBOX_URL: "http://127.0.0.1:54324",
  PLAYWRIGHT_BASE_URL: "http://127.0.0.1:3000",
};

writeFileSync(
  envPath,
  Object.entries(authEnv)
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join("\n") + "\n",
  "utf8",
);

const childEnv = { ...process.env, ...authEnv };
run("pnpm", ["prisma:generate"], { env: childEnv });
run("pnpm", ["prisma:migrate:deploy"], { env: childEnv });

console.log(`Local Supabase Auth is ready. Test environment written to ${envPath}`);
console.log("Auth email inbox: http://127.0.0.1:54324");

function parseEnv(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    result[key] = raw.replace(/^['\"]|['\"]$/g, "");
  }
  return result;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: options.env ?? process.env,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });

  if (result.error) {
    if (result.error.code === "ENOENT") {
      throw new Error(
        `${command} is not installed or is not on PATH. Install the Supabase CLI and pnpm before running local Auth tests.`,
      );
    }
    throw result.error;
  }
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed.${detail ? `\n${detail}` : ""}`);
  }
  return result;
}
