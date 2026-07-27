#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { createServerClient } from "@supabase/ssr";
import { PrismaClient } from "../../prisma/generated/prisma/client.js";
import {
  assertProductAuthorizationResponse,
  parseAuthorizationDomain,
  requireProductAuthorizationActors,
} from "./product-authorization-contract.mjs";

const root = resolve(import.meta.dirname, "../..");
const evidenceDir = resolve(root, "ci-evidence/local-auth");
const envPath = resolve(root, ".env.auth-test.local");
const runAllBrowserTests = process.argv.includes("--all");
const authorizationOnly = process.argv.includes("--authorization");
mkdirSync(evidenceDir, { recursive: true });

let server;
let serverLog;
let exitCode = 1;

try {
  run("pnpm", ["exec", "tsx", "scripts/auth/setup-local-auth.mjs"]);
  const authEnv = parseEnvFile(envPath);
  const env = {
    ...process.env,
    ...authEnv,
  };

  if (authorizationOnly) {
    const domain = parseAuthorizationDomain(process.argv.slice(2));
    const actors = requireProductAuthorizationActors(env);
    run("pnpm", ["build"], { env });
    startServer(env);
    await waitForHttp("http://127.0.0.1:3000/api/v1/admin/products", server);
    if (domain === "products") await runProductAuthorizationJourney(env, actors);
    exitCode = 0;
  } else {
    run("pnpm", ["build"], { env });
    run("pnpm", ["exec", "playwright", "install", "chromium"], { env });

    startServer(env);
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
      [
        "test",
        "tests/e2e/auth-flows.spec.ts",
        "tests/e2e/manager-invitation.spec.ts",
        "--project=desktop-chromium",
      ],
      "playwright-auth",
      {
        ...env,
        AUTH_E2E: "1",
      },
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  if (server && server.exitCode === null) server.kill("SIGTERM");
  if (serverLog !== undefined) closeSync(serverLog);
}

process.exit(exitCode);

function startServer(env) {
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
}

async function runProductAuthorizationJourney(env, actors) {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: env.DATABASE_URL,
      max: 2,
      connectionTimeoutMillis: 10_000,
    }),
  });
  const prefix = "acceptance-p45-authz-products-";

  try {
    await cleanupAuthorizationProducts(prisma, prefix);
    for (const actor of ["anonymous", "consumer", "manager", "admin"]) {
      const before = await prisma.products.count({ where: { name: { startsWith: prefix } } });
      const cookie =
        actor === "anonymous" ? undefined : await productActorCookie(env, actors[actor]);
      const response = await fetch("http://127.0.0.1:3000/api/v1/admin/products", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(cookie ? { cookie } : {}),
        },
        body: JSON.stringify(productCreatePayload(`${prefix}${actor}`)),
      });
      const payload = await safeJson(response);
      assertProductAuthorizationResponse(actor, response.status, payload);
      const after = await prisma.products.count({ where: { name: { startsWith: prefix } } });

      if (actor === "anonymous" || actor === "consumer") {
        if (after !== before) throw new Error(`Denied ${actor} Product request created a row`);
      } else {
        if (after !== before + 1) {
          throw new Error(`Authorized ${actor} Product request was not persisted`);
        }
        const productId = payload.data.product.id;
        const direct = await prisma.products.findUnique({ where: { id: productId } });
        if (!direct || direct.name !== `${prefix}${actor}`) {
          throw new Error(`Authorized ${actor} Product row did not match the API response`);
        }
      }
    }
    console.log("Product authorization acceptance passed for anonymous, consumer, manager and admin.");
  } finally {
    await cleanupAuthorizationProducts(prisma, prefix);
    await prisma.$disconnect();
  }
}

async function productActorCookie(env, credentials) {
  const jar = new Map();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (values) => {
          for (const { name, value } of values) jar.set(name, value);
        },
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) throw new Error("A pre-provisioned Product authorization actor could not sign in");
  return [...jar].map(([name, value]) => `${name}=${value}`).join("; ");
}

async function cleanupAuthorizationProducts(prisma, prefix) {
  const products = await prisma.products.findMany({
    where: { name: { startsWith: prefix } },
    select: { id: true },
  });
  const productIds = products.map(({ id }) => id);
  if (!productIds.length) return;
  await prisma.$transaction(async (tx) => {
    await tx.stock_movements.deleteMany({ where: { product_id: { in: productIds } } });
    await tx.audit_events.deleteMany({
      where: { target_table: "products", target_id: { in: productIds } },
    });
    await tx.products.deleteMany({ where: { id: { in: productIds } } });
  });
}

function productCreatePayload(name) {
  return {
    intent: "draft",
    values: {
      productId: null,
      inventoryMode: "stocked",
      name,
      category: "",
      brand: "",
      material: "",
      fit: "",
      style: "",
      careInstructions: "",
      flawNotes: "",
      description: "",
      collection: "",
      internalReference: name.toUpperCase(),
      media: [],
      sellingPrice: null,
      referencePrice: null,
      cost: null,
      lowStockThreshold: 1,
      channels: [],
      fulfilment: {
        weightKg: null,
        pickupAvailable: true,
        deliveryRestrictions: "",
        packagingNotes: "",
      },
      scheduledAt: "",
      stocked: { sizeLabel: "", colour: "", quantity: 1 },
    },
  };
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    throw new Error(`Product authorization response was not JSON (status ${response.status})`);
  }
}

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
