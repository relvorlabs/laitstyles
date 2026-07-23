import { resolve } from "node:path";

import { parseArgs, readJson, truncate, writeJson, writeText } from "./lib.mjs";

const args = parseArgs();
const feedbackPath = resolve(String(args.get("feedback") ?? "ci-feedback/ci-feedback.json"));
const contextPath = resolve(String(args.get("context") ?? "ci-artifacts/meta/context.json"));
const outputRoot = resolve(String(args.get("output") ?? "ci-feedback"));

const feedback = await readJson(feedbackPath);
const context = await readJson(contextPath, {});
if (!feedback) {
  console.error(`Missing CI feedback: ${feedbackPath}`);
  process.exit(2);
}

const protocol = [
  "Read ci-feedback.json, agent-handoff.json, failed job logs and the cited changed files.",
  "Separate runner/infrastructure failures from application failures before editing code.",
  "Fix the smallest evidenced root cause on the pull-request head branch.",
  "Commit and push the correction, then inspect the new workflow runs for the new head SHA.",
  "Rerun only failed jobs when the code did not change; push a new commit when code changed.",
  "Repeat until every required gate passes. Never report skipped, missing or unavailable jobs as successful.",
];

const handoff = {
  schemaVersion: 1,
  kind: "github-agent-handoff",
  repository: feedback.repository ?? context.repository ?? process.env.GITHUB_REPOSITORY ?? null,
  pullRequest: feedback.pullRequest ?? context.pullRequest ?? null,
  sha: feedback.sha ?? context.sha ?? process.env.HEAD_SHA ?? null,
  baseRef: context.baseRef ?? null,
  branch: context.branch ?? null,
  generatedAt: new Date().toISOString(),
  status: feedback.status,
  requiredFailures: feedback.failed ?? [],
  warnings: feedback.warnings ?? [],
  missingEvidence: feedback.missing ?? [],
  changedFiles: context.changedFiles ?? [],
  diffStat: context.diffStat ?? "",
  commitLog: context.commitLog ?? "",
  patch: truncate(context.patch ?? "", 250_000),
  protocol,
};

await writeJson(resolve(outputRoot, "agent-handoff.json"), handoff);

const markdown = [
  "## GitHub agent handoff",
  "",
  "No OpenAI API key or external AI endpoint is used by this workflow.",
  "",
  "A ChatGPT/Codex session with GitHub access can use the attached `agent-handoff.json`, `ci-feedback.json`, workflow job logs and changed-file context to continue the task.",
  "",
  `**Head SHA:** ${handoff.sha ?? "unknown"}`,
  `**Required failures:** ${handoff.requiredFailures.length}`,
  `**Missing evidence:** ${handoff.missingEvidence.length}`,
  "",
  "### Fix-and-verify protocol",
  ...protocol.map((item, index) => `${index + 1}. ${item}`),
  "",
  "### Prompt for any connected GitHub chat",
  "",
  "```text",
  `Open ${handoff.repository ?? "this repository"} PR #${handoff.pullRequest ?? "<number>"}. Read the latest task-runtime-feedback artifact, ci-feedback.json, agent-handoff.json and failed GitHub Actions logs. Fix only evidenced root causes on the PR branch, commit the changes, inspect the new workflow runs, rerun failed jobs when appropriate, and repeat until every required check is green. Do not treat missing or skipped jobs as passed.`,
  "```",
].join("\n");

await writeText(resolve(outputRoot, "agent-handoff.md"), markdown);
