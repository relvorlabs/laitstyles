#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = process.cwd();
const errors = [];

const requiredFiles = [
  "src/lib/http/contracts.ts",
  "src/lib/http/client.ts",
  "src/lib/http/server.ts",
  "src/lib/http/request-context.ts",
  "src/lib/http/request.ts",
  "src/lib/http/auth.ts",
  "src/lib/http/policy.ts",
  "src/lib/http/pagination.ts",
  "src/lib/errors/api-error.ts",
  "src/lib/query/app-query-client.ts",
  "src/modules/health/schema.ts",
  "src/modules/health/server/queries.ts",
  "src/modules/health/client/api.ts",
  "src/app/api/v1/health/route.ts",
  "src/lib/http/server.test.ts",
  "src/lib/http/client.test.ts",
  "src/lib/http/request.test.ts",
  "src/lib/http/auth.test.ts",
  "src/lib/http/policy.test.ts",
  "src/lib/http/pagination.test.ts",
  "src/lib/query/app-query-client.test.ts",
  "src/app/api/v1/health/route.test.ts",
];

for (const path of requiredFiles) {
  if (!existsSync(resolve(root, path))) errors.push(`Required Phase 3 file is missing: ${path}`);
}

const contracts = read("src/lib/http/contracts.ts");
const client = read("src/lib/http/client.ts");
const server = read("src/lib/http/server.ts");
const requestContext = read("src/lib/http/request-context.ts");
const requestValidation = read("src/lib/http/request.ts");
const auth = read("src/lib/http/auth.ts");
const policy = read("src/lib/http/policy.ts");
const pagination = read("src/lib/http/pagination.ts");
const appQueryClient = read("src/lib/query/app-query-client.ts");
const appProvider = read("src/providers/providers.tsx");
const healthQuery = read("src/modules/health/server/queries.ts");
const healthClient = read("src/modules/health/client/api.ts");
const healthRoute = read("src/app/api/v1/health/route.ts");
const httpSmoke = read("scripts/ci/http-smoke.mjs");

if (
  !contracts.includes("ApiSuccess") ||
  !contracts.includes("ApiFailure") ||
  !contracts.includes("ApiPaginationMeta")
) {
  errors.push("The HTTP contract must expose success, failure and pagination envelopes.");
}
if (!contracts.includes("meta?:") || !contracts.includes("Record<string, string>")) {
  errors.push(
    "Success metadata must be optional and field errors must match the approved contract.",
  );
}

for (const [path, source] of [
  ["src/lib/http/server.ts", server],
  ["src/lib/http/request-context.ts", requestContext],
  ["src/lib/http/request.ts", requestValidation],
  ["src/lib/http/auth.ts", auth],
  ["src/lib/http/policy.ts", policy],
  ["src/modules/health/server/queries.ts", healthQuery],
]) {
  if (!source.includes('import "server-only"')) {
    errors.push(`${path} must remain server-only.`);
  }
}

if (!server.includes("handleApiRequest") || !server.includes("VALIDATION_ERROR")) {
  errors.push("The server HTTP adapter must map route operations and validation failures.");
}
if (!server.includes("INTERNAL_ERROR") || !server.includes("The request could not be completed.")) {
  errors.push("Unexpected API failures must use the sanitized stable error contract.");
}
if (!server.includes("createApiRequestContext") || !server.includes("withRequestId")) {
  errors.push("The server adapter must attach request correlation to every response.");
}
if (!requestContext.includes("x-request-id") || !requestContext.includes("crypto.randomUUID")) {
  errors.push("Request correlation must accept a safe incoming ID or generate one.");
}
if (
  !requestValidation.includes("parseJsonBody") ||
  !requestValidation.includes("parseSearchParams")
) {
  errors.push("Phase 3 must expose shared JSON body and search-parameter validation helpers.");
}
if (
  !auth.includes("requireApiSession") ||
  !auth.includes("requireApiConsumer") ||
  !auth.includes("requireApiStaff")
) {
  errors.push("Phase 3 must expose reusable API authentication helpers.");
}
if (!policy.includes("requireApiPermission")) {
  errors.push("Phase 3 must expose a reusable domain-policy assertion helper.");
}
if (!pagination.includes("paginationQuerySchema") || !pagination.includes("createPaginationMeta")) {
  errors.push("Phase 3 must expose bounded pagination input and response metadata helpers.");
}

if (/from\s+["']@\/modules\/[^"']+\/server\//.test(client)) {
  errors.push("The shared browser API client must not import domain server modules.");
}
if (/from\s+["']@\/lib\/(?:prisma|supabase\/server)/.test(client)) {
  errors.push("The shared browser API client must not import server persistence infrastructure.");
}
if (!client.includes("NETWORK_ERROR") || !client.includes("AbortError")) {
  errors.push(
    "The browser API client must distinguish network failures and preserve cancellation.",
  );
}

if (!appQueryClient.includes("APP_QUERY_DEFAULTS")) {
  errors.push("The shared QueryClient must publish intentional cache defaults.");
}
if (!appProvider.includes("getAppQueryClient")) {
  errors.push("The shared AppProvider must use the app QueryClient contract.");
}
if (existsSync(resolve(root, "src/lib/query/query-client.ts"))) {
  errors.push("The ambiguous app-wide query-client module must be retired in Phase 3.");
}

if (!healthClient.includes("apiRequest") || healthClient.includes("/server/")) {
  errors.push("The health browser client must use the typed API client without server imports.");
}
if (
  !healthRoute.includes("handleApiRequest(request") ||
  !healthRoute.includes("getHealthStatus")
) {
  errors.push("The versioned health route must pass Request context to the shared server adapter.");
}
if (!httpSmoke.includes("/api/v1/health") || !httpSmoke.includes("x-request-id")) {
  errors.push(
    "Runtime HTTP smoke must prove the versioned health and request-correlation contract.",
  );
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
