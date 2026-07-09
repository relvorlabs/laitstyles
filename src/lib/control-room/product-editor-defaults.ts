import type {
  InventoryMode,
  InventoryProduct,
} from "@/lib/control-room/inventory-types";
import type {
  ProductEditorBase,
  ProductEditorValues,
} from "@/lib/control-room/product-editor-types";

const defaultFulfilment = {
  weightKg: null,
  pickupAvailable: true,
  deliveryRestrictions: "",
  packagingNotes: "",
} as const;

export function createEditorId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createEmptyProductEditorValues(
  mode: InventoryMode = "unique",
): ProductEditorValues {
  const base: ProductEditorBase = {
    productId: null,
    inventoryMode: mode,
    name: "",
    category: "",
    brand: "",
    description: "",
    collection: "",
    internalReference: "",
    media: [],
    sellingPrice: null,
    referencePrice: null,
    cost: null,
    lowStockThreshold: mode === "unique" ? 1 : 3,
    channels: ["physical-store"],
    fulfilment: { ...defaultFulfilment },
    scheduledAt: "",
  };

  return withMode(base, mode);
}

export function changeProductEditorMode(
  values: ProductEditorValues,
  mode: InventoryMode,
): ProductEditorValues {
  const base: ProductEditorBase = {
    productId: values.productId,
    inventoryMode: mode,
    name: values.name,
    category: values.category,
    brand: values.brand,
    description: values.description,
    collection: values.collection,
    internalReference: values.internalReference,
    media: values.media,
    sellingPrice: values.sellingPrice,
    referencePrice: values.referencePrice,
    cost: values.cost,
    lowStockThreshold: mode === "unique" ? 1 : values.lowStockThreshold,
    channels: values.channels,
    fulfilment: values.fulfilment,
    scheduledAt: values.scheduledAt,
  };

  return withMode(base, mode);
}

export function createProductEditorValues(
  product: InventoryProduct,
): ProductEditorValues {
  const base: ProductEditorBase = {
    productId: product.id,
    inventoryMode: product.inventoryMode,
    name: product.name,
    category: product.category,
    brand: product.brand,
    description: product.description,
    collection: product.collection ?? "",
    internalReference: getInternalReference(product),
    media: product.media.map((item) => ({
      ...item,
      source: "existing" as const,
    })),
    sellingPrice: product.price || null,
    referencePrice: product.referencePrice,
    cost: product.cost,
    lowStockThreshold: product.lowStockThreshold,
    channels: product.channels,
    fulfilment: product.fulfilment ?? { ...defaultFulfilment },
    scheduledAt: "",
  };

  if (product.inventoryMode === "unique") {
    return {
      ...base,
      inventoryMode: "unique",
      unique: {
        condition: product.condition,
        size: product.size,
        colour: product.colour,
        measurements: product.measurements.map((measurement) => ({
          id: createEditorId("measurement"),
          ...measurement,
        })),
      },
    };
  }

  if (product.inventoryMode === "stocked") {
    return {
      ...base,
      inventoryMode: "stocked",
      stocked: {
        sizeLabel: product.sizeLabel,
        colour: product.colour,
        quantity: product.stock.totalReceived,
      },
    };
  }

  return {
    ...base,
    inventoryMode: "variant",
    variant: {
      optionNames: product.optionNames,
      variants: product.variants.map((variant) => ({
        id: variant.id,
        label: variant.label,
        sku: variant.sku,
        size: variant.size ?? "",
        colour: variant.colour ?? "",
        imageUrl: variant.imageUrl ?? "",
        price: variant.price,
        cost: variant.cost,
        quantity: variant.stock.totalReceived,
      })),
    },
  };
}

function withMode(
  base: ProductEditorBase,
  mode: InventoryMode,
): ProductEditorValues {
  if (mode === "unique") {
    return {
      ...base,
      inventoryMode: "unique",
      unique: {
        condition: "Good",
        size: "",
        colour: "",
        measurements: [],
      },
    };
  }

  if (mode === "stocked") {
    return {
      ...base,
      inventoryMode: "stocked",
      stocked: {
        sizeLabel: "",
        colour: "",
        quantity: 1,
      },
    };
  }

  return {
    ...base,
    inventoryMode: "variant",
    variant: {
      optionNames: ["Size", "Colour"],
      variants: [
        {
          id: createEditorId("variant"),
          label: "",
          sku: "",
          size: "",
          colour: "",
          imageUrl: "",
          price: null,
          cost: null,
          quantity: 1,
        },
      ],
    },
  };
}

function getInternalReference(product: InventoryProduct) {
  if (product.inventoryMode === "unique") return product.archiveNumber;
  if (product.inventoryMode === "stocked") return product.sku;
  return product.variants[0]?.sku.split("-").slice(0, -1).join("-") ?? "";
}
