#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const output = resolve(root, "ci-evidence/local-verification");
mkdirSync(output, { recursive: true });

const nodeMajor = Number(process.versions.node.split(".")[0]);
const checks = [];

checks.push({
  name: "node-version",
  command: "node -p process.version",
  status: nodeMajor === 25 ? 0 : 1,
  stdout: process.version,
  stderr: nodeMajor === 25 ? "" : `Expected Node 25.x but found ${process.version}.`,
});

for (const check of [
  { name: "architecture", command: "pnpm", args: ["check:architecture"] },
  { name: "prisma", command: "pnpm", args: ["prisma:validate"] },
  { name: "buttons", command: "pnpm", args: ["audit:buttons"] },
  { name: "biome", command: "pnpm", args: ["lint"] },
  { name: "typescript", command: "pnpm", args: ["typecheck"] },
  { name: "vitest", command: "pnpm", args: ["test:coverage"] },
  {
    name: "build-and-playwright",
    command: "node",
    args: ["scripts/auth/run-auth-e2e.mjs", "--all"],
  },
]) {
  checks.push(runCheck(check.name, check.command, check.args));
}

for (const check of checks) {
  writeFileSync(resolve(output, `${check.name}.stdout.log`), check.stdout, "utf8");
  writeFileSync(resolve(output, `${check.name}.stderr.log`), check.stderr, "utf8");
}

const passed = checks.filter((check) => check.status === 0).length;
const failed = checks.length - passed;
const summary = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  passed,
  failed,
  checks: checks.map(({ name, command, status }) => ({
    name,
    command,
    status: status === 0 ? "passed" : "failed",
    exitCode: status,
  })),
};

writeFileSync(resolve(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
writeFileSync(
  resolve(output, "summary.md"),
  [
    "# Local verification evidence",
    "",
    `Generated: ${summary.generatedAt}`,
    `Node: ${summary.node}`,
    `Result: ${passed} passed, ${failed} failed`,
    "",
    "| Check | Result | Exit code |",
    "|---|---:|---:|",
    ...summary.checks.map(
      (check) => `| ${check.name} | ${check.status} | ${check.exitCode} |`,
    ),
    "",
    "Raw stdout and stderr for every check are stored beside this summary.",
    "",
  ].join("\n"),
  "utf8",
);

console.log(`Local verification complete: ${passed} passed, ${failed} failed.`);
console.log(`Evidence: ${output}`);
process.exit(failed === 0 ? 0 : 1);

function runCheck(name, command, args) {
  console.log(`\n=== ${name}: ${command} ${args.join(" ")} ===`);
  const result = spawnSync(command, args, {
    cwd: root,
    env: process.env,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  return {
    name,
    command: `${command} ${args.join(" ")}`,
    status: result.error ? 1 : (result.status ?? 1),
    stdout,
    stderr: result.error ? `${stderr}\n${result.error.message}` : stderr,
  };
}
