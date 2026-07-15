import type {
  CatalogueChannel,
  InventoryHealth,
  InventoryMode,
  InventoryProduct,
} from "@/lib/admin/types";

const inventoryDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export const inventoryModeLabels: Record<InventoryMode, string> = {
  unique: "Unique piece",
  stocked: "Stocked product",
  variant: "Product variants",
};

export const inventoryHealthLabels: Record<InventoryHealth, string> = {
  healthy: "Available",
  "low-stock": "Low stock",
  "out-of-stock": "Out of stock",
  held: "Held",
  sold: "Sold",
  draft: "Draft",
  intake: "Intake",
  archived: "Archived",
  unpublished: "Unpublished",
};

export const channelLabels: Record<CatalogueChannel, string> = {
  storefront: "Storefront",
  "physical-store": "Physical store",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
};

export function getProductDescriptor(product: InventoryProduct) {
  if (product.inventoryMode === "unique") {
    return `${product.condition} · ${product.size} · ${product.colour}`;
  }

  if (product.inventoryMode === "stocked") {
    return `${product.sizeLabel} · ${product.colour}`;
  }

  return `${product.variants.length} variants · ${product.optionNames.join(" + ")}`;
}

export function formatInventoryDate(value: string) {
  return inventoryDateFormatter.format(new Date(value));
}
