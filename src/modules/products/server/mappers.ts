import "server-only";

import type { Prisma } from "@/lib/prisma";
import { mapInventoryCounts } from "@/modules/inventory/server/mappers";
import type {
  AdminProduct,
  CatalogueChannel,
  ProductMedia,
  ProductMediaKind,
  ProductTaxonomyItem,
  ProductTaxonomyKind,
  ProductVariant,
} from "@/modules/products/types";

export const adminProductInclude = {
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
          width: true,
          height: true,
          format: true,
          bytes: true,
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
            select: {
              secure_url: true,
              delivery_url: true,
              public_id: true,
              width: true,
              height: true,
              format: true,
              bytes: true,
            },
          },
        },
      },
    },
  },
  stock_levels: { where: { variant_id: null } },
} satisfies Prisma.productsInclude;

export type AdminProductRow = Prisma.productsGetPayload<{
  include: typeof adminProductInclude;
}>;

function mapChannel(channel: string): CatalogueChannel {
  return channel === "physical_store" ? "physical-store" : (channel as CatalogueChannel);
}

function mapMediaKind(kind: string): ProductMediaKind {
  if (kind === "product_detail") return "detail";
  if (kind === "product_defect") return "defect";
  return "cover";
}

function mapMedia(row: AdminProductRow["product_media"][number]): ProductMedia {
  const asset = row.cloudinary_assets;
  return {
    id: row.id,
    publicId: asset.public_id,
    url: asset.delivery_url ?? asset.secure_url,
    width: asset.width,
    height: asset.height,
    format: asset.format,
    bytes: asset.bytes,
    alt: asset.alt,
    kind: mapMediaKind(row.kind),
    position: row.position,
  };
}

function mapVariant(row: AdminProductRow["product_variants"][number]): ProductVariant {
  const asset = row.product_media[0]?.cloudinary_assets;
  return {
    id: row.id,
    label: row.label,
    sku: row.sku ?? "",
    size: row.size,
    colour: row.colour,
    image: asset
      ? {
          publicId: asset.public_id,
          url: asset.delivery_url ?? asset.secure_url,
          width: asset.width,
          height: asset.height,
          format: asset.format,
          bytes: asset.bytes,
        }
      : null,
    price: row.price?.toNumber() ?? null,
    cost: row.cost?.toNumber() ?? null,
    stock: mapInventoryCounts(row.stock_levels[0]),
  };
}

function deriveOptionNames(row: AdminProductRow): string[] {
  const names: string[] = [];
  if (row.product_variants.some((variant) => Boolean(variant.size))) names.push("Size");
  if (row.product_variants.some((variant) => Boolean(variant.colour))) names.push("Colour");
  return names.length ? names : ["Option"];
}

export function mapAdminProductRow(row: AdminProductRow): AdminProduct {
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

export function encodeProductTaxonomyId(kind: ProductTaxonomyKind, id: string): string {
  return `${kind}:${id}`;
}

export function decodeProductTaxonomyId(
  taxonomyId: string,
): { kind: ProductTaxonomyKind; id: string } | null {
  const separator = taxonomyId.indexOf(":");
  if (separator < 1) return null;
  const kind = taxonomyId.slice(0, separator);
  const id = taxonomyId.slice(separator + 1);
  if ((kind !== "category" && kind !== "collection") || !id) return null;
  return { kind, id };
}

export function mapProductTaxonomyRow(
  row: { id: string; slug: string; name: string; created_at: Date; updated_at: Date },
  kind: ProductTaxonomyKind,
): ProductTaxonomyItem {
  return {
    id: encodeProductTaxonomyId(kind, row.id),
    kind,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
