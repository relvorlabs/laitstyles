"use server";

import { revalidateTag } from "next/cache";
import type {
  CatalogueTaxonomyActionError,
  CatalogueTaxonomyActionSuccess,
  CatalogueTaxonomyInput,
} from "@/lib/admin/inventory/catalogue-taxonomy";
import type {
  ProductLifecycleActionError,
  ProductLifecycleActionSuccess,
} from "@/lib/admin/inventory/product-lifecycle-reducer";
import type {
  ProductEditorActionError,
  ProductEditorActionSuccess,
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/admin/product-editor/product-editor-types";
import { err, type Result } from "@/lib/errors";
import { getCurrentSession, type StaffSession } from "@/server/auth/session";
import {
  archiveInventoryProduct,
  createInventoryTaxonomy,
  deleteInventoryProduct,
  deleteInventoryTaxonomy,
  renameInventoryTaxonomy,
  restoreInventoryProduct,
  saveInventoryProduct,
} from "@/server/commerce/inventory/inventory-service";

async function getActor(): Promise<StaffSession | null> {
  const session = await getCurrentSession();
  return session.kind === "staff" ? session : null;
}

function invalidateCatalogue(slugs: Iterable<string | null | undefined>) {
  revalidateTag("catalogue", "max");
  for (const slug of new Set([...slugs].filter((value): value is string => Boolean(value)))) {
    revalidateTag(`product-${slug}`, "max");
  }
}

export async function saveProductAction(
  values: ProductEditorValues,
  intent: ProductEditorIntent,
): Promise<Result<ProductEditorActionSuccess, ProductEditorActionError>> {
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "validation-failed",
      message: "You don't have permission to save products.",
    });
  }
  const result = await saveInventoryProduct(actor, values, intent);
  if (!result.ok) return result;

  invalidateCatalogue([result.value.previousSlug, result.value.product.slug]);
  const { previousSlug: _previousSlug, ...value } = result.value;
  return { ok: true, value };
}

async function lifecycleAction(
  operation: (
    actor: StaffSession,
    productId: string,
  ) => Promise<
    Result<
      ProductLifecycleActionSuccess & { slug: string },
      ProductLifecycleActionError
    >
  >,
  productId: string,
): Promise<Result<ProductLifecycleActionSuccess, ProductLifecycleActionError>> {
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "product-not-found",
      productId,
      message: "You don't have permission to manage products.",
    });
  }
  const result = await operation(actor, productId);
  if (!result.ok) return result;
  invalidateCatalogue([result.value.slug]);
  const { slug: _slug, ...value } = result.value;
  return { ok: true, value };
}

export function archiveProductAction(productId: string) {
  return lifecycleAction(archiveInventoryProduct, productId);
}

export function restoreProductAction(productId: string) {
  return lifecycleAction(restoreInventoryProduct, productId);
}

export function deleteProductAction(productId: string) {
  return lifecycleAction(deleteInventoryProduct, productId);
}

export async function createCatalogueTaxonomyAction(
  input: CatalogueTaxonomyInput,
): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>> {
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "empty-name",
      message: "You don't have permission to manage catalogue groups.",
    });
  }
  const result = await createInventoryTaxonomy(actor, input);
  if (!result.ok) return result;
  invalidateCatalogue(result.value.affectedProductSlugs);
  const { affectedProductSlugs: _affectedProductSlugs, ...value } = result.value;
  return { ok: true, value };
}

export async function renameCatalogueTaxonomyAction(
  taxonomyId: string,
  name: string,
): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>> {
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "You don't have permission to manage catalogue groups.",
    });
  }
  const result = await renameInventoryTaxonomy(actor, taxonomyId, name);
  if (!result.ok) return result;
  invalidateCatalogue(result.value.affectedProductSlugs);
  const { affectedProductSlugs: _affectedProductSlugs, ...value } = result.value;
  return { ok: true, value };
}

export async function deleteCatalogueTaxonomyAction(
  taxonomyId: string,
): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>> {
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "You don't have permission to manage catalogue groups.",
    });
  }
  const result = await deleteInventoryTaxonomy(actor, taxonomyId);
  if (!result.ok) return result;
  invalidateCatalogue(result.value.affectedProductSlugs);
  const { affectedProductSlugs: _affectedProductSlugs, ...value } = result.value;
  return { ok: true, value };
}
