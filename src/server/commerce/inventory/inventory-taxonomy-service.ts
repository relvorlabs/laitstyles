import "server-only";

import { Prisma, prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/errors";
import type {
  CatalogueTaxonomyActionError,
  CatalogueTaxonomyActionSuccess,
  CatalogueTaxonomyInput,
} from "@/lib/admin/inventory/catalogue-taxonomy";
import type { StaffSession } from "@/server/auth/session";
import {
  decodeTaxonomyId,
  mapTaxonomyRow,
} from "@/server/commerce/inventory/inventory-mappers";
import {
  canStaff,
  clean,
  isUuid,
  slugify,
} from "@/server/commerce/inventory/inventory-rules";

export type TaxonomyOutcome = CatalogueTaxonomyActionSuccess & {
  affectedProductSlugs: string[];
};

export async function createInventoryTaxonomy(
  actor: StaffSession,
  input: CatalogueTaxonomyInput,
): Promise<Result<TaxonomyOutcome, CatalogueTaxonomyActionError>> {
  if (!canStaff(actor, "inventory:update")) {
    return err({
      code: "empty-name",
      message: "You don't have permission to manage catalogue groups.",
    });
  }
  const name = clean(input.name);
  if (!name) return err({ code: "empty-name", message: `Enter a ${input.kind} name.` });
  const slug = slugify(name);

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
      item: mapTaxonomyRow(row, input.kind),
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

export async function renameInventoryTaxonomy(
  actor: StaffSession,
  taxonomyId: string,
  nextName: string,
): Promise<Result<TaxonomyOutcome, CatalogueTaxonomyActionError>> {
  if (!canStaff(actor, "inventory:update")) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "You don't have permission to rename catalogue groups.",
    });
  }
  const decoded = decodeTaxonomyId(taxonomyId);
  if (!decoded || !isUuid(decoded.id)) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "The selected catalogue group could not be found.",
    });
  }
  const name = clean(nextName);
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
          decoded.kind === "category"
            ? { category_id: decoded.id }
            : { collection_id: decoded.id },
        select: { slug: true },
      });
      const row =
        decoded.kind === "category"
          ? await tx.catalogue_categories.update({
              where: { id: decoded.id },
              data: { name, slug: slugify(name) },
            })
          : await tx.catalogue_collections.update({
              where: { id: decoded.id },
              data: { name, slug: slugify(name) },
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
      item: mapTaxonomyRow(outcome.row, decoded.kind),
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

export async function deleteInventoryTaxonomy(
  actor: StaffSession,
  taxonomyId: string,
): Promise<Result<TaxonomyOutcome, CatalogueTaxonomyActionError>> {
  if (!canStaff(actor, "inventory:update")) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "You don't have permission to delete catalogue groups.",
    });
  }
  const decoded = decodeTaxonomyId(taxonomyId);
  if (!decoded || !isUuid(decoded.id)) {
    return err({
      code: "taxonomy-not-found",
      taxonomyId,
      message: "The selected catalogue group could not be found.",
    });
  }

  const usageCount = await prisma.products.count({
    where:
      decoded.kind === "category"
        ? { category_id: decoded.id }
        : { collection_id: decoded.id },
  });
  if (usageCount > 0) {
    return err({
      code: "taxonomy-in-use",
      taxonomyId,
      message: `This ${decoded.kind} is used by ${usageCount} product${usageCount === 1 ? "" : "s"}. Reassign those products before deleting it.`,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
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
    });
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
