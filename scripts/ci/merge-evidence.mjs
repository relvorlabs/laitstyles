import { basename, resolve } from "node:path";

import { listFiles, parseArgs, readJson, truncate, writeJson, writeText } from "./lib.mjs";

const args = parseArgs();
const inputRoot = resolve(String(args.get("input") ?? "ci-artifacts"));
const outputRoot = resolve(String(args.get("output") ?? "ci-feedback"));
const expected = String(args.get("expect") ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const files = await listFiles(inputRoot);
const manifestPaths = files.filter((path) => basename(path) === "manifest.json");
const manifests = [];
for (const path of manifestPaths) {
  const value = await readJson(path);
  if (value) manifests.push({ ...value, artifactPath: path.replace(`${process.cwd()}/`, "") });
}

const gates = [];
for (const manifest of manifests) {
  for (const result of manifest.results ?? []) {
    gates.push({
      ...result,
      required: result.required ?? true,
      source: manifest.suite ?? manifest.kind,
      project: manifest.project ?? result.project ?? null,
      workflow: manifest.workflow,
      runId: manifest.runId,
    });
  }
}

const observed = new Set();
for (const manifest of manifests) {
  const name = manifest.suite ?? manifest.kind;
  observed.add(name);
  if (manifest.project) observed.add(`${name}:${manifest.project}`);
}
const missing = expected.filter((value) => !observed.has(value));
const failed = gates.filter((gate) => gate.required !== false && gate.status === "failed");
const warnings = gates.filter((gate) => gate.status === "warning" || (gate.required === false && gate.status !== "passed"));
const status = failed.length || missing.length ? "failed" : warnings.length ? "passed-with-warnings" : "passed";

const feedback = {
  schemaVersion: 1,
  kind: "ci-feedback",
  repository: process.env.GITHUB_REPOSITORY ?? null,
  sha: process.env.HEAD_SHA || process.env.GITHUB_SHA || null,
  pullRequest: process.env.PR_NUMBER ? Number(process.env.PR_NUMBER) : null,
  generatedAt: new Date().toISOString(),
  status,
  expected,
  observed: [...observed].sort(),
  missing,
  failed,
  warnings,
  gates,
  manifests,
};

await writeJson(resolve(outputRoot, "ci-feedback.json"), feedback);
const lines = [
  "<!-- laitstyles-ci-feedback -->",
  "## CI execution feedback",
  "",
  `**Overall result:** ${status === "passed" ? "✅ passed" : status === "passed-with-warnings" ? "⚠️ passed with warnings" : "❌ failed"}`,
  "",
  `- Evidence manifests: ${manifests.length}`,
  `- Required failures: ${failed.length}`,
  `- Advisory warnings: ${warnings.length}`,
  `- Missing expected suites: ${missing.length}`,
  "",
  "| Gate | Source | Required | Result |",
  "| --- | --- | --- | --- |",
  ...gates.map(
    (gate) =>
      `| ${gate.name ?? "unnamed"} | ${gate.project ? `${gate.source}/${gate.project}` : gate.source} | ${gate.required === false ? "advisory" : "yes"} | ${gate.status} |`,
  ),
];
if (missing.length) lines.push("", "### Missing evidence", ...missing.map((item) => `- \`${item}\``));
if (failed.length || warnings.length) {
  lines.push("", "### Actionable diagnostics");
  for (const gate of [...failed, ...warnings].slice(0, 20)) {
    lines.push(
      "",
      `<details><summary>${gate.status === "failed" ? "❌" : "⚠️"} ${gate.name}</summary>`,
      "",
      "```text",
      truncate(gate.failureTail ?? gate.error ?? "No captured failure tail.", 12_000),
      "```",
      "</details>",
    );
  }
}
lines.push(
  "",
  "### Agent handoff",
  "",
  "The JSON artifact `ci-feedback.json` is the machine-readable source for a connected GitHub/ChatGPT debugging session. Logs are redacted before publication. No check is marked successful unless its command returned success.",
);
await writeText(resolve(outputRoot, "ci-feedback.md"), lines.join("\n"));
