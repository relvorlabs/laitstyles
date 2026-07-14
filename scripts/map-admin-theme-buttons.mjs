import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

// Repository mapper for the Admin/theme/button stabilization branch.
const root = process.cwd();
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter(Boolean)
  .filter(
    (file) =>
      !/(^|\/)(node_modules|\.next|dist|build|coverage|playwright-report|test-results)(\/|$)/.test(
        file,
      ),
  );

const read = (file) => {
  try {
    return readFileSync(path.join(root, file), "utf8");
  } catch {
    return "";
  }
};
const sourceFiles = files.filter((file) => /\.(?:[cm]?[jt]sx?|css|md|json|ya?ml)$/.test(file));
const entries = sourceFiles.map((file) => ({ file, text: read(file) }));
const matches = (regex) =>
  entries.filter(({ file, text }) => regex.test(file) || regex.test(text)).map(({ file }) => file);
const unique = (values) => [...new Set(values)].sort();
const count = (text, regex) => [...text.matchAll(regex)].length;
const surfaceFor = (file) => {
  if (/^src\/(?:app|features)\/admin(?:\/|\.)/i.test(file)) return "admin";
  if (/account|profile|settings/i.test(file)) return "account";
  if (/storefront|home-lab|products|catalog|cart|checkout/i.test(file)) return "storefront";
  return "shared";
};

// Old naming is intentionally searched so compatibility aliases, redirects and
// remaining migration debt stay visible in the generated map.
const namingFiles = unique(
  matches(/Control Room|control room|control-room|control_room|controlRoom|ControlRoom/i),
);
const styleFiles = files.filter((file) =>
  /(?:^|\/)(?:global|globals|home-lab|.*theme.*|.*admin.*)\.css$/i.test(file),
);
const cssImports = entries
  .filter(({ text }) => /(?:import\s+["'][^"']+\.css["']|@import\s+)/.test(text))
  .map(({ file }) => file);
const providerFiles = unique(
  matches(/ThemeProvider|next-themes|data-theme|classList\.toggle\(["']dark/i),
);
const tokenFiles = entries
  .filter(
    ({ file, text }) =>
      file.endsWith(".css") &&
      /--(?:background|foreground|primary|secondary|accent|brand|admin|control)/.test(text),
  )
  .map(({ file }) => file);

const buttonRows = [];
const totals = { raw: 0, shadcn: 0, role: 0, bySurface: {} };
for (const { file, text } of entries) {
  if (!/\.(?:tsx|jsx)$/.test(file)) continue;
  const raw = count(text, /<button\b/g);
  const shadcn = count(text, /<Button\b/g);
  const role = count(text, /role=["']button["']/g);
  if (!(raw || shadcn || role)) continue;
  const surface = surfaceFor(file);
  totals.raw += raw;
  totals.shadcn += shadcn;
  totals.role += role;
  totals.bySurface[surface] ??= { raw: 0, shadcn: 0, role: 0, files: 0 };
  totals.bySurface[surface].raw += raw;
  totals.bySurface[surface].shadcn += shadcn;
  totals.bySurface[surface].role += role;
  totals.bySurface[surface].files += 1;
  buttonRows.push({ file, surface, raw, shadcn, role });
}

const rawButtonFiles = buttonRows.filter((row) => row.raw > 0);
const suspiciousActionFiles = entries
  .filter(
    ({ file, text }) =>
      /\.(?:tsx|jsx)$/.test(file) &&
      /<button|<Button/.test(text) &&
      /(console\.log\(|onClick=\{\(\)\s*=>\s*\{?\s*\}?\}|TODO)/.test(text),
  )
  .map(({ file }) => file);
const toastFiles = unique(
  matches(/from ["']sonner["']|toast\.(?:success|error|info|warning)|<Toaster/),
);
const buttonPrimitiveFiles = unique(
  matches(/buttonVariants|cva\([^)]*variant|components\/ui\/button/),
);
const workflows = files.filter((file) => file.startsWith(".github/workflows/"));
const playwrightFiles = unique(matches(/playwright|test:e2e|e2e/i));
const routeFiles = files.filter((file) =>
  /src\/app\/.*(?:page|layout|route)\.(?:tsx?|jsx?)$/.test(file),
);

const pkg = existsSync(path.join(root, "package.json")) ? JSON.parse(read("package.json")) : {};
const nodeFiles = files.filter((file) =>
  /(^|\/)(?:\.nvmrc|\.node-version|vercel\.json|package\.json|pnpm-workspace\.yaml)$/.test(
    file,
  ),
);
const lockfiles = files.filter((file) =>
  /(?:^|\/)(?:pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?)$/.test(file),
);

const lines = [];
lines.push("# Repository map: Admin, themes, buttons, Node and Playwright", "");
lines.push(`Generated: ${new Date().toISOString()}`, "");
lines.push("## Runtime and package metadata", "");
lines.push(`- packageManager: \`${pkg.packageManager ?? "not declared"}\``);
lines.push(`- engines.node: \`${pkg.engines?.node ?? "not declared"}\``);
lines.push(`- package scripts: \`${Object.keys(pkg.scripts ?? {}).sort().join(", ")}\``);
lines.push(`- lockfiles: ${lockfiles.map((file) => `\`${file}\``).join(", ") || "none"}`);
lines.push(
  `- Node/Vercel metadata files: ${nodeFiles.map((file) => `\`${file}\``).join(", ") || "none"}`,
  "",
);

lines.push("## Naming map", "");
lines.push(`Total files containing an old naming form or path: **${namingFiles.length}**`, "");
for (const file of namingFiles) lines.push(`- \`${file}\``);
lines.push("");

lines.push("## Route files", "");
for (const file of routeFiles) lines.push(`- \`${file}\``);
lines.push("");

lines.push("## Theme map", "");
lines.push("### Candidate global/theme stylesheets");
for (const file of styleFiles) lines.push(`- \`${file}\``);
lines.push("", "### Files importing CSS");
for (const file of cssImports) lines.push(`- \`${file}\``);
lines.push("", "### Theme providers/wrappers");
for (const file of providerFiles) lines.push(`- \`${file}\``);
lines.push("", "### CSS token sources");
for (const file of tokenFiles) lines.push(`- \`${file}\``);
lines.push("");

lines.push("## Button baseline", "");
lines.push(`- Raw native \`<button>\`: **${totals.raw}**`);
lines.push(`- Shared \`<Button>\` usage: **${totals.shadcn}**`);
lines.push(`- \`role="button"\`: **${totals.role}**`, "");
lines.push("| Surface | Raw | Button | role=button | Files |");
lines.push("|---|---:|---:|---:|---:|");
for (const [surface, values] of Object.entries(totals.bySurface).sort()) {
  lines.push(
    `| ${surface} | ${values.raw} | ${values.shadcn} | ${values.role} | ${values.files} |`,
  );
}
lines.push("", "### Files with button controls", "");
lines.push("| File | Surface | Raw | Button | role=button |");
lines.push("|---|---|---:|---:|---:|");
for (const row of buttonRows.sort((a, b) => a.file.localeCompare(b.file))) {
  lines.push(`| \`${row.file}\` | ${row.surface} | ${row.raw} | ${row.shadcn} | ${row.role} |`);
}
lines.push("", "### Raw-button files", "");
for (const row of rawButtonFiles) lines.push(`- \`${row.file}\` (${row.raw})`);
lines.push("", "### Shared Button implementation candidates", "");
for (const file of buttonPrimitiveFiles) lines.push(`- \`${file}\``);
lines.push("", "### Toast implementation candidates", "");
for (const file of toastFiles) lines.push(`- \`${file}\``);
lines.push("", "### Suspicious/no-op/TODO action candidates", "");
for (const file of suspiciousActionFiles) lines.push(`- \`${file}\``);
lines.push("");

lines.push("## Playwright and CI map", "");
lines.push("### Workflows");
for (const file of workflows) lines.push(`- \`${file}\``);
lines.push("", "### Playwright-related files");
for (const file of playwrightFiles) lines.push(`- \`${file}\``);
lines.push("");

mkdirSync(path.join(root, "docs"), { recursive: true });
writeFileSync(path.join(root, "docs/repository-audit-map.md"), `${lines.join("\n")}\n`);
writeFileSync(
  path.join(root, "docs/repository-audit-map.json"),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      pkg: { packageManager: pkg.packageManager, engines: pkg.engines, scripts: pkg.scripts },
      namingFiles,
      routeFiles,
      styleFiles,
      cssImports,
      providerFiles,
      tokenFiles,
      buttonRows,
      totals,
      suspiciousActionFiles,
      toastFiles,
      buttonPrimitiveFiles,
      workflows,
      playwrightFiles,
      nodeFiles,
      lockfiles,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `Mapped ${files.length} tracked files; ${totals.raw} raw native buttons and ${totals.shadcn} shared Button usages.`,
);
