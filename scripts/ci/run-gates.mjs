import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  commandLabel,
  ensureParent,
  parseArgs,
  redact,
  secretValues,
  tailLines,
  truncate,
  writeJson,
  writeText,
} from "./lib.mjs";

const args = parseArgs();
const suiteName = String(args.get("suite") ?? "");
const project = String(args.get("project") ?? "");
const outputRoot = resolve(String(args.get("output") ?? `ci-evidence/${suiteName || "unknown"}`));
const baseRef = process.env.CI_BASE_REF?.trim() || "main";
const secrets = secretValues();

const gate = (name, command, commandArgs, timeoutMinutes, required = true) => ({
  name,
  command,
  args: commandArgs,
  timeoutMs: timeoutMinutes * 60_000,
  required,
});

const suites = {
  static: [
    gate("architecture", "pnpm", ["check:architecture"], 8),
    gate("button-audit", "pnpm", ["audit:buttons"], 8),
    gate("biome", "pnpm", ["lint"], 12),
    gate("typescript", "pnpm", ["typecheck"], 18),
    gate("dependency-audit", "pnpm", ["audit", "--prod", "--audit-level", "high"], 12, false),
  ],
  database: [
    gate("prisma-validate", "pnpm", ["prisma:validate"], 8),
    gate("prisma-migrate-deploy", "pnpm", ["prisma:migrate:deploy"], 12),
    gate("prisma-migrate-status", "pnpm", ["prisma:migrate:status"], 8),
  ],
  tests: [
    gate("vitest", "pnpm", ["exec", "vitest", "run", "--passWithNoTests", "--coverage", "--reporter=verbose"], 25),
  ],
  build: [
    gate("production-build", "pnpm", ["build"], 30),
    gate(
      "react-doctor",
      "pnpm",
      ["dlx", "react-doctor@latest", ".", "--verbose", "--scope", "changed", "--base", `origin/${baseRef}`],
      18,
      false,
    ),
  ],
  "browser-preflight": [
    gate("prisma-validate", "pnpm", ["prisma:validate"], 8),
    gate("prisma-migrate-deploy", "pnpm", ["prisma:migrate:deploy"], 12),
    gate("prisma-migrate-status", "pnpm", ["prisma:migrate:status"], 8),
    gate("production-build", "pnpm", ["build"], 30),
  ],
  playwright: project
    ? [
        gate(
          `playwright-${project}`,
          "pnpm",
          [
            "exec",
            "playwright",
            "test",
            `--project=${project}`,
            "--retries=2",
            "--grep-invert",
            "captures paired handoff and implementation evidence",
          ],
          35,
        ),
      ]
    : [],
  "safe-repair": [gate("biome-write", "pnpm", ["exec", "biome", "check", "--write", "."], 15)],
};

if (!suiteName || !Object.hasOwn(suites, suiteName)) {
  console.error(`Unknown --suite. Expected one of: ${Object.keys(suites).join(", ")}`);
  process.exit(2);
}
if (suiteName === "playwright" && !project) {
  console.error("--project is required for the playwright suite.");
  process.exit(2);
}

await mkdir(outputRoot, { recursive: true });
const startedAt = new Date();
const results = [];

async function runGate(definition) {
  const logPath = join(outputRoot, `${definition.name}.log`);
  await ensureParent(logPath);
  const start = Date.now();
  let timedOut = false;
  let spawnError = null;
  let exitCode = null;
  let signal = null;
  let output = "";

  console.log(`::group::${definition.name}`);
  console.log(`$ ${commandLabel(definition.command, definition.args)}`);

  await new Promise((resolvePromise) => {
    const child = spawn(definition.command, definition.args, {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: "0" },
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5_000).unref();
    }, definition.timeoutMs);

    const consume = (chunk, destination) => {
      const text = redact(chunk.toString(), secrets);
      output += text;
      destination.write(text);
    };
    child.stdout.on("data", (chunk) => consume(chunk, process.stdout));
    child.stderr.on("data", (chunk) => consume(chunk, process.stderr));
    child.on("error", (error) => {
      spawnError = redact(error.stack ?? error.message, secrets);
    });
    child.on("close", (code, closeSignal) => {
      clearTimeout(timer);
      exitCode = code;
      signal = closeSignal;
      resolvePromise();
    });
  });

  if (spawnError) output += `\n${spawnError}\n`;
  await writeFile(logPath, redact(output, secrets), "utf8");
  const durationMs = Date.now() - start;
  const status = !timedOut && !spawnError && exitCode === 0 ? "passed" : definition.required ? "failed" : "warning";
  const result = {
    name: definition.name,
    suite: suiteName,
    project: project || null,
    required: definition.required,
    status,
    command: commandLabel(definition.command, definition.args),
    exitCode,
    signal,
    timedOut,
    durationMs,
    logPath: logPath.replace(`${process.cwd()}/`, ""),
    failureTail: status === "passed" ? null : tailLines(output, 120),
  };
  console.log("::endgroup::");
  return result;
}

for (const definition of suites[suiteName]) results.push(await runGate(definition));

const failedRequired = results.filter((item) => item.required && item.status === "failed");
const warnings = results.filter((item) => item.status === "warning");
const manifest = {
  schemaVersion: 1,
  kind: "gate-suite",
  repository: process.env.GITHUB_REPOSITORY ?? null,
  workflow: process.env.GITHUB_WORKFLOW ?? null,
  runId: process.env.GITHUB_RUN_ID ?? null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
  job: process.env.GITHUB_JOB ?? null,
  sha: process.env.GITHUB_SHA ?? null,
  ref: process.env.GITHUB_REF ?? null,
  suite: suiteName,
  project: project || null,
  startedAt: startedAt.toISOString(),
  completedAt: new Date().toISOString(),
  status: failedRequired.length ? "failed" : warnings.length ? "passed-with-warnings" : "passed",
  results,
};

await writeJson(join(outputRoot, "manifest.json"), manifest);
const lines = [
  `## ${suiteName}${project ? ` / ${project}` : ""}`,
  "",
  `**Result:** ${manifest.status}`,
  "",
  "| Gate | Required | Result | Duration |",
  "| --- | --- | --- | ---: |",
  ...results.map(
    (result) =>
      `| ${result.name} | ${result.required ? "yes" : "advisory"} | ${result.status} | ${(result.durationMs / 1000).toFixed(1)}s |`,
  ),
];
if (failedRequired.length || warnings.length) {
  lines.push("", "### Diagnostics");
  for (const result of [...failedRequired, ...warnings]) {
    lines.push(
      "",
      `<details><summary>${result.status === "failed" ? "❌" : "⚠️"} ${result.name}</summary>`,
      "",
      "```text",
      truncate(result.failureTail ?? "No output was captured.", 18_000),
      "```",
      "</details>",
    );
  }
}
const summary = `${lines.join("\n")}\n`;
await writeText(join(outputRoot, "summary.md"), summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  const existing = await readFile(process.env.GITHUB_STEP_SUMMARY, "utf8").catch(() => "");
  await writeFile(process.env.GITHUB_STEP_SUMMARY, `${existing}${summary}`, "utf8");
}

if (failedRequired.length) process.exit(1);
