"use client";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/http/client";
import { STOREFRONT_QUERY_DEFAULTS } from "@/lib/query/storefront-query-client";
import type { StorefrontShellCataloguePayload } from "@/modules/products/storefront/catalogue-contract";

export const storefrontCatalogueQueryKey = ["products", "public", "shell"] as const;

export async function fetchStorefrontShellCatalogue(
  signal?: AbortSignal,
): Promise<StorefrontShellCataloguePayload> {
  const response = await apiRequest<StorefrontShellCataloguePayload>("/api/v1/products", {
    method: "GET",
    signal,
  });
  return response.data;
}

export function useStorefrontCatalogue() {
  return useQuery({
    queryKey: storefrontCatalogueQueryKey,
    queryFn: ({ signal }) => fetchStorefrontShellCatalogue(signal),
    ...STOREFRONT_QUERY_DEFAULTS,
  });
}
