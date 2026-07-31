import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const sourceRoot = path.join(root, "src");
const routeRoot = path.join(sourceRoot, "app", "api", "v1");
const buttonPath = path.join(sourceRoot, "components", "ui", "button.tsx");
const shellLoaderPath = path.join(
  sourceRoot,
  "modules",
  "products",
  "server",
  "storefront",
  "catalogue-loader.ts",
);
const shellBoundaryPath = path.join(sourceRoot, "app", "storefront-client-boundary.tsx");
const storefrontErrorPath = path.join(sourceRoot, "app", "(storefront)", "error.tsx");
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
  const isClientModule = source.startsWith('"use client"') || source.startsWith("'use client'");

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

  if (/\bas\s+any\b|:\s*any\b|<any>/.test(source)) {
    violations.push(`${relative(file)} contains an explicit any`);
  }

  if (/from\s+["']@\/features\/storefront\/account(?:\/|["'])/.test(source)) {
    violations.push(`${relative(file)} imports the retired storefront account prototype`);
  }

  if (
    isClientModule &&
    /from\s+["'](?:@\/lib\/prisma(?:\/|["'])|@\/modules\/[^"']+\/server(?:\/|["']))/.test(
      source,
    )
  ) {
    violations.push(`${relative(file)} imports a server-only data module from a client boundary`);
  }

  if (
    isClientModule &&
    /fetch\(\s*["']\/auth\/(?:email|invite\/finalize)(?:["'?])/.test(source)
  ) {
    violations.push(`${relative(file)} bypasses the typed /api/v1 auth client boundary`);
  }

  if (
    isActiveStorefrontOrAccountFile(normalized) &&
    /\b(?:products|orders|images|lines|addresses|members)\s*\[\s*\d+\s*\]/.test(source)
  ) {
    violations.push(`${relative(file)} uses a fixed collection index in an active customer flow`);
  }

  if (
    isActiveStorefrontOrAccountFile(normalized) &&
    /error\s+instanceof\s+Error[\s\S]{0,160}error\.message/.test(source)
  ) {
    violations.push(`${relative(file)} exposes an arbitrary Error.message in a customer flow`);
  }

  if (normalized.endsWith(".tsx") && isUserFacingAuthFile(normalized) && /\bSupabase\b/.test(source)) {
    violations.push(`${relative(file)} exposes provider language in a user-facing auth surface`);
  }

  for (const match of source.matchAll(/["'`]((?:\/api\/v1\/)[^"'`\s?${}]*)/g)) {
    const apiPath = normalizeApiReference(match[1]);
    if (apiPath) apiReferences.push({ file, apiPath });
  }
}

await checkButtonContract(violations);
await checkStorefrontFailureContract(violations);

const routePatterns = await collectRoutePatterns(routeRoot);
for (const reference of apiReferences) {
  if (!routePatterns.some((routePath) => routeMatches(reference.apiPath, routePath))) {
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

async function checkButtonContract(target) {
  const source = await readFile(buttonPath, "utf8");
  const requiredPatterns = [
    [/outline:\s*[\s\S]*?text-foreground/, "outline variant must own a foreground color"],
    [/ghost:\s*[\s\S]*?text-foreground/, "ghost variant must own a foreground color"],
    [/link:\s*[\s\S]*?text-primary/, "link variant must own a foreground color"],
    [/\[&_svg\]:text-current/, "button icons must inherit the button foreground"],
  ];

  for (const [pattern, message] of requiredPatterns) {
    if (!pattern.test(source)) target.push(`src/components/ui/button.tsx: ${message}`);
  }
}

async function checkStorefrontFailureContract(target) {
  const [loaderSource, boundarySource, errorSource] = await Promise.all([
    readFile(shellLoaderPath, "utf8"),
    readFile(shellBoundaryPath, "utf8"),
    readFile(storefrontErrorPath, "utf8"),
  ]);

  if (!/catch\s*\([^)]*\)[\s\S]*temporarily-unavailable/.test(loaderSource)) {
    target.push("storefront shell loader must convert internal failures to a public unavailable state");
  }
  if (!/availability\s*===\s*["']temporarily-unavailable["']/.test(boundarySource)) {
    target.push("storefront client boundary must render the public unavailable state");
  }
  if (/error\.message|error\.stack|error\.cause/.test(errorSource)) {
    target.push("storefront route error boundary must not render internal error properties");
  }
}

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
    return `/${relativeRoute.replace(/\/route\.ts$/, "")}`;
  });
}

function routeMatches(apiPath, routePath) {
  const reference = segments(apiPath);
  const route = segments(routePath);

  for (let index = 0; index < route.length; index += 1) {
    const routeSegment = route[index];
    const referenceSegment = reference[index];

    if (isCatchAllSegment(routeSegment)) {
      return index <= reference.length;
    }
    if (referenceSegment === undefined) {
      return route.slice(index).every(isDynamicSegment);
    }
    if (isDynamicSegment(routeSegment)) continue;
    if (routeSegment !== referenceSegment) return false;
  }

  return reference.length === route.length;
}

function segments(value) {
  return value.split("/").filter(Boolean);
}

function isDynamicSegment(value) {
  return value.startsWith("[") && value.endsWith("]");
}

function isCatchAllSegment(value) {
  return value.includes("...") && isDynamicSegment(value);
}

function normalizeApiReference(value) {
  const normalized = value.replace(/\/+$/, "");
  return normalized.startsWith("/api/v1") ? normalized : null;
}

function isActiveStorefrontOrAccountFile(file) {
  return (
    file.includes("/src/app/(storefront)/") ||
    file.includes("/src/modules/storefront-shell/") ||
    file.includes("/src/modules/customers/ui/account/") ||
    file.includes("/src/modules/customers/ui/storefront/") ||
    file.includes("/src/modules/checkout/ui/") ||
    file.includes("/src/modules/orders/ui/storefront/") ||
    file.includes("/src/modules/returns/ui/storefront/") ||
    file.includes("/src/modules/auth/ui/")
  );
}

function isUserFacingAuthFile(file) {
  return (
    file.includes("/src/app/auth/") ||
    file.includes("/src/modules/auth/ui/") ||
    file.includes("/src/modules/customers/ui/account/") ||
    file.includes("/src/features/admin/team/")
  );
}

function normalizePath(value) {
  return value.replaceAll(path.sep, "/");
}

function relative(file) {
  return normalizePath(path.relative(root, file));
}
