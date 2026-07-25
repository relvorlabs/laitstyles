import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import { parseArgs, redact, truncate, writeJson, writeText } from "./lib.mjs";

const args = parseArgs();
const outputRoot = resolve(String(args.get("output") ?? "ci-evidence/http"));
const baseUrl = String(
  args.get("base-url") ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
).replace(/\/$/, "");

const cases = [
  { name: "home", method: "GET", path: "/", allowed: [200, 302, 307] },
  { name: "catalogue", method: "GET", path: "/products", allowed: [200, 302, 307] },
  { name: "account", method: "GET", path: "/account", allowed: [200, 302, 307, 401, 403] },
  { name: "admin", method: "GET", path: "/admin", allowed: [200, 302, 307, 401, 403] },
  {
    name: "versioned-health-api",
    method: "GET",
    path: "/api/v1/health",
    allowed: [200],
    validate: assertVersionedHealth,
  },
  {
    name: "versioned-admin-products-api",
    method: "GET",
    path: "/api/v1/admin/products?page=1&pageSize=25",
    allowed: [200, 401, 403],
    validate: ({ response, raw }) =>
      assertVersionedPaginatedAdminResponse({
        response,
        raw,
        label: "Admin products",
      }),
  },
  {
    name: "versioned-admin-holds-api",
    method: "GET",
    path: "/api/v1/admin/holds?page=1&pageSize=25",
    allowed: [200, 401, 403],
    validate: ({ response, raw }) =>
      assertVersionedPaginatedAdminResponse({
        response,
        raw,
        label: "Admin holds",
      }),
  },
  {
    name: "versioned-admin-returns-api",
    method: "GET",
    path: "/api/v1/admin/returns?page=1&pageSize=25",
    allowed: [200, 401, 403],
    validate: ({ response, raw }) =>
      assertVersionedPaginatedAdminResponse({
        response,
        raw,
        label: "Admin returns",
      }),
  },
  {
    name: "versioned-admin-customers-api",
    method: "GET",
    path: "/api/v1/admin/customers?page=1&pageSize=25",
    allowed: [200, 401, 403],
    validate: ({ response, raw }) =>
      assertVersionedPaginatedAdminResponse({
        response,
        raw,
        label: "Admin customers",
      }),
  },
  {
    name: "versioned-admin-settings-api",
    method: "GET",
    path: "/api/v1/admin/settings",
    allowed: [200, 401, 403],
    validate: ({ response, raw }) =>
      assertVersionedAdminResource({
        response,
        raw,
        label: "Admin settings",
      }),
  },
  {
    name: "versioned-admin-overview-api",
    method: "GET",
    path: "/api/v1/admin/overview",
    allowed: [200, 401, 403],
    validate: ({ response, raw }) =>
      assertVersionedAdminResource({
        response,
        raw,
        label: "Admin overview",
      }),
  },
  {
    name: "versioned-inventory-adjustment-api",
    method: "POST",
    path: "/api/v1/admin/inventory/adjustments",
    allowed: [401, 403],
    body: {
      productId: "22222222-2222-4222-8222-222222222222",
      variantId: null,
      quantityDelta: 1,
      note: "HTTP smoke authorization check",
    },
    validate: ({ response, raw }) =>
      assertVersionedProtectedMutation({
        response,
        raw,
        label: "Inventory adjustment authorization",
      }),
  },
  {
    name: "versioned-hold-release-api",
    method: "POST",
    path: "/api/v1/admin/holds/22222222-2222-4222-8222-222222222222/release",
    allowed: [401, 403],
    validate: ({ response, raw }) =>
      assertVersionedProtectedMutation({
        response,
        raw,
        label: "Hold release authorization",
      }),
  },
];

async function requestWithRedirects(testCase) {
  const redirects = [];
  let url = `${baseUrl}${testCase.path}`;
  let response;
  const started = performance.now();

  for (let count = 0; count < 6; count += 1) {
    response = await fetch(url, {
      method: testCase.method,
      redirect: "manual",
      headers: testCase.body ? { "content-type": "application/json" } : undefined,
      body: testCase.body ? JSON.stringify(testCase.body) : undefined,
    });
    const location = response.headers.get("location");
    if (![301, 302, 303, 307, 308].includes(response.status) || !location) break;
    redirects.push({ status: response.status, from: url, to: location });
    url = new URL(location, url).toString();
  }

  if (!response) throw new Error(`No response for ${testCase.name}`);
  const raw = await response.text();
  const durationMs = performance.now() - started;
  let contractError = null;

  if (testCase.validate) {
    try {
      testCase.validate({ response, raw });
    } catch (error) {
      contractError = error instanceof Error ? error.message : String(error);
    }
  }

  const statusPassed = testCase.allowed.includes(response.status) && response.status < 500;
  return {
    name: testCase.name,
    method: testCase.method,
    path: testCase.path,
    finalUrl: url,
    status: response.status,
    allowed: testCase.allowed,
    passed: statusPassed && contractError === null,
    durationMs: Math.round(durationMs),
    redirects,
    headers: {
      "cache-control": response.headers.get("cache-control"),
      "content-type": response.headers.get("content-type"),
      location: response.headers.get("location"),
      "x-request-id": response.headers.get("x-request-id"),
    },
    bodyPreview: truncate(redact(raw), 2_000),
    contractError,
  };
}

const results = [];
for (const testCase of cases) {
  try {
    results.push(await requestWithRedirects(testCase));
  } catch (error) {
    results.push({
      name: testCase.name,
      method: testCase.method,
      path: testCase.path,
      allowed: testCase.allowed,
      passed: false,
      status: "error",
      error: redact(error instanceof Error ? error.stack ?? error.message : String(error)),
    });
  }
}

const failures = results.filter((result) => !result.passed);
const manifest = {
  schemaVersion: 1,
  kind: "http-smoke",
  repository: process.env.GITHUB_REPOSITORY ?? null,
  workflow: process.env.GITHUB_WORKFLOW ?? null,
  runId: process.env.GITHUB_RUN_ID ?? null,
  job: process.env.GITHUB_JOB ?? null,
  sha: process.env.GITHUB_SHA ?? null,
  baseUrl,
  generatedAt: new Date().toISOString(),
  status: failures.length ? "failed" : "passed",
  results: results.map((result) => ({
    ...result,
    required: true,
    status: result.passed ? "passed" : "failed",
    failureTail: result.passed
      ? null
      : result.error ?? result.contractError ?? `Unexpected HTTP status ${result.status}`,
  })),
};
await writeJson(resolve(outputRoot, "manifest.json"), manifest);
const summary = [
  "## HTTP and API smoke",
  "",
  "| Request | Status | Duration | Result |",
  "| --- | ---: | ---: | --- |",
  ...results.map((result) => {
    const status = result.status ?? "error";
    const duration = result.durationMs ?? 0;
    const outcome = result.passed ? "✅" : "❌";
    return `| ${result.method} ${result.path} | ${status} | ${duration}ms | ${outcome} |`;
  }),
];
if (failures.length) {
  summary.push("", "### Failures");
  for (const failure of failures) {
    const reason = failure.error ?? failure.contractError ?? `unexpected status ${failure.status}`;
    summary.push(`- **${failure.name}:** ${reason}`);
  }
}
await writeText(resolve(outputRoot, "summary.md"), summary.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary.join("\n")}\n`, "utf8");
}
if (failures.length) process.exit(1);

function assertJsonRequestId(response) {
  if (!response.headers.get("content-type")?.includes("application/json")) {
    throw new Error("Versioned API response is not JSON.");
  }
  if (!response.headers.get("x-request-id")) {
    throw new Error("Versioned API response is missing x-request-id.");
  }
}

function assertVersionedHealth({ response, raw }) {
  assertJsonRequestId(response);
  const payload = JSON.parse(raw);
  if (
    payload?.data?.status !== "ok" ||
    payload?.data?.service !== "laitstyles" ||
    typeof payload?.data?.timestamp !== "string" ||
    payload?.meta?.version !== "v1"
  ) {
    throw new Error("Versioned health response does not match the Phase 3 contract.");
  }
}

function assertVersionedPaginatedAdminResponse({ response, raw, label }) {
  assertJsonRequestId(response);
  const payload = JSON.parse(raw);
  if (response.status === 200) {
    if (
      !Array.isArray(payload?.data) ||
      typeof payload?.meta?.page !== "number" ||
      typeof payload?.meta?.pageSize !== "number" ||
      typeof payload?.meta?.total !== "number" ||
      typeof payload?.meta?.pageCount !== "number"
    ) {
      throw new Error(`${label} success response does not match the paginated envelope.`);
    }
    return;
  }
  assertErrorEnvelope(payload, `${label} authorization`);
}

function assertVersionedAdminResource({ response, raw, label }) {
  assertJsonRequestId(response);
  const payload = JSON.parse(raw);
  if (response.status === 200) {
    if (!payload?.data || typeof payload.data !== "object" || Array.isArray(payload.data)) {
      throw new Error(`${label} success response does not match the resource envelope.`);
    }
    return;
  }
  assertErrorEnvelope(payload, `${label} authorization`);
}

function assertVersionedProtectedMutation({ response, raw, label }) {
  assertJsonRequestId(response);
  const payload = JSON.parse(raw);
  assertErrorEnvelope(payload, label);
}

function assertErrorEnvelope(payload, label) {
  if (typeof payload?.error?.code !== "string" || typeof payload?.error?.message !== "string") {
    throw new Error(`${label} response does not match the error envelope.`);
  }
}
