import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import type { StaffSession } from "@/server/auth/session";
import {
  decodeProductTaxonomyId,
  mapProductTaxonomyRow,
} from "@/modules/products/server/mappers";
import {
  canManageProduct,
  cleanProductText,
  isProductId,
  slugifyProductName,
} from "@/modules/products/server/rules";
import type {
  ProductTaxonomyError,
  ProductTaxonomyInput,
  ProductTaxonomyOutcome,
} from "@/modules/products/types";

export async function createProductTaxonomy(
  actor: StaffSession,
  input: ProductTaxonomyInput,
): Promise<Result<ProductTaxonomyOutcome, ProductTaxonomyError>> {
  if (!canManageProduct(actor, "inventory:update")) {
    return err({
      code: "empty-name",
      message: "You don't have permission to manage catalogue groups.",
    });
  }
  const name = cleanProductText(input.name);
  if (!name) return err({ code: "empty-name", message: `Enter a ${input.kind} name.` });
  const slug = slugifyProductName(name);

  try {
    const row = await prisma.$transaction(async (tx) => {
      const created =
        input.kind === "category"
          ? await tx.catalogue_categories.create({ data: { name, slug } })
          : await tx.catalogue_collections.create({ data: { name, slug } });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: `inventory:${input.kind}:create`,
          target_table:
            input.kind === "category" ? "catalogue_categories" : "catalogue_collections",
          target_id: created.id,
        },
      });
      return created;
    });
    return ok({
      item: mapProductTaxonomyRow(row, input.kind),
      message: `${input.kind === "category" ? "Category" : "Collection"} “${name}” created.`,
      affectedProductSlugs: [],
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return err({
        code: "duplicate-name",
        message: `${input.kind === "category" ? "Category" : "Collection"} “${name}” already exists.`,
      });
    }
    throw error;
  }
}

export async function renameProductTaxonomy(
  actor: StaffSession,
  taxonomyId: string,
  nextName: string,
): Promise<Result<ProductTaxonomyOutcome, ProductTaxonomyError>> {
  if (!canManageProduct(actor, "inventory:update")) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "You don't have permission to rename catalogue groups.",
    });
  }
  const decoded = decodeProductTaxonomyId(taxonomyId);
  if (!decoded || !isProductId(decoded.id)) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "The selected catalogue group could not be found.",
    });
  }
  const name = cleanProductText(nextName);
  if (!name) {
    return err({
      code: "empty-name",
      taxonomyId,
      message: `Enter a ${decoded.kind} name.`,
    });
  }

  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const affected = await tx.products.findMany({
        where:
          decoded.kind === "category" ? { category_id: decoded.id } : { collection_id: decoded.id },
        select: { slug: true },
      });
      const row =
        decoded.kind === "category"
          ? await tx.catalogue_categories.update({
              where: { id: decoded.id },
              data: { name, slug: slugifyProductName(name) },
            })
          : await tx.catalogue_collections.update({
              where: { id: decoded.id },
              data: { name, slug: slugifyProductName(name) },
            });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: `inventory:${decoded.kind}:rename`,
          target_table:
            decoded.kind === "category" ? "catalogue_categories" : "catalogue_collections",
          target_id: decoded.id,
        },
      });
      return { row, affectedProductSlugs: affected.map(({ slug }) => slug) };
    });
    return ok({
      item: mapProductTaxonomyRow(outcome.row, decoded.kind),
      message: `${decoded.kind === "category" ? "Category" : "Collection"} renamed to “${name}”.`,
      affectedProductSlugs: outcome.affectedProductSlugs,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return err({
          code: "duplicate-name",
          taxonomyId,
          message: `${decoded.kind === "category" ? "Category" : "Collection"} “${name}” already exists.`,
        });
      }
      if (error.code === "P2025") {
        return err({
          code: "taxonomy-not-found",
          taxonomyId,
          message: "The selected catalogue group could not be found.",
        });
      }
    }
    throw error;
  }
}

export async function deleteProductTaxonomy(
  actor: StaffSession,
  taxonomyId: string,
): Promise<Result<ProductTaxonomyOutcome, ProductTaxonomyError>> {
  if (!canManageProduct(actor, "inventory:update")) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "You don't have permission to delete catalogue groups.",
    });
  }
  const decoded = decodeProductTaxonomyId(taxonomyId);
  if (!decoded || !isProductId(decoded.id)) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "The selected catalogue group could not be found.",
    });
  }

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        const usageCount = await tx.products.count({
          where:
            decoded.kind === "category"
              ? { category_id: decoded.id }
              : { collection_id: decoded.id },
        });
        if (usageCount > 0) return { kind: "in-use" as const, usageCount };

        if (decoded.kind === "category") {
          await tx.catalogue_categories.delete({ where: { id: decoded.id } });
        } else {
          await tx.catalogue_collections.delete({ where: { id: decoded.id } });
        }
        await tx.audit_events.create({
          data: {
            actor_profile_id: actor.authUserId,
            action: `inventory:${decoded.kind}:delete`,
            target_table:
              decoded.kind === "category" ? "catalogue_categories" : "catalogue_collections",
            target_id: decoded.id,
          },
        });
        return { kind: "deleted" as const };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (outcome.kind === "in-use") {
      return err({
        code: "taxonomy-in-use",
        taxonomyId,
        message: `This ${decoded.kind} is used by ${outcome.usageCount} product${outcome.usageCount === 1 ? "" : "s"}. Reassign those products before deleting it.`,
      });
    }

    return ok({
      deletedId: taxonomyId,
      message: `${decoded.kind === "category" ? "Category" : "Collection"} deleted.`,
      affectedProductSlugs: [],
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return err({
        code: "taxonomy-not-found",
        taxonomyId,
        message: "The selected catalogue group could not be found.",
      });
    }
    throw error;
  }
}
