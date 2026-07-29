"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  createOwnedAddressRequest,
  deleteOwnedAddressRequest,
  getOwnedProfileRequest,
  listOwnedAddressesRequest,
  listSavedProductIdsRequest,
  removeSavedProductRequest,
  saveProductRequest,
  updateOwnedAddressRequest,
  updateOwnedProfileRequest,
} from "@/modules/customers/client/account-api";
import { accountCustomerKeys } from "@/modules/customers/client/account-keys";
import type { OwnedAddress } from "@/modules/customers/types";
import { selectSavedIds, useSavedItemsStore } from "@/stores/saved-items.store";

export function ownedProfileQueryOptions() {
  return queryOptions({
    queryKey: accountCustomerKeys.profile(),
    queryFn: ({ signal }) => getOwnedProfileRequest(signal),
    staleTime: 15_000,
  });
}

export function useUpdateOwnedProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOwnedProfileRequest,
    onSuccess: (profile) => {
      queryClient.setQueryData(accountCustomerKeys.profile(), profile);
    },
  });
}

export function ownedAddressesQueryOptions() {
  return queryOptions({
    queryKey: accountCustomerKeys.addresses(),
    queryFn: ({ signal }) => listOwnedAddressesRequest(signal),
    staleTime: 15_000,
  });
}

export function useCreateOwnedAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOwnedAddressRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountCustomerKeys.addresses() });
    },
  });
}

export function useUpdateOwnedAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateOwnedAddressRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountCustomerKeys.addresses() });
    },
  });
}

export function useDeleteOwnedAddress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOwnedAddressRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountCustomerKeys.addresses() });
    },
  });
}

export function ownedSavedProductIdsQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: accountCustomerKeys.savedProducts(),
    queryFn: ({ signal }) => listSavedProductIdsRequest(signal),
    enabled,
    staleTime: 15_000,
  });
}

export function useSaveOwnedProduct() {
  const queryClient = useQueryClient();
  const save = useSavedItemsStore((state) => state.save);
  return useMutation({
    mutationFn: saveProductRequest,
    onSuccess: (_data, productId) => {
      save(productId);
      queryClient.invalidateQueries({ queryKey: accountCustomerKeys.savedProducts() });
    },
  });
}

export function useRemoveOwnedSavedProduct() {
  const queryClient = useQueryClient();
  const remove = useSavedItemsStore((state) => state.remove);
  return useMutation({
    mutationFn: removeSavedProductRequest,
    onSuccess: (_data, productId) => {
      remove(productId);
      queryClient.invalidateQueries({ queryKey: accountCustomerKeys.savedProducts() });
    },
  });
}

/**
 * Reconciles the browser-owned saved-items store with the authenticated
 * customer's persisted saved products after sign-in. The server list is
 * merged into the local store (never replacing it outright) so items saved
 * as a guest in this browser are not silently dropped. TanStack Query/Prisma
 * remain the source of truth; Zustand only mirrors the union for instant,
 * offline-tolerant toggling in storefront UI.
 */
export function useReconcileSavedProductsOnAuth(authenticated: boolean) {
  const query = useQuery(ownedSavedProductIdsQueryOptions(authenticated));
  const localIds = useSavedItemsStore(selectSavedIds);
  const hydrate = useSavedItemsStore((state) => state.hydrate);

  useEffect(() => {
    if (!authenticated || !query.data) return;
    const merged = new Set([...localIds, ...query.data]);
    if (merged.size === localIds.length && query.data.every((id) => localIds.includes(id))) return;
    hydrate([...merged]);
    // localIds is read but intentionally not a dependency: this effect should
    // only re-run when the server list or auth state changes, not on every
    // local toggle (which would immediately re-trigger this merge).
  }, [authenticated, query.data, hydrate]);
}

export type { OwnedAddress };
