"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  archiveProductAction,
  createCatalogueTaxonomyAction,
  deleteCatalogueTaxonomyAction,
  deleteProductAction,
  renameCatalogueTaxonomyAction,
  restoreProductAction,
  saveProductAction,
} from "@/features/admin/inventory/inventory-actions";
import { inventoryKeys } from "@/lib/admin/inventory/inventory-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type {
  CatalogueTaxonomyItem,
  InventoryProduct,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/admin/shared/types";

function upsertProductInCache(
  products: InventoryProduct[] | undefined,
  product: InventoryProduct,
): InventoryProduct[] {
  if (!products) return [product];
  const exists = products.some((item) => item.id === product.id);
  return exists
    ? products.map((item) => (item.id === product.id ? product : item))
    : [product, ...products];
}

export function useSaveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      values,
      intent,
    }: {
      values: ProductEditorValues;
      intent: ProductEditorIntent;
    }) => saveProductAction(values, intent),
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.setQueryData(
        inventoryKeys.products(),
        (previous?: InventoryProduct[]) =>
          upsertProductInCache(previous, result.value.product),
      );
      queryClient.setQueryData(
        inventoryKeys.product(result.value.product.id),
        result.value.product,
      );
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.stockMovements(result.value.product.id),
      });
      queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: archiveProductAction,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.product(result.value.productId),
      });
      queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
    },
  });
}

export function useRestoreProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: restoreProductAction,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      queryClient.invalidateQueries({
        queryKey: inventoryKeys.product(result.value.productId),
      });
      queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteProductAction,
    onSuccess: (result) => {
      if (!result.ok) return;
      queryClient.setQueryData(
        inventoryKeys.products(),
        (previous?: InventoryProduct[]) =>
          previous?.filter((entry) => entry.id !== result.value.productId),
      );
      queryClient.removeQueries({
        queryKey: inventoryKeys.product(result.value.productId),
      });
      queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
    },
  });
}

export function useCreateCatalogueTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCatalogueTaxonomyAction,
    onSuccess: (result) => {
      if (!result.ok || !result.value.item) return;
      const item = result.value.item;
      queryClient.setQueryData(
        inventoryKeys.taxonomy(),
        (previous?: CatalogueTaxonomyItem[]) => [
          ...(previous?.filter((entry) => entry.id !== item.id) ?? []),
          item,
        ],
      );
    },
  });
}

export function useRenameCatalogueTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      taxonomyId,
      name,
    }: {
      taxonomyId: string;
      name: string;
    }) => renameCatalogueTaxonomyAction(taxonomyId, name),
    onSuccess: (result) => {
      if (!result.ok || !result.value.item) return;
      const item = result.value.item;
      queryClient.setQueryData(
        inventoryKeys.taxonomy(),
        (previous?: CatalogueTaxonomyItem[]) =>
          previous?.map((entry) => (entry.id === item.id ? item : entry)),
      );
      queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
    },
  });
}

export function useDeleteCatalogueTaxonomy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteCatalogueTaxonomyAction,
    onSuccess: (result) => {
      if (!result.ok || !result.value.deletedId) return;
      const deletedId = result.value.deletedId;
      queryClient.setQueryData(
        inventoryKeys.taxonomy(),
        (previous?: CatalogueTaxonomyItem[]) =>
          previous?.filter((entry) => entry.id !== deletedId),
      );
    },
  });
}
