import "server-only";

import { Prisma, prisma } from "@/lib/prisma";
import { err, ok, type Result } from "@/lib/errors";
import type {
  ProductLifecycleActionError,
  ProductLifecycleActionSuccess,
} from "@/lib/admin/inventory/product-lifecycle-reducer";
import type { StaffSession } from "@/server/auth/session";
import { canStaff, isUuid } from "@/server/commerce/inventory/inventory-rules";

export type LifecycleOutcome = ProductLifecycleActionSuccess & { slug: string };

type ProductTarget = { id: string; name: string; slug: string };

function productNotFound(productId: string): Result<never, ProductLifecycleActionError> {
  return err({
    code: "product-not-found",
    productId,
    message: "The selected product could not be found.",
  });
}

async function findTarget(tx: Prisma.TransactionClient, productId: string): Promise<ProductTarget | null> {
  if (!isUuid(productId)) return null;
  return tx.products.findUnique({
    where: { id: productId },
    select: { id: true, name: true, slug: true },
  });
}

export async function archiveInventoryProduct(
  actor: StaffSession,
  productId: string,
): Promise<Result<LifecycleOutcome, ProductLifecycleActionError>> {
  if (!canStaff(actor, "inventory:archive")) {
    return err({
      code: "product-not-found",
      productId,
      message: "You don't have permission to archive products.",
    });
  }

  const product = await prisma.$transaction(
    async (tx) => {
      const target = await findTarget(tx, productId);
      if (!target) return null;
      await tx.products.update({
        where: { id: target.id },
        data: { lifecycle: "archived", publication: "unpublished", scheduled_at: null },
      });
      await tx.product_channels.deleteMany({ where: { product_id: target.id } });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: "inventory:archive",
          target_table: "products",
          target_id: target.id,
        },
      });
      return target;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  if (!product) return productNotFound(productId);

  return ok({
    productId,
    slug: product.slug,
    deleted: false,
    message: `${product.name} archived and removed from selling channels.`,
  });
}

export async function restoreInventoryProduct(
  actor: StaffSession,
  productId: string,
): Promise<Result<LifecycleOutcome, ProductLifecycleActionError>> {
  if (!canStaff(actor, "inventory:update")) {
    return err({
      code: "product-not-found",
      productId,
      message: "You don't have permission to restore products.",
    });
  }

  const product = await prisma.$transaction(
    async (tx) => {
      const target = await findTarget(tx, productId);
      if (!target) return null;
      await tx.products.update({
        where: { id: target.id },
        data: { lifecycle: "active", publication: "unpublished", scheduled_at: null },
      });
      await tx.audit_events.create({
        data: {
          actor_profile_id: actor.authUserId,
          action: "inventory:restore",
          target_table: "products",
          target_id: target.id,
        },
      });
      return target;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  if (!product) return productNotFound(productId);

  return ok({
    productId,
    slug: product.slug,
    deleted: false,
    message: `${product.name} restored as an unpublished product.`,
  });
}

export async function deleteInventoryProduct(
  actor: StaffSession,
  productId: string,
): Promise<Result<LifecycleOutcome, ProductLifecycleActionError>> {
  if (!canStaff(actor, "inventory:delete")) {
    return err({
      code: "product-not-found",
      productId,
      message: "You don't have permission to delete products.",
    });
  }
  if (!isUuid(productId)) return productNotFound(productId);

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
