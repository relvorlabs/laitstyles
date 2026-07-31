import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const routeRoot = path.join(sourceRoot, "app", "api", "v1");
const cloudImagePath = normalizePath(path.join(sourceRoot, "components", "ui", "cloud-image.tsx"));
const applicationExtensions = new Set([".ts", ".tsx"]);
const ignoredFile = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

const files = await walk(sourceRoot);
const applicationFiles = files.filter((file) => {
  const extension = path.extname(file);
  return applicationExtensions.has(extension) && !ignoredFile.test(file);
});

const violations = [];
const apiReferences = [];

for (const file of applicationFiles) {
  const normalized = normalizePath(file);
  const source = await readFile(file, "utf8");

  if (normalized !== cloudImagePath) {
    if (/from\s+["']next\/image["']/.test(source)) {
      violations.push(`${relative(file)} imports next/image instead of CloudImage`);
    }
    if (/from\s+["']next-cloudinary["']/.test(source)) {
      violations.push(`${relative(file)} imports next-cloudinary instead of CloudImage`);
    }
    if (/<img\b/.test(source)) {
      violations.push(`${relative(file)} renders a raw <img> element`);
    }
  }

  if (isUserFacingAuthFile(normalized) && /\bSupabase\b/.test(source)) {
    violations.push(`${relative(file)} exposes provider language in a user-facing auth surface`);
  }

  for (const match of source.matchAll(/["'`]((?:\/api\/v1\/)[^"'`\s?${}]*)/g)) {
    const apiPath = normalizeApiReference(match[1]);
    if (apiPath) apiReferences.push({ file, apiPath });
  }
}

const routePatterns = await collectRoutePatterns(routeRoot);
for (const reference of apiReferences) {
  if (!matchesRoute(reference.apiPath, routePatterns)) {
    violations.push(
      `${relative(reference.file)} references ${reference.apiPath}, but no /api/v1 Route Handler matches it`,
    );
  }
}

if (violations.length > 0) {
  console.error("Storefront production-readiness check failed:\n");
  for (const violation of [...new Set(violations)].sort()) console.error(`- ${violation}`);
  process.exit(1);
}

console.log(
  `Storefront production-readiness check passed (${applicationFiles.length} source files, ${routePatterns.length} API routes, ${apiReferences.length} API references).`,
);

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }

  const nested = await Promise.all(
    entries.map(async (entry) => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(file) : [file];
    }),
  );
  return nested.flat();
}

async function collectRoutePatterns(directory) {
  const routeFiles = (await walk(directory)).filter((file) => path.basename(file) === "route.ts");
  return routeFiles.map((file) => {
    const relativeRoute = normalizePath(path.relative(path.join(sourceRoot, "app"), file));
    const routePath = `/${relativeRoute.replace(/\/route\.ts$/, "")}`;
    const staticPrefix = normalizeApiReference(routePath.replace(/\/(?:\[\[?\.\.\.[^\]]+\]\]?|\[[^\]]+\])/g, ""));
    const expression = routePath
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\/\\\[\\\[\\\.\\\.\\\.[^\]]+\\\]\\\]/g, "(?:/.*)?")
      .replace(/\\\/\\\[\\\.\\\.\\\.[^\]]+\\\]/g, "/.+")
      .replace(/\\\/\\\[[^\]]+\\\]/g, "/[^/]+");
    return { routePath, staticPrefix, regex: new RegExp(`^${expression}/?$`) };
  });
}

function matchesRoute(apiPath, routePatterns) {
  return routePatterns.some(({ regex, staticPrefix }) => {
    if (regex.test(apiPath)) return true;
    const prefix = staticPrefix.endsWith("/") ? staticPrefix : `${staticPrefix}/`;
    return apiPath === staticPrefix || apiPath.startsWith(prefix) || staticPrefix.startsWith(`${apiPath}/`);
  });
}

function normalizeApiReference(value) {
  const normalized = value.replace(/\/+$/, "");
  return normalized.startsWith("/api/v1") ? normalized : null;
}

function isUserFacingAuthFile(file) {
  return (
    file.includes("/src/app/auth/") ||
    file.includes("/src/modules/auth/ui/") ||
    file.includes("/src/modules/customers/ui/account/")
  );
}

function normalizePath(value) {
  return value.replaceAll(path.sep, "/");
}

function relative(file) {
  return normalizePath(path.relative(root, file));
}
