import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const rootLayoutSource = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
const appProviderSource = readFileSync(
  resolve(process.cwd(), "src/providers/providers.tsx"),
  "utf8",
);
const adminLayoutSource = readFileSync(resolve(process.cwd(), "src/app/admin/layout.tsx"), "utf8");

describe("application provider ownership", () => {
  it("keeps the root layout thin and delegates global ownership to AppProvider", () => {
    expect(rootLayoutSource).toContain("<AppProvider>{children}</AppProvider>");
    expect(rootLayoutSource).not.toContain("QueryProvider");
    expect(rootLayoutSource).not.toContain("ThemeProvider");
    expect(rootLayoutSource).not.toContain("Toaster");
  });

  it("keeps only theme and toast concerns in the global provider", () => {
    expect(appProviderSource).toContain("<ThemeProvider>");
    expect(appProviderSource).toContain("<Toaster");
    expect(appProviderSource).not.toContain("QueryProvider");
  });

  it("scopes the remote-data provider to the admin surface", () => {
    expect(adminLayoutSource).toContain(
      'import { QueryProvider } from "@/providers/query-provider";',
    );
    expect(adminLayoutSource).toContain("<QueryProvider>");
    expect(adminLayoutSource).toContain("</QueryProvider>");
  });
});
