"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  type CatalogueSearchPatch,
  catalogueHref,
  type ParsedCatalogueSearch,
  parseCatalogueSearchParams,
} from "@/modules/products/client/catalogue-search-params";

export type CatalogueFilterType =
  | "category"
  | "collection"
  | "condition"
  | "inventory"
  | "stock"
  | "price"
  | "search";

function toggleValue<T extends string>(values: readonly T[], value: T, checked: boolean) {
  return checked
    ? [...new Set([...values, value])]
    : values.filter((candidate) => candidate !== value);
}

export type CatalogueQuickLink =
  | "all"
  | "new"
  | "women"
  | "men"
  | "unisex"
  | "one-of-one"
  | "under-25"
  | "grade-a-plus"
  | "vintage";

export function useCatalogueNavigation(initialSearch?: ParsedCatalogueSearch) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = useMemo(
    () =>
      searchParams.size === 0 && initialSearch
        ? initialSearch
        : parseCatalogueSearchParams(searchParams),
    [initialSearch, searchParams],
  );

  const navigate = useCallback(
    (patch: CatalogueSearchPatch, mode: "push" | "replace" = "push") => {
      const href = catalogueHref(search, patch);
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router, search],
  );

  const replace = useCallback(
    (patch: CatalogueSearchPatch) => navigate({ ...patch, page: 1 }, "replace"),
    [navigate],
  );

  const push = useCallback((patch: CatalogueSearchPatch) => navigate(patch, "push"), [navigate]);

  const setCategory = useCallback((category: string | null) => replace({ category }), [replace]);
  const toggleCondition = useCallback(
    (condition: ParsedCatalogueSearch["conditions"][number], checked: boolean) =>
      replace({ conditions: toggleValue(search.conditions, condition, checked) }),
    [replace, search.conditions],
  );
  const toggleInventory = useCallback(
    (inventory: ParsedCatalogueSearch["inventories"][number], checked: boolean) =>
      replace({ inventories: toggleValue(search.inventories, inventory, checked) }),
    [replace, search.inventories],
  );
  const setSort = useCallback(
    (sort: ParsedCatalogueSearch["sort"]) => replace({ sort }),
    [replace],
  );
  const searchFor = useCallback(
    (value: string) => {
      const nextSearch = value.trim();
      if (!nextSearch) return false;
      push({ search: nextSearch, page: 1 });
      return true;
    },
    [push],
  );
  const goToPage = useCallback((page: number) => push({ page: Math.max(1, page) }), [push]);

  const quickPatch = useCallback((quick: CatalogueQuickLink): CatalogueSearchPatch => {
    const patch: CatalogueSearchPatch = {
      category: null,
      collection: null,
      conditions: [],
      inventories: [],
      inStock: false,
      maxPriceNaira: undefined,
      search: "",
      page: 1,
      colours: [],
      sizes: [],
    };
    if (quick === "new") patch.collection = "new";
    if (quick === "women") patch.category = "Women";
    if (quick === "men") patch.category = "Men";
    if (quick === "unisex") patch.category = "Unisex";
    if (quick === "one-of-one") patch.collection = "one-of-one";
    if (quick === "under-25") patch.maxPriceNaira = 25_000;
    if (quick === "grade-a-plus") patch.conditions = ["A+"];
    if (quick === "vintage") patch.collection = "vintage";
    return patch;
  }, []);

  const applyQuick = useCallback(
    (quick: CatalogueQuickLink) => navigate(quickPatch(quick), "push"),
    [navigate, quickPatch],
  );

  const isQuickActive = useCallback(
    (quick: CatalogueQuickLink) => {
      if (quick === "new") return search.collection === "new";
      if (quick === "women") return search.category === "Women";
      if (quick === "men") return search.category === "Men";
      if (quick === "unisex") return search.category === "Unisex";
      if (quick === "one-of-one") return search.collection === "one-of-one";
      if (quick === "under-25") return search.maxPriceNaira === 25_000;
      if (quick === "grade-a-plus") {
        return search.conditions.length === 1 && search.conditions[0] === "A+";
      }
      if (quick === "vintage") return search.collection === "vintage";
      return (
        !search.category &&
        !search.collection &&
        search.conditions.length === 0 &&
        search.inventories.length === 0 &&
        !search.inStock &&
        search.maxPriceNaira === undefined &&
        !search.search &&
        search.colours.length === 0 &&
        search.sizes.length === 0
      );
    },
    [search],
  );

  const removeFilter = useCallback(
    (type: CatalogueFilterType, value?: string) => {
      if (type === "condition") {
        replace({
          conditions: value ? search.conditions.filter((condition) => condition !== value) : [],
        });
      } else if (type === "inventory") {
        replace({
          inventories: value ? search.inventories.filter((inventory) => inventory !== value) : [],
        });
      } else if (type === "price") replace({ maxPriceNaira: undefined });
      else if (type === "stock") replace({ inStock: false });
      else if (type === "search") replace({ search: "" });
      else replace({ [type]: null });
    },
    [replace, search.conditions, search.inventories],
  );

  const clear = useCallback(() => {
    router.replace("/products", { scroll: false });
  }, [router]);

  return {
    pathname,
    search,
    replace,
    push,
    setCategory,
    toggleCondition,
    toggleInventory,
    setSort,
    searchFor,
    goToPage,
    applyQuick,
    isQuickActive,
    removeFilter,
    clear,
  };
}
