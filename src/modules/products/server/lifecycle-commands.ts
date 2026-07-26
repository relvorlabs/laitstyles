import "server-only";

import { err, ok, type Result } from "@/lib/errors";
import { Prisma, prisma } from "@/lib/prisma";
import { canManageProduct, isProductId } from "@/modules/products/server/rules";
import type { ProductLifecycleError, ProductLifecycleOutcome } from "@/modules/products/types";
import type { StaffSession } from "@/server/auth/session";

type ProductTarget = { id: string; name: string; slug: string };

function productNotFound(productId: string): Result<never, ProductLifecycleError> {
  return err({
    code: "product-not-found",
    productId,
    message: "The selected product could not be found.",
  });
}

async function getTarget(productId: string): Promise<ProductTarget | null> {
  if (!isProductId(productId)) return null;
  return prisma.products.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true },
  });
}

async function findTarget(tx: Prisma.TransactionClient, productId: string) {
  return tx.products.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true },
  });
}

export async function archiveProduct(
  actor: StaffSession,
  productId: string,
): Promise<Result<ProductLifecycleOutcome, ProductLifecycleError>> {
  if (!canManageProduct(actor, "inventory:archive")) {
    return err({
      code: "product-not-found",
      productId,
      message: "You don't have permission to archive products.",
    });
  }
  const product = await getTarget(productId);
  if (!product) return productNotFound(productId);

  await prisma.$transaction(
    async (tx) => {
      await tx.products.update({
        where: { id: product.id },
        data: { lifecycle: "archived", publication: "unpublished", scheduled_at: null },
      });
      await tx.product_channels.deleteMany({ where: { product_id: product.id } });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: "inventory:archive",
          target_table: "products",
          target_id: product.id,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  return ok({
    productId,
    slug: product.slug,
    deleted: false,
    message: `${product.name} archived and removed from selling channels.`,
  });
}

export async function restoreProduct(
  actor: StaffSession,
  productId: string,
): Promise<Result<ProductLifecycleOutcome, ProductLifecycleError>> {
  if (!canManageProduct(actor, "inventory:update")) {
    return err({
      code: "product-not-found",
      productId,
      message: "You don't have permission to restore products.",
    });
  }
  const product = await getTarget(productId);
  if (!product) return productNotFound(productId);

  await prisma.$transaction(
    async (tx) => {
      await tx.products.update({
        where: { id: product.id },
        data: { lifecycle: "active", publication: "unpublished", scheduled_at: null },
      });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: "inventory:restore",
          target_table: "products",
          target_id: product.id,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  return ok({
    productId,
    slug: product.slug,
    deleted: false,
    message: `${product.name} restored as an unpublished product.`,
  });
}

export async function deleteProduct(
  actor: StaffSession,
  productId: string,
): Promise<Result<ProductLifecycleOutcome, ProductLifecycleError>> {
  if (!canManageProduct(actor, "inventory:delete")) {
    return err({
      code: "product-not-found",
      productId,
      message: "You don't have permission to delete products.",
    });
  }
  if (!isProductId(productId)) return productNotFound(productId);

  try {
    const outcome = await prisma.$transaction(
      async (tx) => {
        const product = await findTarget(tx, productId);
        if (!product) return { kind: "missing" as const };

        const dependencies = await Promise.all([
          tx.order_lines.count({ where: { product_id: productId } }),
          tx.holds.count({ where: { product_id: productId } }),
          tx.stock_movements.count({ where: { product_id: productId } }),
          tx.customer_saved_products.count({ where: { product_id: productId } }),
        ]);
        if (dependencies.some((count) => count > 0)) {
          return { kind: "in-use" as const, product };
        }

        await tx.products.delete({ where: { id: productId } });
        await tx.audit_events.create({
          data: {
            actor_profile_id: actor.authUserId,
            action: "inventory:delete",
            target_table: "products",
            target_id: productId,
            metadata: { slug: product.slug, name: product.name },
          },
        });
        return { kind: "deleted" as const, product };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    if (outcome.kind === "missing") return productNotFound(productId);
    if (outcome.kind === "in-use") {
      return err({
        code: "product-in-use",
        productId,
        message: `${outcome.product.name} has order, hold, stock or customer history. Archive it instead.`,
      });
    }

    return ok({
      productId,
      slug: outcome.product.slug,
      deleted: true,
      message: `${outcome.product.name} permanently deleted.`,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return err({
        code: "product-in-use",
        productId,
        message: "This product has operational history. Archive it instead.",
      });
    }
    throw error;
  }
}
