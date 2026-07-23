/**
 * Guarded `prisma db pull`.
 *
 * Plain `prisma db pull` blindly overwrites prisma/schema.prisma with
 * whatever the live database currently looks like — no backup, no diff,
 * no confirmation. On this project that is especially risky: schema.prisma
 * is hand-curated (see docs/storefront-v2/04-prisma-supabase-architecture.md)
 * and the live Supabase database's `auth` schema must never be introspected
 * alongside `public` (see the "Making and Committing Schema Changes" note in
 * the supabase skill and prisma/schema.prisma's datasource comment).
 *
 * This wrapper:
 *   1. Refuses to run with uncommitted changes to prisma/schema.prisma, so
 *      there is always a clean git revert point.
 *   2. Writes a timestamped backup alongside the schema file.
 *   3. Runs the real `prisma db pull`.
 *   4. Prints a `git diff --stat` summary so the change is visible before
 *      anyone commits it.
 *
 *   pnpm prisma:pull:write
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";

const SCHEMA_PATH = "prisma/schema.prisma";

function run(cmd, args, options = {}) {
  return execFileSync(cmd, args, { stdio: "pipe", encoding: "utf8", ...options });
}

function runInherit(cmd, args) {
  execFileSync(cmd, args, { stdio: "inherit" });
}

if (!existsSync(SCHEMA_PATH)) {
  console.error(`✗ ${SCHEMA_PATH} not found. Run this from the repository root.`);
  process.exit(1);
}

const status = run("git", ["status", "--porcelain", "--", SCHEMA_PATH]).trim();
if (status.length > 0) {
  console.error(
    `✗ ${SCHEMA_PATH} has uncommitted changes. Commit or stash them first so this run has a clean revert point.`,
  );
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = `${SCHEMA_PATH}.${timestamp}.bak`;
copyFileSync(SCHEMA_PATH, backupPath);
console.log(`Backed up ${SCHEMA_PATH} -> ${backupPath}`);

console.log("Running `prisma db pull`...");
try {
  runInherit("pnpm", ["exec", "prisma", "db", "pull"]);
} catch (error) {
  console.error("✗ prisma db pull failed. schema.prisma was not modified beyond this point; backup left in place.");
  throw error;
}

console.log("\nChanges introduced by this pull:");
runInherit("git", ["diff", "--stat", "--", SCHEMA_PATH]);

console.log(
  `\nReview the diff (git diff -- ${SCHEMA_PATH}) before committing. If the pull picked up anything ` +
    `unwanted (e.g. Supabase's auth schema, or stripped manual customizations), restore from ${backupPath}.`,
);
