export const legacyTanstackServerActionEdges = new Map([
  [
    "src/features/admin/inventory/inventory-mutations.ts -> src/features/admin/inventory/inventory-actions.ts",
    {
      removalPhase: "Phase 4",
      reason:
        "The current admin inventory TanStack mutations call legacy Server Actions directly. Phase 4 replaces this edge with typed API mutations.",
    },
  ],
]);
