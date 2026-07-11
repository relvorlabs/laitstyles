import "server-only";

import type { Prisma } from "@/lib/prisma";

// The single source of the public product-visibility predicate (see
// docs/storefront-v2/03 §4 and 04 §4.1 #5). EVERY storefront-facing catalogue
// read composes this — nothing reads `products` without it. Mirrors the RLS
// policy `products_public_storefront_select` so app-layer authz and RLS agree.
export function publishedProductWhere(
  storeId: string,
  now: Date = new Date(),
): Prisma.productsWhereInput {
  return {
    store_id: storeId,
    lifecycle: "active",
    price: { gt: 0 },
    // published, or a scheduled publication whose time has arrived
    OR: [{ publication: "published" }, { publication: "scheduled", scheduled_at: { lte: now } }],
    // enabled on the storefront channel
    product_channels: { some: { channel: "storefront" } },
    // at least one cover image exists
    product_media: { some: { kind: "product_cover" } },
    // store is active
    stores: { status: "active" },
  };
}
