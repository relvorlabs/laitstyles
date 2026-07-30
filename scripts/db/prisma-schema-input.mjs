import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve } from "node:path";

const RUNTIME_SCHEMA_NAME = ".runtime-schema.prisma";
const GENERATED_SCHEMA_PATH = "prisma/generated/prisma/schema.prisma";

export async function preparePrismaSchemaInput(root = process.cwd()) {
  const prismaRoot = resolve(root, "prisma");
  const runtimeSchemaPath = join(prismaRoot, RUNTIME_SCHEMA_NAME);
  const schemaFiles = await collectSchemaFiles(prismaRoot, runtimeSchemaPath);
  const orderedFiles = schemaFiles.sort((left, right) => {
    const leftName = basename(left);
    const rightName = basename(right);
    if (leftName === "schema.prisma") return -1;
    if (rightName === "schema.prisma") return 1;
    return relative(prismaRoot, left).localeCompare(relative(prismaRoot, right), "en");
  });

  const fragments = await Promise.all(orderedFiles.map((file) => readFile(file, "utf8")));
  const combined = fragments.join("\n\n");
  const normalized = includeSupabaseAuthSchema(combined);
  await writeFile(runtimeSchemaPath, normalized, "utf8");
  return runtimeSchemaPath;
}

export async function cleanPrismaSchemaInput(root = process.cwd()) {
  await Promise.all([
    rm(resolve(root, "prisma", RUNTIME_SCHEMA_NAME), { force: true }),
    rm(resolve(root, GENERATED_SCHEMA_PATH), { force: true }),
  ]);
}

export function includeSupabaseAuthSchema(schema) {
  if (/schemas\s*=\s*\[[^\]]*"auth"[^\]]*\]/m.test(schema)) return schema;
  const publicOnly = /schemas\s*=\s*\[\s*"public"\s*\]/m;
  if (!publicOnly.test(schema)) {
    throw new Error(
      'Prisma datasource must declare schemas = ["public"] before the Supabase Auth namespace can be added safely.',
    );
  }
  return schema.replace(publicOnly, 'schemas  = ["public", "auth"]');
}

async function collectSchemaFiles(directory, runtimeSchemaPath) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (path === runtimeSchemaPath) continue;
    if (entry.isDirectory()) {
      if (entry.name === "generated" || entry.name === "migrations") continue;
      files.push(...(await collectSchemaFiles(path, runtimeSchemaPath)));
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".prisma")) files.push(path);
  }
  return files;
}
