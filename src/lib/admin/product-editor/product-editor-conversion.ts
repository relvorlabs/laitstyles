import type {
  InventoryCounts,
  InventoryProduct,
  ProductMedia,
  PublicationState,
} from "@/lib/admin/inventory/inventory-types";
import type {
  ProductEditorIntent,
  ProductEditorValues,
} from "@/lib/admin/product-editor/product-editor-types";

export type ProductConversionOptions = {
  intent: ProductEditorIntent;
  now: string;
  idFactory?: (prefix: string) => string;
  existingProduct?: InventoryProduct;
};

export function convertEditorValuesToProduct(
  values: ProductEditorValues,
  options: ProductConversionOptions,
): InventoryProduct {
  const idFactory = options.idFactory ?? defaultIdFactory;
  const id = values.productId ?? idFactory("product");
  const publication = getPublication(options.intent);
  const lifecycle =
    options.intent === "draft"
      ? options.existingProduct?.lifecycle === "intake"
        ? "intake"
        : "draft"
      : "active";
  const media = normalizeMedia(values.media);
  const image =
    media.find((item) => item.kind === "cover")?.url ??
    options.existingProduct?.image ??
    "/product-placeholder.svg";
  const createdAt = options.existingProduct?.createdAt ?? options.now;

  const base = {
    id,
    slug: createSlug(values.name || `draft-${values.inventoryMode}`),
    name: values.name.trim() || `Untitled ${modeLabel(values.inventoryMode)}`,
    description: values.description.trim() || "Draft product awaiting complete details.",
    category: values.category.trim() || "Uncategorised",
    collection: values.collection.trim() || null,
    brand: values.brand.trim() || "Unlabelled",
    material: values.material.trim() || null,
    fit: values.fit.trim() || null,
    style: values.style.trim() || null,
    careInstructions: values.careInstructions.trim() || null,
    flawNotes: values.flawNotes.trim() || null,
    image,
    media,
    price: values.sellingPrice ?? 0,
    referencePrice: values.referencePrice,
    cost: values.cost,
    lifecycle,
    publication,
    channels: values.channels,
    lowStockThreshold: values.inventoryMode === "unique" ? 1 : values.lowStockThreshold,
    fulfilment: values.fulfilment,
    scheduledAt: options.intent === "schedule" ? values.scheduledAt : undefined,
    createdAt,
    updatedAt: options.now,
  } as const;

  if (values.inventoryMode === "unique") {
    return {
      ...base,
      inventoryMode: "unique",
      archiveNumber: values.internalReference.trim() || "Pending",
      condition: values.unique.condition,
      size: values.unique.size.trim() || "Not recorded",
      colour: values.unique.colour.trim() || "Not recorded",
      measurements: values.unique.measurements
        .filter((measurement) => measurement.label.trim() || measurement.value.trim())
        .map(({ label, value }) => ({
          label: label.trim() || "Measurement",
          value: value.trim() || "Not recorded",
        })),
      stock: preserveOrCreateStock(options.existingProduct, 1),
    };
  }

  if (values.inventoryMode === "stocked") {
    return {
      ...base,
      inventoryMode: "stocked",
      sku: values.internalReference.trim() || "Pending",
      sizeLabel: values.stocked.sizeLabel.trim() || "Not recorded",
      colour: values.stocked.colour.trim() || "Not recorded",
      stock: preserveOrCreateStock(options.existingProduct, values.stocked.quantity),
    };
  }

  return {
    ...base,
    inventoryMode: "variant",
    optionNames: values.variant.optionNames.map((option) => option.trim()).filter(Boolean),
    variants: values.variant.variants.map((variant, index) => ({
      id: variant.id || idFactory("variant"),
      label: variant.label.trim() || `Variant ${index + 1}`,
      sku: variant.sku.trim() || `${values.internalReference.trim() || "PENDING"}-${index + 1}`,
      size: variant.size.trim() || null,
      colour: variant.colour.trim() || null,
      imageUrl: variant.imageUrl.trim() || null,
      price: variant.price,
      cost: variant.cost,
      stock: preserveVariantStock(options.existingProduct, variant.id, variant.quantity),
    })),
  };
}

function normalizeMedia(values: ProductEditorValues["media"]): ProductMedia[] {
  return values.map((item, position) => ({
    id: item.id,
    url: item.url,
    alt: item.alt.trim(),
    kind: item.kind,
    position,
  }));
}

function preserveOrCreateStock(
  existingProduct: InventoryProduct | undefined,
  totalReceived: number,
): InventoryCounts {
  if (existingProduct && existingProduct.inventoryMode !== "variant") {
    const committed =
      existingProduct.stock.reserved +
      existingProduct.stock.sold +
      existingProduct.stock.returned +
      existingProduct.stock.damaged;

    return {
      ...existingProduct.stock,
      totalReceived,
      available: Math.max(totalReceived - committed, 0),
    };
  }

  return createStock(totalReceived);
}

function preserveVariantStock(
  existingProduct: InventoryProduct | undefined,
  variantId: string,
  totalReceived: number,
): InventoryCounts {
  if (existingProduct?.inventoryMode === "variant") {
    const existingVariant = existingProduct.variants.find((variant) => variant.id === variantId);
    if (existingVariant) {
      const committed =
        existingVariant.stock.reserved +
        existingVariant.stock.sold +
        existingVariant.stock.returned +
        existingVariant.stock.damaged;

      return {
        ...existingVariant.stock,
        totalReceived,
        available: Math.max(totalReceived - committed, 0),
      };
    }
  }

  return createStock(totalReceived);
}

function createStock(totalReceived: number): InventoryCounts {
  return {
    totalReceived,
    available: totalReceived,
    reserved: 0,
    sold: 0,
    returned: 0,
    damaged: 0,
  };
}

function getPublication(intent: ProductEditorIntent): PublicationState {
  if (intent === "publish") return "published";
  if (intent === "schedule") return "scheduled";
  return "unpublished";
}

function createSlug(value: string) {
  return (
    value
      .trim()
      .toLocaleLowerCase("en-NG")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-product"
  );
}

function modeLabel(mode: ProductEditorValues["inventoryMode"]) {
  if (mode === "unique") return "unique piece";
  if (mode === "stocked") return "stocked product";
  return "variant product";
}

function defaultIdFactory(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
