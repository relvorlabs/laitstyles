import type { Prisma } from "@/lib/prisma";

// Pure builder for the public product-visibility predicate. Repository modules
// remain server-only; keeping this function side-effect free lets query-contract
// tests verify the exact Prisma predicate without opening a database connection.
export function publishedProductWhere(now: Date = new Date()): Prisma.productsWhereInput {
  return {
    lifecycle: "active",
    price: { gt: 0 },
    OR: [
      { publication: "published" },
      { publication: "scheduled", scheduled_at: { lte: now } },
    ],
    product_channels: { some: { channel: "storefront" } },
    product_media: { some: { kind: "product_cover" } },
  };
}
