import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const targets = [
  "src/app/layout.tsx",
  "src/components/brand",
  "src/components/layout",
  "src/components/theme",
  "src/components/ui/dialog.tsx",
  "src/components/ui/sheet.tsx",
  "src/features/control-room/shell",
  "src/features/control-room/inventory",
  "src/features/control-room/product-editor/product-editor-controller.tsx",
  "src/features/control-room/record-sale/record-sale-controller.tsx",
];

const ignoredPaths = new Set([
  "src/components/brand/laitstyle-symbol.tsx",
]);

const rawColour =
  "(?:#[0-9a-fA-F]{3,8}|rgba?\\(|hsla?\\(|oklch\\(|oklab\\(|lab\\(|lch\\()";
const checks = [
  {
    label: "raw arbitrary Tailwind colour",
    pattern: new RegExp(
      `(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow)-\\[[^\\]\\n]*${rawColour}[^\\]\\n]*\\]`,
      "g",
    ),
  },
  {
    label: "raw inline colour style",
    pattern: new RegExp(
      `(?:background|backgroundColor|borderColor|color|fill|stroke)\\s*:\\s*["'\\`]${rawColour}`,
      "g",
    ),
  },
  {
    label: "raw SVG colour literal",
    pattern: /(?:fill|stroke|stopColor)=["']#[0-9a-fA-F]{3,8}["']/g,
  },
];

const files = [];
for (const target of targets) {
  await collectFiles(path.join(root, target), files);
}

const failures = [];
for (const absolutePath of files) {
  const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
  if (ignoredPaths.has(relativePath)) continue;
  const source = await readFile(absolutePath, "utf8");
  const lines = source.split("\n");

  for (const check of checks) {
    for (const match of source.matchAll(check.pattern)) {
      const before = source.slice(0, match.index);
      const lineNumber = before.split("\n").length;
      failures.push(
        `${relativePath}:${lineNumber} ${check.label}: ${lines[lineNumber - 1]?.trim()}`,
      );
    }
  }
}

if (failures.length) {
  throw new Error(
    `Phase 7 theme audit found raw colour literals in theme-critical source files:\n${failures.join("\n")}`,
  );
}

console.log(
  `Phase 7 theme audit passed for ${files.length} theme-critical source files.`,
);

async function collectFiles(targetPath, output) {
  let metadata;
  try {
    metadata = await stat(targetPath);
  } catch {
    throw new Error(`Theme audit target does not exist: ${path.relative(root, targetPath)}`);
  }

  if (metadata.isFile()) {
    if (/\.(?:ts|tsx|js|jsx)$/.test(targetPath)) output.push(targetPath);
    return;
  }

  const entries = await readdir(targetPath, { withFileTypes: true });
  for (const entry of entries) {
    const childPath = path.join(targetPath, entry.name);
    if (entry.isDirectory()) await collectFiles(childPath, output);
    else if (/\.(?:ts|tsx|js|jsx)$/.test(entry.name)) output.push(childPath);
  }
}
