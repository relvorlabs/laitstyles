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

export function ownedCartQueryOptions(enabled = true) {
  return queryOptions({
    queryKey: ownedCartKeys.detail(),
    queryFn: ({ signal }) => getOwnedCartRequest(signal),
    enabled,
    staleTime: 5_000,
  });
}

export function useReplaceOwnedCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replaceOwnedCartRequest,
    onSuccess: (cart) => queryClient.setQueryData(ownedCartKeys.detail(), cart),
  });
}

export function useMergeOwnedCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mergeOwnedCartRequest,
    onSuccess: (cart) => queryClient.setQueryData(ownedCartKeys.detail(), cart),
  });
}

export function useClearOwnedCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearOwnedCartRequest,
    onSuccess: (cart) => queryClient.setQueryData<OwnedCartSnapshot>(ownedCartKeys.detail(), cart),
  });
}
