import { resolve } from "node:path";

import {
  extractResponseText,
  fetchWithRetry,
  parseArgs,
  readJson,
  redact,
  truncate,
  writeJson,
  writeText,
} from "./lib.mjs";

const args = parseArgs();
const inputPath = resolve(String(args.get("input") ?? "ci-feedback/ci-feedback.json"));
const contextPath = resolve(String(args.get("context") ?? "ci-feedback/context.json"));
const outputRoot = resolve(String(args.get("output") ?? "ci-feedback"));
const feedback = await readJson(inputPath);
const context = await readJson(contextPath, {});

if (!feedback) {
  console.error(`Missing feedback input: ${inputPath}`);
  process.exit(2);
}

if (!feedback.failed?.length && !feedback.missing?.length) {
  await writeText(resolve(outputRoot, "ai-analysis.md"), "## AI failure analysis\n\nSkipped because no required CI failure was detected.");
  await writeJson(resolve(outputRoot, "ai-analysis.json"), { status: "skipped", reason: "no-required-failure" });
  process.exit(0);
}

const payload = {
  repository: feedback.repository,
  sha: feedback.sha,
  pullRequest: feedback.pullRequest,
  status: feedback.status,
  missing: feedback.missing,
  failures: (feedback.failed ?? []).slice(0, 20).map((failure) => ({
    name: failure.name,
    source: failure.source,
    project: failure.project,
    command: failure.command,
    exitCode: failure.exitCode,
    timedOut: failure.timedOut,
    logTail: truncate(redact(failure.failureTail ?? failure.error ?? ""), 12_000),
  })),
  changedFiles: context.changedFiles ?? [],
  diffStat: context.diffStat ?? "",
  commitLog: context.commitLog ?? "",
  patchExcerpt:
    process.env.CI_AI_INCLUDE_PATCH === "true" ? truncate(redact(context.patch ?? ""), 80_000) : undefined,
  instructions:
    "Diagnose observed evidence only. Separate root cause from symptoms, name likely files, give a minimal fix plan and verification steps. Do not claim to have changed code or passed checks.",
};

let analysis = "";
let provider = "none";
let responseId = null;
try {
  if (process.env.CI_FEEDBACK_ENDPOINT && process.env.CI_FEEDBACK_TOKEN) {
    provider = "ci-feedback-endpoint";
    const response = await fetchWithRetry(
      process.env.CI_FEEDBACK_ENDPOINT,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.CI_FEEDBACK_TOKEN}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      { attempts: 3, timeoutMs: 90_000 },
    );
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`CI feedback endpoint returned ${response.status}: ${JSON.stringify(json)}`);
    analysis = json.analysis ?? "";
    responseId = json.responseId ?? null;
  } else if (process.env.OPENAI_API_KEY && process.env.OPENAI_CI_MODEL) {
    provider = "openai-responses";
    const response = await fetchWithRetry(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_CI_MODEL,
          instructions:
            "You are a senior CI and Next.js reviewer. Use only the supplied evidence. Return concise Markdown with: observed failure, root cause confidence, affected files, minimal correction, validation commands, and residual risk.",
          input: JSON.stringify(payload),
          max_output_tokens: 1800,
        }),
      },
      { attempts: 3, timeoutMs: 120_000 },
    );
    const json = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`OpenAI Responses API returned ${response.status}: ${JSON.stringify(json)}`);
    analysis = extractResponseText(json);
    responseId = json.id ?? null;
  }
} catch (error) {
  analysis = `AI analysis failed safely: ${redact(error instanceof Error ? error.message : String(error))}`;
}

if (!analysis) {
  analysis =
    "AI analysis was not requested because neither `CI_FEEDBACK_ENDPOINT` + `CI_FEEDBACK_TOKEN` nor `OPENAI_API_KEY` + `OPENAI_CI_MODEL` was configured.";
}
const markdown = `## AI failure analysis\n\n**Provider:** ${provider}\n\n${analysis}\n`;
await writeText(resolve(outputRoot, "ai-analysis.md"), markdown);
await writeJson(resolve(outputRoot, "ai-analysis.json"), {
  status: provider === "none" ? "skipped" : analysis.startsWith("AI analysis failed") ? "failed" : "completed",
  provider,
  responseId,
  analysis,
});
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import("node:fs/promises");
  await appendFile(process.env.GITHUB_STEP_SUMMARY, markdown, "utf8");
}
