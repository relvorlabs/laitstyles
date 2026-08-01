import "server-only";

import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { runSerializable } from "@/lib/prisma/serializable";
import type { ConsumerSession } from "@/modules/auth/server/session";

const MAX_RECENT_PRODUCTS = 8;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type RecentProductRow = {
  product_id: string;
};

export async function listOwnedRecentProductIds(
  identity: ConsumerSession,
): Promise<string[]> {
  return readOwnedRecentProductIds(prisma, identity.customerId);
}

export async function recordOwnedRecentProductIds(
  identity: ConsumerSession,
  productIds: readonly string[],
): Promise<string[]> {
  const requestedIds = uniqueProductIds(productIds)
    .filter((productId) => uuidPattern.test(productId))
    .slice(0, MAX_RECENT_PRODUCTS);
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

  return runSerializable(async (transaction) => {
      const now = Date.now();
      for (const [index, productId] of acceptedIds.entries()) {
        await transaction.$executeRaw`
          INSERT INTO public.customer_recent_products (
            customer_id,
            product_id,
            viewed_at
          ) VALUES (
            ${identity.customerId}::uuid,
            ${productId}::uuid,
            ${new Date(now - index)}
          )
          ON CONFLICT (customer_id, product_id)
          DO UPDATE SET viewed_at = EXCLUDED.viewed_at
        `;
      }

      await transaction.$executeRaw`
        DELETE FROM public.customer_recent_products AS recent
        WHERE recent.customer_id = ${identity.customerId}::uuid
          AND NOT EXISTS (
            SELECT 1
            FROM public.products AS product
            WHERE product.id = recent.product_id
              AND product.lifecycle = 'active'::public.product_lifecycle
              AND product.publication = 'published'::public.product_publication
          )
      `;

      await transaction.$executeRaw`
        DELETE FROM public.customer_recent_products
        WHERE customer_id = ${identity.customerId}::uuid
          AND product_id NOT IN (
            SELECT product_id
            FROM public.customer_recent_products
            WHERE customer_id = ${identity.customerId}::uuid
            ORDER BY viewed_at DESC, product_id ASC
            LIMIT ${MAX_RECENT_PRODUCTS}
          )
      `;

      return readOwnedRecentProductIds(transaction, identity.customerId);
  });
}

async function readOwnedRecentProductIds(
  client: Pick<Prisma.TransactionClient, "$queryRaw">,
  customerId: string,
): Promise<string[]> {
  const rows = await client.$queryRaw<RecentProductRow[]>`
    SELECT recent.product_id::text AS product_id
    FROM public.customer_recent_products AS recent
    INNER JOIN public.products AS product ON product.id = recent.product_id
    WHERE recent.customer_id = ${customerId}::uuid
      AND product.lifecycle = 'active'::public.product_lifecycle
      AND product.publication = 'published'::public.product_publication
    ORDER BY recent.viewed_at DESC, recent.product_id ASC
    LIMIT ${MAX_RECENT_PRODUCTS}
  `;
  return rows.map((row) => row.product_id);
}

function uniqueProductIds(productIds: readonly string[]): string[] {
  return [...new Set(productIds.map((productId) => productId.trim()).filter(Boolean))];
}
