import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import type { StaffSession } from "@/modules/auth/server/session";
import {
  categoryTaxonomyInclude,
  collectionTaxonomyInclude,
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
  ProductTaxonomyReorderInput,
  ProductTaxonomyUpdateInput,
} from "@/modules/products/types";

class TaxonomyRuleViolation extends Error {
  constructor(readonly taxonomyError: ProductTaxonomyError) {
    super(taxonomyError.message);
  }
}

function taxonomyNotFound(taxonomyId?: string, message?: string): ProductTaxonomyError {
  return {
    code: "taxonomy-not-found",
    ...(taxonomyId ? { taxonomyId } : {}),
    message: message ?? "The selected catalogue group could not be found.",
  };
}

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

export async function updateProductTaxonomy(
  actor: StaffSession,
  taxonomyId: string,
  input: ProductTaxonomyUpdateInput,
): Promise<Result<ProductTaxonomyOutcome, ProductTaxonomyError>> {
  if (!canManageProduct(actor, "inventory:update")) {
    return err(taxonomyNotFound(taxonomyId, "You don't have permission to update catalogue groups."));
  }
  const decoded = decodeProductTaxonomyId(taxonomyId);
  if (!decoded || !isProductId(decoded.id) || decoded.kind !== input.kind) {
    return err(taxonomyNotFound(taxonomyId));
  }
  const name = cleanProductText(input.name);
  if (!name) {
    return err({
      code: "empty-name",
      taxonomyId,
      message: `Enter a ${decoded.kind} name.`,
    });
  }
  if (!Number.isInteger(input.position) || input.position < 0) {
    return err(taxonomyNotFound(taxonomyId, "The catalogue group position is invalid."));
  }
  if (
    input.kind === "collection" &&
    (new Set(input.productIds).size !== input.productIds.length ||
      input.productIds.some((id) => !isProductId(id)))
  ) {
    return err(taxonomyNotFound(taxonomyId, "One or more selected products could not be found."));
  }

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        if (input.kind === "category") {
          const affected = await tx.products.findMany({
            where: { category_id: decoded.id },
            select: { slug: true },
          });
          const row = await tx.catalogue_categories.update({
            where: { id: decoded.id },
            data: {
              name,
              slug: slugifyProductName(name),
              image_url: input.imageUrl?.trim() || null,
              position: input.position,
            },
            include: categoryTaxonomyInclude,
          });
          await tx.audit_events.create({
            data: {
              actor_profile_id: actor.authUserId,
              action: "inventory:category:update",
              target_table: "catalogue_categories",
              target_id: decoded.id,
            },
          });
          return { row, affectedProductSlugs: affected.map(({ slug }) => slug) };
        }

        const targetCollection = await tx.catalogue_collections.findUnique({
          where: { id: decoded.id },
          select: { id: true },
        });
        if (!targetCollection) {
          throw new TaxonomyRuleViolation(taxonomyNotFound(taxonomyId));
        }
        const currentProducts = await tx.products.findMany({
          where: { collection_id: decoded.id },
          select: { id: true, slug: true, collection_id: true },
        });
        const selectedProducts = input.productIds.length
          ? await tx.products.findMany({
              where: { id: { in: input.productIds } },
              select: { id: true, slug: true, collection_id: true },
            })
          : [];
        if (selectedProducts.length !== input.productIds.length) {
          throw new TaxonomyRuleViolation(
            taxonomyNotFound(taxonomyId, "One or more selected products could not be found."),
          );
        }

        await tx.products.updateMany({
          where: { collection_id: decoded.id, id: { notIn: input.productIds } },
          data: { collection_id: null },
        });
        if (input.productIds.length) {
          await tx.products.updateMany({
            where: { id: { in: input.productIds } },
            data: { collection_id: decoded.id },
          });
        }
        const row = await tx.catalogue_collections.update({
          where: { id: decoded.id },
          data: { name, slug: slugifyProductName(name), position: input.position },
          include: collectionTaxonomyInclude,
        });
        await tx.audit_events.create({
          data: {
            actor_profile_id: actor.authUserId,
            action: "inventory:collection:update",
            target_table: "catalogue_collections",
            target_id: decoded.id,
          },
        });
        return {
          row,
          affectedProductSlugs: [
            ...new Set([...currentProducts, ...selectedProducts].map(({ slug }) => slug)),
          ],
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok({
      item: mapProductTaxonomyRow(outcome.row, decoded.kind),
      message: `${decoded.kind === "category" ? "Category" : "Collection"} “${name}” updated.`,
      affectedProductSlugs: outcome.affectedProductSlugs,
    });
  } catch (error) {
    if (error instanceof TaxonomyRuleViolation) return err(error.taxonomyError);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return err({
          code: "duplicate-name",
          taxonomyId,
          message: `${decoded.kind === "category" ? "Category" : "Collection"} “${name}” already exists.`,
        });
      }
      if (error.code === "P2025") return err(taxonomyNotFound(taxonomyId));
    }
    throw error;
  }
}

export async function reorderProductTaxonomy(
  actor: StaffSession,
  input: ProductTaxonomyReorderInput,
): Promise<Result<ProductTaxonomyOutcome, ProductTaxonomyError>> {
  if (!canManageProduct(actor, "inventory:update")) {
    return err(taxonomyNotFound(undefined, "You don't have permission to reorder catalogue groups."));
  }
  const decodedIds = input.orderedIds.map((taxonomyId) => decodeProductTaxonomyId(taxonomyId));
  if (
    decodedIds.some(
      (decoded) => !decoded || decoded.kind !== input.kind || !isProductId(decoded.id),
    )
  ) {
    return err(taxonomyNotFound(undefined, "The catalogue group order is invalid."));
  }
  const databaseIds = decodedIds.map((decoded) => decoded?.id ?? "");
  if (new Set(databaseIds).size !== databaseIds.length) {
    return err(taxonomyNotFound(undefined, "The catalogue group order contains duplicates."));
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const currentRows =
          input.kind === "category"
            ? await tx.catalogue_categories.findMany({ select: { id: true } })
            : await tx.catalogue_collections.findMany({ select: { id: true } });
        const submitted = new Set(databaseIds);
        if (
          currentRows.length !== databaseIds.length ||
          currentRows.some(({ id }) => !submitted.has(id))
        ) {
          throw new TaxonomyRuleViolation(
            taxonomyNotFound(undefined, "The catalogue group order is out of date."),
          );
        }

        for (const [position, id] of databaseIds.entries()) {
          if (input.kind === "category") {
            await tx.catalogue_categories.update({ where: { id }, data: { position } });
          } else {
            await tx.catalogue_collections.update({ where: { id }, data: { position } });
          }
        }
        await tx.audit_events.create({
          data: {
            actor_profile_id: actor.authUserId,
            action: `inventory:${input.kind}:reorder`,
            target_table:
              input.kind === "category" ? "catalogue_categories" : "catalogue_collections",
            metadata: { orderedIds: databaseIds },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return ok({
      message: `${input.kind === "category" ? "Category" : "Collection"} order updated.`,
      affectedProductSlugs: [],
    });
  } catch (error) {
    if (error instanceof TaxonomyRuleViolation) return err(error.taxonomyError);
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
