import { rm } from "node:fs/promises";
import { resolve } from "node:path";

// Multi-file Prisma discovery recursively reads every *.prisma file below the
// configured schema directory. prisma-client-js copies schema.prisma into its
// generated output, so remove only that copied schema before/after repository
// Prisma commands while retaining the generated TypeScript client.
await rm(resolve(process.cwd(), "prisma/generated/prisma/schema.prisma"), { force: true });
