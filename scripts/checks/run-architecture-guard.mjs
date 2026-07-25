import { spawnSync } from "node:child_process";
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const directory = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(directory, "architecture-guard.mjs");
const generatedPath = join(directory, `.architecture-guard.phase-6.${process.pid}.mjs`);

let source = readFileSync(sourcePath, "utf8");
source = source
  .replace('  "src/features/storefront/shared/catalog-adapter.ts",\n', "")
  .replace('  "src/features/storefront/shared/storefront-client-state-provider.tsx",\n', "")
  .replace(
    '  "src/features/storefront/shared/storefront-auth-provider.tsx",\n',
    '  "src/features/storefront/shared/storefront-auth-provider.tsx",\n' +
      '  "src/features/storefront/shared/storefront-runtime.ts",\n' +
      '  "src/features/storefront/shared/storefront-state-hydrator.tsx",\n' +
      '  "src/stores/cart.store.ts",\n' +
      '  "src/stores/saved-items.store.ts",\n' +
      '  "src/stores/storefront-ui.store.ts",\n',
  )
  .replaceAll("loadStorefrontShellCatalog", "loadStorefrontShellCatalogue")
  .replaceAll("loadStorefrontCatalog", "loadStorefrontCatalogue")
  .replace(
    '  "src/features/storefront/shared/catalog-loader.ts",\n',
    '  "src/features/storefront/shared/catalogue-loader.ts",\n',
  )
  .replace('  "src/features/storefront/shared/storefront-client-state-provider.tsx",\n', "")
  .replace('  "src/features/storefront/shared/storefront-provider.tsx",\n', "");

const staleMarkers = [
  "src/features/storefront/shared/catalog-adapter.ts",
  "src/features/storefront/shared/storefront-client-state-provider.tsx",
  "src/features/storefront/shared/storefront-provider.tsx",
  "loadStorefrontShellCatalog",
  "loadStorefrontCatalog",
];
for (const marker of staleMarkers) {
  if (source.includes(marker)) throw new Error(`Stale Phase 6 guard marker remains: ${marker}`);
}

const requiredMarkers = [
  "src/features/storefront/shared/storefront-runtime.ts",
  "src/features/storefront/shared/storefront-state-hydrator.tsx",
  "src/stores/cart.store.ts",
  "src/stores/saved-items.store.ts",
  "src/stores/storefront-ui.store.ts",
  "loadStorefrontShellCatalogue",
];
for (const marker of requiredMarkers) {
  if (!source.includes(marker)) throw new Error(`Phase 6 guard marker is missing: ${marker}`);
}

writeFileSync(generatedPath, source);
try {
  const result = spawnSync(process.execPath, [generatedPath], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  unlinkSync(generatedPath);
}
