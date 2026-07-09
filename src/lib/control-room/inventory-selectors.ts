import type {
  InventoryAttentionReason,
  InventoryCounts,
  InventoryFacetOptions,
  InventoryHealth,
  InventoryListItem,
  InventoryProduct,
  InventoryQuery,
  InventorySavedView,
  InventorySummary,
  ProductMedia,
} from "@/lib/control-room/inventory-types";
import { err, ok, type Result } from "@/lib/control-room/result";

export const defaultInventoryQuery: InventoryQuery = {
  search: "",
  view: "all",
  mode: "all",
  stock: "all",
  category: "all",
  collection: "all",
  channel: "all",
  sort: "updated-desc",
};

export const inventorySavedViews: Array<{
  value: InventorySavedView;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "drafts", label: "Drafts" },
  { value: "intake", label: "Intake" },
  { value: "low-stock", label: "Low stock" },
  { value: "out-of-stock", label: "Out of stock" },
  { value: "held", label: "Held" },
  { value: "sold", label: "Sold" },
  { value: "unpublished", label: "Unpublished" },
  { value: "needs-attention", label: "Needs attention" },
];

export type InventoryValidationIssue = {
  path: string;
  code:
    | "negative-count"
    | "non-integer-count"
    | "stock-total-mismatch"
    | "unique-quantity"
    | "missing-cover"
    | "duplicate-variant"
    | "invalid-threshold";
  message: string;
};

export function validateInventoryProduct(
  product: InventoryProduct,
): Result<InventoryProduct, InventoryValidationIssue[]> {
  const issues: InventoryValidationIssue[] = [];

  if (!Number.isInteger(product.lowStockThreshold) || product.lowStockThreshold < 0) {
    issues.push({
      path: "lowStockThreshold",
      code: "invalid-threshold",
      message: "Low-stock threshold must be a non-negative whole number.",
    });
  }

  if (!product.media.some((item) => item.kind === "cover")) {
    issues.push({
      path: "media",
      code: "missing-cover",
      message: "Every product requires one cover image.",
    });
  }

  if (product.inventoryMode === "variant") {
    const variantIds = new Set<string>();

    for (const [index, variant] of product.variants.entries()) {
      if (variantIds.has(variant.id)) {
        issues.push({
          path: `variants.${index}.id`,
          code: "duplicate-variant",
          message: `Variant id ${variant.id} is duplicated.`,
        });
      }
      variantIds.add(variant.id);
      issues.push(...validateCounts(variant.stock, `variants.${index}.stock`));
    }
  } else {
    issues.push(...validateCounts(product.stock, "stock"));
  }

  if (product.inventoryMode === "unique") {
    const counts = product.stock;
    const buckets = [
      counts.available,
      counts.reserved,
      counts.sold,
      counts.returned,
      counts.damaged,
    ];

    if (counts.totalReceived !== 1 || buckets.some((value) => value > 1)) {
      issues.push({
        path: "stock",
        code: "unique-quantity",
        message: "A unique piece must represent exactly one physical unit.",
      });
    }
  }

  return issues.length ? err(issues) : ok(product);
}

function validateCounts(
  counts: InventoryCounts,
  path: string,
): InventoryValidationIssue[] {
  const issues: InventoryValidationIssue[] = [];
  const entries = Object.entries(counts) as Array<
    [keyof InventoryCounts, number]
  >;

  for (const [key, value] of entries) {
    if (!Number.isInteger(value)) {
      issues.push({
        path: `${path}.${key}`,
        code: "non-integer-count",
        message: `${key} must be a whole number.`,
      });
    }

    if (value < 0) {
      issues.push({
        path: `${path}.${key}`,
        code: "negative-count",
        message: `${key} cannot be negative.`,
      });
    }
  }

  const allocated =
    counts.available +
    counts.reserved +
    counts.sold +
    counts.returned +
    counts.damaged;

  if (allocated !== counts.totalReceived) {
    issues.push({
      path,
      code: "stock-total-mismatch",
      message:
        "Received stock must equal available, reserved, sold, returned and damaged units.",
    });
  }

  return issues;
}

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
    {
      totalReceived: 0,
      available: 0,
      reserved: 0,
      sold: 0,
      returned: 0,
      damaged: 0,
    },
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

export function getInventoryAttention(
  product: InventoryProduct,
): InventoryAttentionReason[] {
  const counts = getProductStock(product);
  const reasons: InventoryAttentionReason[] = [];

  if (
    product.inventoryMode !== "unique" &&
    counts.available > 0 &&
    counts.available <= product.lowStockThreshold
  ) {
    reasons.push("low-stock");
  }

  if (isOutOfStock(product)) reasons.push("out-of-stock");
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
  if (counts.reserved > 0 && counts.available === 0) return "held";
  if (isOutOfStock(product)) return "out-of-stock";
  if (
    product.inventoryMode !== "unique" &&
    counts.available > 0 &&
    counts.available <= product.lowStockThreshold
  ) {
    return "low-stock";
  }
  if (counts.available === 0 && counts.sold > 0) return "sold";
  return "healthy";
}

export function toInventoryListItem(
  product: InventoryProduct,
): InventoryListItem {
  return {
    product,
    coverImage: getProductCover(product),
    reference: getProductReference(product),
    stock: getProductStock(product),
    health: getInventoryHealth(product),
    attention: getInventoryAttention(product),
    variantCount:
      product.inventoryMode === "variant" ? product.variants.length : 0,
  };
}

export function queryInventory(
  products: InventoryProduct[],
  query: InventoryQuery,
): InventoryListItem[] {
  const normalizedSearch = normalize(query.search);

  return products
    .map(toInventoryListItem)
    .filter((item) => matchesSavedView(item, query.view))
    .filter((item) => query.mode === "all" || item.product.inventoryMode === query.mode)
    .filter((item) => matchesStockFilter(item, query.stock))
    .filter(
      (item) =>
        query.category === "all" || item.product.category === query.category,
    )
    .filter(
      (item) =>
        query.collection === "all" ||
        item.product.collection === query.collection,
    )
    .filter(
      (item) =>
        query.channel === "all" || item.product.channels.includes(query.channel),
    )
    .filter((item) => matchesSearch(item.product, normalizedSearch))
    .toSorted((left, right) => compareInventory(left, right, query.sort));
}

export function getInventorySummary(
  products: InventoryProduct[],
): InventorySummary {
  const items = products.map(toInventoryListItem);

  return items.reduce<InventorySummary>(
    (summary, item) => ({
      totalProducts: summary.totalProducts + 1,
      liveProducts:
        summary.liveProducts +
        (matchesSavedView(item, "live") ? 1 : 0),
      availableUnits: summary.availableUnits + item.stock.available,
      reservedUnits: summary.reservedUnits + item.stock.reserved,
      soldUnits: summary.soldUnits + item.stock.sold,
      lowStockProducts:
        summary.lowStockProducts +
        (item.attention.includes("low-stock") ? 1 : 0),
      outOfStockProducts:
        summary.outOfStockProducts +
        (item.attention.includes("out-of-stock") ? 1 : 0),
      intakeProducts:
        summary.intakeProducts +
        (item.product.lifecycle === "intake" ? 1 : 0),
    }),
    {
      totalProducts: 0,
      liveProducts: 0,
      availableUnits: 0,
      reservedUnits: 0,
      soldUnits: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      intakeProducts: 0,
    },
  );
}

export function getInventoryFacetOptions(
  products: InventoryProduct[],
): InventoryFacetOptions {
  const categories = new Set<string>();
  const collections = new Set<string>();

  for (const product of products) {
    categories.add(product.category);
    if (product.collection) collections.add(product.collection);
  }

  return {
    categories: [...categories].toSorted((left, right) =>
      left.localeCompare(right),
    ),
    collections: [...collections].toSorted((left, right) =>
      left.localeCompare(right),
    ),
  };
}

export function getInventoryViewCounts(
  products: InventoryProduct[],
): Record<InventorySavedView, number> {
  const items = products.map(toInventoryListItem);

  return inventorySavedViews.reduce<Record<InventorySavedView, number>>(
    (counts, view) => {
      counts[view.value] = items.filter((item) =>
        matchesSavedView(item, view.value),
      ).length;
      return counts;
    },
    {
      all: 0,
      live: 0,
      drafts: 0,
      intake: 0,
      "low-stock": 0,
      "out-of-stock": 0,
      held: 0,
      sold: 0,
      unpublished: 0,
      "needs-attention": 0,
    },
  );
}

export function matchesSavedView(
  item: InventoryListItem,
  view: InventorySavedView,
) {
  const product = item.product;

  switch (view) {
    case "all":
      return true;
    case "live":
      return (
        product.lifecycle === "active" &&
        product.publication === "published" &&
        item.stock.available > 0
      );
    case "drafts":
      return product.lifecycle === "draft";
    case "intake":
      return product.lifecycle === "intake";
    case "low-stock":
      return item.attention.includes("low-stock");
    case "out-of-stock":
      return item.attention.includes("out-of-stock");
    case "held":
      return item.stock.reserved > 0;
    case "sold":
      return item.stock.sold > 0;
    case "unpublished":
      return product.publication !== "published";
    case "needs-attention":
      return item.attention.length > 0;
  }
}

function matchesStockFilter(
  item: InventoryListItem,
  filter: InventoryQuery["stock"],
) {
  if (filter === "all") return true;
  if (filter === "healthy") return item.health === "healthy";
  if (filter === "low-stock") return item.attention.includes("low-stock");
  if (filter === "out-of-stock") {
    return item.attention.includes("out-of-stock");
  }
  if (filter === "held") return item.stock.reserved > 0;
  return item.stock.sold > 0;
}

function matchesSearch(product: InventoryProduct, normalizedSearch: string) {
  if (!normalizedSearch) return true;

  const variantText =
    product.inventoryMode === "variant"
      ? product.variants
          .flatMap((variant) => [
            variant.label,
            variant.sku,
            variant.size ?? "",
            variant.colour ?? "",
          ])
          .join(" ")
      : "";

  const modeText =
    product.inventoryMode === "unique"
      ? `${product.archiveNumber} ${product.size} ${product.colour} ${product.condition}`
      : product.inventoryMode === "stocked"
        ? `${product.sku} ${product.sizeLabel} ${product.colour}`
        : variantText;

  const searchable = normalize(
    [
      product.name,
      product.description,
      product.category,
      product.collection ?? "",
      product.brand,
      product.inventoryMode,
      modeText,
    ].join(" "),
  );

  return normalizedSearch
    .split(/\s+/)
    .every((token) => searchable.includes(token));
}

function compareInventory(
  left: InventoryListItem,
  right: InventoryListItem,
  sort: InventoryQuery["sort"],
) {
  switch (sort) {
    case "stock-asc":
      return left.stock.available - right.stock.available;
    case "stock-desc":
      return right.stock.available - left.stock.available;
    case "sold-desc":
      return right.stock.sold - left.stock.sold;
    case "price-asc":
      return left.product.price - right.product.price;
    case "price-desc":
      return right.product.price - left.product.price;
    case "name-asc":
      return left.product.name.localeCompare(right.product.name);
    case "updated-desc":
      return (
        new Date(right.product.updatedAt).getTime() -
        new Date(left.product.updatedAt).getTime()
      );
  }
}

function isOutOfStock(product: InventoryProduct) {
  const counts = getProductStock(product);
  return (
    product.inventoryMode !== "unique" &&
    product.lifecycle === "active" &&
    counts.available === 0 &&
    counts.reserved === 0
  );
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-NG");
}
