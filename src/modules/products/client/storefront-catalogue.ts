"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/http/client";
import { APP_QUERY_DEFAULTS } from "@/lib/query/app-query-client";
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
    ...APP_QUERY_DEFAULTS,
  });
}

/**
 * Seeds the shared QueryClient with server-fetched catalogue data exactly once
 * per mount, so `useStorefrontCatalogue()` reads it without an extra client-side
 * fetch. Must be called before any descendant calls `useStorefrontCatalogue()`.
 */
export function useSeedStorefrontCatalogue(initialCatalogue: StorefrontShellCataloguePayload) {
  const queryClient = useQueryClient();
  useState(() => {
    queryClient.setQueryData(storefrontCatalogueQueryKey, initialCatalogue);
    return null;
  });
}
