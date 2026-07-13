import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const themePath = path.join(root, "src/app/globals.css");
const targets = [
  "src/app/layout.tsx",
  "src/app/admin",
  "src/components/brand",
  "src/components/layout",
  "src/components/theme",
  "src/components/ui",
  "src/features/control-room",
];

const requiredRoleTokens = [
  "--surface-canvas",
  "--surface-canvas-foreground",
  "--surface-panel",
  "--surface-panel-foreground",
  "--surface-raised",
  "--surface-raised-foreground",
  "--surface-sunken",
  "--surface-sunken-foreground",
  "--surface-interactive",
  "--surface-interactive-hover",
  "--surface-interactive-foreground",
  "--surface-selected",
  "--surface-selected-foreground",
  "--surface-selected-muted",
  "--surface-inverse",
  "--surface-inverse-foreground",
  "--action-primary",
  "--action-primary-foreground",
  "--action-secondary",
  "--action-secondary-foreground",
  "--control",
  "--control-hover",
  "--control-foreground",
  "--border-subtle",
  "--border-strong",
  "--focus",
  "--destructive-surface",
  "--destructive-surface-foreground",
  "--success-surface",
  "--success-surface-foreground",
  "--warning-surface",
  "--warning-surface-foreground",
  "--sidebar-selected",
  "--sidebar-selected-foreground",
];

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
    label: "raw named neutral colour",
    pattern:
      /(?:bg|text|border|ring|outline|fill|stroke|from|via|to)-(?:black|white|gray|grey|slate|zinc|neutral|stone)(?:\/[\d.]+)?\b/g,
  },
  {
    label: "raw inline colour style",
    pattern: new RegExp(
      `(?:background|backgroundColor|borderColor|color|fill|stroke)\\s*:\\s*["']${rawColour}`,
      "g",
    ),
  },
  {
    label: "raw SVG colour literal",
    pattern: /(?:fill|stroke|stopColor)=["']#[0-9a-fA-F]{3,8}["']/g,
  },
  {
    label: "manual dark-mode colour patch",
    pattern:
      /dark:[^\s"']*(?:bg|text|border|ring|outline|fill|stroke|from|via|to|shadow)-[^\s"']+/g,
  },
];

const files = [];
for (const target of targets) {
  await collectFiles(path.join(root, target), files);
}

const failures = [];
for (const absolutePath of files) {
  const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
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

const themeSource = await readFile(themePath, "utf8");
for (const token of requiredRoleTokens) {
  const declaration = new RegExp(`^\\s*${escapeRegExp(token)}\\s*:`, "gm");
  const occurrences = themeSource.match(declaration)?.length ?? 0;
  if (occurrences < 2) {
    failures.push(
      `src/app/globals.css missing paired light/dark declarations for ${token} (found ${occurrences})`,
    );
  }
}

if (failures.length) {
  throw new Error(
    `Phase 8A theme audit found role-system violations:\n${failures.join("\n")}`,
  );
}

console.log(
  `Phase 8A theme audit passed for ${files.length} scoped application source files and ${requiredRoleTokens.length} paired role tokens.`,
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
