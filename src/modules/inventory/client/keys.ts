import type { InventoryProductListInput } from "@/modules/inventory/types";

export const inventoryKeys = {
  all: ["admin", "inventory"] as const,
  products: (input: InventoryProductListInput) =>
    [...inventoryKeys.all, "products", input] as const,
  stockMovements: (productId?: string) =>
    [...inventoryKeys.all, "stock-movements", productId ?? "all"] as const,
};
