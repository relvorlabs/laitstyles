import { apiRequest } from "@/lib/http/client";

const RECENT_PRODUCTS_URL = "/api/v1/account/recent-products";

export async function listOwnedRecentProductIdsRequest(signal?: AbortSignal): Promise<string[]> {
  const response = await apiRequest<string[]>(RECENT_PRODUCTS_URL, {
    cache: "no-store",
    signal,
  });
  return response.data;
}

export async function recordOwnedRecentProductIdsRequest(
  productIds: readonly string[],
): Promise<string[]> {
  const response = await apiRequest<string[]>(RECENT_PRODUCTS_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productIds }),
  });
  return response.data;
}
