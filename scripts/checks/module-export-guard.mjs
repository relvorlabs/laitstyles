import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const root = process.cwd();
const sourceRoot = join(root, "src");
const sourcePattern = /\.(?:[cm]?[jt]sx?)$/i;
const errors = [];

function normalise(value) {
  return value.replaceAll("\\", "/");
}

function listSourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(absolute);
    return sourcePattern.test(entry.name) ? [absolute] : [];
  });
}

function resolveInternalModule(fromFile, specifier) {
  if (!(specifier.startsWith("@/") || specifier.startsWith("."))) return null;

  const base = specifier.startsWith("@/")
    ? join(sourceRoot, specifier.slice(2))
    : resolve(dirname(fromFile), specifier);
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
    join(base, "index.mts"),
    join(base, "index.cts"),
    join(base, "index.js"),
    join(base, "index.jsx"),
  ];

  return candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile()) ?? null;
}

function splitBindings(value) {
  return value
    .split(",")
    .map((binding) => binding.trim())
    .filter(Boolean)
    .map((binding) => binding.replace(/^type\s+/, "").split(/\s+as\s+/)[0]?.trim())
    .filter(Boolean);
}

function readModule(file) {
  const source = readFileSync(file, "utf8");
  const direct = new Set();
  const namedReexports = [];
  const starReexports = [];

  if (/\bexport\s+default\b/.test(source)) direct.add("default");

  const declarations = [
    /\bexport\s+(?:declare\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+(?:declare\s+)?class\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+(?:declare\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/g,
    /\bexport\s+(?:declare\s+)?(?:type|interface|enum|namespace)\s+([A-Za-z_$][\w$]*)/g,
  ];

  for (const pattern of declarations) {
    for (const match of source.matchAll(pattern)) direct.add(match[1]);
  }

  const localExportPattern = /\bexport\s+(?:type\s+)?\{([^}]+)\}(?!\s+from\s+["'])/g;
  for (const match of source.matchAll(localExportPattern)) {
    for (const binding of match[1].split(",")) {
      const cleaned = binding.trim().replace(/^type\s+/, "");
      if (!cleaned) continue;
      const parts = cleaned.split(/\s+as\s+/);
      direct.add((parts[1] ?? parts[0]).trim());
    }
  }

  const namedReexportPattern = /\bexport\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(namedReexportPattern)) {
    namedReexports.push({ specifier: match[2], bindings: match[1] });
  }

  const starReexportPattern = /\bexport\s+\*\s+from\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(starReexportPattern)) starReexports.push(match[1]);

  return { source, direct, namedReexports, starReexports };
}

const moduleCache = new Map();

function exportedNames(file, stack = new Set()) {
  if (moduleCache.has(file)) return moduleCache.get(file);
  if (stack.has(file)) return new Set();

  const nextStack = new Set(stack).add(file);
  const module = readModule(file);
  const exports = new Set(module.direct);
  moduleCache.set(file, exports);

  for (const entry of module.namedReexports) {
    const target = resolveInternalModule(file, entry.specifier);
    if (!target) continue;
    const targetExports = exportedNames(target, nextStack);
    for (const binding of entry.bindings.split(",")) {
      const cleaned = binding.trim().replace(/^type\s+/, "");
      if (!cleaned) continue;
      const [sourceName, exportedName] = cleaned.split(/\s+as\s+/).map((part) => part.trim());
      if (targetExports.has(sourceName)) exports.add(exportedName ?? sourceName);
    }
  }

  for (const specifier of module.starReexports) {
    const target = resolveInternalModule(file, specifier);
    if (!target) continue;
    for (const name of exportedNames(target, nextStack)) {
      if (name !== "default") exports.add(name);
    }
  }

  return exports;
}

function importedBindings(source) {
  const imports = [];
  const importPattern = /\bimport\s+(?:type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    const clause = match[1].trim();
    const specifier = match[2];
    const names = [];

    const named = clause.match(/\{([\s\S]*?)\}/);
    if (named) names.push(...splitBindings(named[1]));

    const beforeNamed = clause.split("{")[0].trim().replace(/,$/, "").trim();
    if (beforeNamed && !beforeNamed.startsWith("*")) {
      const defaultBinding = beforeNamed.split(",")[0]?.trim();
      if (defaultBinding) names.push("default");
    }

    imports.push({ specifier, names });
  }

  const reexportPattern = /\bexport\s+(?:type\s+)?\{([^}]+)\}\s+from\s+["']([^"']+)["']/g;
  for (const match of source.matchAll(reexportPattern)) {
    imports.push({ specifier: match[2], names: splitBindings(match[1]) });
  }

  return imports;
}

for (const file of listSourceFiles(sourceRoot)) {
  const source = readFileSync(file, "utf8");
  for (const entry of importedBindings(source)) {
    const target = resolveInternalModule(file, entry.specifier);
    const owner = normalise(relative(root, file));

    if (!target) {
      errors.push(`${owner}: unresolved internal module ${entry.specifier}`);
      continue;
    }

    const available = exportedNames(target);
    for (const name of entry.names) {
      if (!available.has(name)) {
        errors.push(
          `${owner}: ${entry.specifier} does not export ${name} (resolved to ${normalise(relative(root, target))})`,
        );
      }
    }
  }
}

const summary = [
  "## Module export guard",
  "",
  `- Source files scanned: ${listSourceFiles(sourceRoot).length}`,
  `- Errors: ${errors.length}`,
];
if (errors.length) summary.push("", "### Failures", ...errors.map((error) => `- ${error}`));
const rendered = `${summary.join("\n")}\n`;
process.stdout.write(rendered);
if (errors.length) process.exit(1);
