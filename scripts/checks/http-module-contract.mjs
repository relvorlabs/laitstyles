#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const errors = [];

const requiredFiles = [
  "src/lib/http/contracts.ts",
  "src/lib/http/client.ts",
  "src/lib/http/server.ts",
  "src/lib/errors/api-error.ts",
  "src/modules/health/schema.ts",
  "src/modules/health/server/queries.ts",
  "src/modules/health/client/api.ts",
  "src/app/api/v1/health/route.ts",
  "src/lib/http/server.test.ts",
  "src/lib/http/client.test.ts",
  "src/app/api/v1/health/route.test.ts",
];

for (const path of requiredFiles) {
  if (!existsSync(resolve(root, path))) errors.push(`Required Phase 3 file is missing: ${path}`);
}

const contracts = read("src/lib/http/contracts.ts");
const client = read("src/lib/http/client.ts");
const server = read("src/lib/http/server.ts");
const healthQuery = read("src/modules/health/server/queries.ts");
const healthClient = read("src/modules/health/client/api.ts");
const healthRoute = read("src/app/api/v1/health/route.ts");

if (!contracts.includes("ApiSuccess") || !contracts.includes("ApiFailure")) {
  errors.push("The HTTP contract must expose typed success and failure envelopes.");
}

if (!server.includes('import "server-only"')) {
  errors.push("The server HTTP adapter must remain server-only.");
}
if (!server.includes("handleApiRequest") || !server.includes("VALIDATION_ERROR")) {
  errors.push("The server HTTP adapter must map route operations and validation failures.");
}
if (!server.includes("INTERNAL_ERROR") || !server.includes("The request could not be completed.")) {
  errors.push("Unexpected API failures must use the sanitized stable error contract.");
}

if (/from\s+["']@\/modules\/[^"']+\/server\//.test(client)) {
  errors.push("The shared browser API client must not import domain server modules.");
}
if (/from\s+["']@\/lib\/(?:prisma|supabase\/server)/.test(client)) {
  errors.push("The shared browser API client must not import server persistence infrastructure.");
}

if (!healthQuery.includes('import "server-only"')) {
  errors.push("The health server query must remain server-only.");
}
if (!healthClient.includes("apiRequest") || healthClient.includes("/server/")) {
  errors.push("The health browser client must use the typed API client without server imports.");
}
if (!healthRoute.includes("handleApiRequest") || !healthRoute.includes("getHealthStatus")) {
  errors.push("The versioned health route must remain a thin adapter over the health module query.");
}

const versionedRoutes = walk(resolve(root, "src/app/api/v1"))
  .filter((path) => path.endsWith("/route.ts") || path.endsWith("\\route.ts"))
  .map((path) => relative(root, path).replaceAll("\\", "/"));

for (const path of versionedRoutes) {
  const source = read(path);
  if (!source.includes('from "@/lib/http/server"') || !source.includes("handleApiRequest")) {
    errors.push(`${path} must use the shared typed server HTTP adapter.`);
  }
  if (source.includes("NextResponse.json")) {
    errors.push(`${path} must not construct an ad hoc JSON envelope with NextResponse.json.`);
  }
  if (/from\s+["'][^"']*\/(?:actions?|[^/"']+-actions?)["']/.test(source)) {
    errors.push(`${path} must call a domain operation directly, not a Server Action.`);
  }
}

if (!existsSync(resolve(root, "src/app/api/health/route.ts"))) {
  errors.push("The existing /api/health compatibility endpoint must remain during Phase 3.");
}

const summary = [
  "## Phase 3 HTTP and module contract",
  "",
  `- Versioned routes: ${versionedRoutes.length}`,
  `- Errors: ${errors.length}`,
];
if (errors.length > 0) summary.push("", "### Failures", ...errors.map((error) => `- ${error}`));

const rendered = `${summary.join("\n")}\n`;
process.stdout.write(rendered);

if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, rendered);
}

if (errors.length > 0) process.exit(1);

function read(path) {
  const absolute = resolve(root, path);
  return existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
}

function walk(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}
