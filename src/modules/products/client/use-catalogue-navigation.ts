"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  catalogueHref,
  type ParsedCatalogueSearch,
  parseCatalogueSearchParams,
} from "@/modules/products/client/catalogue-search-params";

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

function nextSearch(current: ParsedCatalogueSearch, patch: CataloguePatch): ParsedCatalogueSearch {
  return { ...current, ...patch };
}

function toggleValue(values: readonly string[], value: string, checked: boolean) {
  return checked
    ? [...new Set([...values, value])]
    : values.filter((candidate) => candidate !== value);
}

export function useCatalogueNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = useMemo(() => parseCatalogueSearchParams(searchParams), [searchParams]);

  const navigate = useCallback(
    (next: ParsedCatalogueSearch, mode: "push" | "replace" = "push") => {
      const href = catalogueHref(next);
      if (mode === "replace") router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    },
    [router],
  );

  const replace = useCallback(
    (patch: CataloguePatch) => navigate(nextSearch(search, { ...patch, page: 1 }), "replace"),
    [navigate, search],
  );

  const push = useCallback(
    (patch: CataloguePatch) => navigate(nextSearch(search, patch), "push"),
    [navigate, search],
  );

  const setCategory = useCallback((category: string | null) => replace({ category }), [replace]);
  const toggleCondition = useCallback(
    (condition: string, checked: boolean) =>
      replace({ conditions: toggleValue(search.conditions, condition, checked) }),
    [replace, search.conditions],
  );
  const toggleInventory = useCallback(
    (inventory: string, checked: boolean) =>
      replace({ inventories: toggleValue(search.inventories, inventory, checked) }),
    [replace, search.inventories],
  );
  const setSort = useCallback(
    (sort: ParsedCatalogueSearch["sort"]) => replace({ sort }),
    [replace],
  );
  const searchFor = useCallback((query: string) => push({ query: query.trim(), page: 1 }), [push]);
  const setPage = useCallback((page: number) => push({ page: Math.max(1, page) }), [push]);

  const applyQuickLink = useCallback(
    (quick: "all" | "new" | "one-of-one" | "under-25" | "grade-a-plus") => {
      const patch: CataloguePatch = {
        category: null,
        collection: null,
        conditions: [],
        inventories: [],
        inStock: false,
        maxPriceNaira: null,
        query: "",
        page: 1,
      };
      if (quick === "new") patch.collection = "new";
      if (quick === "one-of-one") patch.collection = "one-of-one";
      if (quick === "under-25") patch.maxPriceNaira = 25_000;
      if (quick === "grade-a-plus") patch.conditions = ["A+"];
      navigate(nextSearch(search, patch), "push");
    },
    [navigate, search],
  );

  const activeQuick = useMemo(() => {
    if (search.collection === "new") return "new";
    if (search.collection === "one-of-one") return "one-of-one";
    if (search.maxPriceNaira === 25_000) return "under-25";
    if (search.conditions.length === 1 && search.conditions[0] === "A+") return "grade-a-plus";
    return "all";
  }, [search]);

  const removeChip = useCallback(
    (
      kind:
        | "category"
        | "collection"
        | "condition"
        | "inventory"
        | "inStock"
        | "maxPrice"
        | "query",
    ) => {
      if (kind === "condition") replace({ conditions: [] });
      else if (kind === "inventory") replace({ inventories: [] });
      else if (kind === "maxPrice") replace({ maxPriceNaira: null });
      else if (kind === "query") replace({ query: "" });
      else replace({ [kind]: kind === "inStock" ? false : null });
    },
    [replace],
  );

  const clear = useCallback(() => {
    const clearState: ParsedCatalogueSearch = {
      category: null,
      collection: null,
      conditions: [],
      inventories: [],
      inStock: false,
      maxPriceNaira: null,
      query: "",
      sort: "curated",
      page: 1,
    };
    router.replace(catalogueHref(clearState), { scroll: false });
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
    setPage,
    applyQuickLink,
    activeQuick,
    removeChip,
    clear,
  };
}
