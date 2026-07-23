import type { CatalogueSort } from "@/lib/storefront/types";

export type CatalogueSearchParams = Record<string, string | string[] | undefined>;

export interface ParsedCatalogueSearch {
  page: number;
  search: string;
  category: string | null;
  collection: string | null;
  brands: string[];
  conditions: string[];
  colours: string[];
  sizes: string[];
  modes: Array<"unique" | "stocked" | "variant">;
  minPriceNaira: number | undefined;
  maxPriceNaira: number | undefined;
  sort: CatalogueSort;
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

function parseSort(value: string | string[] | undefined): CatalogueSort {
  const sort = first(value);
  return sort === "price_asc" || sort === "price_desc" ? sort : "newest";
}

export function parseCatalogueSearchParams(
  searchParams: CatalogueSearchParams,
): ParsedCatalogueSearch {
  const modes = values(searchParams.mode).filter(
    (mode): mode is ParsedCatalogueSearch["modes"][number] =>
      mode === "unique" || mode === "stocked" || mode === "variant",
  );

  return {
    page: positiveInteger(searchParams.page, 1),
    search: first(searchParams.search).slice(0, 120),
    category: first(searchParams.category) || null,
    collection: first(searchParams.collection) || null,
    brands: values(searchParams.brand),
    conditions: values(searchParams.condition),
    colours: values(searchParams.colour),
    sizes: values(searchParams.size),
    modes,
    minPriceNaira: nonNegativeNumber(searchParams.min),
    maxPriceNaira: nonNegativeNumber(searchParams.max),
    sort: parseSort(searchParams.sort),
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
  if (next.brands.length) params.set("brand", next.brands.join(","));
  if (next.conditions.length) params.set("condition", next.conditions.join(","));
  if (next.colours.length) params.set("colour", next.colours.join(","));
  if (next.sizes.length) params.set("size", next.sizes.join(","));
  if (next.modes.length) params.set("mode", next.modes.join(","));
  if (next.minPriceNaira !== undefined) params.set("min", String(next.minPriceNaira));
  if (next.maxPriceNaira !== undefined) params.set("max", String(next.maxPriceNaira));
  if (next.sort !== "newest") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query ? `/products?${query}` : "/products";
}
