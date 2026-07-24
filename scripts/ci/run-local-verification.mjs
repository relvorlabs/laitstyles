#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const output = resolve(root, "ci-evidence/local-verification");
const flags = new Set(process.argv.slice(2));
const fix = flags.has("--fix");
const full = flags.has("--full");
const browser = flags.has("--browser");
const nodeMajor = Number(process.versions.node.split(".")[0]);
const results = [];

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

results.push({
  name: "node-version",
  command: "node -p process.version",
  status: nodeMajor === 25 ? "passed" : "failed",
  exitCode: nodeMajor === 25 ? 0 : 1,
  detail: nodeMajor === 25 ? process.version : `Expected Node 25.x but found ${process.version}.`,
});

if (fix) runSuite("safe-repair");
runSuite("static");
runSuite("tests");

if (full) {
  runSuite("database");
  runSuite("build");
} else {
  runSuite("react");
}

if (browser) {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
  const reachable = await checkBrowserTarget(baseUrl);
  results.push({
    name: "browser-target",
    command: `GET ${baseUrl}/products`,
    status: reachable ? "passed" : "failed",
    exitCode: reachable ? 0 : 1,
    detail: reachable
      ? `Playwright target is reachable at ${baseUrl}.`
      : `Start the application first or set PLAYWRIGHT_BASE_URL. Could not reach ${baseUrl}/products.`,
  });

  if (reachable) {
    for (const project of ["desktop-chromium", "tablet-chromium", "mobile-chromium"]) {
      runSuite("playwright", project);
    }
  }
}

const failed = results.filter((result) => result.status === "failed");
const warnings = results.filter((result) => result.status === "passed-with-warnings");
const summary = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  mode: { fix, full, browser },
  passed: results.length - failed.length - warnings.length,
  warnings: warnings.length,
  failed: failed.length,
  results,
};

writeFileSync(resolve(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
writeFileSync(
  resolve(output, "summary.md"),
  [
    "# Local verification evidence",
    "",
    `Generated: ${summary.generatedAt}`,
    `Node: ${summary.node}`,
    `Mode: fix=${fix}, full=${full}, browser=${browser}`,
    `Result: ${summary.passed} passed, ${summary.warnings} warning suites, ${summary.failed} failed`,
    "",
    "| Check | Result | Exit code |",
    "| --- | ---: | ---: |",
    ...results.map((result) => `| ${result.name} | ${result.status} | ${result.exitCode} |`),
    "",
    "Every suite stores its manifest, summary, and raw logs below this directory.",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`\nLocal verification: ${summary.passed} passed, ${summary.warnings} warnings, ${summary.failed} failed.`);
console.log(`Evidence: ${output}`);
process.exit(failed.length === 0 ? 0 : 1);

function runSuite(suite, project = "") {
  const label = project ? `${suite}:${project}` : suite;
  const suiteOutput = resolve(output, project ? `${suite}/${project}` : suite);
  const commandArgs = [
    "scripts/ci/run-gates.mjs",
    "--suite",
    suite,
    "--output",
    suiteOutput,
  ];
  if (project) commandArgs.push("--project", project);

  console.log(`\n=== ${label} ===`);
  const result = spawnSync(process.execPath, commandArgs, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    shell: false,
    stdio: "inherit",
  });
  const exitCode = result.error ? 1 : (result.status ?? 1);
  let status = exitCode === 0 ? "passed" : "failed";

  try {
    const manifest = JSON.parse(readFileSync(resolve(suiteOutput, "manifest.json"), "utf8"));
    status = manifest.status;
  } catch {
    // Missing evidence is a failure, never an implied pass.
    status = "failed";
  }

  results.push({
    name: label,
    command: `${process.execPath} ${commandArgs.join(" ")}`,
    status,
    exitCode,
    detail: result.error?.message ?? null,
  });
}

async function checkBrowserTarget(baseUrl) {
  try {
    const response = await fetch(new URL("/products", baseUrl), {
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
