#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";

const mappingPath = process.argv[2];
if (!mappingPath) {
  console.error("Usage: node scripts/tmp-rewrite-imports.mjs <mapping.json>");
  process.exit(1);
}
const mappings = JSON.parse(readFileSync(mappingPath, "utf8"));

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (extname(entry.name) === ".ts" || extname(entry.name) === ".tsx") {
      out.push(full);
    }
  }
  return out;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let changedFiles = 0;
for (const file of walk("src")) {
  const original = readFileSync(file, "utf8");
  let content = original;
  for (const { from, to } of mappings) {
    const pattern = new RegExp(`(["'\`])${escapeRegExp(from)}\\1`, "g");
    content = content.replace(pattern, `$1${to}$1`);
  }
  if (content !== original) {
    writeFileSync(file, content);
    changedFiles += 1;
  }
}
console.log(`Rewrote imports in ${changedFiles} file(s).`);
