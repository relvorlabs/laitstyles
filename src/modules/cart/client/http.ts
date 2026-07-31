import { apiRequest } from "@/lib/http/client";
import type { OwnedCartSnapshot, OwnedCartWriteInput } from "@/modules/cart/types";

const CART_URL = "/api/v1/account/cart";

export async function getOwnedCartRequest(signal?: AbortSignal): Promise<OwnedCartSnapshot> {
  const response = await apiRequest<OwnedCartSnapshot>(CART_URL, { cache: "no-store", signal });
  return response.data;
}

export async function replaceOwnedCartRequest(
  input: OwnedCartWriteInput,
): Promise<OwnedCartSnapshot> {
  const response = await apiRequest<OwnedCartSnapshot>(CART_URL, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function mergeOwnedCartRequest(
  input: OwnedCartWriteInput,
): Promise<OwnedCartSnapshot> {
  const response = await apiRequest<OwnedCartSnapshot>(CART_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function clearOwnedCartRequest(): Promise<OwnedCartSnapshot> {
  const response = await apiRequest<OwnedCartSnapshot>(CART_URL, { method: "DELETE" });
  return response.data;
}
