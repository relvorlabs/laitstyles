import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";

export async function listOwnedSavedProductIds(identity: ConsumerSession): Promise<string[]> {
  const rows = await prisma.customer_saved_products.findMany({
    where: { customer_id: identity.customerId },
    select: { product_id: true },
    orderBy: { created_at: "desc" },
  });
  return rows.map((row) => row.product_id);
}

export async function saveOwnedProduct(
  identity: ConsumerSession,
  productId: string,
): Promise<void> {
  const product = await prisma.products.findUnique({
    where: { id: productId },
    select: { id: true },
  });
  if (!product) {
    throw new ApiError({
      code: "PRODUCT_NOT_FOUND",
      message: "The selected product could not be found.",
      status: 404,
    });
  }

  await prisma.customer_saved_products.upsert({
    where: {
      customer_id_product_id: { customer_id: identity.customerId, product_id: productId },
    },
    update: {},
    create: { customer_id: identity.customerId, product_id: productId },
  });
}

export async function removeOwnedSavedProduct(
  identity: ConsumerSession,
  productId: string,
): Promise<void> {
  await prisma.customer_saved_products.deleteMany({
    where: { customer_id: identity.customerId, product_id: productId },
  });
}
