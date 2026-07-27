// Phase 7 authentication consolidation is complete. All 30 original edges are
// retired:
// - P7-T03 retired every phase7SessionImporters entry (src/server/auth/session.ts
//   moved to src/modules/auth/server/session.ts).
// - P7-T04 retired every phase7ProfileImporters entry (src/server/auth/profile.ts
//   moved to src/modules/auth/server/account-provisioning.ts).
// - P7-T10/T11 retired phase7StorefrontAuthProviderImporters (3),
//   phase7StorefrontAuthCompositionEdges (1), and legacyProductTypeOnlyEdge (1):
//   src/features/storefront/shared/{storefront-auth-dialog,storefront-auth-dialog-host,
//   storefront-auth-provider,catalogue-data}.ts moved/deleted into
//   src/modules/auth/ui/**, importing the canonical
//   @/modules/products/ui/storefront/catalogue-data directly. No exception
//   remains for any auth-owned edge.
// src/features/storefront/shared/storefront-runtime.ts remains a Phase 8
// checkout edge and is untouched by Phase 7.

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

const phase8Reason =
  "Phase 2 preserves the existing checkout presentation; settlement authority moves in Phase 8.";

export const legacyArchitectureExceptions = Object.freeze([
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

// No legacy top-level auth files remain; src/server/auth/** no longer exists
// (retired across P7-T03/T04).
export const legacyTopLevelServerFiles = new Set();

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
