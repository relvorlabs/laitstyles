import type {
  ProductImportChild,
  ProductImportRow,
  ProductImportVariant,
} from "@/modules/products/import/types";
import type {
  CatalogueChannel,
  ProductEditorIssue,
  ProductEditorValues,
} from "@/modules/products/types";

type RelationalProduct = {
  id: string;
  category_id: string | null;
  collection_id: string | null;
  name: string;
  description: string;
  inventory_mode: "unique" | "stocked" | "variant";
  brand?: string | null;
  price: number;
  reference_price?: number | null;
  cost?: number | null;
  low_stock_threshold: number;
  archive_number?: string | null;
  sku?: string | null;
  condition?: string | null;
  size_label?: string | null;
  colour?: string | null;
  material?: string | null;
  fit?: string | null;
  style?: string | null;
  care_instructions?: string | null;
  flaw_notes?: string | null;
  weight_grams?: number | null;
  pickup_available?: boolean | null;
  delivery_restrictions?: string | null;
  packaging_notes?: string | null;
  scheduled_at?: string | null;
};

export type ProductImportRelationalSnapshot = {
  catalogue_categories: Array<{ id: string; name: string }>;
  catalogue_collections: Array<{ id: string; name: string }>;
  products: RelationalProduct[];
  product_channels: Array<{ product_id: string; channel: string }>;
  product_variants: Array<{
    id: string;
    product_id: string;
    title: string;
    sku?: string | null;
    size_label?: string | null;
    colour?: string | null;
    price_override?: number | null;
    cost?: number | null;
  }>;
  stock_levels: Array<{
    product_id: string;
    variant_id: string | null;
    quantity_on_hand: number;
  }>;
  product_measurements: Array<{
    product_id: string;
    variant_id: string | null;
    label: string;
    value: number;
    unit: string;
  }>;
  product_media: Array<{ product_id: string; variant_id: string | null }>;
};

export type ProductImportMappingSource = ProductImportRow[] | ProductImportRelationalSnapshot;

export type ProductImportMappingResult = {
  children: ProductImportChild[];
  ignoredAssetCount: number;
};

const supportedChannels = new Set<CatalogueChannel>([
  "storefront",
  "physical-store",
  "whatsapp",
  "instagram",
]);

export function mapProductImport(source: ProductImportMappingSource): ProductImportMappingResult {
  return Array.isArray(source) ? mapDirectRows(source) : mapRelationalSnapshot(source);
}

function mapDirectRows(rows: ProductImportRow[]): ProductImportMappingResult {
  return {
    children: rows.map((row, index) => {
      const importId = `direct-${index + 1}`;
      return createChild(importId, mapDirectRow(row, importId), []);
    }),
    ignoredAssetCount: 0,
  };
}

function mapDirectRow(row: ProductImportRow, importId: string): ProductEditorValues {
  const base = createBaseValues({
    importId,
    mode: row.mode,
    name: row.name,
    description: row.description,
    category: row.category,
    collection: row.collection,
    brand: row.brand,
    material: row.material,
    fit: row.fit,
    style: row.style,
    careInstructions: row.careInstructions,
    flawNotes: row.flawNotes,
    internalReference: row.internalReference,
    sellingPrice: row.sellingPrice,
    referencePrice: row.referencePrice,
    cost: row.cost,
    lowStockThreshold: row.lowStockThreshold,
    channels: row.channels,
    fulfilment: row.fulfilment,
    scheduledAt: row.scheduledAt,
  });

  if (row.mode === "unique") {
    return {
      ...base,
      inventoryMode: "unique",
      unique: {
        condition: row.condition ?? "",
        size: row.size ?? "",
        colour: row.colour ?? "",
        measurements: row.measurements.map((measurement, index) => ({
          id: `${importId}-measurement-${index + 1}`,
          label: measurement.label,
          value: measurement.value,
        })),
      },
    };
  }

  if (row.mode === "stocked") {
    return {
      ...base,
      inventoryMode: "stocked",
      stocked: {
        sizeLabel: row.sizeLabel ?? "",
        colour: row.colour ?? "",
        quantity: row.stock,
      },
    };
  }

  return {
    ...base,
    inventoryMode: "variant",
    variant: {
      optionNames: row.optionNames?.length ? row.optionNames : deriveOptionNames(row.variants),
      variants: row.variants.map((variant, index) => mapImportVariant(variant, importId, index)),
    },
  };
}

function mapRelationalSnapshot(
  source: ProductImportRelationalSnapshot,
): ProductImportMappingResult {
  const categories = new Map(source.catalogue_categories.map((row) => [row.id, row.name]));
  const collections = new Map(source.catalogue_collections.map((row) => [row.id, row.name]));
  const variantsByProduct = groupBy(source.product_variants, (row) => row.product_id);
  const stockByProduct = groupBy(source.stock_levels, (row) => row.product_id);
  const stockByVariant = groupBy(
    source.stock_levels.filter((row) => row.variant_id !== null),
    (row) => row.variant_id as string,
  );
  const measurementsByProduct = groupBy(source.product_measurements, (row) => row.product_id);
  const channelsByProduct = groupBy(source.product_channels, (row) => row.product_id);
  const productIds = new Set(source.products.map((product) => product.id));

  return {
    children: source.products.map((product) => {
      const importId = `import-${product.id}`;
      const issues = taxonomyIssues(product, categories, collections);
      const variants = variantsByProduct.get(product.id) ?? [];
      const productStock = stockByProduct.get(product.id) ?? [];
      const measurements = (measurementsByProduct.get(product.id) ?? []).filter(
        (measurement) => measurement.variant_id === null,
      );
      const base = createBaseValues({
        importId,
        mode: product.inventory_mode,
        name: product.name,
        description: product.description,
        category: product.category_id ? (categories.get(product.category_id) ?? "") : "",
        collection: product.collection_id ? (collections.get(product.collection_id) ?? "") : "",
        brand: product.brand ?? "",
        material: product.material ?? "",
        fit: product.fit ?? "",
        style: product.style ?? "",
        careInstructions: product.care_instructions ?? "",
        flawNotes: product.flaw_notes ?? "",
        internalReference: importReference(product),
        sellingPrice: product.price,
        referencePrice: product.reference_price ?? null,
        cost: product.cost ?? null,
        lowStockThreshold: product.low_stock_threshold,
        channels: (channelsByProduct.get(product.id) ?? []).flatMap(({ channel }) =>
          normalizeChannel(channel),
        ),
        fulfilment: {
          weightKg:
            product.weight_grams === null || product.weight_grams === undefined
              ? null
              : product.weight_grams / 1000,
          pickupAvailable: product.pickup_available ?? true,
          deliveryRestrictions: product.delivery_restrictions ?? "",
          packagingNotes: product.packaging_notes ?? "",
        },
        scheduledAt: product.scheduled_at ?? "",
      });

      const values = mapRelationalProduct({
        base,
        importId,
        product,
        variants,
        productStock,
        stockByVariant,
        measurements,
      });
      return createChild(importId, values, issues);
    }),
    ignoredAssetCount: source.product_media.filter((media) => productIds.has(media.product_id))
      .length,
  };
}

function mapRelationalProduct({
  base,
  importId,
  product,
  variants,
  productStock,
  stockByVariant,
  measurements,
}: {
  base: ReturnType<typeof createBaseValues>;
  importId: string;
  product: RelationalProduct;
  variants: ProductImportRelationalSnapshot["product_variants"];
  productStock: ProductImportRelationalSnapshot["stock_levels"];
  stockByVariant: Map<string, ProductImportRelationalSnapshot["stock_levels"]>;
  measurements: ProductImportRelationalSnapshot["product_measurements"];
}): ProductEditorValues {
  if (product.inventory_mode === "unique") {
    return {
      ...base,
      inventoryMode: "unique",
      unique: {
        condition: product.condition ?? "",
        size: product.size_label ?? "",
        colour: product.colour ?? "",
        measurements: measurements.map((measurement, index) => ({
          id: `${importId}-measurement-${index + 1}`,
          label: measurement.label,
          value: `${measurement.value} ${measurement.unit}`,
        })),
      },
    };
  }

  if (product.inventory_mode === "stocked") {
    return {
      ...base,
      inventoryMode: "stocked",
      stocked: {
        sizeLabel: product.size_label ?? "",
        colour: product.colour ?? "",
        quantity: totalQuantity(productStock.filter((stock) => stock.variant_id === null)),
      },
    };
  }

  return {
    ...base,
    inventoryMode: "variant",
    variant: {
      optionNames: deriveOptionNames(variants),
      variants: variants.map((variant, index) => ({
        id: `${importId}-variant-${index + 1}`,
        label: variant.title,
        sku: variant.sku ?? "",
        size: variant.size_label ?? "",
        colour: variant.colour ?? "",
        image: null,
        price: variant.price_override ?? null,
        cost: variant.cost ?? null,
        quantity: totalQuantity(stockByVariant.get(variant.id) ?? []),
      })),
    },
  };
}

function createBaseValues(input: {
  importId: string;
  mode: ProductEditorValues["inventoryMode"];
  name: string;
  description?: string;
  category?: string;
  collection?: string;
  brand?: string;
  material?: string;
  fit?: string;
  style?: string;
  careInstructions?: string;
  flawNotes?: string;
  internalReference?: string;
  sellingPrice?: number | null;
  referencePrice?: number | null;
  cost?: number | null;
  lowStockThreshold?: number;
  channels?: string[];
  fulfilment?: {
    weightKg?: number | null;
    pickupAvailable?: boolean;
    deliveryRestrictions?: string;
    packagingNotes?: string;
  };
  scheduledAt?: string;
}) {
  return {
    productId: null,
    inventoryMode: input.mode,
    name: input.name,
    category: input.category ?? "",
    brand: input.brand ?? "",
    material: input.material ?? "",
    fit: input.fit ?? "",
    style: input.style ?? "",
    careInstructions: input.careInstructions ?? "",
    flawNotes: input.flawNotes ?? "",
    description: input.description ?? "",
    collection: input.collection ?? "",
    internalReference: input.internalReference ?? "",
    media: [],
    sellingPrice: input.sellingPrice ?? null,
    referencePrice: input.referencePrice ?? null,
    cost: input.cost ?? null,
    lowStockThreshold: input.lowStockThreshold ?? (input.mode === "unique" ? 1 : 3),
    channels: (input.channels ?? []).flatMap(normalizeChannel),
    fulfilment: {
      weightKg: input.fulfilment?.weightKg ?? null,
      pickupAvailable: input.fulfilment?.pickupAvailable ?? true,
      deliveryRestrictions: input.fulfilment?.deliveryRestrictions ?? "",
      packagingNotes: input.fulfilment?.packagingNotes ?? "",
    },
    scheduledAt: input.scheduledAt ?? "",
  };
}

function createChild(
  importId: string,
  values: ProductEditorValues,
  issues: ProductEditorIssue[],
): ProductImportChild {
  return { importId, values, issues, status: "ready" };
}

function mapImportVariant(variant: ProductImportVariant, importId: string, index: number) {
  return {
    id: `${importId}-variant-${index + 1}`,
    label: variant.label,
    sku: variant.sku ?? "",
    size: variant.size ?? "",
    colour: variant.colour ?? "",
    image: null,
    price: variant.price ?? null,
    cost: variant.cost ?? null,
    quantity: variant.stock,
  };
}

function taxonomyIssues(
  product: RelationalProduct,
  categories: Map<string, string>,
  collections: Map<string, string>,
): ProductEditorIssue[] {
  const issues: ProductEditorIssue[] = [];
  if (product.category_id && !categories.has(product.category_id)) {
    issues.push({
      step: "identity",
      path: "category",
      message: "The referenced category could not be found.",
    });
  }
  if (product.collection_id && !collections.has(product.collection_id)) {
    issues.push({
      step: "identity",
      path: "collection",
      message: "The referenced collection could not be found.",
    });
  }
  return issues;
}

function deriveOptionNames(
  variants: Array<{ size_label?: string | null; colour?: string | null }> | ProductImportVariant[],
) {
  const names: string[] = [];
  if (
    variants.some((variant) => Boolean("size_label" in variant ? variant.size_label : variant.size))
  ) {
    names.push("Size");
  }
  if (variants.some((variant) => Boolean(variant.colour))) names.push("Colour");
  return names.length ? names : ["Option"];
}

function normalizeChannel(channel: string): CatalogueChannel[] {
  const normalized = channel === "physical_store" ? "physical-store" : channel;
  return supportedChannels.has(normalized as CatalogueChannel)
    ? [normalized as CatalogueChannel]
    : [];
}

function totalQuantity(stock: Array<{ quantity_on_hand: number }>) {
  return stock.reduce((total, row) => total + row.quantity_on_hand, 0);
}

function importReference(product: RelationalProduct) {
  if (product.inventory_mode === "unique") return product.archive_number ?? "";
  return product.sku ?? "";
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const group = grouped.get(key(row));
    if (group) group.push(row);
    else grouped.set(key(row), [row]);
  }
  return grouped;
}
