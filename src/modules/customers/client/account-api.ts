import { apiRequest } from "@/lib/http/client";
import type {
  CreateOwnedAddressInput,
  OwnedAddress,
  OwnedProfile,
  UpdateOwnedAddressInput,
  UpdateOwnedProfileInput,
} from "@/modules/customers/types";

const PROFILE_URL = "/api/v1/account/profile";
const ADDRESSES_URL = "/api/v1/account/addresses";
const SAVED_PRODUCTS_URL = "/api/v1/account/saved-products";

export async function getOwnedProfileRequest(signal?: AbortSignal): Promise<OwnedProfile> {
  const response = await apiRequest<OwnedProfile>(PROFILE_URL, { cache: "no-store", signal });
  return response.data;
}

export async function updateOwnedProfileRequest(
  input: UpdateOwnedProfileInput,
): Promise<OwnedProfile> {
  const response = await apiRequest<OwnedProfile>(PROFILE_URL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function listOwnedAddressesRequest(signal?: AbortSignal): Promise<OwnedAddress[]> {
  const response = await apiRequest<OwnedAddress[]>(ADDRESSES_URL, { cache: "no-store", signal });
  return response.data;
}

export async function createOwnedAddressRequest(
  input: CreateOwnedAddressInput,
): Promise<OwnedAddress> {
  const response = await apiRequest<OwnedAddress>(ADDRESSES_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateOwnedAddressRequest({
  addressId,
  input,
}: {
  addressId: string;
  input: UpdateOwnedAddressInput;
}): Promise<OwnedAddress> {
  const response = await apiRequest<OwnedAddress>(
    `${ADDRESSES_URL}/${encodeURIComponent(addressId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return response.data;
}

export async function deleteOwnedAddressRequest(addressId: string): Promise<void> {
  await apiRequest<{ id: string }>(`${ADDRESSES_URL}/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
  });
}

export async function listSavedProductIdsRequest(signal?: AbortSignal): Promise<string[]> {
  const response = await apiRequest<string[]>(SAVED_PRODUCTS_URL, { cache: "no-store", signal });
  return response.data;
}

export async function saveProductRequest(productId: string): Promise<void> {
  await apiRequest<{ productId: string }>(SAVED_PRODUCTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId }),
  });
}

export async function removeSavedProductRequest(productId: string): Promise<void> {
  await apiRequest<{ productId: string }>(
    `${SAVED_PRODUCTS_URL}/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
  );
}
