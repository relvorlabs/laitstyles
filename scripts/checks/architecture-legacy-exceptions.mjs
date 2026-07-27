const phase7SessionImporters = [
  "src/app/layout.tsx",
  "src/app/auth/sign-in/page.tsx",
  "src/app/admin/layout.tsx",
  "src/app/admin/inventory/page.tsx",
  "src/app/(storefront)/account/profile/page.tsx",
  "src/app/(storefront)/account/profile/actions.ts",
  "src/app/(storefront)/account/orders/page.tsx",
  "src/app/(storefront)/account/orders/[orderNumber]/page.tsx",
  "src/app/(storefront)/account/orders/[orderNumber]/items/[orderLineId]/review/actions.ts",
  "src/app/(storefront)/account/orders/[orderNumber]/items/[orderLineId]/review/page.tsx",
  "src/lib/http/auth.ts",
  "src/modules/customers/server/commands.ts",
  "src/modules/holds/server/commands.ts",
  "src/modules/inventory/server/adjust-stock.ts",
  "src/modules/inventory/server/stock-write.ts",
  "src/modules/orders/server/offline-sale-checkout.ts",
  "src/modules/orders/server/offline-sale-draft.ts",
  "src/modules/orders/server/offline-sale.ts",
  "src/modules/orders/server/transition-order.ts",
  "src/modules/products/server/lifecycle-commands.ts",
  "src/modules/products/server/product-commands.ts",
  "src/modules/products/server/rules.ts",
  "src/modules/products/server/taxonomy-commands.ts",
  "src/modules/returns/server/commands.ts",
  "src/modules/settings/server/commands.ts",
];

const phase7ProfileImporters = [
  "src/app/auth/callback/route.ts",
  "src/server/auth/session.ts",
];

const phase7StorefrontAuthProviderImporters = [
  "src/app/storefront-client-boundary.tsx",
  "src/modules/storefront-shell/ui/site-chrome.tsx",
  "src/modules/storefront-shell/ui/storefront-account-menu.tsx",
];

const phase7StorefrontAuthCompositionEdges = [
  {
    importer: "src/app/storefront-client-boundary.tsx",
    imported: "@/features/storefront/shared/storefront-auth-dialog-host",
  },
];

const phase8Edges = [
  {
    importer: "src/app/(storefront)/checkout/page.tsx",
    imported: "@/features/storefront/checkout/checkout-flow-v2",
  },
  {
    importer: "src/app/(storefront)/order-confirmation/page.tsx",
    imported: "@/features/storefront/checkout/order-receipt",
  },
];

const phase7Reason =
  "Phase 1-6 reuses the inherited session boundary; auth ownership moves in Phase 7.";
const phase7ProfileReason =
  "Phase 1-6 reuses the inherited profile boundary; auth ownership moves in Phase 7.";
const phase7StorefrontProviderReason =
  "Phase 1-6 reuses the inherited storefront auth provider; auth ownership moves in Phase 7.";
const phase8Reason =
  "Phase 2 preserves the existing checkout presentation; settlement authority moves in Phase 8.";

export const legacyArchitectureExceptions = Object.freeze([
  ...phase7SessionImporters.map((importer) =>
    Object.freeze({
      importer,
      imported: "@/server/auth/session",
      kind: "phase-7-auth",
      reason: phase7Reason,
      owner: "domain-engineer",
      removalPhase: 7,
    }),
  ),
  ...phase7ProfileImporters.map((importer) =>
    Object.freeze({
      importer,
      imported: "@/server/auth/profile",
      kind: "phase-7-auth",
      reason: phase7ProfileReason,
      owner: "domain-engineer",
      removalPhase: 7,
    }),
  ),
  ...phase7StorefrontAuthProviderImporters.map((importer) =>
    Object.freeze({
      importer,
      imported: "@/features/storefront/shared/storefront-auth-provider",
      kind: "phase-7-auth",
      reason: phase7StorefrontProviderReason,
      owner: "domain-engineer",
      removalPhase: 7,
    }),
  ),
  ...phase7StorefrontAuthCompositionEdges.map((edge) =>
    Object.freeze({
      ...edge,
      kind: "phase-7-auth",
      reason: phase7StorefrontProviderReason,
      owner: "domain-engineer",
      removalPhase: 7,
    }),
  ),
  ...phase8Edges.map((edge) =>
    Object.freeze({
      ...edge,
      kind: "phase-8-checkout",
      reason: phase8Reason,
      owner: "ui-engineer",
      removalPhase: 8,
    }),
  ),
]);

export const legacyTopLevelServerFiles = new Set([
  "src/server/auth/session.ts",
  "src/server/auth/profile.ts",
]);

export const legacyProductTypeOnlyEdge = Object.freeze({
  importer: "src/features/storefront/shared/storefront-auth-dialog.tsx",
  imported: "@/features/storefront/shared/catalogue-data",
  shim: "src/features/storefront/shared/catalogue-data.ts",
});

const edgeKeys = legacyArchitectureExceptions.map(
  ({ importer, imported }) => `${importer}->${imported}`,
);
if (new Set(edgeKeys).size !== edgeKeys.length) {
  throw new Error("Duplicate legacy architecture exception edge.");
}

for (const entry of legacyArchitectureExceptions) {
  if (
    entry.importer.length === 0 ||
    entry.imported.length === 0 ||
    ![7, 8].includes(entry.removalPhase) ||
    !["domain-engineer", "ui-engineer"].includes(entry.owner)
  ) {
    throw new Error(`Invalid legacy architecture exception: ${entry.importer}->${entry.imported}`);
  }
}
