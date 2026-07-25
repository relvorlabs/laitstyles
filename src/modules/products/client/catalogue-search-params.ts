export type CatalogueSearchParams = {
  category?: string | string[];
  collection?: string | string[];
  condition?: string | string[];
  inventory?: string | string[];
  inStock?: string | string[];
  maxPrice?: string | string[];
  q?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

export const catalogueSortValues = [
  "curated",
  "newest",
  "price-low",
  "price-high",
  "condition",
  "one",
  "saved",
] as const;
export type CatalogueSort = (typeof catalogueSortValues)[number];

export type ParsedCatalogueSearch = {
  category: string | null;
  collection: string | null;
  conditions: readonly string[];
  inventories: readonly string[];
  inStock: boolean;
  maxPriceNaira: number | null;
  query: string;
  sort: CatalogueSort;
  page: number;
};

function scalar(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function list(value: string | string[] | null | undefined): readonly string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [...new Set(values.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean))];
}

function boolean(value: string | string[] | null | undefined): boolean {
  return ["1", "true", "yes"].includes((scalar(value) ?? "").toLowerCase());
}

function positiveNumber(value: string | string[] | null | undefined): number | null {
  const parsed = Number(scalar(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function positiveInteger(value: string | string[] | null | undefined, fallback: number): number {
  const parsed = Number(scalar(value));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sortValue(value: string | string[] | null | undefined): CatalogueSort {
  const candidate = scalar(value);
  return catalogueSortValues.includes(candidate as CatalogueSort)
    ? (candidate as CatalogueSort)
    : "curated";
}

export function parseCatalogueSearchParams(
  params: CatalogueSearchParams | URLSearchParams,
): ParsedCatalogueSearch {
  const get = (key: keyof CatalogueSearchParams) =>
    params instanceof URLSearchParams ? params.getAll(key) : params[key];

  return {
    category: scalar(get("category")),
    collection: scalar(get("collection")),
    conditions: list(get("condition")),
    inventories: list(get("inventory")),
    inStock: boolean(get("inStock")),
    maxPriceNaira: positiveNumber(get("maxPrice")),
    query: scalar(get("q")) ?? "",
    sort: sortValue(get("sort")),
    page: positiveInteger(get("page"), 1),
  };
}

export function catalogueSearchParams(search: ParsedCatalogueSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (search.category) params.set("category", search.category);
  if (search.collection) params.set("collection", search.collection);
  for (const condition of search.conditions) params.append("condition", condition);
  for (const inventory of search.inventories) params.append("inventory", inventory);
  if (search.inStock) params.set("inStock", "true");
  if (search.maxPriceNaira) params.set("maxPrice", String(search.maxPriceNaira));
  if (search.query) params.set("q", search.query);
  if (search.sort !== "curated") params.set("sort", search.sort);
  if (search.page > 1) params.set("page", String(search.page));
  return params;
}

export function catalogueHref(search: ParsedCatalogueSearch): string {
  const query = catalogueSearchParams(search).toString();
  return query ? `/products?${query}` : "/products";
}
