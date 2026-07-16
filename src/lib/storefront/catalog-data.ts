import "server-only";

import { cache } from "react";
import type { Product } from "@/features/storefront/shared/catalogue-data";
import { nairaToKobo } from "@/lib/money";
import type {
  Availability,
  ProductDetail,
  ProductImage,
  ProductSummary,
  ProductVariantOption,
  TaxonomyRef,
} from "@/lib/storefront/types";
import rawCatalog from "../../../public/assets/data/storefront-catalog.json";

type InventoryMode = "unique" | "stocked" | "variant";

interface ProductRow {
  id: string;
  category_id: string | null;
  collection_id: string | null;
  slug: string;
  name: string;
  description: string;
  inventory_mode: InventoryMode;
  brand: string | null;
  price: number;
  reference_price: number | null;
  lifecycle: "draft" | "intake" | "active" | "archived";
  publication: "published" | "unpublished" | "scheduled";
  low_stock_threshold: number;
  archive_number: string | null;
  sku: string | null;
  condition: string | null;
  size_label: string | null;
  colour: string | null;
  material: string | null;
  fit: string | null;
  style: string | null;
  care_instructions: string | null;
  flaw_notes: string | null;
  scheduled_at: string | null;
  created_at: string;
  updated_at: string;
}

interface VariantRow {
  id: string;
  product_id: string;
  sku: string | null;
  title: string;
  size_label: string | null;
  colour: string | null;
  price_override: number | null;
  status: string;
  created_at: string;
}

interface StockRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  updated_at: string;
}

interface CatalogSnapshot {
  schema_version: 2;
  generated_at: string;
  currency: "NGN";
  money_unit: "major";
  source_contract: { public_projection: true; excluded_private_fields: string[] };
  catalogue_categories: Array<{
    id: string;
    slug: string;
    name: string;
    image_url: string;
  }>;
  catalogue_collections: Array<{ id: string; slug: string; name: string }>;
  products: ProductRow[];
  product_channels: Array<{ product_id: string; channel: string }>;
  product_variants: VariantRow[];
  stock_levels: StockRow[];
  product_measurements: Array<{
    id: string;
    product_id: string;
    variant_id: string | null;
    label: string;
    value: number;
    unit: string;
  }>;
  product_condition_reports: Array<{ id: string; product_id: string }>;
  cloudinary_assets: Array<{
    id: string;
    secure_url: string;
    delivery_url: string | null;
    width: number | null;
    height: number | null;
    alt: string;
    external_only: boolean;
    provider_photo_id: string;
  }>;
  product_media: Array<{
    id: string;
    product_id: string;
    variant_id: string | null;
    asset_id: string;
    role: "cover" | "detail" | "defect";
    position: number;
  }>;
  product_options: Array<{ id: string; product_id: string }>;
  product_option_values: Array<{ id: string; product_option_id: string }>;
  variant_option_values: Array<{
    id: string;
    variant_id: string;
    product_option_value_id: string;
  }>;
  tags: Array<{ id: string }>;
  product_tags: Array<{ id: string; product_id: string; tag_id: string }>;
  asset_source_index: unknown[];
}

export interface StorefrontCatalogPayload {
  products: Product[];
  categories: StorefrontCategory[];
  measurementsCm: Record<string, number>;
}

export interface StorefrontCategory {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  productCount: number;
}

function invalid(message: string): never {
  throw new Error(`Invalid public storefront catalog: ${message}`);
}

function assertCatalog(value: unknown): asserts value is CatalogSnapshot {
  if (!value || typeof value !== "object") invalid("root must be an object");
  const catalog = value as Partial<CatalogSnapshot>;
  if (catalog.schema_version !== 2) invalid("unsupported schema_version");
  if (catalog.currency !== "NGN" || catalog.money_unit !== "major") {
    invalid("money must use NGN major units");
  }
  if (!catalog.source_contract?.public_projection) invalid("catalog must be public-safe");
  const arrays: Array<keyof CatalogSnapshot> = [
    "catalogue_categories",
    "catalogue_collections",
    "products",
    "product_channels",
    "product_variants",
    "stock_levels",
    "product_measurements",
    "product_condition_reports",
    "cloudinary_assets",
    "product_media",
    "product_options",
    "product_option_values",
    "variant_option_values",
    "tags",
    "product_tags",
    "asset_source_index",
  ];
  for (const key of arrays) {
    if (!Array.isArray(catalog[key])) invalid(`${key} must be an array`);
  }
  if (catalog.products?.length !== 100) invalid("catalog must contain 100 products");

  const ids = (rows: Array<{ id: string }> | undefined) => new Set(rows?.map((row) => row.id));
  const productIds = ids(catalog.products);
  const categoryIds = ids(catalog.catalogue_categories);
  const collectionIds = ids(catalog.catalogue_collections);
  const variantIds = ids(catalog.product_variants);
  const assetIds = ids(catalog.cloudinary_assets);
  const optionIds = ids(catalog.product_options);
  const optionValueIds = ids(catalog.product_option_values);
  const tagIds = ids(catalog.tags);

  if (productIds.size !== catalog.products?.length) invalid("product ids must be unique");
  for (const product of catalog.products ?? []) {
    if (!product.id || !product.slug || !product.name)
      invalid("products require id, slug and name");
    if (product.category_id && !categoryIds.has(product.category_id)) {
      invalid(`${product.id} has an unknown category`);
    }
    if (product.collection_id && !collectionIds.has(product.collection_id)) {
      invalid(`${product.id} has an unknown collection`);
    }
    if (!Number.isFinite(product.price) || product.price <= 0) {
      invalid(`${product.id} has invalid price`);
    }
  }
  for (const category of catalog.catalogue_categories ?? []) {
    if (!category.id || !category.slug || !category.name || !category.image_url) {
      invalid("categories require id, slug, name and image_url");
    }
  }
  for (const media of catalog.product_media ?? []) {
    if (!productIds.has(media.product_id) || !assetIds.has(media.asset_id)) {
      invalid(`${media.id} has a broken media relation`);
    }
    if (media.variant_id && !variantIds.has(media.variant_id)) {
      invalid(`${media.id} has an unknown variant`);
    }
  }
  for (const row of catalog.stock_levels ?? []) {
    if (!productIds.has(row.product_id)) invalid(`${row.id} has an unknown product`);
    if (row.variant_id && !variantIds.has(row.variant_id)) {
      invalid(`${row.id} has an unknown variant`);
    }
    if (row.quantity_available !== row.quantity_on_hand - row.quantity_reserved) {
      invalid(`${row.id} has inconsistent stock`);
    }
  }
  for (const row of catalog.product_options ?? []) {
    if (!productIds.has(row.product_id)) invalid(`${row.id} has an unknown product`);
  }
  for (const row of catalog.product_option_values ?? []) {
    if (!optionIds.has(row.product_option_id)) invalid(`${row.id} has an unknown option`);
  }
  for (const row of catalog.variant_option_values ?? []) {
    if (!variantIds.has(row.variant_id) || !optionValueIds.has(row.product_option_value_id)) {
      invalid(`${row.id} has a broken option relation`);
    }
  }
  for (const row of catalog.product_tags ?? []) {
    if (!productIds.has(row.product_id) || !tagIds.has(row.tag_id)) {
      invalid(`${row.id} has a broken tag relation`);
    }
  }
}

assertCatalog(rawCatalog);
const snapshot: CatalogSnapshot = rawCatalog;

function buildCatalog(now = new Date()) {
  const categories = new Map(snapshot.catalogue_categories.map((row) => [row.id, row]));
  const collections = new Map(snapshot.catalogue_collections.map((row) => [row.id, row]));
  const assets = new Map(snapshot.cloudinary_assets.map((row) => [row.id, row]));
  const channels = new Set(
    snapshot.product_channels
      .filter((row) => row.channel === "storefront")
      .map((row) => row.product_id),
  );
  const taxonomy = (
    row: { id: string; slug: string; name: string } | undefined,
  ): TaxonomyRef | null => (row ? { id: row.id, slug: row.slug, name: row.name } : null);
  const stockFor = (productId: string, variantId?: string) =>
    snapshot.stock_levels.filter(
      (row) =>
        row.product_id === productId && (variantId === undefined || row.variant_id === variantId),
    );
  const availabilityFor = (product: ProductRow, variantId?: string): Availability => {
    const rows = stockFor(product.id, variantId);
    const available = rows.reduce((sum, row) => sum + row.quantity_available, 0);
    const reserved = rows.reduce((sum, row) => sum + row.quantity_reserved, 0);
    return {
      state:
        available <= 0
          ? reserved > 0
            ? "reserved_by_others"
            : "sold_out"
          : available <= product.low_stock_threshold && product.inventory_mode !== "unique"
            ? "low"
            : "available",
      available,
      isOneOfOne: product.inventory_mode === "unique",
    };
  };
  const mediaFor = (productId: string): ProductImage[] =>
    snapshot.product_media
      .filter((row) => row.product_id === productId)
      .toSorted((a, b) => a.position - b.position)
      .map((row) => {
        const asset = assets.get(row.asset_id);
        if (!asset) invalid(`${row.id} asset disappeared after validation`);
        return {
          id: row.id,
          url: asset.delivery_url ?? asset.secure_url,
          alt: asset.alt,
          kind: row.role,
          position: row.position,
          width: asset.width,
          height: asset.height,
        };
      });
  const variantsFor = (product: ProductRow): ProductVariantOption[] =>
    snapshot.product_variants
      .filter((row) => row.product_id === product.id && row.status === "active")
      .toSorted(
        (a, b) => a.created_at.localeCompare(b.created_at) || a.title.localeCompare(b.title),
      )
      .map((row) => ({
        id: row.id,
        label: row.title,
        sku: row.sku,
        size: row.size_label,
        colour: row.colour,
        price: row.price_override === null ? null : nairaToKobo(row.price_override),
        availability: availabilityFor(product, row.id),
      }));
  const visibleRows = snapshot.products.filter((product) => {
    const scheduled = product.scheduled_at ? new Date(product.scheduled_at) <= now : false;
    const published =
      product.publication === "published" || (product.publication === "scheduled" && scheduled);
    const hasCover = snapshot.product_media.some(
      (row) => row.product_id === product.id && row.role === "cover",
    );
    return (
      product.lifecycle === "active" &&
      published &&
      product.price > 0 &&
      channels.has(product.id) &&
      hasCover
    );
  });
  const productDetails: ProductDetail[] = visibleRows.map((product) => {
    const media = mediaFor(product.id);
    const common = {
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      price: nairaToKobo(product.price),
      referencePrice:
        product.reference_price && product.reference_price > product.price
          ? nairaToKobo(product.reference_price)
          : null,
      archiveNumber: product.archive_number,
      condition: product.condition,
      material: product.material,
      fit: product.fit,
      style: product.style,
      category: taxonomy(product.category_id ? categories.get(product.category_id) : undefined),
      collection: taxonomy(
        product.collection_id ? collections.get(product.collection_id) : undefined,
      ),
      cover: media.find((item) => item.kind === "cover") ?? null,
      description: product.description,
      media,
      measurements: snapshot.product_measurements
        .filter((row) => row.product_id === product.id && row.variant_id === null)
        .map((row, position) => ({
          label: row.label,
          value: `${row.value} ${row.unit}`,
          position,
        })),
      reviewSummary: {
        average: 0,
        count: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      },
      careInstructions: product.care_instructions,
      flawNotes: product.flaw_notes,
      availability: availabilityFor(product),
    };
    return product.inventory_mode === "variant"
      ? { ...common, mode: "variant", variants: variantsFor(product) }
      : {
          ...common,
          mode: product.inventory_mode,
          sizeLabel: product.size_label,
          colour: product.colour,
        };
  });
  const productSummaries: ProductSummary[] = productDetails.map((product) => ({
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: product.price,
    referencePrice: product.referencePrice,
    archiveNumber: product.archiveNumber,
    condition: product.condition,
    material: product.material,
    fit: product.fit,
    style: product.style,
    category: product.category,
    collection: product.collection,
    cover: product.cover,
    mode: product.mode,
    sizeLabel: product.mode === "variant" ? null : product.sizeLabel,
    colour: product.mode === "variant" ? null : product.colour,
    availability: product.availability,
  }));
  const condition = (value: string | null): Product["condition"] =>
    value === "Excellent" ? "A+" : value === "Fair" ? "B+" : "A";
  const products: Product[] = visibleRows.map((product, index) => {
    const detail = productDetails[index];
    const variants = variantsFor(product);
    const category = product.category_id ? categories.get(product.category_id) : undefined;
    const collection = product.collection_id ? collections.get(product.collection_id) : undefined;
    return {
      id: product.id,
      databaseId: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand ?? "Unbranded",
      brandStatus: product.brand ? "Branded" : "Unbranded",
      category: collection?.name ?? "Unisex",
      type: category?.name ?? "Pieces",
      style: product.style ?? "Essentials",
      price: product.price,
      referencePrice: product.reference_price,
      condition: condition(product.condition),
      size:
        product.size_label ??
        variants
          .map((variant) => variant.size)
          .filter(Boolean)
          .join("–"),
      fit: product.fit ?? product.size_label ?? "One size",
      colour: product.colour ?? variants[0]?.colour ?? "",
      inventory:
        product.inventory_mode === "unique"
          ? "one-of-one"
          : product.inventory_mode === "stocked"
            ? "matching-stock"
            : "variant",
      stock: detail.availability.available,
      status:
        detail.availability.state === "sold_out"
          ? "sold"
          : detail.availability.state === "reserved_by_others"
            ? "reserved"
            : "available",
      new: index < 20,
      saved: 0,
      flaw: product.flaw_notes ?? "None",
      material: product.material ?? "Material not specified",
      careInstructions: product.care_instructions ?? "Follow the garment care label.",
      images: detail.media.map((item) => item.url),
      ...(product.inventory_mode === "variant"
        ? { variants: variants.map((variant) => variant.size ?? variant.label) }
        : {}),
    };
  });
  const firstProductId = products[0]?.databaseId;
  const storefrontCategories: StorefrontCategory[] = snapshot.catalogue_categories.map(
    (category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      imageUrl: category.image_url,
      productCount: visibleRows.filter((product) => product.category_id === category.id).length,
    }),
  );
  const measurementsCm = Object.fromEntries(
    snapshot.product_measurements
      .filter(
        (row) => row.product_id === firstProductId && row.variant_id === null && row.unit === "cm",
      )
      .map((row) => [row.label, row.value]),
  );
  return {
    catalogSnapshot: snapshot,
    productDetails,
    productSummaries,
    storefront: {
      products,
      categories: storefrontCategories,
      measurementsCm,
    } satisfies StorefrontCatalogPayload,
  };
}

const getBuiltCatalog = cache(async () => buildCatalog());

export async function loadCatalogSnapshot() {
  return (await getBuiltCatalog()).catalogSnapshot;
}

export async function loadCatalogProductDetails() {
  return (await getBuiltCatalog()).productDetails;
}

export async function loadCatalogProductSummaries() {
  return (await getBuiltCatalog()).productSummaries;
}

export async function loadStorefrontCatalog(): Promise<StorefrontCatalogPayload> {
  return (await getBuiltCatalog()).storefront;
}

export async function loadStorefrontProductBySlug(slug: string) {
  const catalog = await loadStorefrontCatalog();
  return catalog.products.find((product) => product.slug === slug) ?? null;
}
