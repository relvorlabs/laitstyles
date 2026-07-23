import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];

function normalise(path) {
  return path.replaceAll("\\", "/");
}

function listChangedFiles() {
  const baseRef = process.env.CI_BASE_REF?.trim();
  const candidates = baseRef ? [`origin/${baseRef}...HEAD`, "HEAD^...HEAD"] : ["HEAD^...HEAD"];
  for (const range of candidates) {
    try {
      return execFileSync("git", ["diff", "--name-only", range], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean)
        .map(normalise);
    } catch {
      // Try the next deterministic range.
    }
  }
  warnings.push("Could not resolve a git diff range; only repository-level contracts were checked.");
  return [];
}

const expectedWorkflows = ["implementation-quality.yml", "playwright.yml", "task-progress.yml"];
const workflowDirectory = join(root, ".github", "workflows");
const actualWorkflows = existsSync(workflowDirectory)
  ? readdirSync(workflowDirectory)
      .filter((name) => /\.ya?ml$/i.test(name))
      .sort()
  : [];

if (JSON.stringify(actualWorkflows) !== JSON.stringify(expectedWorkflows)) {
  errors.push(
    `Workflow contract drift: expected ${expectedWorkflows.join(", ")}; found ${actualWorkflows.join(", ") || "none"}.`,
  );
}

const requiredFiles = [
  "AGENTS.md",
  ".agents/doctrine/architecture.md",
  ".agents/doctrine/server-and-actions.md",
  ".agents/doctrine/toolchain-and-skills.md",
  ".agents/doctrine/validation-and-reporting.md",
  "scripts/ci/lib.mjs",
  "scripts/ci/run-gates.mjs",
  "scripts/ci/collect-context.mjs",
  "scripts/ci/http-smoke.mjs",
  "scripts/ci/check-server-log.mjs",
  "scripts/ci/merge-evidence.mjs",
  "scripts/ci/build-agent-handoff.mjs",
  "scripts/ci/publish-feedback.mjs",
  "docs/ci/advanced-feedback-loop.md",
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) errors.push(`Required architecture or CI contract is missing: ${path}`);
}

const forbiddenAiFiles = [
  "scripts/ci/analyze-failures.mjs",
  "src/app/api/internal/ci/analyze/route.ts",
  "src/server/ci/ci-feedback.ts",
  "src/server/ci/ci-feedback.test.ts",
];
for (const path of forbiddenAiFiles) {
  if (existsSync(join(root, path))) errors.push(`OpenAI-key CI dependency must not exist: ${path}`);
}

if (existsSync(join(root, "src/lib/admin/inventory/inventory-mutations.ts"))) {
  errors.push("Retired browser-memory Inventory mutation module was reintroduced.");
}

const changedFiles = listChangedFiles();
const sourceExtensions = /\.(?:[cm]?[jt]sx?)$/i;
const phaseThree =
  /phase-3/i.test(process.env.GITHUB_HEAD_REF ?? "") ||
  changedFiles.includes("docs/migration/phase-3-product-management-v2.md");
const protectedPhaseThreePaths =
  /^(?:src\/features\/storefront\/|src\/app\/\(home\)\/|src\/app\/products\/|src\/components\/shop\/)/;

for (const file of changedFiles) {
  if (phaseThree && protectedPhaseThreePaths.test(file)) {
    errors.push(`Phase 3 protected storefront path changed: ${file}`);
  }

  if (!sourceExtensions.test(file)) continue;
  const absolute = join(root, file);
  if (!existsSync(absolute)) continue;

  const source = readFileSync(absolute, "utf8");
  const lineCount = source.split(/\r?\n/).length;
  const isTest = /(?:\.test\.|\.spec\.|\/tests?\/)/.test(file);
  const isClient = /^\s*["']use client["'];/m.test(source.slice(0, 300));
  const isServerAction = /^\s*["']use server["'];/m.test(source.slice(0, 300));
  const importsServerRuntime =
    /from\s+["'](?:@\/server\/|@\/lib\/prisma|@prisma\/client|[^"']*prisma\/generated)/.test(source);

  if (!isTest && lineCount > 800) {
    errors.push(`${file} has ${lineCount} lines; split the implementation before it becomes a god module.`);
  } else if (!isTest && lineCount > 600) {
    warnings.push(`${file} has ${lineCount} lines and should be reviewed for responsibility boundaries.`);
  }

  if (isClient && importsServerRuntime) {
    errors.push(`Client/server boundary violation in ${file}: client code imports a server or Prisma runtime.`);
  }

  if (file.startsWith("src/server/") && !isTest && !/import\s+["']server-only["'];/.test(source.slice(0, 500))) {
    errors.push(`Server module is missing an explicit server-only boundary: ${file}`);
  }

  if (isServerAction) {
    const allowedActionPath =
      /^src\/app\/(?:.+\/)?actions\.ts$/.test(file) ||
      /^src\/features\/.+\/(?:actions|.+-actions)\.ts$/.test(file);
    if (!allowedActionPath) {
      errors.push(`Server Action is outside an approved feature/app action boundary: ${file}`);
    }
    if (importsServerRuntime && /@prisma\/client|prisma\/generated|@\/lib\/prisma/.test(source)) {
      errors.push(`Server Action must delegate to a domain service instead of importing Prisma directly: ${file}`);
    }
    if (/from\s+["']react["']/.test(source)) {
      errors.push(`Server Action imports React and mixes transport with UI concerns: ${file}`);
    }
  }

  if (/\.\.\/\.\.\/\.\.\/\.\.\//.test(source)) {
    warnings.push(`${file} contains a four-level relative import; prefer the repository alias and clearer ownership.`);
  }
}

const summary = [
  "## Architecture guard",
  "",
  `- Changed files inspected: ${changedFiles.length}`,
  `- Workflow files: ${actualWorkflows.join(", ") || "none"}`,
  `- Required repository contracts: ${requiredFiles.length}`,
  `- Forbidden OpenAI-key CI files found: ${forbiddenAiFiles.filter((path) => existsSync(join(root, path))).length}`,
  `- Errors: ${errors.length}`,
  `- Warnings: ${warnings.length}`,
];
if (warnings.length) summary.push("", "### Warnings", ...warnings.map((warning) => `- ${warning}`));
if (errors.length) summary.push("", "### Failures", ...errors.map((error) => `- ${error}`));

const rendered = `${summary.join("\n")}\n`;
process.stdout.write(rendered);
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFileSync } = await import("node:fs");
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, rendered);
}

if (errors.length) process.exit(1);
