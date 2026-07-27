// P7-T03 retired every phase7SessionImporters entry: src/server/auth/session.ts
// no longer exists (moved to src/modules/auth/server/session.ts), so every
// former importer now points at the in-module path and needs no exception.

const phase7ProfileImporters = [
  "src/app/auth/callback/route.ts",
  // Temporary: src/modules/auth/server/session.ts (moved in P7-T03) still
  // imports the legacy src/server/auth/profile.ts. Retired in P7-T04 when
  // profile.ts itself moves into the module (same-module import then).
  "src/modules/auth/server/session.ts",
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

const phase7ProfileReason =
  "src/modules/auth/server/session.ts (moved in P7-T03) still imports the legacy " +
  "src/server/auth/profile.ts; auth ownership of profile.ts moves in Phase 7 (P7-T04).";
const phase7StorefrontProviderReason =
  "Phase 1-6 reuses the inherited storefront auth provider; auth ownership moves in Phase 7.";
const phase8Reason =
  "Phase 2 preserves the existing checkout presentation; settlement authority moves in Phase 8.";

export const legacyArchitectureExceptions = Object.freeze([
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

export const legacyTopLevelServerFiles = new Set(["src/server/auth/profile.ts"]);

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
