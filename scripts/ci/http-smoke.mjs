import { performance } from "node:perf_hooks";
import { resolve } from "node:path";

import { parseArgs, redact, truncate, writeJson, writeText } from "./lib.mjs";

const args = parseArgs();
const outputRoot = resolve(String(args.get("output") ?? "ci-evidence/http"));
const baseUrl = String(args.get("base-url") ?? process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

const cases = [
  { name: "home", method: "GET", path: "/", allowed: [200, 302, 307] },
  { name: "catalogue", method: "GET", path: "/products", allowed: [200, 302, 307] },
  { name: "account", method: "GET", path: "/account", allowed: [200, 302, 307, 401, 403] },
  { name: "admin", method: "GET", path: "/admin", allowed: [200, 302, 307, 401, 403] },
  {
    name: "inventory-api",
    method: "GET",
    path: "/api/admin/inventory/products",
    allowed: [200, 302, 307, 401, 403],
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
  return {
    name: testCase.name,
    method: testCase.method,
    path: testCase.path,
    finalUrl: url,
    status: response.status,
    allowed: testCase.allowed,
    passed: testCase.allowed.includes(response.status) && response.status < 500,
    durationMs: Math.round(durationMs),
    redirects,
    headers: {
      "cache-control": response.headers.get("cache-control"),
      "content-type": response.headers.get("content-type"),
      location: response.headers.get("location"),
      "x-request-id": response.headers.get("x-request-id"),
    },
    bodyPreview: truncate(redact(raw), 2_000),
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
    failureTail: result.passed ? null : result.error ?? `Unexpected HTTP status ${result.status}`,
  })),
};
await writeJson(resolve(outputRoot, "manifest.json"), manifest);
const summary = [
  "## HTTP and API smoke",
  "",
  "| Request | Status | Duration | Result |",
  "| --- | ---: | ---: | --- |",
  ...results.map(
    (result) =>
      `| ${result.method} ${result.path} | ${result.status ?? "error"} | ${result.durationMs ?? 0}ms | ${result.passed ? "✅" : "❌"} |`,
  ),
];
if (failures.length) {
  summary.push("", "### Failures");
  for (const failure of failures) summary.push(`- **${failure.name}:** ${failure.error ?? `unexpected status ${failure.status}`}`);
}
await writeText(resolve(outputRoot, "summary.md"), summary.join("\n"));
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary.join("\n")}\n`, "utf8");
}
if (failures.length) process.exit(1);
