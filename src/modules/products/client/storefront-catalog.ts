"use client";

import { useQuery } from "@tanstack/react-query";
import type { StorefrontShellCatalogPayload } from "@/features/storefront/shared/catalog-types";
import { apiRequest } from "@/lib/http/client";

export const storefrontCatalogQueryKey = ["storefront", "catalog", "shell"] as const;

export async function fetchStorefrontShellCatalog(
  signal?: AbortSignal,
): Promise<StorefrontShellCatalogPayload> {
  const response = await apiRequest<StorefrontShellCatalogPayload>("/api/v1/storefront/catalog", {
    method: "GET",
    signal,
  });
  return response.data;
}

export function useStorefrontCatalog() {
  return useQuery({
    queryKey: storefrontCatalogQueryKey,
    queryFn: ({ signal }) => fetchStorefrontShellCatalog(signal),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
}
