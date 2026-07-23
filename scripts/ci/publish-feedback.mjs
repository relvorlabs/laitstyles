import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { fetchWithRetry, parseArgs, redact, truncate } from "./lib.mjs";

const args = parseArgs();
const prNumber = Number(args.get("pull-request") ?? process.env.PR_NUMBER);
const repository = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const feedbackPath = resolve(String(args.get("feedback") ?? "ci-feedback/ci-feedback.md"));
const handoffPath = resolve(String(args.get("handoff") ?? "ci-feedback/agent-handoff.md"));
const marker = "<!-- laitstyles-ci-feedback -->";

if (!repository || !token || !Number.isInteger(prNumber) || prNumber <= 0) {
  console.log("Skipping PR publication: GITHUB_REPOSITORY, GITHUB_TOKEN or PR number is unavailable.");
  process.exit(0);
}

const feedback = await readFile(feedbackPath, "utf8").catch(
  () => `${marker}\n## CI execution feedback\n\nNo feedback artifact was produced.`,
);
const handoff = await readFile(handoffPath, "utf8").catch(() => "");
const runUrl =
  process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;
const body = truncate(
  [
    feedback.includes(marker) ? feedback : `${marker}\n${feedback}`,
    "",
    handoff,
    "",
    runUrl ? `Workflow feedback run: ${runUrl}` : "",
    "",
    "_This is GitHub-generated evidence only. A connected ChatGPT/Codex GitHub session may inspect it, edit the PR branch, rerun jobs and repeat the fix loop._",
  ]
    .filter(Boolean)
    .join("\n"),
  62_000,
);

const headers = {
  accept: "application/vnd.github+json",
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
  "x-github-api-version": "2022-11-28",
};
const commentsResponse = await fetchWithRetry(
  `https://api.github.com/repos/${repository}/issues/${prNumber}/comments?per_page=100`,
  { headers },
);
if (!commentsResponse.ok) throw new Error(`Could not list PR comments: ${commentsResponse.status}`);
const comments = await commentsResponse.json();
const existing = Array.isArray(comments) ? comments.find((comment) => String(comment.body).includes(marker)) : null;
const url = existing
  ? `https://api.github.com/repos/${repository}/issues/comments/${existing.id}`
  : `https://api.github.com/repos/${repository}/issues/${prNumber}/comments`;
const response = await fetchWithRetry(url, {
  method: existing ? "PATCH" : "POST",
  headers,
  body: JSON.stringify({ body }),
});
if (!response.ok) {
  const message = redact(await response.text());
  throw new Error(`Could not publish CI feedback (${response.status}): ${message}`);
}
console.log(existing ? "Updated CI feedback comment." : "Created CI feedback comment.");
