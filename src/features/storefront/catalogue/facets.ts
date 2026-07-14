import type { CatalogueSort } from "@/server/commerce/catalogue/catalog-repository";

// URL-synced facet state for /shop (docs/storefront-v2/05 §5.3). Multi-select
// facets are comma-separated params; price is a single preset. All state lives
// in the URL so it's shareable and back/forward-safe; the listing is server
// rendered from it.

export type PricePreset = "u20" | "b2040" | "o40";

export const PRICE_PRESETS: {
  value: PricePreset;
  label: string;
  minNaira?: number;
  maxNaira?: number;
}[] = [
  { value: "u20", label: "Under ₦20k", maxNaira: 20_000 },
  { value: "b2040", label: "₦20k – ₦40k", minNaira: 20_000, maxNaira: 40_000 },
  { value: "o40", label: "Over ₦40k", minNaira: 40_000 },
];

export interface ActiveFacets {
  q?: string;
  sort: CatalogueSort;
  brands: string[];
  conditions: string[];
  colours: string[];
  sizes: string[];
  price?: PricePreset;
}

type RawParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseList(value: string | string[] | undefined): string[] {
  const raw = firstValue(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseSort(value: string | string[] | undefined): CatalogueSort {
  const v = firstValue(value);
  return v === "price_asc" || v === "price_desc" ? v : "newest";
}

function parsePrice(value: string | string[] | undefined): PricePreset | undefined {
  const v = firstValue(value);
  return v === "u20" || v === "b2040" || v === "o40" ? v : undefined;
}

export function parseFacets(params: RawParams): ActiveFacets {
  return {
    q: firstValue(params.q)?.trim() || undefined,
    sort: parseSort(params.sort),
    brands: parseList(params.brand),
    conditions: parseList(params.condition),
    colours: parseList(params.colour),
    sizes: parseList(params.size),
    price: parsePrice(params.price),
  };
}

export function facetsToQuery(facets: ActiveFacets): string {
  const p = new URLSearchParams();
  if (facets.q) p.set("q", facets.q);
  if (facets.sort !== "newest") p.set("sort", facets.sort);
  if (facets.brands.length) p.set("brand", facets.brands.join(","));
  if (facets.conditions.length) p.set("condition", facets.conditions.join(","));
  if (facets.colours.length) p.set("colour", facets.colours.join(","));
  if (facets.sizes.length) p.set("size", facets.sizes.join(","));
  if (facets.price) p.set("price", facets.price);
  return p.toString();
}

function cloneFacets(facets: ActiveFacets): ActiveFacets {
  return {
    ...facets,
    brands: [...facets.brands],
    conditions: [...facets.conditions],
    colours: [...facets.colours],
    sizes: [...facets.sizes],
  };
}

/** Build a /shop href from the current facets with a mutation applied. */
export function shopHref(facets: ActiveFacets, mutate: (next: ActiveFacets) => void): string {
  const next = cloneFacets(facets);
  mutate(next);
  const query = facetsToQuery(next);
  return query ? `/shop?${query}` : "/shop";
}

function toggle(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export const facetMutations = {
  brand: (value: string) => (next: ActiveFacets) => {
    next.brands = toggle(next.brands, value);
  },
  condition: (value: string) => (next: ActiveFacets) => {
    next.conditions = toggle(next.conditions, value);
  },
  colour: (value: string) => (next: ActiveFacets) => {
    next.colours = toggle(next.colours, value);
  },
  size: (value: string) => (next: ActiveFacets) => {
    next.sizes = toggle(next.sizes, value);
  },
  price: (value: PricePreset) => (next: ActiveFacets) => {
    next.price = next.price === value ? undefined : value;
  },
  sort: (value: CatalogueSort) => (next: ActiveFacets) => {
    next.sort = value;
  },
  clearAll: (next: ActiveFacets) => {
    next.brands = [];
    next.conditions = [];
    next.colours = [];
    next.sizes = [];
    next.price = undefined;
  },
};

export function hasActiveFacets(facets: ActiveFacets): boolean {
  return (
    facets.brands.length > 0 ||
    facets.conditions.length > 0 ||
    facets.colours.length > 0 ||
    facets.sizes.length > 0 ||
    facets.price !== undefined
  );
}

export function activeFacetCount(facets: ActiveFacets): number {
  return (
    facets.brands.length +
    facets.conditions.length +
    facets.colours.length +
    facets.sizes.length +
    (facets.price ? 1 : 0)
  );
}
