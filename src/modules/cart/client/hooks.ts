"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  clearOwnedCartRequest,
  getOwnedCartRequest,
  mergeOwnedCartRequest,
  replaceOwnedCartRequest,
} from "@/modules/cart/client/http";
import { ownedCartKeys } from "@/modules/cart/client/keys";
import type { OwnedCartSnapshot } from "@/modules/cart/types";

export function ownedCartQueryOptions(enabled = true, identityKey = "current") {
  return queryOptions({
    queryKey: ownedCartKeys.detail(identityKey),
    queryFn: ({ signal }) => getOwnedCartRequest(signal),
    enabled,
    staleTime: 5_000,
  });
}

export function useReplaceOwnedCart(identityKey = "current") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replaceOwnedCartRequest,
    onSuccess: (cart) => queryClient.setQueryData(ownedCartKeys.detail(identityKey), cart),
  });
}

export function useMergeOwnedCart(identityKey = "current") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mergeOwnedCartRequest,
    onSuccess: (cart) => queryClient.setQueryData(ownedCartKeys.detail(identityKey), cart),
  });
}

export function useClearOwnedCart(identityKey = "current") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearOwnedCartRequest,
    onSuccess: (cart) =>
      queryClient.setQueryData<OwnedCartSnapshot>(ownedCartKeys.detail(identityKey), cart),
  });
}
