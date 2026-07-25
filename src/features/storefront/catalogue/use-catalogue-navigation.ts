"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  catalogueHref,
  type CatalogueSearchParams,
  type LegacyCatalogueSort,
  type LegacyCondition,
  type LegacyInventory,
  parseCatalogueSearchParams,
  type ParsedCatalogueSearch,
} from "./catalogue-search-params";

type CataloguePatch = Partial<Omit<ParsedCatalogueSearch, "conditions" | "inventories">> & {
  conditions?: readonly string[];
  inventories?: readonly string[];
};

export type CatalogueFilterType =
  | "category"
  | "collection"
  | "condition"
  | "inventory"
  | "stock"
  | "price"
  | "search";

const quickCategoryByKey: Record<string, string> = {
  women: "Women",
  men: "Men",
  unisex: "Unisex",
};

const quickReset: CataloguePatch = {
  page: 1,
  search: "",
  conditions: [],
  inventories: [],
  inStock: false,
  maxPriceNaira: undefined,
};

const clearState: ParsedCatalogueSearch = {
  page: 1,
  search: "",
  category: null,
  collection: null,
  conditions: [],
  inventories: [],
  inStock: false,
  maxPriceNaira: undefined,
  sort: "curated",
  colours: [],
  sizes: [],
};

export function useCatalogueNavigation(initialSearch?: ParsedCatalogueSearch) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const parsedSearch = useMemo(
    () => parseCatalogueSearchParams(toCatalogueSearchParams(searchParams)),
    [searchParams],
  );
  const search = initialSearch ?? parsedSearch;

  const replace = useCallback(
    (patch: CataloguePatch, options: { scroll?: boolean } = {}) => {
      router.replace(catalogueHref(search, { ...patch, page: patch.page ?? 1 }), {
        scroll: options.scroll ?? false,
      });
    },
    [router, search],
  );

  const push = useCallback(
    (patch: CataloguePatch, options: { scroll?: boolean } = {}) => {
      router.push(catalogueHref(search, patch), { scroll: options.scroll ?? false });
    },
    [router, search],
  );

  const setCategory = useCallback(
    (category: string | null) => replace({ category, collection: null }),
    [replace],
  );

  const toggleCondition = useCallback(
    (condition: LegacyCondition, checked: boolean) =>
      replace({
        conditions: checked
          ? [...new Set([...search.conditions, condition])]
          : search.conditions.filter((value) => value !== condition),
      }),
    [replace, search.conditions],
  );

  const toggleInventory = useCallback(
    (inventory: LegacyInventory, checked: boolean) =>
      replace({
        inventories: checked
          ? [...new Set([...search.inventories, inventory])]
          : search.inventories.filter((value) => value !== inventory),
      }),
    [replace, search.inventories],
  );

  const setSort = useCallback(
    (sort: LegacyCatalogueSort) => replace({ sort }),
    [replace],
  );

  const applyQuick = useCallback(
    (key: string) => {
      if (key === "all") {
        push({ ...quickReset, category: null, collection: null });
        return;
      }
      if (quickCategoryByKey[key]) {
        push({ ...quickReset, category: quickCategoryByKey[key], collection: null });
        return;
      }
      if (key === "under-25") {
        push({ ...quickReset, maxPriceNaira: 25_000 });
        return;
      }
      if (key === "grade-a-plus") {
        push({ ...quickReset, conditions: ["A+"] });
        return;
      }
      push({ ...quickReset, category: null, collection: key });
    },
    [push],
  );

  const isQuickActive = useCallback(
    (key: string) => {
      if (key === "all") return !search.category && !search.collection;
      if (quickCategoryByKey[key]) return search.category === quickCategoryByKey[key];
      if (key === "under-25") return search.maxPriceNaira === 25_000;
      if (key === "grade-a-plus") return search.conditions.includes("A+");
      return search.collection === key;
    },
    [search],
  );

  const removeFilter = useCallback(
    (type: CatalogueFilterType, value?: string) => {
      if (type === "category") push({ page: 1, category: null });
      if (type === "collection") push({ page: 1, collection: null });
      if (type === "condition") {
        push({
          page: 1,
          conditions: search.conditions.filter((item) => item !== value),
        });
      }
      if (type === "inventory") {
        push({
          page: 1,
          inventories: search.inventories.filter((item) => item !== value),
        });
      }
      if (type === "stock") push({ page: 1, inStock: false });
      if (type === "price") push({ page: 1, maxPriceNaira: undefined });
      if (type === "search") push({ page: 1, search: "" });
    },
    [push, search.conditions, search.inventories],
  );

  const clear = useCallback(() => {
    router.replace("/products", { scroll: false });
  }, [router]);

  const searchFor = useCallback(
    (term: string) => {
      const nextSearch = term.trim();
      if (!nextSearch) return false;
      router.push(catalogueHref(clearState, { search: nextSearch, page: 1 }));
      return true;
    },
    [router],
  );

  const goToPage = useCallback(
    (page: number) => push({ page }, { scroll: true }),
    [push],
  );

  return {
    search,
    replace,
    push,
    setCategory,
    toggleCondition,
    toggleInventory,
    setSort,
    applyQuick,
    isQuickActive,
    removeFilter,
    clear,
    searchFor,
    goToPage,
  };
}

function toCatalogueSearchParams(
  searchParams: ReturnType<typeof useSearchParams>,
): CatalogueSearchParams {
  const values: CatalogueSearchParams = {};
  for (const key of new Set(searchParams.keys())) {
    const entries = searchParams.getAll(key);
    values[key] = entries.length > 1 ? entries : entries[0];
  }
  return values;
}
