import type {
  InventoryAttentionReason,
  InventoryCounts,
  InventoryFacetOptions,
  InventoryHealth,
  InventoryListItem,
  InventoryProduct,
  InventorySummary,
  ProductMedia,
} from "@/lib/control-room/inventory-types";

const emptyStock: InventoryCounts = {
  totalReceived: 0,
  available: 0,
  reserved: 0,
  sold: 0,
  returned: 0,
  damaged: 0,
};

export function getProductStock(product: InventoryProduct): InventoryCounts {
  if (product.inventoryMode !== "variant") return product.stock;

  return product.variants.reduce<InventoryCounts>(
    (total, variant) => ({
      totalReceived: total.totalReceived + variant.stock.totalReceived,
      available: total.available + variant.stock.available,
      reserved: total.reserved + variant.stock.reserved,
      sold: total.sold + variant.stock.sold,
      returned: total.returned + variant.stock.returned,
      damaged: total.damaged + variant.stock.damaged,
    }),
    emptyStock,
  );
}

export function getProductCover(product: InventoryProduct): ProductMedia {
  return (
    product.media.find((item) => item.kind === "cover") ??
    product.media[0] ?? {
      id: `${product.id}-fallback`,
      url: product.image,
      alt: product.name,
      kind: "cover",
      position: 0,
    }
  );
}

export function getProductReference(product: InventoryProduct) {
  if (product.inventoryMode === "unique") return product.archiveNumber;
  if (product.inventoryMode === "stocked") return product.sku;
  return `${product.variants.length} variants`;
}

export function getInventoryAttention(product: InventoryProduct): InventoryAttentionReason[] {
  const counts = getProductStock(product);
  const reasons: InventoryAttentionReason[] = [];

  if (isLowStock(product, counts)) reasons.push("low-stock");
  if (isOutOfStock(product, counts)) reasons.push("out-of-stock");
  if (counts.damaged > 0) reasons.push("damaged-stock");
  if (counts.returned > 0) reasons.push("returned-stock");
  if (product.publication !== "published") reasons.push("unpublished");
  if (product.lifecycle === "draft") reasons.push("draft");
  if (product.lifecycle === "intake") reasons.push("intake");

  return reasons;
}

export function getInventoryHealth(product: InventoryProduct): InventoryHealth {
  const counts = getProductStock(product);

  if (product.lifecycle === "archived") return "archived";
  if (product.lifecycle === "draft") return "draft";
  if (product.lifecycle === "intake") return "intake";
  if (product.publication !== "published") return "unpublished";
  if (counts.available === 0 && counts.reserved > 0) return "held";
  if (isFullySold(counts)) return "sold";
  if (isOutOfStock(product, counts)) return "out-of-stock";
  if (isLowStock(product, counts)) return "low-stock";
  return "healthy";
}

export function toInventoryListItem(product: InventoryProduct): InventoryListItem {
  return {
    product,
    coverImage: getProductCover(product),
    reference: getProductReference(product),
    stock: getProductStock(product),
    health: getInventoryHealth(product),
    attention: getInventoryAttention(product),
    variantCount: product.inventoryMode === "variant" ? product.variants.length : 0,
  };
}

export function getInventorySummary(products: InventoryProduct[]): InventorySummary {
  const summary: InventorySummary = {
    totalProducts: 0,
    liveProducts: 0,
    availableUnits: 0,
    reservedUnits: 0,
    soldUnits: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    intakeProducts: 0,
  };

  for (const product of products) {
    const item = toInventoryListItem(product);
    summary.totalProducts += 1;
    summary.availableUnits += item.stock.available;
    summary.reservedUnits += item.stock.reserved;
    summary.soldUnits += item.stock.sold;

    if (
      product.lifecycle === "active" &&
      product.publication === "published" &&
      item.stock.available > 0
    ) {
      summary.liveProducts += 1;
    }
    if (item.attention.includes("low-stock")) summary.lowStockProducts += 1;
    if (item.attention.includes("out-of-stock")) {
      summary.outOfStockProducts += 1;
    }
    if (product.lifecycle === "intake") summary.intakeProducts += 1;
  }

  return summary;
}

export function getInventoryFacetOptions(products: InventoryProduct[]): InventoryFacetOptions {
  const categories = new Set<string>();
  const collections = new Set<string>();

  for (const product of products) {
    categories.add(product.category);
    if (product.collection) collections.add(product.collection);
  }

  return {
    categories: [...categories].toSorted((left, right) => left.localeCompare(right)),
    collections: [...collections].toSorted((left, right) => left.localeCompare(right)),
  };
}

export function isFullySold(counts: InventoryCounts) {
  return counts.totalReceived > 0 && counts.sold === counts.totalReceived;
}

export function isLowStock(product: InventoryProduct, counts = getProductStock(product)) {
  if (product.inventoryMode === "unique" || product.lifecycle !== "active") {
    return false;
  }

  if (product.inventoryMode === "variant") {
    return product.variants.some(
      (variant) =>
        variant.stock.available > 0 && variant.stock.available <= product.lowStockThreshold,
    );
  }

  return counts.available > 0 && counts.available <= product.lowStockThreshold;
}

export function isOutOfStock(product: InventoryProduct, counts = getProductStock(product)) {
  return (
    product.inventoryMode !== "unique" &&
    product.lifecycle === "active" &&
    counts.available === 0 &&
    counts.reserved === 0 &&
    !isFullySold(counts)
  );
}
