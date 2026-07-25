import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = process.cwd();
const errors = [];
const warnings = [];
const sourcePattern = /\.(?:[cm]?[jt]sx?)$/i;

function normalise(value) {
  return value.replaceAll("\\", "/");
}

function listFiles(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    const repoPath = normalise(join(prefix, entry.name));
    return entry.isDirectory() ? listFiles(absolute, repoPath) : [repoPath];
  });
}

function isTestOrFixture(file) {
  return /(?:\.test\.|\.spec\.|\/tests?\/|\/__tests__\/|\/stories\/|\.stories\.)/.test(file);
}

function isProductionSource(file) {
  return file.startsWith("src/") && sourcePattern.test(file) && !isTestOrFixture(file);
}

function isClientModule(source) {
  const start = source.trimStart().slice(0, 300);
  return start.startsWith('"use client";') || start.startsWith("'use client';");
}

function isServerActionModule(source) {
  const start = source.trimStart().slice(0, 300);
  return start.startsWith('"use server";') || start.startsWith("'use server';");
}

function importSpecifiers(source) {
  const values = new Set();
  const staticImport = /(?:import|export)\s+(?:type\s+)?(?:[^"'`;]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImport = /import\(\s*["']([^"']+)["']\s*\)/g;
  for (const match of source.matchAll(staticImport)) values.add(match[1]);
  for (const match of source.matchAll(dynamicImport)) values.add(match[1]);
  return [...values];
}

function resolveLocalImport(fromFile, specifier) {
  if (!(specifier.startsWith("@/") || specifier.startsWith("."))) return null;
  const base = specifier.startsWith("@/")
    ? join(root, "src", specifier.slice(2))
    : resolve(dirname(join(root, fromFile)), specifier);
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    `${base}.cjs`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
    join(base, "index.js"),
    join(base, "index.jsx"),
  ];
  const match = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
  return match ? normalise(relative(root, match)) : null;
}

function importsServerRuntime(specifier, resolvedPath) {
  return (
    specifier === "server-only" ||
    specifier === "@prisma/client" ||
    specifier.startsWith("@/server/") ||
    specifier.startsWith("@/lib/prisma") ||
    specifier.startsWith("@/lib/supabase/server") ||
    specifier.includes("prisma/generated") ||
    /^@\/modules\/[^/]+\/server(?:\/|$)/.test(specifier) ||
    resolvedPath?.startsWith("src/server/") ||
    /^src\/modules\/[^/]+\/server\//.test(resolvedPath ?? "")
  );
}

function hasFixturePath(value) {
  const candidate = normalise(value).replace(/^@\/|^\.\//, "");
  return /(?:^|\/)(?:tests\/fixtures|tests\/factories|stories\/fixtures|scripts\/seed|development\/fixtures)(?:\/|$)/.test(
    candidate,
  );
}

function changedEntries() {
  const baseRef = process.env.CI_BASE_REF?.trim();
  const ranges = baseRef ? [`origin/${baseRef}...HEAD`, "HEAD^...HEAD"] : ["HEAD^...HEAD"];
  for (const range of ranges) {
    try {
      return execFileSync("git", ["diff", "--name-status", "--find-renames", range], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split("\t");
          const status = parts[0][0];
          return { status, path: normalise(status === "R" || status === "C" ? parts[2] : parts[1]) };
        });
    } catch {
      // Try the next deterministic range.
    }
  }
  warnings.push("Could not resolve a git diff range; new-file ownership rules were not checked.");
  return [];
}

const allFiles = listFiles(join(root, "src"), "src");
const sourceFiles = allFiles.filter((file) => sourcePattern.test(file));
const sourceByFile = new Map(
  sourceFiles.map((file) => [file, readFileSync(join(root, file), "utf8")]),
);
const serverActions = new Set(
  [...sourceByFile].filter(([, source]) => isServerActionModule(source)).map(([file]) => file),
);

const requiredFiles = [
  "src/stores/cart.store.ts",
  "src/stores/saved-items.store.ts",
  "src/stores/storefront-ui.store.ts",
  "src/providers/providers.tsx",
  "src/modules/products/storefront/catalogue-contract.ts",
  "src/modules/products/server/storefront/catalogue-projection.ts",
  "src/modules/products/client/storefront-catalogue.ts",
  "src/app/api/v1/products/route.ts",
];
for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) errors.push(`Required target-architecture file is missing: ${file}`);
}

const retiredFiles = [
  "src/features/storefront/shared/storefront-provider.tsx",
  "src/features/storefront/shared/storefront-client-state-provider.tsx",
  "src/features/storefront/shared/catalog-adapter.ts",
  "src/features/storefront/shared/catalog-loader.ts",
  "src/features/storefront/shared/catalog-types.ts",
  "src/modules/products/client/storefront-catalog.ts",
  "src/app/api/v1/storefront/catalogue/route.ts",
  "src/app/api/v1/storefront/catalogue/route.test.ts",
  "src/app/api/v1/storefront/catalog/route.ts",
  "src/app/api/v1/storefront/catalog/route.test.ts",
];
for (const file of retiredFiles) {
  if (existsSync(join(root, file))) errors.push(`Retired Phase 5/6 file remains: ${file}`);
}

const retiredImports = [
  "@/features/storefront/shared/storefront-provider",
  "@/features/storefront/shared/storefront-client-state-provider",
  "@/features/storefront/shared/catalog-adapter",
  "@/features/storefront/shared/catalog-loader",
  "@/features/storefront/shared/catalog-types",
  "@/modules/products/client/storefront-catalog",
];

const retiredSymbols = [
  "StorefrontCatalogPayload",
  "StorefrontShellCatalogPayload",
  "storefrontCatalogQueryKey",
  "getStorefrontShellCatalog",
  "loadStorefrontCatalog",
  "loadStorefrontShellCatalog",
  "useStorefrontCatalog",
  "useStorefrontCatalogData",
  "buildStorefrontCatalog",
  "buildStorefrontShellCatalog",
];

for (const [file, source] of sourceByFile) {
  const imports = importSpecifiers(source);

  for (const retiredImport of retiredImports) {
    if (imports.includes(retiredImport)) errors.push(`Retired Phase 5/6 import in ${file}: ${retiredImport}`);
  }

  if (isProductionSource(file)) {
    for (const symbol of retiredSymbols) {
      if (source.includes(symbol)) errors.push(`Retired American catalogue symbol in ${file}: ${symbol}`);
    }
    if (/['"`]\/api\/v1\/storefront\//.test(source)) {
      errors.push(`Obsolete storefront API prefix remains in ${file}; use the owning /api/v1 domain.`);
    }
    if (/\b[Cc]atalog(?!ue)[A-Za-z0-9_]*/.test(source)) {
      errors.push(`American catalog spelling remains in production source: ${file}`);
    }
  }

  for (const specifier of imports) {
    const resolvedPath = resolveLocalImport(file, specifier);
    if (isProductionSource(file) && (hasFixturePath(specifier) || hasFixturePath(resolvedPath ?? ""))) {
      errors.push(`Production fixture import in ${file}: ${specifier}`);
    }

    if (isClientModule(source) && importsServerRuntime(specifier, resolvedPath)) {
      errors.push(`Client/server boundary violation in ${file}: ${specifier}`);
    }

    if (resolvedPath && serverActions.has(resolvedPath)) {
      if (imports.includes("@tanstack/react-query")) {
        errors.push(`TanStack module imports a Server Action: ${file} -> ${resolvedPath}`);
      }
      if (/^src\/app\/.+\/route\.[cm]?[jt]sx?$/.test(file)) {
        errors.push(`Route Handler imports a Server Action: ${file} -> ${resolvedPath}`);
      }
    }

    if (
      specifier.startsWith("@/features/storefront/") &&
      /^(?:src\/app\/|src\/stores\/|src\/modules\/|src\/server\/)/.test(file)
    ) {
      errors.push(`Target ownership leak: ${file} imports legacy ${specifier}`);
    }

    if (file.startsWith("src/modules/") && specifier.startsWith("@/features/")) {
      errors.push(`Domain module depends on legacy feature UI: ${file} -> ${specifier}`);
    }
  }

  if (isProductionSource(file) && file.startsWith("src/server/") && !file.startsWith("src/server/auth/")) {
    errors.push(`Top-level server business code must move to its domain module: ${file}`);
  }

  if (isProductionSource(file) && /^src\/app\/api\//.test(file)) {
    const allowed =
      file.startsWith("src/app/api/v1/") ||
      file.startsWith("src/app/api/health/") ||
      file.startsWith("src/app/api/internal/");
    if (!allowed) errors.push(`Machine-readable API route is outside /api/v1: ${file}`);
  }

  if (!isTestOrFixture(file)) {
    const lines = source.split(/\r?\n/).length;
    if (lines > 800) errors.push(`${file} has ${lines} lines; split the god module.`);
    else if (lines > 600) warnings.push(`${file} has ${lines} lines and needs a responsibility review.`);
  }
}

for (const entry of changedEntries()) {
  if (entry.status !== "A" || !isProductionSource(entry.path)) continue;
  if (entry.path.startsWith("src/features/")) {
    errors.push(`New production code was added under legacy features ownership: ${entry.path}`);
  }
  if (entry.path.startsWith("src/server/")) {
    errors.push(`New production code was added under legacy top-level server ownership: ${entry.path}`);
  }
}

const summary = [
  "## Architecture guard",
  "",
  `- Source files scanned: ${sourceFiles.length}`,
  `- Server Action modules indexed: ${serverActions.size}`,
  `- Errors: ${errors.length}`,
  `- Warnings: ${warnings.length}`,
];
if (warnings.length) summary.push("", "### Warnings", ...warnings.map((warning) => `- ${warning}`));
if (errors.length) summary.push("", "### Failures", ...errors.map((error) => `- ${error}`));
const rendered = `${summary.join("\n")}\n`;
process.stdout.write(rendered);
if (errors.length) process.exit(1);
