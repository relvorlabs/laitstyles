import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { legacyTanstackServerActionEdges } from "./architecture-legacy-exceptions.mjs";

const root = process.cwd();
const errors = [];
const warnings = [];

function normalise(path) {
  return path.replaceAll("\\", "/");
}

function gitOutput(args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
}

function diffRanges() {
  const baseRef = process.env.CI_BASE_REF?.trim();
  return baseRef ? [`origin/${baseRef}...HEAD`, "HEAD^...HEAD"] : ["HEAD^...HEAD"];
}

function baseObjectRefs() {
  const baseRef = process.env.CI_BASE_REF?.trim();
  return baseRef ? [`origin/${baseRef}`, "HEAD^"] : ["HEAD^"];
}

function listChangedEntries() {
  for (const range of diffRanges()) {
    try {
      return gitOutput(["diff", "--name-status", "--find-renames", range])
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split("\t");
          const status = parts[0][0];
          if (status === "R" || status === "C") {
            return {
              status,
              previousPath: normalise(parts[1]),
              path: normalise(parts[2]),
            };
          }
          return { status, path: normalise(parts[1]) };
        });
    } catch {
      // Try the next deterministic range.
    }
  }
  warnings.push("Could not resolve a git diff range; changed-file migration rules were not checked.");
  return [];
}

function readBaseFile(repoPath) {
  for (const ref of baseObjectRefs()) {
    try {
      return gitOutput(["show", `${ref}:${repoPath}`]);
    } catch {
      // The file may be new or the ref may be unavailable.
    }
  }
  return null;
}

function listFilesRecursively(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = normalise(join(prefix, entry.name));
    const absolute = join(directory, entry.name);
    return entry.isDirectory()
      ? listFilesRecursively(absolute, relativePath)
      : [relativePath];
  });
}

function isTestOrFixture(repoPath) {
  return /(?:\.test\.|\.spec\.|\/tests?\/|\/__tests__\/|\/stories\/|\.stories\.)/.test(repoPath);
}

function isProductionSource(repoPath) {
  return repoPath.startsWith("src/") && !isTestOrFixture(repoPath);
}

function isClientModule(source) {
  const beginning = source.trimStart().slice(0, 300);
  return beginning.startsWith('"use client";') || beginning.startsWith("'use client';");
}

function isServerActionModule(source) {
  const beginning = source.trimStart().slice(0, 300);
  return beginning.startsWith('"use server";') || beginning.startsWith("'use server';");
}

function importSpecifiers(source) {
  const specifiers = new Set();
  const staticImport =
    /(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImport = /import\(\s*["']([^"']+)["']\s*\)/g;

  for (const match of source.matchAll(staticImport)) specifiers.add(match[1]);
  for (const match of source.matchAll(dynamicImport)) specifiers.add(match[1]);

  return [...specifiers];
}

function resolveLocalImport(fromRepoPath, specifier) {
  let candidateBase;
  if (specifier.startsWith("@/")) {
    candidateBase = join(root, "src", specifier.slice(2));
  } else if (specifier.startsWith(".")) {
    candidateBase = resolve(dirname(join(root, fromRepoPath)), specifier);
  } else {
    return null;
  }

  const candidates = [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}.js`,
    `${candidateBase}.jsx`,
    `${candidateBase}.mjs`,
    `${candidateBase}.cjs`,
    join(candidateBase, "index.ts"),
    join(candidateBase, "index.tsx"),
    join(candidateBase, "index.js"),
    join(candidateBase, "index.jsx"),
  ];

  const match = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  return match ? normalise(relative(root, match)) : null;
}

function hasFixturePath(value) {
  const path = normalise(value).replace(/^@\/|^\.\//, "");
  return /(?:^|\/)(?:tests\/fixtures|tests\/factories|stories\/fixtures|scripts\/seed|development\/fixtures)(?:\/|$)/.test(
    path,
  );
}

function importsServerRuntime(specifier, resolvedPath) {
  return (
    specifier === "server-only" ||
    specifier === "@prisma/client" ||
    specifier.startsWith("@/server") ||
    specifier.startsWith("@/lib/prisma") ||
    specifier.startsWith("@/lib/supabase/server") ||
    specifier.includes("prisma/generated") ||
    /^@\/modules\/[^/]+\/server(?:\/|$)/.test(specifier) ||
    resolvedPath?.startsWith("src/server/") ||
    /^src\/modules\/[^/]+\/server\//.test(resolvedPath ?? "")
  );
}

function americanCatalogueCount(value) {
  return value.match(/\b[Cc]atalog(?!ue)[A-Za-z0-9_]*\b/g)?.length ?? 0;
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
  "scripts/checks/architecture-legacy-exceptions.mjs",
  "scripts/ci/lib.mjs",
  "scripts/ci/run-gates.mjs",
  "scripts/ci/collect-context.mjs",
  "scripts/ci/http-smoke.mjs",
  "scripts/ci/check-server-log.mjs",
  "scripts/ci/merge-evidence.mjs",
  "scripts/ci/build-agent-handoff.mjs",
  "scripts/ci/publish-feedback.mjs",
  "docs/ci/advanced-feedback-loop.md",
  "docs/architecture-migration/phase-1-domain-status.md",
  "docs/architecture-migration/phase-1-legacy-exceptions.md",
  "src/features/storefront/shared/catalog-adapter.ts",
  "src/features/storefront/shared/cart-restoration.ts",
  "src/features/storefront/shared/storefront-client-state.ts",
  "src/features/storefront/shared/storefront-client-state-provider.tsx",
  "src/features/storefront/shared/storefront-auth-provider.tsx",
  "src/features/storefront/checkout/order-receipt.ts",
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) {
    errors.push(`Required architecture or CI contract is missing: ${path}`);
  }
}

const forbiddenArchitectureNamespaces = [
  "src/features/store",
  "src/features/commerce",
  "src/lib/store",
  "src/server/store",
  "src/server/storefront",
];

for (const forbiddenPath of forbiddenArchitectureNamespaces) {
  if (existsSync(join(root, forbiddenPath))) {
    errors.push(
      `Ambiguous architecture namespace exists at ${forbiddenPath}; new business code belongs under src/modules/<domain>.`,
    );
  }
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

const retiredStorefrontFiles = [
  "src/components/shop/shop-provider.tsx",
  "src/features/storefront/shared/cart-persistence.ts",
  "src/features/storefront/shared/cart-persistence.test.ts",
  "src/features/storefront/shared/storefront-experience-provider.tsx",
  "src/features/storefront/shared/storefront-experience-data.ts",
  "src/features/storefront/shared/storefront-experience-data.test.ts",
  "src/features/storefront/checkout/checkout-flow.tsx",
  "src/lib/catalogue.ts",
  "src/lib/order.ts",
];

for (const path of retiredStorefrontFiles) {
  if (existsSync(join(root, path))) errors.push(`Retired storefront compatibility file was reintroduced: ${path}`);
}

if (existsSync(join(root, "src/lib/admin/inventory/inventory-mutations.ts"))) {
  errors.push("Retired browser-memory Inventory mutation module was reintroduced.");
}

const sourceExtensions = /\.(?:[cm]?[jt]sx?)$/i;
const allSourceFiles = listFilesRecursively(join(root, "src"), "src").filter((file) =>
  sourceExtensions.test(file),
);
const sourceByFile = new Map(
  allSourceFiles.map((file) => [file, readFileSync(join(root, file), "utf8")]),
);
const serverActionModules = new Set(
  [...sourceByFile].filter(([, source]) => isServerActionModule(source)).map(([file]) => file),
);

const forbiddenStorefrontImports = [
  "@/components/shop/shop-provider",
  "./cart-persistence",
  "storefront-experience-provider",
  "storefront-experience-data",
  "@/lib/catalogue",
  "@/lib/order",
  "storefront/checkout/checkout-flow\"",
  "storefront/checkout/checkout-flow'",
];

const forbiddenArchitectureImports = [
  "@/features/store/",
  "@/features/commerce/",
  "@/lib/store/",
  "@/server/store/",
  "@/server/storefront/",
];

const ambiguousSurfaceFilePatterns = [
  /^src\/app\/(?:store|commerce)-/,
  /^src\/features\/storefront\/.*\/(?:store|commerce)-/,
  /^src\/lib\/storefront\/(?:store|commerce)-/,
];

const ambiguousSurfaceIdentifiers = [
  /\bStore(?:Provider|ClientBoundary|RouteBoundary|AuthProvider|ClientStateProvider|Home|Shell)\b/,
  /\bCommerce(?:Provider|ClientBoundary|RouteBoundary|AuthProvider|ClientStateProvider|Home|Shell)\b/,
];

const observedLegacyEdges = new Set();

for (const [file, source] of sourceByFile) {
  const imports = importSpecifiers(source);

  for (const forbiddenImport of forbiddenStorefrontImports) {
    if (source.includes(forbiddenImport)) {
      errors.push(`Retired storefront import remains in ${file}: ${forbiddenImport}`);
    }
  }

  for (const forbiddenImport of forbiddenArchitectureImports) {
    if (source.includes(forbiddenImport)) {
      errors.push(
        `Ambiguous architecture import remains in ${file}: ${forbiddenImport}; migrate new ownership by domain under src/modules.`,
      );
    }
  }

  if (ambiguousSurfaceFilePatterns.some((pattern) => pattern.test(file))) {
    errors.push(`Ambiguous storefront filename uses store/commerce alias: ${file}.`);
  }

  for (const pattern of ambiguousSurfaceIdentifiers) {
    const match = source.match(pattern)?.[0];
    if (match) {
      errors.push(
        `Ambiguous storefront symbol remains in ${file}: ${match}; use a Storefront-prefixed surface name.`,
      );
    }
  }

  if (isProductionSource(file)) {
    for (const specifier of imports) {
      const resolvedPath = resolveLocalImport(file, specifier);
      if (hasFixturePath(specifier) || hasFixturePath(resolvedPath ?? "")) {
        errors.push(`Production fixture import in ${file}: ${specifier}`);
      }
    }
  }

  if (isClientModule(source)) {
    for (const specifier of imports) {
      const resolvedPath = resolveLocalImport(file, specifier);
      if (importsServerRuntime(specifier, resolvedPath)) {
        errors.push(`Client/server boundary violation in ${file}: ${specifier}`);
      }
    }
  }

  const importsTanstack = imports.some((specifier) => specifier === "@tanstack/react-query");
  const isRouteHandler = /^src\/app\/.+\/route\.[cm]?[jt]sx?$/.test(file);

  for (const specifier of imports) {
    const resolvedPath = resolveLocalImport(file, specifier);
    if (!resolvedPath || !serverActionModules.has(resolvedPath)) continue;

    const edge = `${file} -> ${resolvedPath}`;

    if (importsTanstack) {
      if (legacyTanstackServerActionEdges.has(edge)) {
        observedLegacyEdges.add(edge);
        const exception = legacyTanstackServerActionEdges.get(edge);
        warnings.push(
          `Legacy TanStack/Server Action edge remains until ${exception.removalPhase}: ${edge}`,
        );
      } else {
        errors.push(`TanStack module imports a Server Action: ${edge}`);
      }
    }

    if (isRouteHandler) {
      errors.push(`Route Handler imports a Server Action: ${edge}`);
    }
  }
}

for (const [edge, exception] of legacyTanstackServerActionEdges) {
  if (!observedLegacyEdges.has(edge)) {
    errors.push(
      `Stale architecture exception must be removed: ${edge} (${exception.removalPhase}).`,
    );
  }
}

const storefrontBoundaryPath = join(root, "src/app/storefront-route-boundary.tsx");
if (existsSync(storefrontBoundaryPath)) {
  const source = readFileSync(storefrontBoundaryPath, "utf8");
  if (!source.includes("loadStorefrontShellCatalog")) {
    errors.push("Storefront route boundary must load the lightweight shell catalogue projection.");
  }
  if (/\bloadStorefrontCatalog\b/.test(source)) {
    errors.push("Storefront route boundary must not serialize the full catalogue through the global client boundary.");
  }
}

const changedEntries = listChangedEntries();
const changedFiles = changedEntries.map(({ path }) => path);
const phaseThree =
  /phase-3/i.test(process.env.GITHUB_HEAD_REF ?? "") ||
  changedFiles.includes("docs/migration/phase-3-product-management-v2.md");
const protectedPhaseThreePaths =
  /^(?:src\/features\/storefront\/|src\/app\/\(home\)\/|src\/app\/products\/|src\/components\/shop\/)/;

for (const entry of changedEntries) {
  const { path: file, status, previousPath } = entry;

  if (status === "A" && isProductionSource(file) && file.startsWith("src/features/")) {
    errors.push(`New production code was added under legacy src/features: ${file}`);
  }

  if (status === "A" && isProductionSource(file) && file.startsWith("src/server/")) {
    errors.push(`New production business code was added under legacy top-level src/server: ${file}`);
  }

  if (phaseThree && protectedPhaseThreePaths.test(file)) {
    errors.push(`Phase 3 protected storefront path changed: ${file}`);
  }

  if (!sourceExtensions.test(file)) continue;
  const absolute = join(root, file);
  if (!existsSync(absolute)) continue;

  const source = readFileSync(absolute, "utf8");
  const lineCount = source.split(/\r?\n/).length;
  const isTest = isTestOrFixture(file);
  const isServerAction = isServerActionModule(source);
  const importsServerRuntimeDirectly =
    /from\s+["'](?:@\/server\/|@\/lib\/prisma|@prisma\/client|[^"']*prisma\/generated)/.test(
      source,
    );

  if (!isTest && lineCount > 800) {
    errors.push(`${file} has ${lineCount} lines; split the implementation before it becomes a god module.`);
  } else if (!isTest && lineCount > 600) {
    warnings.push(`${file} has ${lineCount} lines and should be reviewed for responsibility boundaries.`);
  }

  if (
    file.startsWith("src/server/") &&
    !isTest &&
    !/import\s+["']server-only["'];/.test(source.slice(0, 500))
  ) {
    errors.push(`Legacy server module is missing an explicit server-only boundary: ${file}`);
  }

  if (isServerAction) {
    const allowedActionPath =
      /^src\/app\/(?:.+\/)?actions\.ts$/.test(file) ||
      /^src\/features\/.+\/(?:actions|.+-actions)\.ts$/.test(file);

    if (!allowedActionPath) {
      errors.push(`Server Action is outside an approved temporary app/legacy-feature boundary: ${file}`);
    }

    if (
      importsServerRuntimeDirectly &&
      /@prisma\/client|prisma\/generated|@\/lib\/prisma/.test(source)
    ) {
      errors.push(`Server Action must delegate to a domain command instead of importing Prisma directly: ${file}`);
    }

    if (/from\s+["']react["']/.test(source)) {
      errors.push(`Server Action imports React and mixes transport with UI concerns: ${file}`);
    }
  }

  if (isProductionSource(file)) {
    const currentAmericanCount =
      americanCatalogueCount(file) + americanCatalogueCount(source);
    const baseSource = previousPath ? readBaseFile(previousPath) : readBaseFile(file);
    const baseAmericanCount =
      americanCatalogueCount(previousPath ?? file) + americanCatalogueCount(baseSource ?? "");

    if (currentAmericanCount > baseAmericanCount) {
      errors.push(
        `American catalog spelling increased in ${file}: ${baseAmericanCount} -> ${currentAmericanCount}. Use catalogue.`,
      );
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
  `- Source files scanned: ${allSourceFiles.length}`,
  `- Server Action modules indexed: ${serverActionModules.size}`,
  `- Documented legacy transport exceptions observed: ${observedLegacyEdges.size}`,
  `- Workflow files: ${actualWorkflows.join(", ") || "none"}`,
  `- Required repository contracts: ${requiredFiles.length}`,
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
