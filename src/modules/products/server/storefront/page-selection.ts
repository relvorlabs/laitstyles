import type { InventoryMode, ProductSummary } from "@/lib/storefront/types";

export type StorefrontConditionFilter = "A+" | "A" | "B+";
export type StorefrontInventoryFilter = "one-of-one" | "variant" | "matching-stock";
export type StorefrontCatalogueSort =
  | "curated"
  | "newest"
  | "price-low"
  | "price-high"
  | "condition"
  | "one"
  | "saved";

export interface StorefrontCataloguePageQuery {
  page: number;
  pageSize: number;
  search: string;
  category: string | null;
  collection: string | null;
  conditions: readonly StorefrontConditionFilter[];
  inventories: readonly StorefrontInventoryFilter[];
  inStock: boolean;
  maxPriceNaira: number | undefined;
  sort: StorefrontCatalogueSort;
  colours: readonly string[];
  sizes: readonly string[];
}

export interface StorefrontCataloguePage {
  productIds: string[];
  total: number;
  page: number;
  pageCount: number;
}

function legacyCondition(value: string | null): StorefrontConditionFilter {
  if (value === "Excellent") return "A+";
  if (value === "Fair") return "B+";
  return "A";
}

function legacyInventory(mode: InventoryMode): StorefrontInventoryFilter {
  if (mode === "unique") return "one-of-one";
  if (mode === "stocked") return "matching-stock";
  return "variant";
}

function isAvailable(product: ProductSummary): boolean {
  return product.availability.state === "available" || product.availability.state === "low";
}

function matchesSearch(product: ProductSummary, search: string): boolean {
  if (!search) return true;
  const query = search.toLowerCase();
  return [
    product.name,
    product.brand ?? "Unbranded",
    product.collection?.name,
    product.category?.name,
    product.style,
    legacyCondition(product.condition),
    product.material,
    product.colour,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

export function selectStorefrontCataloguePage(
  products: readonly ProductSummary[],
  query: StorefrontCataloguePageQuery,
  eligibleProductIds?: ReadonlySet<string>,
): StorefrontCataloguePage {
  let list = products
    .map((product, index) => ({ product, isNew: index < 20 }))
    .filter(({ product }) => !eligibleProductIds || eligibleProductIds.has(product.id));

  if (query.category) {
    list = list.filter(
      ({ product }) =>
        product.collection?.name === query.category || product.category?.name === query.category,
    );
  }
  if (query.collection === "new") list = list.filter(({ isNew }) => isNew);
  if (query.collection === "one-of-one") {
    list = list.filter(({ product }) => product.mode === "unique");
  }
  if (query.collection === "under-25") {
    list = list.filter(({ product }) => product.price < 2_500_000);
  }
  if (query.collection === "grade-a-plus") {
    list = list.filter(({ product }) => legacyCondition(product.condition) === "A+");
  }
  if (query.collection === "vintage") {
    list = list.filter(({ product }) => product.style === "Vintage");
  }
  if (query.conditions.length) {
    const conditions = new Set(query.conditions);
    list = list.filter(({ product }) => conditions.has(legacyCondition(product.condition)));
  }
  if (query.inventories.length) {
    const inventories = new Set(query.inventories);
    list = list.filter(({ product }) => inventories.has(legacyInventory(product.mode)));
  }
  if (query.inStock) list = list.filter(({ product }) => isAvailable(product));
  if (query.maxPriceNaira !== undefined) {
    const maxPriceKobo = query.maxPriceNaira * 100;
    list = list.filter(({ product }) => product.price <= maxPriceKobo);
  }
  if (query.search) list = list.filter(({ product }) => matchesSearch(product, query.search));

  const conditionRank: Record<StorefrontConditionFilter, number> = { "A+": 0, A: 1, "B+": 2 };
  if (query.sort === "price-low") list.sort((a, b) => a.product.price - b.product.price);
  if (query.sort === "price-high") list.sort((a, b) => b.product.price - a.product.price);
  if (query.sort === "condition") {
    list.sort(
      (a, b) =>
        conditionRank[legacyCondition(a.product.condition)] -
        conditionRank[legacyCondition(b.product.condition)],
    );
  }
  if (query.sort === "one") {
    list.sort((a, b) => Number(b.product.mode === "unique") - Number(a.product.mode === "unique"));
  }

  const total = list.length;
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(Math.max(1, query.page), pageCount);
  const offset = (page - 1) * query.pageSize;

  return {
    productIds: list.slice(offset, offset + query.pageSize).map(({ product }) => product.id),
    total,
    page,
    pageCount,
  };
}
