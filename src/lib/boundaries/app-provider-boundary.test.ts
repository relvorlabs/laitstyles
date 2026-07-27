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
  it("resolves session once at root and delegates provider ownership to AppProvider", () => {
    expect(rootLayoutSource).toContain("getCurrentSession");
    expect(rootLayoutSource).toContain("<AppProvider>");
    expect(rootLayoutSource).toContain("<SessionProvider session={session}>{children}</SessionProvider>");
  });

  it("mounts theme, query, and session ownership in the shared provider", () => {
    expect(appProviderSource).toContain("<ThemeProvider>");
    expect(appProviderSource).toContain("<Toaster");
    expect(appProviderSource).toContain("QueryClientProvider");
    expect(appProviderSource).toContain("SessionProvider");
  });

  it("does not let admin mount its own query or session provider", () => {
    expect(adminLayoutSource).not.toContain("QueryProvider");
    expect(adminLayoutSource).not.toContain("QueryClientProvider");
    expect(adminLayoutSource).not.toContain("SessionProvider");
  });
});
