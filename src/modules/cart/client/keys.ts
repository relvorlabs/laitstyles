export const ownedCartKeys = {
  all: ["account", "cart"] as const,
  details: () => [...ownedCartKeys.all, "detail"] as const,
  detail: (identityKey = "current") => [...ownedCartKeys.details(), identityKey] as const,
};
