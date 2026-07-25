import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");

const allowedProductionImports = new Map<string, ReadonlySet<string>>([
  ["@/lib/admin/shared/admin-seed", new Set(["src/app/admin/layout.tsx"])],
  [
    "@/lib/admin/data/in-memory/admin-repositories",
    new Set(["src/features/admin/data/admin-repository-context.tsx"]),
  ],
]);

const ordersFilesWithoutLegacyOwnership = [
  "src/app/admin/orders/page.tsx",
  "src/features/admin/orders/orders-workspace.tsx",
  "src/features/admin/record-sale/record-sale-dialog.tsx",
] as const;
const ordersForbiddenImports = [
  "@/lib/admin/shared/admin-seed",
  "@/features/admin/state/admin-provider",
  "@/lib/admin/orders/orders-mutations",
] as const;

const recordSalePaymentStep = "src/features/admin/record-sale/record-sale-payment-step.tsx";
const manualPaymentControlTokens = [
  'name="paymentStatus"',
  'name="paymentMethod"',
  'value="cash"',
  'value="pos"',
  'value="bank-transfer"',
  "Paid in full",
  "Deposit received",
] as const;

describe("Phase 5 admin persistence boundary", () => {
  it("does not expand production seed or in-memory repository ownership", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (relative.includes(".test.") || relative.includes(".spec.")) continue;

      const source = await readFile(filePath, "utf8");
      for (const [specifier, allowedFiles] of allowedProductionImports) {
        if (source.includes(specifier) && !allowedFiles.has(relative)) {
          offenders.push(`${relative} -> ${specifier}`);
        }
      }
    }

    expect(
      offenders,
      "Phase 5 may remove the recorded legacy edges, but production code must not create new ones.",
    ).toEqual([]);
  });

  it("keeps Orders page, workspace and record-sale orchestration off legacy state", async () => {
    const offenders: string[] = [];
    for (const relative of ordersFilesWithoutLegacyOwnership) {
      const source = await readFile(path.join(repositoryRoot, relative), "utf8");
      for (const specifier of ordersForbiddenImports) {
        if (source.includes(specifier)) offenders.push(`${relative} -> ${specifier}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("does not restore manual payment status or cash controls to in-person Checkout", async () => {
    const source = await readFile(path.join(repositoryRoot, recordSalePaymentStep), "utf8");
    const offenders = manualPaymentControlTokens.filter((token) => source.includes(token));
    expect(
      offenders,
      "In-person sales must remain Paystack-tracked; the form cannot declare a payment paid.",
    ).toEqual([]);
    expect(source).toContain("Paystack one-time checkout");
    expect(source).toContain("server verification or signed Paystack webhook");
  });
});

async function collectSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return collectSourceFiles(target);
      return /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
    }),
  );
  return files.flat();
}

function normalize(value: string) {
  return value.split(path.sep).join("/");
}
