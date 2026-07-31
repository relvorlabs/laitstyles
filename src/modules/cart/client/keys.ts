export const ownedCartKeys = {
  all: ["account", "cart"] as const,
  detail: () => [...ownedCartKeys.all, "detail"] as const,
};
