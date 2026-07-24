"use client";

import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import {
  archiveProductRequest,
  createProductTaxonomyRequest,
  deleteProductRequest,
  deleteProductTaxonomyRequest,
  getAdminProduct,
  listAdminProducts,
  listProductTaxonomy,
  renameProductTaxonomyRequest,
  restoreProductRequest,
  saveProductRequest,
} from "@/modules/products/client/api";
import { productKeys } from "@/modules/products/client/keys";
import type { AdminProduct, ProductTaxonomyItem } from "@/modules/products/types";

export function adminProductsQueryOptions() {
  return queryOptions({
    queryKey: productKeys.list(),
    queryFn: ({ signal }) => listAdminProducts(signal),
    staleTime: 30_000,
  });
}

export function adminProductQueryOptions(productId: string) {
  return queryOptions({
    queryKey: productKeys.detail(productId),
    queryFn: ({ signal }) => getAdminProduct(productId, signal),
    staleTime: 30_000,
  });
}

export function productTaxonomyQueryOptions() {
  return queryOptions({
    queryKey: productKeys.taxonomy(),
    queryFn: ({ signal }) => listProductTaxonomy(signal),
    staleTime: 30_000,
  });
}

function upsertProductInCache(
  products: AdminProduct[] | undefined,
  product: AdminProduct,
): AdminProduct[] {
  if (!products) return [product];
  const exists = products.some((item) => item.id === product.id);
  return exists
    ? products.map((item) => (item.id === product.id ? product : item))
    : [product, ...products];
}

export function useSaveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveProductRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      const product = result.value.product;
      queryClient.setQueryData(productKeys.list(), (previous?: AdminProduct[]) =>
        upsertProductInCache(previous, product),
      );
      queryClient.setQueryData(productKeys.detail(product.id), product);
      queryClient.invalidateQueries({ queryKey: inventoryKeys.stockMovements(product.id) });
      queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveProductRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: productKeys.list() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(result.value.productId) });
      queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
    },
  });
}

export function useRestoreProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreProductRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: productKeys.list() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(result.value.productId) });
      queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProductRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.setQueryData(productKeys.list(), (previous?: AdminProduct[]) =>
        previous?.filter((entry) => entry.id !== result.value.productId),
      );
      queryClient.removeQueries({ queryKey: productKeys.detail(result.value.productId) });
      queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
    },
  });
}

export function useCreateProductTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProductTaxonomyRequest,
    onSuccess: (result) => {
      if (!result.ok || !result.value.item) return;
      const item = result.value.item;
      queryClient.setQueryData(productKeys.taxonomy(), (previous?: ProductTaxonomyItem[]) => [
        ...(previous?.filter((entry) => entry.id !== item.id) ?? []),
        item,
      ]);
    },
  });
}

export function useRenameProductTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: renameProductTaxonomyRequest,
    onSuccess: (result) => {
      if (!result.ok || !result.value.item) return;
      const item = result.value.item;
      queryClient.setQueryData(productKeys.taxonomy(), (previous?: ProductTaxonomyItem[]) =>
        previous?.map((entry) => (entry.id === item.id ? item : entry)),
      );
      queryClient.invalidateQueries({ queryKey: productKeys.list() });
    },
  });
}

export function useDeleteProductTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProductTaxonomyRequest,
    onSuccess: (result) => {
      if (!result.ok || !result.value.deletedId) return;
      const deletedId = result.value.deletedId;
      queryClient.setQueryData(productKeys.taxonomy(), (previous?: ProductTaxonomyItem[]) =>
        previous?.filter((entry) => entry.id !== deletedId),
      );
    },
  });
}
