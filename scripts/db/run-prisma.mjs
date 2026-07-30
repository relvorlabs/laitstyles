import { spawn } from "node:child_process";
import {
  cleanPrismaSchemaInput,
  preparePrismaSchemaInput,
} from "./prisma-schema-input.mjs";

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/db/run-prisma.mjs <prisma command...>");
  process.exit(1);
}

const schemaPath = await preparePrismaSchemaInput();
const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

try {
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(command, ["exec", "prisma", ...args], {
      stdio: "inherit",
      env: {
        ...process.env,
        PRISMA_SCHEMA_INPUT: schemaPath,
      },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Prisma exited after signal ${signal}.`));
        return;
      }
      resolve(code ?? 1);
    });
  });
  process.exitCode = exitCode;
} finally {
  await cleanPrismaSchemaInput();
}
