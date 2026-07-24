import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function sourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.[cm]?[jt]sx?$/.test(entry.name) ? [path] : [];
  });
}

function repoPath(path: string) {
  return relative(root, path).replaceAll("\\", "/");
}

describe("app provider boundary", () => {
  it("owns exactly one TanStack QueryClientProvider", () => {
    const owners = sourceFiles(join(root, "src"))
      .filter((path) => !/\.test\.[cm]?[jt]sx?$/.test(path))
      .filter((path) => readFileSync(path, "utf8").includes("QueryClientProvider"))
      .map(repoPath);

    expect(owners).toEqual(["src/providers/query-provider.tsx"]);
  });

  it("keeps the root provider entry point app-wide and composition-only", () => {
    const entry = readFileSync(join(root, "src/providers/providers.tsx"), "utf8");

    expect(entry).toContain("export function AppProvider");
    expect(entry).toContain("<ThemeProvider>");
    expect(entry).toContain("<QueryProvider>");
    expect(entry).not.toMatch(/export\s+\{/);

    for (const featureProvider of [
      "StorefrontProvider",
      "StorefrontAuthProvider",
      "StorefrontClientStateProvider",
      "AdminProvider",
      "AdminAccessProvider",
      "ProductEditorControllerProvider",
      "RecordSaleControllerProvider",
    ]) {
      expect(entry).not.toContain(featureProvider);
    }
  });

  it("retires duplicate root and route query provider modules", () => {
    for (const path of [
      "src/app/app-providers.tsx",
      "src/app/admin/admin-query-provider.tsx",
      "src/lib/query/query-provider.tsx",
      "src/components/theme/theme-provider.tsx",
    ]) {
      expect(existsSync(join(root, path)), path).toBe(false);
    }
  });

  it("mounts AppProvider once in the root layout", () => {
    const layout = readFileSync(join(root, "src/app/layout.tsx"), "utf8");

    expect(layout).toContain('import { AppProvider } from "@/providers/providers"');
    expect(layout.match(/<AppProvider>/g)).toHaveLength(1);
    expect(layout.match(/<\/AppProvider>/g)).toHaveLength(1);
  });
});
