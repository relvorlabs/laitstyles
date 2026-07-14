import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const strict = process.argv.includes("--strict");

// Native elements are intentional only inside low-level primitive implementations.
const nativeAllowlist = new Map([
  ["src/components/ui/button.tsx", "The shadcn/Base UI Button primitive must ultimately render a native button."],
  ["src/components/ui/dialog.tsx", "Low-level Base UI dialog close primitive."],
  ["src/components/ui/sheet.tsx", "Low-level Base UI sheet close primitive."],
  ["src/components/ui/input-group.tsx", "Low-level input-group affordance primitive."],
]);

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
    if (/(^|\/)(node_modules|\.next|dist|build|coverage|generated)(\/|$)/.test(relative)) return [];
    return statSync(absolute).isDirectory() ? walk(absolute) : [relative];
  });
}

function countRawButtons(content) {
  return [...content.matchAll(/<button\b/g)].length;
}

function readMainVersion(file) {
  for (const ref of ["origin/main", "main"]) {
    try {
      return execFileSync("git", ["show", `${ref}:${file}`], {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
    } catch {
      // Try the next available main ref.
    }
  }
  return null;
}

const files = walk(sourceRoot).filter((file) => /\.(?:tsx|jsx)$/.test(file));
const rows = [];
const violations = [];

for (const file of files) {
  const current = countRawButtons(readFileSync(path.join(root, file), "utf8"));
  if (current === 0) continue;

  if (nativeAllowlist.has(file)) {
    rows.push({ file, current, baseline: current, status: "native-primitive" });
    continue;
  }

  const mainContent = readMainVersion(file);
  const baseline = mainContent == null ? 0 : countRawButtons(mainContent);
  const status = current > baseline ? "violation" : "legacy-baseline";
  rows.push({ file, current, baseline, status });

  if (strict || current > baseline) {
    violations.push({ file, current, baseline });
  }
}

console.log("Application raw-button audit");
console.log(`Mode: ${strict ? "strict (zero application raw buttons)" : "no-regression baseline"}`);
for (const row of rows.sort((a, b) => a.file.localeCompare(b.file))) {
  const note = nativeAllowlist.get(row.file);
  console.log(
    `- ${row.file}: ${row.current} raw button(s); main baseline ${row.baseline}; ${row.status}${note ? ` — ${note}` : ""}`,
  );
}

if (violations.length > 0) {
  console.error("\nRaw application buttons require shadcn <Button> migration:");
  for (const violation of violations) {
    console.error(`  ${violation.file}: current=${violation.current}, allowed=${strict ? 0 : violation.baseline}`);
  }
  process.exit(1);
}

console.log(`\nPASS: ${rows.length} file(s) inspected with no new raw-button regression.`);
