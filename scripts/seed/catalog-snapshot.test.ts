import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareCatalogSnapshot } from "./catalog-snapshot";

const ID = {
  category: "019f65c1-74fe-7bd3-8100-000000000001",
  collection: "019f65c1-74fe-7bd3-8200-000000000001",
  asset: "019f65c1-74fe-7bd3-8300-000000000001",
  product: "019f65c1-74fe-7bd3-8400-000000000001",
  media: "019f65c1-74fe-7bd3-8500-000000000001",
  measurement: "019f65c1-74fe-7bd3-8600-000000000001",
  variant: "019f65c1-74fe-7bd3-8700-000000000001",
  stock: "019f65c1-74fe-7bd3-8800-000000000001",
} as const;

const NOW = "2026-07-15T14:30:00.000Z";

interface ProductFixture {
  id: string;
  category_id: string | null;
  collection_id: string | null;
  slug: string;
  name: string;
  description: string;
  inventory_mode: string;
  brand: string | null;
  price: number;
  reference_price: number | null;
  lifecycle: string;
  publication: string;
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

interface VariantFixture {
  id: string;
  product_id: string;
  title: string;
  sku: string | null;
  size_label: string | null;
  colour: string | null;
  price_override: number | null;
  created_at: string;
}

interface StockFixture {
  id: string;
  product_id: string;
  variant_id: string | null;
  quantity_on_hand: number;
  quantity_available: number;
  quantity_reserved: number;
  updated_at: string;
}

interface SnapshotFixture {
  schema_version: number;
  catalogue_categories: Array<{ id: string; slug: string; name: string; image_url: string }>;
  catalogue_collections: Array<{ id: string; slug: string; name: string }>;
  products: ProductFixture[];
  product_channels: Array<{ product_id: string; channel: string }>;
  product_variants: VariantFixture[];
  stock_levels: StockFixture[];
  product_measurements: Array<{
    id: string;
    product_id: string;
    variant_id: string | null;
    label: string;
    value: number;
    unit: string;
  }>;
  cloudinary_assets: Array<{
    id: string;
    secure_url: string;
    delivery_url: string | null;
    width: number | null;
    height: number | null;
    alt: string;
  }>;
  product_media: Array<{
    id: string;
    product_id: string;
    variant_id: string | null;
    asset_id: string;
    role: string;
    position: number;
  }>;
}

function validSnapshot(): SnapshotFixture {
  return {
    schema_version: 2,
    catalogue_categories: [
      { id: ID.category, slug: "jackets", name: "Jackets", image_url: "https://example.com/a.jpg" },
    ],
    catalogue_collections: [{ id: ID.collection, slug: "edit", name: "Edit" }],
    products: [
      {
        id: ID.product,
        category_id: ID.category,
        collection_id: ID.collection,
        slug: "one-jacket",
        name: "One Jacket",
        description: "Description",
        inventory_mode: "unique",
        brand: null,
        price: 100,
        reference_price: null,
        lifecycle: "active",
        publication: "published",
        low_stock_threshold: 1,
        archive_number: "LST-1",
        sku: "SKU-1",
        condition: "Good",
        size_label: "M",
        colour: "Black",
        material: null,
        fit: null,
        style: null,
        care_instructions: null,
        flaw_notes: null,
        scheduled_at: null,
        created_at: NOW,
        updated_at: NOW,
      },
    ],
    product_channels: [{ product_id: ID.product, channel: "storefront" }],
    product_variants: [],
    stock_levels: [
      {
        id: ID.stock,
        product_id: ID.product,
        variant_id: null,
        quantity_on_hand: 1,
        quantity_available: 1,
        quantity_reserved: 0,
        updated_at: NOW,
      },
    ],
    product_measurements: [
      {
        id: ID.measurement,
        product_id: ID.product,
        variant_id: null,
        label: "Length",
        value: 60,
        unit: "cm",
      },
    ],
    cloudinary_assets: [
      {
        id: ID.asset,
        secure_url: "https://example.com/a.jpg",
        delivery_url: null,
        width: null,
        height: null,
        alt: "One Jacket",
      },
    ],
    product_media: [
      {
        id: ID.media,
        product_id: ID.product,
        variant_id: null,
        asset_id: ID.asset,
        role: "cover",
        position: 0,
      },
    ],
  };
}

test("accepts a valid schema-v2 unique-product snapshot", () => {
  const prepared = prepareCatalogSnapshot(validSnapshot());
  assert.equal(prepared.snapshot.products.length, 1);
  assert.equal(prepared.counts.droppedVariantMeasurements, 0);
});

test("rejects unsupported versions and malformed UUID, date, or enum values", () => {
  const version = validSnapshot();
  version.schema_version = 3;
  assert.throws(() => prepareCatalogSnapshot(version), /schema_version/);

  const uuid = validSnapshot();
  uuid.products[0].id = "not-a-uuid";
  assert.throws(() => prepareCatalogSnapshot(uuid), /UUID/);

  const date = validSnapshot();
  date.products[0].created_at = "not-a-date";
  assert.throws(() => prepareCatalogSnapshot(date), /date/);

  const enumValue = validSnapshot();
  enumValue.products[0].inventory_mode = "unlimited";
  assert.throws(() => prepareCatalogSnapshot(enumValue), /inventory_mode/);
});

test("rejects duplicate ids, slugs, product SKUs, and archive numbers", () => {
  for (const key of ["id", "slug", "sku", "archive_number"] as const) {
    const input = validSnapshot();
    input.products.push({
      ...input.products[0],
      id: "019f65c1-74fe-7bd3-8400-000000000002",
      slug: "another-jacket",
      sku: "SKU-2",
      archive_number: "LST-2",
      [key]: input.products[0][key],
    });
    assert.throws(() => prepareCatalogSnapshot(input), new RegExp(key));
  }
});

test("rejects duplicate variant SKUs within a product before any write", () => {
  const input = validSnapshot();
  input.products[0].inventory_mode = "variant";
  input.product_variants = [
    {
      id: ID.variant,
      product_id: ID.product,
      title: "Small",
      sku: "DUPLICATE",
      size_label: "S",
      colour: null,
      price_override: null,
      created_at: NOW,
    },
    {
      id: "019f65c1-74fe-7bd3-8700-000000000002",
      product_id: ID.product,
      title: "Medium",
      sku: "DUPLICATE",
      size_label: "M",
      colour: null,
      price_override: null,
      created_at: NOW,
    },
  ];
  input.stock_levels = input.product_variants.map((variant, index) => ({
    id: `019f65c1-74fe-7bd3-8800-00000000000${index + 1}`,
    product_id: ID.product,
    variant_id: variant.id,
    quantity_on_hand: 1,
    quantity_available: 1,
    quantity_reserved: 0,
    updated_at: NOW,
  }));

  assert.throws(
    () => prepareCatalogSnapshot(input),
    /product_variants\.product_id\+sku.*duplicate/,
  );
});

test("rejects negative monetary or stock values", () => {
  const money = validSnapshot();
  money.products[0].price = -1;
  assert.throws(() => prepareCatalogSnapshot(money), /price/);

  const stock = validSnapshot();
  stock.stock_levels[0].quantity_available = -1;
  assert.throws(() => prepareCatalogSnapshot(stock), /quantity_available/);
});

test("rejects missing foreign keys and cross-product variant relationships", () => {
  const missingCategory = validSnapshot();
  missingCategory.products[0].category_id = "019f65c1-74fe-7bd3-8100-000000000099";
  assert.throws(() => prepareCatalogSnapshot(missingCategory), /category_id/);

  const crossProduct = validSnapshot();
  crossProduct.products[0].inventory_mode = "variant";
  const secondProductId = "019f65c1-74fe-7bd3-8400-000000000002";
  crossProduct.products.push({
    ...crossProduct.products[0],
    id: secondProductId,
    slug: "another-jacket",
    sku: "SKU-2",
    archive_number: "LST-2",
    inventory_mode: "stocked",
  });
  crossProduct.product_variants = [
    {
      id: ID.variant,
      product_id: ID.product,
      title: "Small",
      sku: null,
      size_label: "S",
      colour: null,
      price_override: null,
      created_at: NOW,
    },
  ];
  crossProduct.stock_levels = [
    {
      ...crossProduct.stock_levels[0],
      variant_id: ID.variant,
      product_id: secondProductId,
    },
    {
      ...crossProduct.stock_levels[0],
      id: "019f65c1-74fe-7bd3-8800-000000000002",
      product_id: secondProductId,
    },
  ];
  assert.throws(() => prepareCatalogSnapshot(crossProduct), /same product/);
});

test("enforces inventory-mode stock shape and unique quantity", () => {
  const uniqueQuantity = validSnapshot();
  uniqueQuantity.stock_levels[0].quantity_on_hand = 2;
  uniqueQuantity.stock_levels[0].quantity_available = 2;
  assert.throws(() => prepareCatalogSnapshot(uniqueQuantity), /unique/);

  const variantWithoutVariants = validSnapshot();
  variantWithoutVariants.products[0].inventory_mode = "variant";
  assert.throws(() => prepareCatalogSnapshot(variantWithoutVariants), /variant stock/);
});
