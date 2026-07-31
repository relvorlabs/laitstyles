import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import {
  buildStorefrontCatalogue,
  buildStorefrontShellCatalogue,
} from "@/modules/products/server/storefront/catalogue-projection";
import {
  listPublishedProductDetails,
  listStorefrontCategories,
} from "@/modules/products/server/storefront/queries";
import { publishedProductWhere } from "@/modules/products/server/storefront/visibility";
import type {
  StorefrontCatalogueProduct,
  StorefrontCondition,
  StorefrontInventory,
  StorefrontShellCataloguePayload,
  StorefrontStatus,
} from "@/modules/products/storefront/catalogue-contract";
import type { ProductVariantOption } from "@/modules/products/storefront-types";

const useStyleSmokeCatalogue = process.env.STOREFRONT_STYLE_SMOKE === "1";

const shellProductInclude = {
  catalogue_categories: { select: { id: true, slug: true, name: true } },
  catalogue_collections: { select: { id: true, slug: true, name: true } },
  product_media: {
    where: { kind: "product_cover" },
    orderBy: { position: "asc" },
    take: 1,
    include: { cloudinary_assets: true },
  },
  stock_levels: true,
  product_variants: {
    orderBy: { position: "asc" },
    include: { stock_levels: true },
  },
} satisfies Prisma.productsInclude;

type ShellProductRow = Prisma.productsGetPayload<{ include: typeof shellProductInclude }>;
type ShellVariantRow = ShellProductRow["product_variants"][number];
type ShellStockRow = ShellProductRow["stock_levels"][number];

export async function getStorefrontShellCatalogue(): Promise<StorefrontShellCataloguePayload> {
  "use cache";
  cacheTag("catalogue");
  cacheLife("minutes");

  if (useStyleSmokeCatalogue) {
    const [details, categories] = await Promise.all([
      listPublishedProductDetails(),
      listStorefrontCategories(),
    ]);
    return buildStorefrontShellCatalogue(buildStorefrontCatalogue(details, categories));
  }

  const [rows, categories, categoryCounts] = await Promise.all([
    prisma.products.findMany({
      where: publishedProductWhere(),
      include: shellProductInclude,
      orderBy: { created_at: "desc" },
    }),
    prisma.catalogue_categories.findMany({
      orderBy: { position: "asc" },
      select: { id: true, slug: true, name: true, image_url: true },
    }),
    prisma.products.groupBy({
      by: ["category_id"],
      where: publishedProductWhere(),
      _count: { _all: true },
    }),
  ]);

  const countByCategory = new Map(
    categoryCounts.flatMap((row) =>
      row.category_id ? [[row.category_id, row._count._all] as const] : [],
    ),
  );

  return {
    availability: "ready",
    products: rows.map(mapShellProduct),
    categories: categories.flatMap((category) => {
      const productCount = countByCategory.get(category.id) ?? 0;
      return productCount > 0
        ? [
            {
              id: category.id,
              slug: category.slug,
              name: category.name,
              imageUrl: category.image_url,
              productCount,
            },
          ]
        : [];
    }),
    measurementsCm: {},
    variantOptionsByProductId: Object.fromEntries(
      rows.map((row) => [row.id, mapVariantOptions(row)]),
    ),
  };
}

function mapShellProduct(row: ShellProductRow, index: number): StorefrontCatalogueProduct {
  const mode = mapInventory(row.inventory_mode);
  const variants = mapVariantOptions(row);
  const availability = productAvailability(row.inventory_mode, row.stock_levels, row.product_variants);
  const cover = row.product_media[0]?.cloudinary_assets;
  const defaultImage = cover?.delivery_url ?? cover?.secure_url ?? null;
  const size =
    row.inventory_mode === "variant"
      ? variants
          .map((variant) => variant.size ?? variant.label)
          .filter(Boolean)
          .join("–")
      : (row.size_label ?? "One size");
  const colour = row.colour ?? variants.find((variant) => variant.colour)?.colour ?? "";

  return {
    id: row.id,
    databaseId: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand ?? "Unbranded",
    brandStatus: row.brand ? "Branded" : "Unbranded",
    category: row.catalogue_collections?.name ?? "Unisex",
    type: row.catalogue_categories?.name ?? "Pieces",
    style: row.style ?? "Essentials",
    price: row.price.toNumber(),
    referencePrice:
      row.reference_price && row.reference_price.greaterThan(row.price)
        ? row.reference_price.toNumber()
        : null,
    condition: mapCondition(row.condition),
    size: size || "One size",
    fit: row.fit ?? size || "One size",
    colour,
    inventory: mode,
    stock: availability.available,
    status: availability.status,
    new: index < 20,
    saved: 0,
    flaw: "",
    material: row.material ?? "Material not specified",
    careInstructions: "",
    defaultImage,
    images: defaultImage ? [defaultImage] : [],
    ...(row.inventory_mode === "variant"
      ? { variants: variants.map((variant) => variant.size ?? variant.label) }
      : {}),
  };
}

function mapVariantOptions(row: ShellProductRow): ProductVariantOption[] {
  if (row.inventory_mode !== "variant") return [];
  return row.product_variants.map((variant) => {
    const availability = variantAvailability(variant);
    return {
      id: variant.id,
      label: variant.label,
      sku: variant.sku,
      size: variant.size,
      colour: variant.colour,
      colourHex: null,
      price: variant.price ? Math.round(variant.price.toNumber() * 100) : null,
      availability: {
        state: availability.status,
        available: availability.available,
        isOneOfOne: false,
      },
    };
  });
}

function productAvailability(
  mode: ShellProductRow["inventory_mode"],
  stockLevels: ShellStockRow[],
  variants: ShellVariantRow[],
): { available: number; status: StorefrontStatus } {
  if (mode === "variant") {
    return combineStock(variants.flatMap((variant) => variant.stock_levels));
  }
  return combineStock(stockLevels.filter((stock) => stock.variant_id === null));
}

function variantAvailability(
  variant: ShellVariantRow,
): { available: number; status: "available" | "reserved_by_others" | "sold_out" } {
  const result = combineStock(variant.stock_levels);
  return {
    available: result.available,
    status:
      result.status === "available"
        ? "available"
        : result.status === "reserved"
          ? "reserved_by_others"
          : "sold_out",
  };
}

function combineStock(
  stockLevels: readonly { available: number; reserved: number }[],
): { available: number; status: StorefrontStatus } {
  const available = stockLevels.reduce((total, stock) => total + stock.available, 0);
  const reserved = stockLevels.reduce((total, stock) => total + stock.reserved, 0);
  return {
    available,
    status: available > 0 ? "available" : reserved > 0 ? "reserved" : "sold",
  };
}

function mapCondition(value: string | null): StorefrontCondition {
  if (value === "Excellent") return "A+";
  if (value === "Fair") return "B+";
  return "A";
}

function mapInventory(value: ShellProductRow["inventory_mode"]): StorefrontInventory {
  if (value === "unique") return "one-of-one";
  if (value === "stocked") return "matching-stock";
  return "variant";
}
