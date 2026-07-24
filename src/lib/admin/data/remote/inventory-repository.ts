import type { InventoryRepository } from "@/lib/admin/data/repositories";
import type {
  CatalogueTaxonomyItem,
  InventoryProduct,
  StockMovement,
} from "@/lib/admin/shared/types";

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request to ${url} failed with status ${response.status}.`);
  }
  return response.json() as Promise<T>;
}

export function createFetchAdminInventoryRepository(): InventoryRepository {
  return {
    listProducts: () => fetchJson<InventoryProduct[]>("/api/admin/inventory/products"),
    getProduct: async (productId) => {
      const url = `/api/admin/inventory/products/${encodeURIComponent(productId)}`;
      const response = await fetch(url, { cache: "no-store" });
      if (response.status === 404) return null;
      if (!response.ok) {
        throw new Error(`Request to ${url} failed with status ${response.status}.`);
      }
      return response.json() as Promise<InventoryProduct>;
    },
    listTaxonomy: () => fetchJson<CatalogueTaxonomyItem[]>("/api/admin/inventory/taxonomy"),
    listStockMovements: (productId) =>
      fetchJson<StockMovement[]>(
        productId
          ? `/api/admin/inventory/stock-movements?productId=${encodeURIComponent(productId)}`
          : "/api/admin/inventory/stock-movements",
      ),
  };
}
