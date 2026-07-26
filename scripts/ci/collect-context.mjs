import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { listFiles, parseArgs, redact, sha256, truncate, writeJson, writeText } from "./lib.mjs";

const args = parseArgs();
const outputRoot = resolve(String(args.get("output") ?? "ci-evidence/context"));
const baseRef = process.env.CI_BASE_REF?.trim() || "main";

function git(commandArgs, fallback = "") {
  try {
    return execFileSync("git", commandArgs, {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 5 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return fallback;
  }
}

const ranges = [`origin/${baseRef}...HEAD`, `${baseRef}...HEAD`, "HEAD^...HEAD"];
let activeRange = "";
for (const range of ranges) {
  if (git(["rev-parse", "--verify", range.split("...")[0]])) {
    activeRange = range;
    break;
  }
}
activeRange ||= "HEAD^...HEAD";

const changedFiles = git(["diff", "--name-only", activeRange])
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);
const diffStat = git(["diff", "--stat", activeRange]);
const numStat = git(["diff", "--numstat", activeRange]);
const commitLog = git(["log", "--oneline", "--decorate", activeRange], "No commit range available.");
const patch = truncate(redact(git(["diff", "--no-ext-diff", "--unified=40", activeRange])), 300_000);

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const candidateSha = git(["rev-parse", "HEAD"]);
const parentSha = git(["rev-parse", "HEAD^"]);
const workingTreeEntries = git(["status", "--short"])
  .split(/\r?\n/)
  .map((entry) => entry.trimEnd())
  .filter(Boolean);
const lockfile = await readFile("pnpm-lock.yaml", "utf8");
const databaseIdentity = [process.env.DATABASE_URL, process.env.DIRECT_URL]
  .filter(Boolean)
  .map((value) => {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}:${url.port || "default"}/${url.pathname.replace(/^\//, "")}`;
  })
  .join("|");
const pnpmVersion = process.env.npm_execpath
  ? execFileSync(process.execPath, [process.env.npm_execpath, "--version"], { encoding: "utf8" }).trim()
  : execFileSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["--version"], {
      encoding: "utf8",
    }).trim();
const capturedAt = new Date().toISOString();
const doctrinePaths = [
  "AGENTS.md",
  ".agents/doctrine/architecture.md",
  ".agents/doctrine/conventions.md",
  ".agents/doctrine/server-and-actions.md",
  ".agents/doctrine/toolchain-and-skills.md",
  ".agents/doctrine/validation-and-reporting.md",
];
const doctrine = {};
for (const path of doctrinePaths) {
  if (!existsSync(path)) continue;
  doctrine[path] = truncate(await readFile(path, "utf8"), 24_000);
}

const skillRoot = resolve(".ci/agent-controller/skills");
const loadedSkills = [];
if (existsSync(skillRoot)) {
  const skillFiles = (await listFiles(skillRoot)).filter((path) => path.endsWith("/SKILL.md"));
  for (const absolutePath of skillFiles) {
    const text = await readFile(absolutePath, "utf8").catch(() => "");
    const path = relative(process.cwd(), absolutePath).replaceAll("\\", "/");
    loadedSkills.push({
      path,
      name: text.match(/^name:\s*["']?([^"'\n]+)["']?/m)?.[1] ?? path.split("/").at(-2),
      description: text.match(/^description:\s*["']?([^"'\n]+)["']?/m)?.[1] ?? "",
    });
  }
}

const changedSource = [];
let sourceBudget = 160_000;
for (const path of changedFiles) {
  if (!/\.(?:[cm]?[jt]sx?|json|ya?ml|md|prisma|sql)$/i.test(path) || !existsSync(path)) continue;
  const raw = await readFile(path, "utf8").catch(() => "");
  const content = truncate(redact(raw), Math.min(24_000, sourceBudget));
  if (!content) continue;
  changedSource.push({ path, content, sha256: sha256(raw) });
  sourceBudget -= content.length;
  if (sourceBudget <= 0) break;
}

const context = {
  schemaVersion: 1,
  kind: "implementation-context",
  candidateSha,
  parentSha,
  repository: process.env.GITHUB_REPOSITORY ?? null,
  pullRequest: process.env.PR_NUMBER ? Number(process.env.PR_NUMBER) : null,
  sha: process.env.GITHUB_SHA ?? git(["rev-parse", "HEAD"]),
  branch: process.env.GITHUB_HEAD_REF || process.env.GITHUB_REF_NAME || git(["branch", "--show-current"]),
  workingTreeEntries,
  nodeVersion: process.version,
  pnpmVersion,
  prismaVersion: packageJson.dependencies["@prisma/client"],
  playwrightVersion: packageJson.devDependencies["@playwright/test"],
  lockfileDigest: sha256(lockfile),
  databaseIdentityDigest: databaseIdentity ? sha256(databaseIdentity) : null,
  capturedAt,
  baseRef,
  range: activeRange,
  generatedAt: capturedAt,
  packageManager: packageJson.packageManager,
  packageScripts: packageJson.scripts,
  changedFiles,
  diffStat,
  numStat,
  commitLog,
  patch,
  doctrine,
  loadedSkills,
  changedSource,
};

await writeJson(join(outputRoot, "context.json"), context);
await writeFile(join(outputRoot, "changes.patch"), `${patch}\n`, "utf8");
const markdown = [
  "# CI implementation context",
  "",
  `- Range: \`${activeRange}\``,
  `- Changed files: ${changedFiles.length}`,
  `- Loaded skill manifests: ${loadedSkills.length}`,
  `- Patch bytes retained: ${patch.length}`,
  "",
  "## Changed files",
  ...changedFiles.map((path) => `- \`${path}\``),
  "",
  "## Diff stat",
  "```text",
  diffStat || "No diff stat available.",
  "```",
  "",
  "## Commits",
  "```text",
  commitLog,
  "```",
].join("\n");
await writeText(join(outputRoot, "context.md"), markdown);
if (process.env.GITHUB_STEP_SUMMARY) {
  await writeFile(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`, {
    encoding: "utf8",
    flag: "a",
  });
}
