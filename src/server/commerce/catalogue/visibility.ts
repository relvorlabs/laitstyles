import "server-only";

import type { Prisma } from "@/lib/prisma";

// The single source of the public product-visibility predicate. Cached callers
// intentionally evaluate the default clock when their `use cache` entry is
// filled. With cacheLife("minutes"), scheduled publication therefore becomes
// visible on catalogue cache refresh (or explicit catalogue invalidation), not
// at an exact request-time boundary. Do not call connection() in those scopes.
export function publishedProductWhere(now: Date = new Date()): Prisma.productsWhereInput {
  return {
    lifecycle: "active",
    price: { gt: 0 },
    OR: [{ publication: "published" }, { publication: "scheduled", scheduled_at: { lte: now } }],
    product_channels: { some: { channel: "storefront" } },
    product_media: { some: { kind: "product_cover" } },
  };
}
