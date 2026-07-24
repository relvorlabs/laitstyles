export const inventoryKeys = {
  all: ["admin", "inventory"] as const,
  stockMovements: (productId?: string) =>
    [...inventoryKeys.all, "stock-movements", productId ?? "all"] as const,
};
