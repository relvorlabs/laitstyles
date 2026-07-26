import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { classifyArchitectureGraph } from "../../scripts/checks/architecture-guard.mjs";

const repositoryRoot = process.cwd();
const sourceRoot = path.join(repositoryRoot, "src");

const forbiddenProductionSpecifiers = [
  "@/lib/admin/shared/admin-seed",
  "@/lib/admin/shared/seed",
  "@/features/admin/state/admin-store",
  "@/features/admin/data/admin-repository-context",
  "@/lib/admin/data/repositories",
  "@/lib/admin/data/in-memory/admin-repositories",
  "/tests/fixtures/",
  "/stories/fixtures/",
  "/development/fixtures/",
] as const;

const migratedConsumers = [
  "src/app/admin/page.tsx",
  "src/features/admin/overview/overview-page.tsx",
  "src/features/admin/shell/admin-command-menu.tsx",
  "src/app/admin/orders/page.tsx",
  "src/features/admin/orders/orders-workspace.tsx",
  "src/features/admin/record-sale/record-sale-dialog.tsx",
  "src/features/admin/record-sale/record-sale-customer-step.tsx",
  "src/features/admin/record-sale/record-sale-review-step.tsx",
  "src/app/admin/holds/page.tsx",
  "src/features/admin/holds/holds-workspace.tsx",
  "src/features/admin/holds/hold-detail-sheet.tsx",
  "src/features/admin/holds/hold-conversion-dialog.tsx",
  "src/app/admin/returns/page.tsx",
  "src/features/admin/returns/returns-workspace.tsx",
  "src/features/admin/returns/create-return-dialog.tsx",
  "src/features/admin/returns/return-detail-sheet.tsx",
  "src/app/admin/customers/page.tsx",
  "src/features/admin/customers/customers-workspace.tsx",
  "src/features/admin/customers/customer-detail-sheet.tsx",
  "src/features/admin/settings/settings-workspace.tsx",
] as const;

const forbiddenLegacyOwnership = [
  ...forbiddenProductionSpecifiers,
  "@/lib/admin/orders/orders-mutations",
  "@/lib/admin/holds/holds-mutations",
  "@/lib/admin/holds/holds-query-options",
  "@/lib/admin/returns/returns-mutations",
  "@/lib/admin/returns/returns-query-options",
  "@/lib/admin/customers/customers-mutations",
  "@/lib/admin/customers/customers-query-options",
  "@/lib/admin/settings/settings-mutations",
  "@/lib/admin/settings/settings-query-options",
] as const;

const deletedLegacyPaths = [
  "src/features/admin/state/admin-store.ts",
  "src/features/admin/data/admin-repository-context.tsx",
  "src/lib/admin/data/repositories.ts",
  "src/lib/admin/data/in-memory/admin-repositories.ts",
  "src/lib/admin/shared/admin-seed.ts",
  "src/lib/admin/shared/seed/index.ts",
  "src/lib/admin/shared/seed/active.ts",
  "src/lib/admin/shared/seed/new-store.ts",
  "src/lib/admin/shared/seed/active-store-data.ts",
  "src/lib/admin/shared/seed/helpers.ts",
  "src/lib/admin/orders/orders-mutations.ts",
  "src/lib/admin/orders/order-reducer.ts",
  "src/lib/admin/orders/offline-sale-reducer.ts",
  "src/lib/admin/holds/holds-mutations.ts",
  "src/lib/admin/holds/holds-query-options.ts",
  "src/lib/admin/holds/holds-query-keys.ts",
  "src/lib/admin/holds/hold-reducer.ts",
  "src/lib/admin/returns/returns-mutations.ts",
  "src/lib/admin/returns/returns-query-options.ts",
  "src/lib/admin/returns/returns-query-keys.ts",
  "src/lib/admin/returns/return-reducer.ts",
  "src/lib/admin/customers/customers-mutations.ts",
  "src/lib/admin/customers/customers-query-options.ts",
  "src/lib/admin/customers/customers-query-keys.ts",
  "src/lib/admin/customers/customer-reducer.ts",
  "src/lib/admin/settings/settings-mutations.ts",
  "src/lib/admin/settings/settings-query-options.ts",
  "src/lib/admin/settings/settings-reducer.ts",
  "src/features/admin/orders/orders-pagination.tsx",
] as const;

const canonicalDomainPaths = [
  "src/modules/orders/server/queries.ts",
  "src/modules/orders/server/commands.ts",
  "src/modules/holds/server/queries.ts",
  "src/modules/holds/server/commands.ts",
  "src/modules/returns/server/queries.ts",
  "src/modules/returns/server/commands.ts",
  "src/modules/customers/server/queries.ts",
  "src/modules/customers/server/commands.ts",
  "src/modules/settings/server/queries.ts",
  "src/modules/settings/server/commands.ts",
  "src/modules/overview/server/queries.ts",
  "src/app/api/v1/admin/orders/route.ts",
  "src/app/api/v1/admin/holds/route.ts",
  "src/app/api/v1/admin/returns/route.ts",
  "src/app/api/v1/admin/customers/route.ts",
  "src/app/api/v1/admin/settings/route.ts",
  "src/app/api/v1/admin/overview/route.ts",
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
  it("detects alias and relative production fixture imports", () => {
    const files = {
      "src/alias.ts": 'import { order } from "@/tests/fixtures/order";',
      "src/nested/relative.ts": 'import { order } from "../../tests/fixtures/order";',
      "src/tests/fixtures/order.ts": "export const order = {};",
    };

    expect(classifyArchitectureGraph({ files })).toEqual([
      {
        rule: "production-fixture-import",
        importer: "src/alias.ts",
        imported: "@/tests/fixtures/order",
        detail: "Production source imports a test or development fixture.",
      },
      {
        rule: "production-fixture-import",
        importer: "src/nested/relative.ts",
        imported: "../../tests/fixtures/order",
        detail: "Production source imports a test or development fixture.",
      },
    ]);
  });

  it("keeps production code free of seed, AdminStore, repository and fixture ownership", async () => {
    const sourceFiles = await collectSourceFiles(sourceRoot);
    const offenders: string[] = [];

    for (const filePath of sourceFiles) {
      const relative = normalize(path.relative(repositoryRoot, filePath));
      if (relative.includes(".test.") || relative.includes(".spec.")) continue;

      const source = await readFile(filePath, "utf8");
      for (const specifier of forbiddenProductionSpecifiers) {
        if (source.includes(specifier)) offenders.push(`${relative} -> ${specifier}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps every migrated admin consumer off legacy data ownership", async () => {
    const offenders: string[] = [];

    for (const relative of migratedConsumers) {
      const source = await readFile(path.join(repositoryRoot, relative), "utf8");
      for (const specifier of forbiddenLegacyOwnership) {
        if (source.includes(specifier)) offenders.push(`${relative} -> ${specifier}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("keeps the removed seed, store, repository and reducer implementations deleted", async () => {
    await expectExistingPaths(deletedLegacyPaths, []);
  });

  it("keeps canonical Prisma/API module ownership present for every Phase 5 domain", async () => {
    const missing: string[] = [];
    for (const relative of canonicalDomainPaths) {
      try {
        await access(path.join(repositoryRoot, relative));
      } catch {
        missing.push(relative);
      }
    }
    expect(missing).toEqual([]);
  });

  it("does not restore browser-authoritative paid, cash, POS or transfer controls", async () => {
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

async function expectExistingPaths(paths: readonly string[], expected: readonly string[]) {
  const existing: string[] = [];
  for (const relative of paths) {
    try {
      await access(path.join(repositoryRoot, relative));
      existing.push(relative);
    } catch {
      // Expected for deleted architecture.
    }
  }
  expect(existing).toEqual(expected);
}

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
