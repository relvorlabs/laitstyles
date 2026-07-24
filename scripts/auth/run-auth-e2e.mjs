#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const evidenceDir = resolve(root, "ci-evidence/local-auth");
const envPath = resolve(root, ".env.auth-test.local");
const runAllBrowserTests = process.argv.includes("--all");
mkdirSync(evidenceDir, { recursive: true });

let server;
let serverLog;
let exitCode = 1;

try {
  run("node", ["scripts/auth/setup-local-auth.mjs"]);
  const authEnv = parseEnvFile(envPath);
  const env = {
    ...process.env,
    ...authEnv,
  };

  run("pnpm", ["build"], { env });
  run("pnpm", ["exec", "playwright", "install", "chromium"], { env });

  serverLog = openSync(resolve(evidenceDir, "server.log"), "w");
  server = spawn(
    "pnpm",
    ["exec", "next", "start", "--hostname", "127.0.0.1", "--port", "3000"],
    {
      cwd: root,
      env,
      shell: process.platform === "win32",
      stdio: ["ignore", serverLog, serverLog],
    },
  );

  await waitForHttp("http://127.0.0.1:3000/auth/sign-up", server);

  if (runAllBrowserTests) {
    const generalResult = runPlaywright(
      ["test"],
      "playwright-responsive",
      {
        ...env,
        AUTH_E2E: "0",
      },
    );
    if (generalResult !== 0) {
      exitCode = generalResult;
      throw new Error("Responsive Playwright suite failed; Auth journey was not started.");
    }
  }

  exitCode = runPlaywright(
    ["test", "tests/e2e/auth-flows.spec.ts", "--project=desktop-chromium"],
    "playwright-auth",
    {
      ...env,
      AUTH_E2E: "1",
    },
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  if (server && server.exitCode === null) server.kill("SIGTERM");
  if (serverLog !== undefined) closeSync(serverLog);
  spawnSync("supabase", ["stop", "--no-backup"], {
    cwd: root,
    shell: process.platform === "win32",
    stdio: "inherit",
  });
}

process.exit(exitCode);

function runPlaywright(args, evidenceName, env) {
  const outputDir = `ci-evidence/local-auth/${evidenceName}/test-results`;
  const result = spawnSync("pnpm", ["exec", "playwright", ...args], {
    cwd: root,
    env: {
      ...env,
      PLAYWRIGHT_OUTPUT_DIR: outputDir,
      PLAYWRIGHT_REPORT_DIR: `ci-evidence/local-auth/${evidenceName}/playwright-report`,
      PLAYWRIGHT_JSON_OUTPUT: `${outputDir}/results.json`,
      PLAYWRIGHT_JUNIT_OUTPUT: `${outputDir}/junit.xml`,
    },
    encoding: "utf8",
    shell: process.platform === "win32",
  });

  writeFileSync(
    resolve(evidenceDir, `${evidenceName}.stdout.log`),
    result.stdout ?? "",
    "utf8",
  );
  writeFileSync(
    resolve(evidenceDir, `${evidenceName}.stderr.log`),
    result.stderr ?? "",
    "utf8",
  );
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.error) throw result.error;
  return result.status ?? 1;
}

function parseEnvFile(path) {
  const result = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    try {
      result[key] = JSON.parse(raw);
    } catch {
      result[key] = raw;
    }
  }
  return result;
}

async function waitForHttp(url, child) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Next.js exited before becoming ready with code ${child.exitCode}.`);
    }
    try {
      const response = await fetch(url, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 1_000));
  }
  throw new Error(`Timed out waiting for ${url}.`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    env: options.env ?? process.env,
    encoding: "utf8",
    shell: process.platform === "win32",
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with code ${result.status}.`);
  }
}
