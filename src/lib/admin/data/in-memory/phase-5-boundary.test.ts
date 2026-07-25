import { access, readdir, readFile } from "node:fs/promises";
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

const migratedFilesWithoutLegacyOwnership = [
  "src/app/admin/orders/page.tsx",
  "src/features/admin/orders/orders-workspace.tsx",
  "src/features/admin/record-sale/record-sale-dialog.tsx",
  "src/features/admin/record-sale/record-sale-customer-step.tsx",
  "src/app/admin/holds/page.tsx",
  "src/features/admin/holds/holds-workspace.tsx",
  "src/features/admin/holds/hold-detail-sheet.tsx",
  "src/features/admin/holds/hold-conversion-dialog.tsx",
] as const;
const migratedForbiddenImports = [
  "@/lib/admin/shared/admin-seed",
  "@/features/admin/state/admin-provider",
  "@/features/admin/data/admin-repository-context",
  "@/lib/admin/orders/orders-mutations",
  "@/lib/admin/holds/holds-mutations",
  "@/lib/admin/holds/holds-query-options",
] as const;

const deletedLegacyImplementations = [
  "src/lib/admin/orders/orders-mutations.ts",
  "src/lib/admin/orders/order-reducer.ts",
  "src/lib/admin/orders/offline-sale-reducer.ts",
  "src/lib/admin/holds/holds-mutations.ts",
  "src/lib/admin/holds/holds-query-options.ts",
  "src/lib/admin/holds/holds-query-keys.ts",
  "src/lib/admin/holds/hold-reducer.ts",
  "src/features/admin/orders/orders-pagination.tsx",
] as const;

const recordSalePaymentStep = "src/features/admin/record-sale/record-sale-payment-step.tsx";
const holdConversionDialog = "src/features/admin/holds/hold-conversion-dialog.tsx";
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

  it("keeps Orders and Holds consumers off legacy state and repositories", async () => {
    const offenders: string[] = [];
    for (const relative of migratedFilesWithoutLegacyOwnership) {
      const source = await readFile(path.join(repositoryRoot, relative), "utf8");
      for (const specifier of migratedForbiddenImports) {
        if (source.includes(specifier)) offenders.push(`${relative} -> ${specifier}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("keeps removed Orders and Holds implementations deleted", async () => {
    const existing: string[] = [];
    for (const relative of deletedLegacyImplementations) {
      try {
        await access(path.join(repositoryRoot, relative));
        existing.push(relative);
      } catch {
        // Expected: deleted compatibility implementation.
      }
    }
    expect(existing).toEqual([]);
  });

  it("does not restore manual payment status or cash controls", async () => {
    for (const relative of [recordSalePaymentStep, holdConversionDialog]) {
      const source = await readFile(path.join(repositoryRoot, relative), "utf8");
      const offenders = manualPaymentControlTokens.filter((token) => source.includes(token));
      expect(offenders, `${relative} cannot declare a payment paid.`).toEqual([]);
    }
    const checkout = await readFile(path.join(repositoryRoot, recordSalePaymentStep), "utf8");
    expect(checkout).toContain("Paystack one-time checkout");
    expect(checkout).toContain("signed Paystack webhook");
    const conversion = await readFile(path.join(repositoryRoot, holdConversionDialog), "utf8");
    expect(conversion).toContain("Payment remains pending");
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
