import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path, { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseModuleSyntax, stripComments } from "./module-export-guard.mjs";
import { legacyArchitectureExceptions } from "./architecture-legacy-exceptions.mjs";

const sourcePattern = /\.(?:[cm]?[jt]sx?)$/i;
const extensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"];
const normalise = (value) => value.replaceAll("\\", "/");

function isTestOrFixture(file) {
  return /(?:\.test\.|\.spec\.|\/tests?\/|\/__tests__\/|\/stories\/|\.stories\.)/.test(file);
}

function isProductionSource(file) {
  return file.startsWith("src/") && sourcePattern.test(file) && !isTestOrFixture(file);
}

function hasDirective(source, directive) {
  return stripComments(source).trimStart().startsWith(`"${directive}"`) || stripComments(source).trimStart().startsWith(`'${directive}'`);
}

function candidates(fromFile, specifier) {
  const base = specifier.startsWith("@/")
    ? `src/${specifier.slice(2)}`
    : path.posix.normalize(path.posix.join(path.posix.dirname(fromFile), specifier));
  return [base, ...extensions.map((extension) => `${base}${extension}`), ...extensions.map((extension) => `${base}/index${extension}`)];
}

function resolveModule(files, fromFile, specifier) {
  if (!(specifier.startsWith("@/") || specifier.startsWith("."))) return null;
  return candidates(fromFile, specifier).find((candidate) => files.has(candidate)) ?? null;
}

function importsServerRuntime(specifier, resolvedPath) {
  return specifier === "server-only" ||
    specifier === "@prisma/client" ||
    specifier.startsWith("@/server/") ||
    specifier.startsWith("@/lib/prisma") ||
    specifier.startsWith("@/lib/supabase/server") ||
    specifier.includes("prisma/generated") ||
    /^@\/modules\/[^/]+\/server(?:\/|$)/.test(specifier) ||
    resolvedPath?.startsWith("src/server/") ||
    /^src\/modules\/[^/]+\/server\//.test(resolvedPath ?? "");
}

function hasFixturePath(specifier, resolvedPath) {
  return [specifier, resolvedPath]
    .filter(Boolean)
    .map(normalise)
    .some((value) => /(?:^|\/)(?:tests\/fixtures|tests\/factories|stories\/fixtures|scripts\/seed|development\/fixtures)(?:\/|$)/.test(value.replace(/^@\//, "")));
}

function externalBindings(source) {
  const bindings = new Set();
  const code = stripComments(source);
  for (const match of code.matchAll(/(?:^|[;\n])\s*import\s+([^;"']+?)\s+from\s+(["'])([^"']+)\2/g)) {
    if (match[3].startsWith("@/") || match[3].startsWith(".")) continue;
    const clause = match[1].trim().replace(/^type\s+/, "");
    const defaultBinding = clause.split(/[,{]/)[0].trim();
    if (defaultBinding && !defaultBinding.startsWith("*")) bindings.add(defaultBinding);
    const named = clause.match(/\{([\s\S]*?)\}/)?.[1] ?? "";
    for (const item of named.split(",")) {
      const value = item.trim().replace(/^type\s+/, "");
      if (!value) continue;
      bindings.add((value.split(/\s+as\s+/)[1] ?? value.split(/\s+as\s+/)[0]).trim());
    }
  }
  return bindings;
}

function catalogTokens(source) {
  let code = stripComments(source);
  for (const { specifier } of parseModuleSyntax(source).imports) {
    if (!specifier.startsWith("@/") && !specifier.startsWith(".")) code = code.replaceAll(specifier, "");
  }
  return new Set([...code.matchAll(/\b[Cc]atalog(?!ue)[A-Za-z0-9_$]*/g)].map((match) => match[0]));
}

function internalApiCalls(source) {
  const code = stripComments(source);
  const calls = new Set();
  for (const match of code.matchAll(/\bfetch\s*\(\s*(?:new\s+URL\s*\(\s*)?(["'])(\/api\/[^"']*)\1/g)) calls.add(match[2]);
  return [...calls];
}

export function classifyArchitectureGraph({ files, previousFiles = {} }) {
  const fileMap = new Map(Object.entries(files).map(([file, source]) => [normalise(file), source]));
  const parsed = new Map([...fileMap].map(([file, source]) => [file, parseModuleSyntax(source)]));
  const actions = new Set([...fileMap].filter(([, source]) => hasDirective(source, "use server")).map(([file]) => file));
  const actionCache = new Map();
  function reachesAction(file, stack = new Set()) {
    if (actions.has(file)) return true;
    if (actionCache.has(file)) return actionCache.get(file);
    if (stack.has(file)) return false;
    const next = new Set(stack).add(file);
    const result = [...(parsed.get(file)?.namedReexports ?? []), ...(parsed.get(file)?.starReexports ?? [])]
      .map((entry) => resolveModule(fileMap, file, entry.specifier))
      .filter(Boolean)
      .some((target) => reachesAction(target, next));
    actionCache.set(file, result);
    return result;
  }

  const violations = [];
  for (const file of [...fileMap.keys()].sort()) {
    const source = fileMap.get(file);
    const imports = parsed.get(file).imports;
    const specifiers = new Set(imports.map(({ specifier }) => specifier));
    for (const entry of imports) {
      const resolvedPath = resolveModule(fileMap, file, entry.specifier);
      if (isProductionSource(file) && hasFixturePath(entry.specifier, resolvedPath)) {
        violations.push({ rule: "production-fixture-import", importer: file, imported: entry.specifier, detail: "Production source imports a test or development fixture." });
      }
      if (hasDirective(source, "use client") && importsServerRuntime(entry.specifier, resolvedPath)) {
        violations.push({ rule: "client-server-import", importer: file, imported: entry.specifier, detail: `Client module imports server runtime ${resolvedPath ?? entry.specifier}.` });
      }
      if (resolvedPath && reachesAction(resolvedPath) && specifiers.has("@tanstack/react-query")) {
        violations.push({ rule: "tanstack-server-action", importer: file, imported: resolvedPath, detail: "TanStack module imports a Server Action." });
      }
      if (resolvedPath && reachesAction(resolvedPath) && /^src\/app\/.+\/route\.[cm]?[jt]sx?$/.test(file)) {
        violations.push({ rule: "route-handler-server-action", importer: file, imported: resolvedPath, detail: actions.has(resolvedPath) ? "Route Handler imports a Server Action." : "Route Handler imports a Server Action through a re-export." });
      }
    }

    if (isProductionSource(file) && file.startsWith("src/app/") && !/\/route\.[cm]?[jt]sx?$/.test(file) && !hasDirective(source, "use client") && !hasDirective(source, "use server")) {
      for (const apiPath of internalApiCalls(source)) violations.push({ rule: "server-component-internal-api", importer: file, detail: `Server Component calls internal API ${apiPath} instead of its domain query.` });
    }

    if (isProductionSource(file)) {
      const previousTokens = catalogTokens(previousFiles[file] ?? "");
      const ignored = externalBindings(source);
      for (const token of catalogTokens(source)) {
        if (!previousTokens.has(token) && !ignored.has(token)) violations.push({ rule: "american-catalogue-language", importer: file, detail: `New American catalogue identifier: ${token}.` });
      }
    }
  }
  return violations;
}

function listFiles(directory, prefix = "") {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    const repoPath = normalise(join(prefix, entry.name));
    return entry.isDirectory() ? listFiles(absolute, repoPath) : sourcePattern.test(entry.name) ? [repoPath] : [];
  });
}

function previousSource(root, file) {
  try {
    return execFileSync("git", ["show", `HEAD^:${file}`], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return "";
  }
}

export function runArchitectureGuard(root = process.cwd()) {
  const sourceFiles = listFiles(join(root, "src"), "src");
  const files = Object.fromEntries(sourceFiles.map((file) => [file, readFileSync(join(root, file), "utf8")]));
  let changedFiles = new Set();
  try {
    changedFiles = new Set(execFileSync("git", ["diff", "--name-only", "HEAD^", "--", "src"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split(/\r?\n/).map(normalise).filter(Boolean));
  } catch {
    // An empty previous source fails new-debt checks closed when Git history is unavailable.
  }
  const previousFiles = Object.fromEntries(sourceFiles.map((file) => [file, changedFiles.has(file) ? previousSource(root, file) : files[file]]));
  const violations = classifyArchitectureGraph({ files, previousFiles });
  const warnings = [];
  const importsByFile = new Map(sourceFiles.map((file) => [file, new Set(parseModuleSyntax(files[file]).imports.map(({ specifier }) => specifier))]));
  const exceptionEdges = new Set(legacyArchitectureExceptions.map((entry) => `${entry.importer}->${entry.imported}`));

  for (const entry of legacyArchitectureExceptions) {
    if (!importsByFile.get(entry.importer)?.has(entry.imported)) violations.push({ rule: "stale-architecture-exception", importer: entry.importer, imported: entry.imported, detail: `Stale architecture exception: ${entry.importer} -> ${entry.imported}.` });
  }

  for (const file of sourceFiles.filter(isProductionSource)) {
    const previousImports = new Set(parseModuleSyntax(previousFiles[file] ?? "").imports.map(({ specifier }) => specifier));
    for (const specifier of importsByFile.get(file)) {
      const edge = `${file}->${specifier}`;
      const authCompatibility = specifier === "@/server/auth/session" || specifier === "@/server/auth/profile" || specifier.startsWith("@/features/storefront/shared/storefront-auth-");
      const checkoutCompatibility = /^(?:src\/app\/|src\/stores\/|src\/modules\/|src\/server\/)/.test(file) && specifier.startsWith("@/features/storefront/checkout/");
      if ((authCompatibility || checkoutCompatibility) && !exceptionEdges.has(edge)) violations.push({ rule: "undocumented-compatibility-edge", importer: file, imported: specifier, detail: `Undocumented compatibility edge: ${file} -> ${specifier}.` });
      const newImport = !previousImports.has(specifier);
      if (newImport && specifier.startsWith("@/features/storefront/") && /^(?:src\/app\/|src\/stores\/|src\/modules\/|src\/server\/)/.test(file) && !exceptionEdges.has(edge)) violations.push({ rule: "target-ownership-leak", importer: file, imported: specifier, detail: `New target ownership leak imports legacy ${specifier}.` });
      if (newImport && file.startsWith("src/modules/") && specifier.startsWith("@/features/") && !exceptionEdges.has(edge)) violations.push({ rule: "domain-feature-leak", importer: file, imported: specifier, detail: `New domain module dependency on legacy feature ${specifier}.` });
    }
    if (/^src\/app\/api\//.test(file) && !file.startsWith("src/app/api/v1/") && !file.startsWith("src/app/api/health/") && !file.startsWith("src/app/api/internal/")) violations.push({ rule: "unversioned-api-route", importer: file, detail: "Machine-readable API route is outside /api/v1." });
    const lines = files[file].split(/\r?\n/).length;
    if (lines > 800) violations.push({ rule: "god-module", importer: file, detail: `${file} has ${lines} lines; split the god module.` });
    else if (lines > 600) warnings.push(`${file} has ${lines} lines and needs a responsibility review.`);
  }

  const requiredFiles = ["src/stores/cart.store.ts", "src/stores/saved-items.store.ts", "src/stores/storefront-ui.store.ts", "src/providers/providers.tsx", "src/modules/products/storefront/catalogue-contract.ts", "src/modules/products/server/storefront/catalogue-projection.ts", "src/modules/products/client/storefront-catalogue.ts", "src/app/api/v1/products/route.ts"];
  for (const file of requiredFiles) if (!existsSync(join(root, file))) violations.push({ rule: "missing-target-file", importer: file, detail: `Required target-architecture file is missing: ${file}.` });
  return { scanned: sourceFiles.length, serverActions: Object.values(files).filter((source) => hasDirective(source, "use server")).length, violations, warnings };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = runArchitectureGuard(process.cwd());
  const lines = ["## Architecture guard", "", `- Source files scanned: ${result.scanned}`, `- Server Action modules indexed: ${result.serverActions}`, `- Errors: ${result.violations.length}`, `- Warnings: ${result.warnings.length}`];
  if (result.warnings.length) lines.push("", "### Warnings", ...result.warnings.map((warning) => `- ${warning}`));
  if (result.violations.length) lines.push("", "### Failures", ...result.violations.map((violation) => `- [${violation.rule}] ${violation.importer}${violation.imported ? ` -> ${violation.imported}` : ""}: ${violation.detail}`));
  process.stdout.write(`${lines.join("\n")}\n`);
  if (result.violations.length) process.exitCode = 1;
}
