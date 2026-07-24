import "server-only";

import type {
  CatalogueTaxonomyItem,
  CatalogueTaxonomyKind,
} from "@/lib/admin/inventory/catalogue-taxonomy";
import type {
  CatalogueChannel,
  InventoryCounts,
  InventoryProduct,
  ProductMedia,
  ProductMediaKind,
  ProductVariant,
  StockMovement,
} from "@/lib/admin/inventory/inventory-types";
import type { Prisma } from "@/lib/prisma";

export const inventoryProductInclude = {
  catalogue_categories: { select: { name: true } },
  catalogue_collections: { select: { name: true } },
  product_channels: true,
  product_media: {
    where: { variant_id: null },
    orderBy: { position: "asc" },
    include: {
      cloudinary_assets: {
        select: {
          secure_url: true,
          delivery_url: true,
          public_id: true,
          alt: true,
          provider: true,
        },
      },
    },
  },
  product_measurements: { orderBy: { position: "asc" } },
  product_variants: {
    orderBy: { position: "asc" },
    include: {
      stock_levels: true,
      product_media: {
        orderBy: { position: "asc" },
        include: {
          cloudinary_assets: {
            select: { secure_url: true, delivery_url: true },
          },
        },
      },
    },
  },
  stock_levels: { where: { variant_id: null } },
} satisfies Prisma.productsInclude;

export type InventoryProductRow = Prisma.productsGetPayload<{
  include: typeof inventoryProductInclude;
}>;

const EMPTY_COUNTS: InventoryCounts = {
  totalReceived: 0,
  available: 0,
  reserved: 0,
  sold: 0,
  returned: 0,
  damaged: 0,
};

function mapChannel(channel: string): CatalogueChannel {
  return channel === "physical_store" ? "physical-store" : (channel as CatalogueChannel);
}

function mapMediaKind(kind: string): ProductMediaKind {
  if (kind === "product_detail") return "detail";
  if (kind === "product_defect") return "defect";
  return "cover";
}

function mapMedia(row: InventoryProductRow["product_media"][number]): ProductMedia {
  const asset = row.cloudinary_assets;
  return {
    id: row.id,
    url: asset.delivery_url ?? asset.secure_url,
    provider: asset.provider === "cloudinary" ? "cloudinary" : undefined,
    storageKey: asset.public_id,
    alt: asset.alt,
    kind: mapMediaKind(row.kind),
    position: row.position,
  };
}

/**
 * The legacy admin DTO has no separate committed balance. Surface reserved and
 * committed together so the editor never treats committed units as editable.
 */
export function mapInventoryCounts(
  row:
    | {
        total_received: number;
        available: number;
        reserved: number;
        committed: number;
        sold: number;
        returned: number;
        damaged: number;
      }
    | undefined,
): InventoryCounts {
  if (!row) return { ...EMPTY_COUNTS };
  return {
    totalReceived: row.total_received,
    available: row.available,
    reserved: row.reserved + row.committed,
    sold: row.sold,
    returned: row.returned,
    damaged: row.damaged,
  };
}

function mapVariant(row: InventoryProductRow["product_variants"][number]): ProductVariant {
  const image = row.product_media[0]?.cloudinary_assets;
  return {
    id: row.id,
    label: row.label,
    sku: row.sku ?? "",
    size: row.size,
    colour: row.colour,
    imageUrl: image ? (image.delivery_url ?? image.secure_url) : null,
    price: row.price?.toNumber() ?? null,
    cost: row.cost?.toNumber() ?? null,
    stock: mapInventoryCounts(row.stock_levels[0]),
  };
}

function deriveOptionNames(row: InventoryProductRow): string[] {
  const names: string[] = [];
  if (row.product_variants.some((variant) => Boolean(variant.size))) names.push("Size");
  if (row.product_variants.some((variant) => Boolean(variant.colour))) names.push("Colour");
  return names.length ? names : ["Option"];
}

export function mapInventoryProductRow(row: InventoryProductRow): InventoryProduct {
  const media = row.product_media.map(mapMedia);
  const base = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.catalogue_categories?.name ?? "Uncategorised",
    collection: row.catalogue_collections?.name ?? null,
    brand: row.brand ?? "Unlabelled",
    material: row.material,
    fit: row.fit,
    style: row.style,
    careInstructions: row.care_instructions,
    flawNotes: row.flaw_notes,
    image: media.find((item) => item.kind === "cover")?.url ?? "/product-placeholder.svg",
    media,
    price: row.price.toNumber(),
    referencePrice: row.reference_price?.toNumber() ?? null,
    cost: row.cost?.toNumber() ?? null,
    lifecycle: row.lifecycle,
    publication: row.publication,
    channels: row.product_channels.map((entry) => mapChannel(entry.channel)),
    lowStockThreshold: row.low_stock_threshold,
    fulfilment: {
      weightKg: row.weight_grams === null ? null : row.weight_grams / 1000,
      pickupAvailable: row.pickup_available,
      deliveryRestrictions: row.delivery_restrictions,
      packagingNotes: row.packaging_notes,
    },
    scheduledAt: row.scheduled_at?.toISOString(),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };

  if (row.inventory_mode === "unique") {
    return {
      ...base,
      inventoryMode: "unique",
      archiveNumber: row.archive_number ?? "Pending",
      condition: row.condition ?? "",
      size: row.size_label ?? "Not recorded",
      colour: row.colour ?? "Not recorded",
      measurements: row.product_measurements.map(({ label, value }) => ({ label, value })),
      stock: mapInventoryCounts(row.stock_levels[0]),
    };
  }

  if (row.inventory_mode === "stocked") {
    return {
      ...base,
      inventoryMode: "stocked",
      sku: row.sku ?? "Pending",
      sizeLabel: row.size_label ?? "Not recorded",
      colour: row.colour ?? "Not recorded",
      stock: mapInventoryCounts(row.stock_levels[0]),
    };
  }

  return {
    ...base,
    inventoryMode: "variant",
    optionNames: deriveOptionNames(row),
    variants: row.product_variants.map(mapVariant),
  };
}

export function encodeTaxonomyId(kind: CatalogueTaxonomyKind, id: string): string {
  return `${kind}:${id}`;
}

export function decodeTaxonomyId(
  taxonomyId: string,
): { kind: CatalogueTaxonomyKind; id: string } | null {
  const separator = taxonomyId.indexOf(":");
  if (separator < 1) return null;
  const kind = taxonomyId.slice(0, separator);
  const id = taxonomyId.slice(separator + 1);
  if ((kind !== "category" && kind !== "collection") || !id) return null;
  return { kind, id };
}

export function mapTaxonomyRow(
  row: { id: string; slug: string; name: string; created_at: Date; updated_at: Date },
  kind: CatalogueTaxonomyKind,
): CatalogueTaxonomyItem {
  return {
    id: encodeTaxonomyId(kind, row.id),
    kind,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapStockMovementKind(kind: string): StockMovement["kind"] {
  if (kind === "reservation_released" || kind === "commitment_released") return "released";
  if (kind === "committed") return "reserved";
  return kind as StockMovement["kind"];
}

export function mapStockMovementRow(row: {
  id: string;
  product_id: string;
  variant_id: string | null;
  kind: string;
  quantity: number;
  occurred_at: Date;
  note: string | null;
  profiles: { display_name: string | null } | null;
}): StockMovement {
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    kind: mapStockMovementKind(row.kind),
    quantity: row.quantity,
    occurredAt: row.occurred_at.toISOString(),
    actor: row.profiles?.display_name ?? "Store owner",
    note: row.note ?? "",
  };
}
