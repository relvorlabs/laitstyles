#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const violations = [];

const rootProvidersPath = "src/providers/providers.tsx";
const adminLayoutPath = "src/app/admin/layout.tsx";
const storefrontLayoutPath = "src/app/(storefront)/layout.tsx";
const queryProviderImport = "@/providers/query-provider";

const rootProviders = readRequired(rootProvidersPath);
const adminLayout = readRequired(adminLayoutPath);
const storefrontLayout = readRequired(storefrontLayoutPath);

if (rootProviders.includes("QueryProvider") || rootProviders.includes(queryProviderImport)) {
  violations.push(`${rootProvidersPath} must not mount or import QueryProvider.`);
}

if (!adminLayout.includes(queryProviderImport) || !adminLayout.includes("<QueryProvider>")) {
  violations.push(`${adminLayoutPath} must import and mount QueryProvider around the admin shell.`);
}

if (
  !storefrontLayout.includes("StorefrontRouteBoundary") ||
  !storefrontLayout.includes("<StorefrontRouteBoundary>")
) {
  violations.push(
    `${storefrontLayoutPath} must remain the shared storefront route boundary without rewriting presentation.`,
  );
}

for (const removedPath of ["src/app/(home)/layout.tsx", "src/app/(home)/page.tsx"]) {
  if (existsSync(resolve(root, removedPath))) {
    violations.push(`${removedPath} must not be recreated after the homepage route-group move.`);
  }
}

const queryProviderConsumers = walk(resolve(root, "src"))
  .filter((path) => /\.[cm]?[jt]sx?$/.test(path))
  .filter((path) => readFileSync(path, "utf8").includes(queryProviderImport))
  .map((path) => normalize(relative(root, path)));

const unexpectedConsumers = queryProviderConsumers.filter((path) => path !== adminLayoutPath);
if (unexpectedConsumers.length > 0) {
  violations.push(
    `QueryProvider may currently be mounted only by ${adminLayoutPath}; found: ${unexpectedConsumers.join(", ")}`,
  );
}

if (violations.length > 0) {
  console.error("Layout/provider contract failed:\n");
  for (const violation of violations) console.error(`- ${violation}`);
  process.exit(1);
}

console.log("Layout/provider contract passed.");

function readRequired(path) {
  const absolutePath = resolve(root, path);
  if (!existsSync(absolutePath)) {
    violations.push(`Required file is missing: ${path}`);
    return "";
  }
  return readFileSync(absolutePath, "utf8");
}

function walk(directory) {
  if (!existsSync(directory)) return [];

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function normalize(path) {
  return path.replaceAll("\\", "/");
}
