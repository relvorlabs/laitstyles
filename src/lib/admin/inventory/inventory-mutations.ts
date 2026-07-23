"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAdmin } from "@/features/admin/state/admin-provider";
import { inventoryKeys } from "@/lib/admin/inventory/inventory-query-keys";
import { overviewKeys } from "@/lib/admin/shared/overview-query-keys";
import type {
  CatalogueTaxonomyInput,
  CatalogueTaxonomyItem,
  IntakeStage,
  InventoryProduct,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/admin/shared/types";

function upsertProductInCache(previous: InventoryProduct[] | undefined, product: InventoryProduct) {
  if (!previous) return previous;
  const withoutExisting = previous.filter((entry) => entry.id !== product.id);
  return [product, ...withoutExisting];
}

export function useSaveProduct() {
  const { saveProduct } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      values,
      intent,
    }: {
      values: ProductEditorValues;
      intent: ProductEditorIntent;
    }) => Promise.resolve(saveProduct(values, intent)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), (previous?: InventoryProduct[]) =>
          upsertProductInCache(previous, result.value.product),
        );
        queryClient.setQueryData(
          inventoryKeys.product(result.value.product.id),
          result.value.product,
        );
        // Saving a product can change Overview's low-stock/unpublished sections.
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useArchiveProduct() {
  const { archiveProduct } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => Promise.resolve(archiveProduct(productId)),
    onSuccess: (result) => {
      if (result.ok) {
        // The reducer returns only { productId, deleted, message } -- no
        // updated product -- so there's nothing authoritative to patch with;
        // invalidate instead of guessing at the new lifecycle/publication state.
        queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.product(result.value.productId) });
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useRestoreProduct() {
  const { restoreProduct } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => Promise.resolve(restoreProduct(productId)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
        queryClient.invalidateQueries({ queryKey: inventoryKeys.product(result.value.productId) });
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useDeleteProduct() {
  const { deleteProduct } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productId: string) => Promise.resolve(deleteProduct(productId)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), (previous?: InventoryProduct[]) =>
          previous?.filter((entry) => entry.id !== result.value.productId),
        );
        queryClient.removeQueries({ queryKey: inventoryKeys.product(result.value.productId) });
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useTransitionIntake() {
  const { transitionIntake } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, nextStage }: { productId: string; nextStage: IntakeStage }) =>
      Promise.resolve(transitionIntake(productId, nextStage)),
    onSuccess: (result) => {
      if (result.ok) {
        queryClient.setQueryData(inventoryKeys.products(), (previous?: InventoryProduct[]) =>
          upsertProductInCache(previous, result.value.product),
        );
        queryClient.setQueryData(
          inventoryKeys.product(result.value.product.id),
          result.value.product,
        );
        // A stage change can flip lifecycle/publication, which Overview's
        // unpublished-products section reads.
        queryClient.invalidateQueries({ queryKey: overviewKeys.overview() });
      }
    },
  });
}

export function useCreateCatalogueTaxonomy() {
  const { createCatalogueTaxonomy } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CatalogueTaxonomyInput) => Promise.resolve(createCatalogueTaxonomy(input)),
    onSuccess: (result) => {
      if (result.ok && result.value.item) {
        const item = result.value.item;
        queryClient.setQueryData(inventoryKeys.taxonomy(), (previous?: CatalogueTaxonomyItem[]) => [
          ...(previous?.filter((entry) => entry.id !== item.id) ?? []),
          item,
        ]);
      }
    },
  });
}

export function useRenameCatalogueTaxonomy() {
  const { renameCatalogueTaxonomy } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ taxonomyId, name }: { taxonomyId: string; name: string }) =>
      Promise.resolve(renameCatalogueTaxonomy(taxonomyId, name)),
    onSuccess: (result) => {
      if (result.ok && result.value.item) {
        const item = result.value.item;
        queryClient.setQueryData(inventoryKeys.taxonomy(), (previous?: CatalogueTaxonomyItem[]) =>
          previous?.map((entry) => (entry.id === item.id ? item : entry)),
        );
        // Renaming a category/collection also renames it on every connected
        // product -- no authoritative product list comes back, so invalidate.
        queryClient.invalidateQueries({ queryKey: inventoryKeys.products() });
      }
    },
  });
}

export function useDeleteCatalogueTaxonomy() {
  const { deleteCatalogueTaxonomy } = useAdmin();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taxonomyId: string) => Promise.resolve(deleteCatalogueTaxonomy(taxonomyId)),
    onSuccess: (result) => {
      if (result.ok && result.value.deletedId) {
        const deletedId = result.value.deletedId;
        queryClient.setQueryData(inventoryKeys.taxonomy(), (previous?: CatalogueTaxonomyItem[]) =>
          previous?.filter((entry) => entry.id !== deletedId),
        );
      }
    },
  });
}
