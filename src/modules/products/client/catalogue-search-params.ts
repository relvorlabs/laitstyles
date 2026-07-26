export type CatalogueSearchParams = {
  category?: string | string[];
  collection?: string | string[];
  condition?: string | string[];
  inventory?: string | string[];
  mode?: string | string[];
  stock?: string | string[];
  max?: string | string[];
  search?: string | string[];
  sort?: string | string[];
  page?: string | string[];
  colour?: string | string[];
  size?: string | string[];
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

const catalogueConditionValues = ["A+", "A", "B+"] as const;
const catalogueInventoryValues = ["one-of-one", "matching-stock", "variant"] as const;

export type ParsedCatalogueSearch = {
  category: string | null;
  collection: string | null;
  conditions: readonly (typeof catalogueConditionValues)[number][];
  inventories: readonly (typeof catalogueInventoryValues)[number][];
  inStock: boolean;
  maxPriceNaira: number | undefined;
  search: string;
  sort: CatalogueSort;
  page: number;
  colours: readonly string[];
  sizes: readonly string[];
};

export type CatalogueSearchPatch = Partial<
  Omit<ParsedCatalogueSearch, "conditions" | "inventories" | "colours" | "sizes">
> & {
  conditions?: ParsedCatalogueSearch["conditions"];
  inventories?: ParsedCatalogueSearch["inventories"];
  colours?: readonly string[];
  sizes?: readonly string[];
};

function scalar(value: string | string[] | null | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function list(value: string | string[] | null | undefined): readonly string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return [
    ...new Set(
      values
        .flatMap((entry) => entry.split(","))
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  ];
}

function approvedList<const T extends readonly string[]>(
  value: string | string[] | null | undefined,
  approved: T,
): readonly T[number][] {
  return list(value).filter((entry): entry is T[number] => approved.includes(entry as T[number]));
}

function inventoryList(params: CatalogueSearchParams | URLSearchParams) {
  const get = (key: keyof CatalogueSearchParams) =>
    params instanceof URLSearchParams ? params.getAll(key) : params[key];
  const canonical = approvedList(get("inventory"), catalogueInventoryValues);
  if (canonical.length > 0) return canonical;
  const legacyModes: Record<string, (typeof catalogueInventoryValues)[number]> = {
    unique: "one-of-one",
    stocked: "matching-stock",
    variant: "variant",
  };
  return list(get("mode")).flatMap((mode) => {
    const inventory = legacyModes[mode];
    return inventory ? [inventory] : [];
  });
}

function boolean(value: string | string[] | null | undefined): boolean {
  return ["1", "true", "yes"].includes((scalar(value) ?? "").toLowerCase());
}

function positiveNumber(value: string | string[] | null | undefined): number | undefined {
  const parsed = Number(scalar(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
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
    conditions: approvedList(get("condition"), catalogueConditionValues),
    inventories: inventoryList(params),
    inStock: boolean(get("stock")),
    maxPriceNaira: positiveNumber(get("max")),
    search: scalar(get("search")) ?? "",
    sort: sortValue(get("sort")),
    page: positiveInteger(get("page"), 1),
    colours: list(get("colour")),
    sizes: list(get("size")),
  };
}

export function catalogueSearchParams(search: ParsedCatalogueSearch): URLSearchParams {
  const params = new URLSearchParams();
  if (search.category) params.set("category", search.category);
  if (search.collection) params.set("collection", search.collection);
  for (const condition of search.conditions) params.append("condition", condition);
  for (const inventory of search.inventories) params.append("inventory", inventory);
  if (search.inStock) params.set("stock", "1");
  if (search.maxPriceNaira !== undefined) params.set("max", String(search.maxPriceNaira));
  if (search.search) params.set("search", search.search);
  if (search.sort !== "curated") params.set("sort", search.sort);
  if (search.page > 1) params.set("page", String(search.page));
  for (const colour of search.colours) params.append("colour", colour);
  for (const size of search.sizes) params.append("size", size);
  return params;
}

export function catalogueHref(
  current: ParsedCatalogueSearch,
  patch: CatalogueSearchPatch = {},
): string {
  const query = catalogueSearchParams({ ...current, ...patch }).toString();
  return query ? `/products?${query}` : "/products";
}
