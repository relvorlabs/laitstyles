export const productKeys = {
  all: ["admin", "products"] as const,
  list: () => [...productKeys.all, "list"] as const,
  detail: (productId: string) => [...productKeys.all, "detail", productId] as const,
  taxonomy: () => [...productKeys.all, "taxonomy"] as const,
};
