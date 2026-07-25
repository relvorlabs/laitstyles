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

type CataloguePatch = Partial<ParsedCatalogueSearch> & {
  conditions?: readonly string[];
  inventories?: readonly string[];
};

export function useCatalogueNavigation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const search = useMemo(
    () => parseCatalogueSearchParams(toCatalogueSearchParams(searchParams)),
    [searchParams],
  );

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
  const clear = useCallback(
    () =>
      replace({
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
      }),
    [replace],
  );

  return {
    search,
    replace,
    push,
    setCategory,
    toggleCondition,
    toggleInventory,
    setSort,
    clear,
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
