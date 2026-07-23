import { rm } from "node:fs/promises";
import { resolve } from "node:path";

// Multi-file Prisma schema discovery is recursive. The legacy generated client
// contains a copied schema.prisma beneath prisma/generated, so remove that old
// output before every repository Prisma command. The active generator writes
// to src/generated/prisma, outside the schema search tree.
await rm(resolve(process.cwd(), "prisma/generated"), { recursive: true, force: true });
