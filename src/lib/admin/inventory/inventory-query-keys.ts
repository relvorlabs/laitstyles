export const inventoryKeys = {
  all: ["admin", "inventory"] as const,
  products: () => [...inventoryKeys.all, "products"] as const,
  product: (productId: string) => [...inventoryKeys.all, "product", productId] as const,
  taxonomy: () => [...inventoryKeys.all, "taxonomy"] as const,
};
