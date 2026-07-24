"use server";

import { revalidateTag } from "next/cache";
import {
  catalogueTaxonomyIdSchema,
  catalogueTaxonomyInputSchema,
  catalogueTaxonomyRenameSchema,
  inventoryProductActionSchema,
  inventoryProductIdSchema,
} from "@/lib/admin/inventory/inventory-action-schema";
import type {
  CatalogueTaxonomyActionError,
  CatalogueTaxonomyActionSuccess,
} from "@/lib/admin/inventory/catalogue-taxonomy";
import type {
  ProductLifecycleActionError,
  ProductLifecycleActionSuccess,
} from "@/lib/admin/inventory/product-lifecycle-reducer";
import type {
  ProductEditorActionError,
  ProductEditorActionSuccess,
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
  if (session.kind === "unavailable") throw new Error(session.error);
  return session.kind === "staff" ? session : null;
}

function invalidateCatalogue(slugs: Iterable<string | null | undefined>) {
  revalidateTag("catalogue", "max");
  for (const slug of new Set([...slugs].filter((value): value is string => Boolean(value)))) {
    revalidateTag(`product-${slug}`, "max");
  }
}

export async function saveProductAction(
  values: unknown,
  intent: unknown,
): Promise<Result<ProductEditorActionSuccess, ProductEditorActionError>> {
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "validation-failed",
      message: "You don't have permission to save products.",
    });
  }

  const parsed = inventoryProductActionSchema.safeParse({ values, intent });
  if (!parsed.success) {
    return err({
      code: "validation-failed",
      message: "Review the highlighted product fields and try again.",
    });
  }

  const result = await saveInventoryProduct(actor, parsed.data.values, parsed.data.intent);
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
  value: unknown,
): Promise<Result<ProductLifecycleActionSuccess, ProductLifecycleActionError>> {
  const productId = typeof value === "string" ? value : "";
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "product-not-found",
      productId,
      message: "You don't have permission to manage products.",
    });
  }

  const parsed = inventoryProductIdSchema.safeParse(value);
  if (!parsed.success) {
    return err({
      code: "product-not-found",
      productId,
      message: "The selected product could not be found.",
    });
  }

  const result = await operation(actor, parsed.data);
  if (!result.ok) return result;
  invalidateCatalogue([result.value.slug]);
  const { slug: _slug, ...resultValue } = result.value;
  return { ok: true, value: resultValue };
}

export async function archiveProductAction(productId: unknown) {
  return lifecycleAction(archiveInventoryProduct, productId);
}

export async function restoreProductAction(productId: unknown) {
  return lifecycleAction(restoreInventoryProduct, productId);
}

export async function deleteProductAction(productId: unknown) {
  return lifecycleAction(deleteInventoryProduct, productId);
}

export async function createCatalogueTaxonomyAction(
  input: unknown,
): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>> {
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "empty-name",
      message: "You don't have permission to manage catalogue groups.",
    });
  }

  const parsed = catalogueTaxonomyInputSchema.safeParse(input);
  if (!parsed.success) {
    return err({ code: "empty-name", message: "Enter a valid catalogue group name." });
  }

  const result = await createInventoryTaxonomy(actor, parsed.data);
  if (!result.ok) return result;
  invalidateCatalogue(result.value.affectedProductSlugs);
  const { affectedProductSlugs: _affectedProductSlugs, ...value } = result.value;
  return { ok: true, value };
}

export async function renameCatalogueTaxonomyAction(
  taxonomyId: unknown,
  name: unknown,
): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>> {
  const rawTaxonomyId = typeof taxonomyId === "string" ? taxonomyId : "";
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId: rawTaxonomyId,
      message: "You don't have permission to manage catalogue groups.",
    });
  }

  const parsed = catalogueTaxonomyRenameSchema.safeParse({ taxonomyId, name });
  if (!parsed.success) {
    const invalidId = !catalogueTaxonomyIdSchema.safeParse(taxonomyId).success;
    return invalidId
      ? err({
          code: "taxonomy-not-found",
          taxonomyId: rawTaxonomyId,
          message: "The selected catalogue group could not be found.",
        })
      : err({
          code: "empty-name",
          taxonomyId: rawTaxonomyId,
          message: "Enter a valid catalogue group name.",
        });
  }

  const result = await renameInventoryTaxonomy(actor, parsed.data.taxonomyId, parsed.data.name);
  if (!result.ok) return result;
  invalidateCatalogue(result.value.affectedProductSlugs);
  const { affectedProductSlugs: _affectedProductSlugs, ...value } = result.value;
  return { ok: true, value };
}

export async function deleteCatalogueTaxonomyAction(
  taxonomyId: unknown,
): Promise<Result<CatalogueTaxonomyActionSuccess, CatalogueTaxonomyActionError>> {
  const rawTaxonomyId = typeof taxonomyId === "string" ? taxonomyId : "";
  const actor = await getActor();
  if (!actor) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId: rawTaxonomyId,
      message: "You don't have permission to manage catalogue groups.",
    });
  }

  const parsed = catalogueTaxonomyIdSchema.safeParse(taxonomyId);
  if (!parsed.success) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId: rawTaxonomyId,
      message: "The selected catalogue group could not be found.",
    });
  }

  const result = await deleteInventoryTaxonomy(actor, parsed.data);
  if (!result.ok) return result;
  invalidateCatalogue(result.value.affectedProductSlugs);
  const { affectedProductSlugs: _affectedProductSlugs, ...value } = result.value;
  return { ok: true, value };
}
