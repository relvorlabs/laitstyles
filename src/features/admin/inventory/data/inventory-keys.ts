import type { InventoryQuery } from "@/lib/admin/shared/types";

export type InventoryListKeyInput = {
  query: InventoryQuery;
  page: number;
  pageSize: number;
};

export const inventoryKeys = {
  all: ["inventory"] as const,
  lists: () => [...inventoryKeys.all, "list"] as const,
  list: ({ query, page, pageSize }: InventoryListKeyInput) =>
    [
      ...inventoryKeys.lists(),
      {
        query: normaliseInventoryQuery(query),
        page: normalisePositiveInteger(page, 1),
        pageSize: normalisePositiveInteger(pageSize, 10),
      },
    ] as const,
  taxonomy: () => [...inventoryKeys.all, "taxonomy"] as const,
  stockMovements: (productId?: string) =>
    [...inventoryKeys.all, "stock-movements", productId?.trim() || "all"] as const,
};

export const productKeys = {
  all: ["products"] as const,
  details: () => [...productKeys.all, "detail"] as const,
  detail: (productId: string) => [...productKeys.details(), productId.trim()] as const,
  media: (productId: string) => [...productKeys.detail(productId), "media"] as const,
};

function normaliseInventoryQuery(query: InventoryQuery): InventoryQuery {
  return {
    search: query.search.trim(),
    view: query.view,
    mode: query.mode,
    stock: query.stock,
    category: query.category,
    collection: query.collection,
    channel: query.channel,
    sort: query.sort,
  };
}

function normalisePositiveInteger(value: number, fallback: number) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}
