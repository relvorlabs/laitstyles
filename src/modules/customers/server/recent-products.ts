import "server-only";

import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";

const RECENT_PRODUCT_EVENT = "storefront.product.viewed";
const MAX_RECENT_PRODUCTS = 8;
const RECENT_EVENT_SCAN_LIMIT = 64;

export async function listOwnedRecentProductIds(
  identity: ConsumerSession,
): Promise<string[]> {
  const rows = await prisma.activity_events.findMany({
    where: {
      customer_id: identity.customerId,
      kind: RECENT_PRODUCT_EVENT,
      product_id: { not: null },
    },
    select: { product_id: true },
    orderBy: { occurred_at: "desc" },
    take: RECENT_EVENT_SCAN_LIMIT,
  });

  return uniqueProductIds(
    rows.flatMap((row) => (row.product_id ? [row.product_id] : [])),
  ).slice(0, MAX_RECENT_PRODUCTS);
}

export async function recordOwnedRecentProductIds(
  identity: ConsumerSession,
  productIds: readonly string[],
): Promise<string[]> {
  const requestedIds = uniqueProductIds(productIds).slice(0, MAX_RECENT_PRODUCTS);
  if (requestedIds.length === 0) return listOwnedRecentProductIds(identity);

  const publishedRows = await prisma.products.findMany({
    where: {
      id: { in: requestedIds },
      lifecycle: "active",
      publication: "published",
    },
    select: { id: true },
  });
  const publishedIds = new Set(publishedRows.map((row) => row.id));
  const acceptedIds = requestedIds.filter((productId) => publishedIds.has(productId));
  if (acceptedIds.length === 0) return listOwnedRecentProductIds(identity);

  return prisma.$transaction(async (transaction) => {
    await transaction.activity_events.deleteMany({
      where: {
        customer_id: identity.customerId,
        kind: RECENT_PRODUCT_EVENT,
        product_id: { in: acceptedIds },
      },
    });

    const now = Date.now();
    await transaction.activity_events.createMany({
      data: acceptedIds.map((productId, index) => ({
        kind: RECENT_PRODUCT_EVENT,
        title: "Storefront product viewed",
        customer_id: identity.customerId,
        product_id: productId,
        occurred_at: new Date(now - index),
      })),
    });

    const rows = await transaction.activity_events.findMany({
      where: {
        customer_id: identity.customerId,
        kind: RECENT_PRODUCT_EVENT,
        product_id: { not: null },
      },
      select: { id: true, product_id: true },
      orderBy: { occurred_at: "desc" },
      take: RECENT_EVENT_SCAN_LIMIT,
    });
    const canonicalIds = uniqueProductIds(
      rows.flatMap((row) => (row.product_id ? [row.product_id] : [])),
    );
    const retainedIds = new Set(canonicalIds.slice(0, MAX_RECENT_PRODUCTS));
    const staleEventIds = rows
      .filter((row) => !row.product_id || !retainedIds.has(row.product_id))
      .map((row) => row.id);

    if (staleEventIds.length > 0) {
      await transaction.activity_events.deleteMany({ where: { id: { in: staleEventIds } } });
    }

    return canonicalIds.slice(0, MAX_RECENT_PRODUCTS);
  });
}

function uniqueProductIds(productIds: readonly string[]): string[] {
  return [...new Set(productIds.filter((productId) => productId.trim().length > 0))];
}
