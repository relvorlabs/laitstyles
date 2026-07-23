import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { parseArgs, redact, tailLines, writeJson, writeText } from "./lib.mjs";

const args = parseArgs();
const input = resolve(String(args.get("input") ?? "playwright-server.log"));
const outputRoot = resolve(String(args.get("output") ?? "ci-evidence/server-log"));
const text = redact(await readFile(input, "utf8").catch(() => ""));
const fatalPatterns = [
  /Unhandled Runtime Error/i,
  /Internal Server Error/i,
  /ReferenceError:/i,
  /TypeError:/i,
  /PrismaClientInitializationError/i,
  /FATAL:/i,
  /EADDRINUSE/i,
];
const ignoredPatterns = [/favicon/i, /source map/i];
const matches = text
  .split(/\r?\n/)
  .filter((line) => fatalPatterns.some((pattern) => pattern.test(line)) && !ignoredPatterns.some((pattern) => pattern.test(line)));
const status = matches.length ? "failed" : text ? "passed" : "warning";
const manifest = {
  schemaVersion: 1,
  kind: "server-log",
  repository: process.env.GITHUB_REPOSITORY ?? null,
  workflow: process.env.GITHUB_WORKFLOW ?? null,
  runId: process.env.GITHUB_RUN_ID ?? null,
  job: process.env.GITHUB_JOB ?? null,
  sha: process.env.GITHUB_SHA ?? null,
  generatedAt: new Date().toISOString(),
  status,
  results: [
    {
      name: "production-server-log",
      required: true,
      status,
      matches,
      failureTail: matches.length ? tailLines(text, 160) : null,
    },
  ],
};
await writeJson(resolve(outputRoot, "manifest.json"), manifest);
await writeText(
  resolve(outputRoot, "summary.md"),
  [
    "## Production server log",
    "",
    `- Result: ${status}`,
    `- Fatal matches: ${matches.length}`,
    "",
    ...(matches.length ? ["```text", ...matches.slice(0, 40), "```"] : []),
  ].join("\n"),
);
if (matches.length) process.exit(1);
