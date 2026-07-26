import { describe, expect, it } from "vitest";
import { classifyModuleGraph } from "../../../scripts/checks/module-export-guard.mjs";

describe("module export guard generated-module compatibility", () => {
  it("resolves an existing internal asset through a resource query", () => {
    const files = {
      "prisma/generated/prisma/wasm-edge-light-loader.mjs":
        "export default import('./query_compiler_fast_bg.wasm?module');",
      "prisma/generated/prisma/query_compiler_fast_bg.wasm": "",
    };

    expect(classifyModuleGraph({ files })).toEqual([]);
  });

  it("reports a queried internal asset that does not exist", () => {
    const files = {
      "prisma/generated/prisma/wasm-edge-light-loader.mjs":
        "export default import('./missing.wasm?module');",
    };

    expect(classifyModuleGraph({ files })).toEqual([
      {
        rule: "unresolved-internal-module",
        importer: "prisma/generated/prisma/wasm-edge-light-loader.mjs",
        imported: "./missing.wasm?module",
        detail: "Cannot resolve internal module ./missing.wasm?module.",
      },
    ]);
  });

  it("follows generated Prisma CommonJS exports through its client facade", () => {
    const files = {
      "src/lib/prisma/client.ts":
        'export { Prisma, PrismaClient } from "../../../prisma/generated/prisma/client";',
      "prisma/generated/prisma/client.js": "module.exports = { ...require('.') };",
      "prisma/generated/prisma/index.js": `
        const Prisma = {};
        exports.Prisma = Prisma;
        const PrismaClient = createClient();
        exports.PrismaClient = PrismaClient;
      `,
    };

    expect(classifyModuleGraph({ files })).toEqual([]);
  });

  it("reports names absent from a generated CommonJS export chain", () => {
    const files = {
      "src/lib/prisma/client.ts":
        'export { Prisma, MissingClient } from "../../../prisma/generated/prisma/client";',
      "prisma/generated/prisma/client.js": "module.exports = { ...require('.') };",
      "prisma/generated/prisma/index.js": "exports.Prisma = {};",
    };

    expect(classifyModuleGraph({ files })).toEqual([
      {
        rule: "missing-export",
        importer: "src/lib/prisma/client.ts",
        imported: "../../../prisma/generated/prisma/client",
        detail:
          "../../../prisma/generated/prisma/client does not export MissingClient (resolved to prisma/generated/prisma/client.js).",
      },
    ]);
  });
});
