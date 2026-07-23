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

async function getTarget(productId: string) {
  if (!isUuid(productId)) return null;
  return prisma.products.findUnique({
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
  const product = await getTarget(productId);
  if (!product) {
    return err({
      code: "product-not-found",
      productId,
      message: "The selected product could not be found.",
    });
  }
  await prisma.$transaction(async (tx) => {
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
  });
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
  const product = await getTarget(productId);
  if (!product) {
    return err({
      code: "product-not-found",
      productId,
      message: "The selected product could not be found.",
    });
  }
  await prisma.$transaction(async (tx) => {
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
  });
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
  const product = await getTarget(productId);
  if (!product) {
    return err({
      code: "product-not-found",
      productId,
      message: "The selected product could not be found.",
    });
  }

  const dependencies = await Promise.all([
    prisma.order_lines.count({ where: { product_id: productId } }),
    prisma.holds.count({ where: { product_id: productId } }),
    prisma.stock_movements.count({ where: { product_id: productId } }),
    prisma.customer_saved_products.count({ where: { product_id: productId } }),
  ]);
  if (dependencies.some((count) => count > 0)) {
    return err({
      code: "product-in-use",
      productId,
      message: `${product.name} has order, hold, stock or customer history. Archive it instead.`,
    });
  }

  try {
    await prisma.$transaction(async (tx) => {
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
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return err({
        code: "product-in-use",
        productId,
        message: `${product.name} has operational history. Archive it instead.`,
      });
    }
    throw error;
  }

  return ok({
    productId,
    slug: product.slug,
    deleted: true,
    message: `${product.name} permanently deleted.`,
  });
}
