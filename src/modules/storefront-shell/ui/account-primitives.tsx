"use client";

// Re-exports the account workspace's shared presentational primitives. The
// canonical implementation lives with the rest of the account feature; this
// module-scoped alias exists only because `src/modules/orders/ui/storefront/**`
// and `src/modules/reviews/ui/storefront/**` import primitives (Panel,
// StatusBadge, etc.) under this path. Kept as a re-export instead of a second
// copy to retire the byte-for-byte duplication that used to live here.
export * from "@/features/storefront/account/components/account-primitives";
