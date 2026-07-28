"use client";

import { type QueryClient, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryKeys } from "@/modules/inventory/client/keys";
import { overviewKeys } from "@/modules/overview/client/keys";
import {
  archiveProductRequest,
  createProductTaxonomyRequest,
  deleteProductRequest,
  deleteProductTaxonomyRequest,
  getAdminProduct,
  listAdminProducts,
  listProductTaxonomy,
  renameProductTaxonomyRequest,
  reorderProductTaxonomyRequest,
  restoreProductRequest,
  saveProductRequest,
  updateProductTaxonomyRequest,
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

function invalidateInventory(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  queryClient.invalidateQueries({ queryKey: overviewKeys.all });
}

function invalidateTaxonomyDependencies(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: productKeys.taxonomy() });
  queryClient.invalidateQueries({ queryKey: productKeys.list() });
  queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
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
      invalidateInventory(queryClient);
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
      invalidateInventory(queryClient);
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
      invalidateInventory(queryClient);
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
      invalidateInventory(queryClient);
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
      invalidateTaxonomyDependencies(queryClient);
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
      invalidateTaxonomyDependencies(queryClient);
    },
  });
}

export function useUpdateProductTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProductTaxonomyRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      invalidateTaxonomyDependencies(queryClient);
    },
  });
}

export function useReorderProductTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reorderProductTaxonomyRequest,
    onSuccess: (result) => {
      if (!result.ok) return;
      invalidateTaxonomyDependencies(queryClient);
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
      invalidateTaxonomyDependencies(queryClient);
    },
  });
}
