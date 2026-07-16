import "server-only";

import type { Prisma } from "@/lib/prisma";

// The single source of the public product-visibility predicate. In this
// single-store application there is no tenant/store filter to supply.
export function publishedProductWhere(now: Date = new Date()): Prisma.productsWhereInput {
  return {
    lifecycle: "active",
    price: { gt: 0 },
    OR: [{ publication: "published" }, { publication: "scheduled", scheduled_at: { lte: now } }],
    product_channels: { some: { channel: "storefront" } },
    product_media: { some: { kind: "product_cover" } },
  };
}
