import { existsSync, readFileSync, readdirSync } from "node:fs";
import path, { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const sourcePattern = /\.(?:[cm]?[jt]sx?)$/i;
const extensions = [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".css"];

const normalise = (value) => value.replaceAll("\\", "/");
const isInternal = (specifier) => specifier.startsWith("@/") || specifier.startsWith(".");

export function stripComments(source) {
  let result = "";
  let quote = null;
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (quote) {
      result += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === '"' || character === "'" || character === "`") {
      quote = character;
      result += character;
      continue;
    }
    if (character === "/" && next === "/") {
      result += "  ";
      index += 1;
      while (index + 1 < source.length && source[index + 1] !== "\n") {
        result += " ";
        index += 1;
      }
      continue;
    }
    if (character === "/" && next === "*") {
      result += "  ";
      index += 1;
      while (index + 1 < source.length) {
        if (source[index + 1] === "*" && source[index + 2] === "/") {
          result += "  ";
          index += 2;
          break;
        }
        index += 1;
        result += source[index] === "\n" ? "\n" : " ";
      }
      continue;
    }
    result += character;
  }
  return result;
}

function maskNonCode(source) {
  let result = "";
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (character === "\n") {
        lineComment = false;
        result += "\n";
      } else result += " ";
      continue;
    }
    if (blockComment) {
      if (character === "*" && next === "/") {
        result += "  ";
        blockComment = false;
        index += 1;
      } else result += character === "\n" ? "\n" : " ";
      continue;
    }
    if (quote) {
      result += character === "\n" ? "\n" : " ";
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === quote) quote = null;
      continue;
    }
    if (character === "/" && next === "/") {
      result += "  ";
      lineComment = true;
      index += 1;
    } else if (character === "/" && next === "*") {
      result += "  ";
      blockComment = true;
      index += 1;
    } else if (character === '"' || character === "'" || character === "`") {
      quote = character;
      result += " ";
    } else result += character;
  }
  return result;
}

function keywordIsCode(mask, match, keyword) {
  const offset = match[0].indexOf(keyword);
  return offset >= 0 && mask.slice(match.index + offset, match.index + offset + keyword.length) === keyword;
}

function splitBindings(value) {
  return value
    .split(",")
    .map((binding) => binding.trim().replace(/^type\s+/, ""))
    .filter(Boolean)
    .map((binding) => {
      const [imported, local] = binding.split(/\s+as\s+/).map((part) => part.trim());
      return { imported, local: local ?? imported };
    });
}

function importedNames(clause) {
  const value = clause.trim().replace(/^type\s+/, "");
  const names = [];
  const named = value.match(/\{([\s\S]*?)\}/);
  if (named) names.push(...splitBindings(named[1]).map(({ imported }) => imported));
  const leading = value.split("{")[0].trim().replace(/,$/, "").trim();
  if (leading && !leading.startsWith("*")) names.unshift("default");
  return [...new Set(names)];
}

export function parseModuleSyntax(source) {
  const code = stripComments(source);
  const mask = maskNonCode(source);
  const imports = [];
  const directExports = new Set();
  const namedReexports = [];
  const starReexports = [];
  for (const match of code.matchAll(/(?:^|[;\n])\s*import\s+((?:type\s+)?[^;"']+?)\s+from\s+(["'])([^"']+)\2/g)) {
    if (!keywordIsCode(mask, match, "import")) continue;
    imports.push({ kind: "import", specifier: match[3], names: importedNames(match[1]) });
  }
  for (const match of code.matchAll(/(?:^|[;\n])\s*import\s*(["'])([^"']+)\1/g)) {
    if (!keywordIsCode(mask, match, "import")) continue;
    imports.push({ kind: "import", specifier: match[2], names: [] });
  }
  for (const match of code.matchAll(/\bimport\s*\(\s*(["'])([^"']+)\1\s*\)/g)) {
    if (!keywordIsCode(mask, match, "import")) continue;
    imports.push({ kind: "dynamic-import", specifier: match[2], names: [] });
  }
  for (const match of code.matchAll(/(?:^|[;\n])\s*export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from\s+(["'])([^"']+)\2/g)) {
    if (!keywordIsCode(mask, match, "export")) continue;
    const bindings = splitBindings(match[1]);
    namedReexports.push({ specifier: match[3], bindings });
    imports.push({ kind: "reexport", specifier: match[3], names: bindings.map(({ imported }) => imported) });
  }
  for (const match of code.matchAll(/(?:^|[;\n])\s*export\s+\*\s*(?:as\s+([A-Za-z_$][\w$]*)\s+)?from\s+(["'])([^"']+)\2/g)) {
    if (!keywordIsCode(mask, match, "export")) continue;
    starReexports.push({ specifier: match[3], exportedName: match[1] ?? null });
    imports.push({ kind: "reexport", specifier: match[3], names: [] });
  }
  for (const match of code.matchAll(/(?:^|[;\n])\s*export\s+default\b/g)) {
    directExports.add("default");
  }
  for (const match of code.matchAll(/(?:^|[;\n])\s*export\s+(?:declare\s+)?(?:async\s+)?(?:function|class|type|interface|enum|namespace)\s+([A-Za-z_$][\w$]*)/g)) {
    directExports.add(match[1]);
  }
  for (const match of code.matchAll(/(?:^|[;\n])\s*export\s+(?:declare\s+)?(?:const|let|var)\s+([^;\n]+)/g)) {
    for (const item of match[1].split(",")) {
      const name = item.trim().match(/^([A-Za-z_$][\w$]*)/)?.[1];
      if (name) directExports.add(name);
    }
  }
  for (const match of code.matchAll(/(?:^|[;\n])\s*export\s+(?:type\s+)?\{([^}]+)\}(?!\s*from\b)/g)) {
    for (const { local } of splitBindings(match[1])) directExports.add(local);
  }
  for (const match of code.matchAll(/(?:^|[;\n])\s*exports\.([A-Za-z_$][\w$]*)\s*=/g)) {
    if (keywordIsCode(mask, match, "exports")) directExports.add(match[1]);
  }
  for (const match of code.matchAll(/(?:^|[;\n])\s*module\.exports\s*=\s*\{\s*\.\.\.\s*require\s*\(\s*(["'])([^"']+)\1\s*\)\s*\}/g)) {
    if (!keywordIsCode(mask, match, "module")) continue;
    starReexports.push({ specifier: match[2], exportedName: null });
    imports.push({ kind: "reexport", specifier: match[2], names: [] });
  }
  return { imports, directExports, namedReexports, starReexports };
}

function candidates(fromFile, specifier) {
  const resourcePath = specifier.replace(/[?#].*$/, "");
  const base = resourcePath.startsWith("@/")
    ? `src/${resourcePath.slice(2)}`
    : path.posix.normalize(path.posix.join(path.posix.dirname(normalise(fromFile)), resourcePath));
  return [base, ...extensions.map((extension) => `${base}${extension}`), ...extensions.map((extension) => `${base}/index${extension}`)];
}

function resolveModule(files, fromFile, specifier) {
  if (!isInternal(specifier)) return null;
  return candidates(fromFile, specifier).find((candidate) => files.has(candidate)) ?? null;
}

export function classifyModuleGraph({ files }) {
  const fileMap = new Map(Object.entries(files).map(([file, source]) => [normalise(file), source]));
  const parsed = new Map([...fileMap].map(([file, source]) => [file, parseModuleSyntax(source)]));
  const cache = new Map();
  function exportsOf(file, stack = new Set()) {
    if (cache.has(file)) return cache.get(file);
    if (stack.has(file) || !parsed.has(file)) return new Set();
    const syntax = parsed.get(file);
    const names = new Set(syntax.directExports);
    cache.set(file, names);
    const next = new Set(stack).add(file);
    for (const entry of syntax.namedReexports) {
      const target = resolveModule(fileMap, file, entry.specifier);
      if (!target) continue;
      const targetNames = exportsOf(target, next);
      for (const binding of entry.bindings) if (targetNames.has(binding.imported)) names.add(binding.local);
    }
    for (const entry of syntax.starReexports) {
      const target = resolveModule(fileMap, file, entry.specifier);
      if (!target) continue;
      if (entry.exportedName) names.add(entry.exportedName);
      else for (const name of exportsOf(target, next)) if (name !== "default") names.add(name);
    }
    return names;
  }
  const violations = [];
  for (const file of [...fileMap.keys()].sort()) {
    for (const entry of parsed.get(file).imports) {
      if (!isInternal(entry.specifier)) continue;
      const target = resolveModule(fileMap, file, entry.specifier);
      if (!target) {
        violations.push({ rule: "unresolved-internal-module", importer: file, imported: entry.specifier, detail: `Cannot resolve internal module ${entry.specifier}.` });
        continue;
      }
      const available = exportsOf(target);
      for (const name of entry.names) {
        if (!available.has(name)) violations.push({ rule: "missing-export", importer: file, imported: entry.specifier, detail: `${entry.specifier} does not export ${name} (resolved to ${target}).` });
      }
    }
  }
  return violations;
}

function listFiles(directory, pattern = sourcePattern) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(absolute, pattern) : pattern.test(entry.name) ? [absolute] : [];
  });
}

export function runModuleExportGuard(root = process.cwd()) {
  const sourceFiles = listFiles(join(root, "src"));
  const moduleFiles = [
    ...listFiles(join(root, "src"), /\.(?:[cm]?[jt]sx?|css)$/i),
    ...listFiles(join(root, "scripts", "checks")),
    ...listFiles(join(root, "scripts", "auth")),
    ...listFiles(join(root, "prisma", "generated")),
  ];
  const assetFiles = listFiles(join(root, "prisma", "generated"), /\.wasm$/i);
  const files = Object.fromEntries([
    ...moduleFiles.map((file) => [normalise(relative(root, file)), readFileSync(file, "utf8")]),
    ...assetFiles.map((file) => [normalise(relative(root, file)), ""]),
  ]);
  return { scanned: sourceFiles.length, violations: classifyModuleGraph({ files }) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = runModuleExportGuard(process.cwd());
  const lines = ["## Module export guard", "", `- Source files scanned: ${result.scanned}`, `- Errors: ${result.violations.length}`];
  if (result.violations.length) lines.push("", "### Failures", ...result.violations.map((violation) => `- ${violation.importer}: ${violation.detail}`));
  process.stdout.write(`${lines.join("\n")}\n`);
  if (result.violations.length) process.exitCode = 1;
}
