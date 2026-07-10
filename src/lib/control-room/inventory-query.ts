import { inventorySavedViews } from "@/lib/control-room/inventory-constants";
import { toInventoryListItem } from "@/lib/control-room/inventory-derivations";
import type {
  InventoryListItem,
  InventoryProduct,
  InventoryQuery,
  InventorySavedView,
} from "@/lib/control-room/inventory-types";

export function queryInventory(
  products: InventoryProduct[],
  query: InventoryQuery,
): InventoryListItem[] {
  const normalizedSearch = normalize(query.search);
  const results: InventoryListItem[] = [];

  for (const product of products) {
    const item = toInventoryListItem(product);

    if (!matchesSavedView(item, query.view)) continue;
    if (query.mode !== "all" && product.inventoryMode !== query.mode) continue;
    if (!matchesStockFilter(item, query.stock)) continue;
    if (query.category !== "all" && product.category !== query.category) continue;
    if (query.collection !== "all" && product.collection !== query.collection) {
      continue;
    }
    if (query.channel !== "all" && !product.channels.includes(query.channel)) {
      continue;
    }
    if (!matchesSearch(product, normalizedSearch)) continue;

    results.push(item);
  }

  return results.toSorted((left, right) => compareInventory(left, right, query.sort));
}

export function getInventoryViewCounts(
  products: InventoryProduct[],
): Record<InventorySavedView, number> {
  const counts = Object.fromEntries(inventorySavedViews.map((view) => [view.value, 0])) as Record<
    InventorySavedView,
    number
  >;

  for (const product of products) {
    const item = toInventoryListItem(product);
    for (const view of inventorySavedViews) {
      if (matchesSavedView(item, view.value)) counts[view.value] += 1;
    }
  }

  return counts;
}

export function getActiveInventoryFilterCount(query: InventoryQuery) {
  return [
    query.mode !== "all",
    query.stock !== "all",
    query.category !== "all",
    query.collection !== "all",
    query.channel !== "all",
  ].filter(Boolean).length;
}

export function matchesSavedView(item: InventoryListItem, view: InventorySavedView) {
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
      return item.health === "sold";
    case "unpublished":
      return product.publication !== "published";
    case "needs-attention":
      return item.attention.length > 0;
  }
}

function matchesStockFilter(item: InventoryListItem, filter: InventoryQuery["stock"]) {
  if (filter === "all") return true;
  if (filter === "healthy") return item.health === "healthy";
  if (filter === "low-stock") return item.attention.includes("low-stock");
  if (filter === "out-of-stock") {
    return item.attention.includes("out-of-stock");
  }
  if (filter === "held") return item.stock.reserved > 0;
  return item.health === "sold";
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

  return normalizedSearch.split(/\s+/).every((token) => searchable.includes(token));
}

function compareInventory(
  left: InventoryListItem,
  right: InventoryListItem,
  sort: InventoryQuery["sort"],
) {
  switch (sort) {
    case "stock-asc":
      return compareNumber(left.stock.available, right.stock.available, left, right);
    case "stock-desc":
      return compareNumber(right.stock.available, left.stock.available, left, right);
    case "sold-desc":
      return compareNumber(right.stock.sold, left.stock.sold, left, right);
    case "price-asc":
      return compareNumber(left.product.price, right.product.price, left, right);
    case "price-desc":
      return compareNumber(right.product.price, left.product.price, left, right);
    case "name-asc":
      return left.product.name.localeCompare(right.product.name);
    case "updated-desc":
      return compareNumber(
        new Date(right.product.updatedAt).getTime(),
        new Date(left.product.updatedAt).getTime(),
        left,
        right,
      );
  }
}

function compareNumber(
  primaryLeft: number,
  primaryRight: number,
  left: InventoryListItem,
  right: InventoryListItem,
) {
  const difference = primaryLeft - primaryRight;
  return difference || left.product.name.localeCompare(right.product.name);
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("en-NG");
}
