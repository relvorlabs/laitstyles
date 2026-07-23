export type CatalogueSearchParams = Record<string, string | string[] | undefined>;

export type LegacyCatalogueSort =
  | "curated"
  | "newest"
  | "price-low"
  | "price-high"
  | "condition"
  | "one"
  | "saved";

export type LegacyCondition = "A+" | "A" | "B+";
export type LegacyInventory = "one-of-one" | "variant" | "matching-stock";

export interface ParsedCatalogueSearch {
  page: number;
  search: string;
  category: string | null;
  collection: string | null;
  conditions: LegacyCondition[];
  inventories: LegacyInventory[];
  inStock: boolean;
  maxPriceNaira: number | undefined;
  sort: LegacyCatalogueSort;
  colours: string[];
  sizes: string[];
}

function values(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  return raw
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);
}

function first(value: string | string[] | undefined): string {
  return values(value)[0] ?? "";
}

function positiveInteger(value: string | string[] | undefined, fallback: number): number {
  const parsed = Number.parseInt(first(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeNumber(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseSort(value: string | string[] | undefined): LegacyCatalogueSort {
  const sort = first(value);
  return sort === "newest" ||
    sort === "price-low" ||
    sort === "price-high" ||
    sort === "condition" ||
    sort === "one" ||
    sort === "saved"
    ? sort
    : "curated";
}

function parseConditions(value: string | string[] | undefined): LegacyCondition[] {
  return values(value).filter(
    (condition): condition is LegacyCondition =>
      condition === "A+" || condition === "A" || condition === "B+",
  );
}

function parseInventories(searchParams: CatalogueSearchParams): LegacyInventory[] {
  const explicit = values(searchParams.inventory);
  const canonicalModes = values(searchParams.mode).map((mode) =>
    mode === "unique" ? "one-of-one" : mode === "stocked" ? "matching-stock" : mode,
  );
  return [...new Set([...explicit, ...canonicalModes])].filter(
    (value): value is LegacyInventory =>
      value === "one-of-one" || value === "variant" || value === "matching-stock",
  );
}

export function parseCatalogueSearchParams(
  searchParams: CatalogueSearchParams,
): ParsedCatalogueSearch {
  return {
    page: positiveInteger(searchParams.page, 1),
    search: first(searchParams.search).slice(0, 120),
    category: first(searchParams.category) || null,
    collection: first(searchParams.collection) || null,
    conditions: parseConditions(searchParams.condition),
    inventories: parseInventories(searchParams),
    inStock: first(searchParams.stock) === "1" || first(searchParams.inStock) === "true",
    maxPriceNaira: nonNegativeNumber(searchParams.max),
    sort: parseSort(searchParams.sort),
    colours: values(searchParams.colour),
    sizes: values(searchParams.size),
  };
}

export function catalogueHref(
  current: ParsedCatalogueSearch,
  patch: Partial<ParsedCatalogueSearch>,
): string {
  const next = { ...current, ...patch };
  const params = new URLSearchParams();

  if (next.search) params.set("search", next.search);
  if (next.category) params.set("category", next.category);
  if (next.collection) params.set("collection", next.collection);
  if (next.conditions.length) params.set("condition", next.conditions.join(","));
  if (next.inventories.length) params.set("inventory", next.inventories.join(","));
  if (next.inStock) params.set("stock", "1");
  if (next.maxPriceNaira !== undefined) params.set("max", String(next.maxPriceNaira));
  if (next.sort !== "curated") params.set("sort", next.sort);
  if (next.colours.length) params.set("colour", next.colours.join(","));
  if (next.sizes.length) params.set("size", next.sizes.join(","));
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}
