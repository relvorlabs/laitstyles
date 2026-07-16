import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const tableNames = [
  "catalogue_categories",
  "catalogue_collections",
  "products",
  "product_channels",
  "product_variants",
  "product_options",
  "product_option_values",
  "variant_option_values",
  "stock_levels",
  "product_measurements",
  "product_condition_reports",
  "cloudinary_assets",
  "product_media",
  "tags",
  "product_tags",
  "asset_source_index",
];

const [sourceArg, outputArg] = process.argv.slice(2);
if (!sourceArg || !outputArg) {
  throw new Error(
    "Usage: node scripts/build-storefront-catalog.mjs <dataset-directory> <output-file>",
  );
}

const sourceDirectory = path.resolve(sourceArg);
const outputFile = path.resolve(outputArg);
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

const manifest = await readJson(path.join(sourceDirectory, "manifest.json"));
const tables = Object.fromEntries(
  await Promise.all(
    tableNames.map(async (tableName) => [
      tableName,
      await readJson(path.join(sourceDirectory, "tables", `${tableName}.json`)),
    ]),
  ),
);

function invariant(condition, message) {
  if (!condition) throw new Error(`Invalid storefront dataset: ${message}`);
}

function uniqueIds(tableName) {
  const rows = tables[tableName];
  const ids = rows.map((row) => row.id);
  invariant(ids.every(Boolean), `${tableName} contains a row without an id`);
  invariant(new Set(ids).size === ids.length, `${tableName} contains duplicate ids`);
  return new Set(ids);
}

invariant(manifest.schema_version === 2, "schema_version must be 2");
invariant(tables.products.length === 100, "exactly 100 products are required");
for (const [tableName, expectedCount] of Object.entries(manifest.counts)) {
  invariant(
    Array.isArray(tables[tableName]) && tables[tableName].length === expectedCount,
    `${tableName} count does not match the manifest`,
  );
}

const categoryIds = uniqueIds("catalogue_categories");
const collectionIds = uniqueIds("catalogue_collections");
const productIds = uniqueIds("products");
const variantIds = uniqueIds("product_variants");
const optionIds = uniqueIds("product_options");
const optionValueIds = uniqueIds("product_option_values");
const assetIds = uniqueIds("cloudinary_assets");
const tagIds = uniqueIds("tags");

for (const category of tables.catalogue_categories) {
  invariant(category.image_url, `${category.id} has no category image`);
}

for (const product of tables.products) {
  invariant(
    product.category_id === null || categoryIds.has(product.category_id),
    `${product.id} references an unknown category`,
  );
  invariant(
    product.collection_id === null || collectionIds.has(product.collection_id),
    `${product.id} references an unknown collection`,
  );
  invariant(Number.isFinite(product.price) && product.price > 0, `${product.id} has invalid price`);
  const stock = tables.stock_levels.filter((row) => row.product_id === product.id);
  const variants = tables.product_variants.filter((row) => row.product_id === product.id);
  if (product.inventory_mode === "unique") {
    invariant(product.archive_number, `${product.id} unique product has no archive number`);
    invariant(
      stock.length === 1 && stock[0].variant_id === null && stock[0].quantity_on_hand === 1,
      `${product.id} has invalid unique stock`,
    );
  } else if (product.inventory_mode === "stocked") {
    invariant(product.sku, `${product.id} stocked product has no SKU`);
    invariant(
      stock.length === 1 && stock[0].variant_id === null,
      `${product.id} has invalid stocked stock`,
    );
  } else if (product.inventory_mode === "variant") {
    invariant(variants.length > 0, `${product.id} has no variants`);
    invariant(
      stock.every((row) => row.variant_id && variantIds.has(row.variant_id)),
      `${product.id} has invalid variant stock`,
    );
  } else {
    invariant(false, `${product.id} has unknown inventory mode`);
  }
}

for (const relation of tables.product_channels) {
  invariant(productIds.has(relation.product_id), "product_channels has a broken product FK");
}
for (const relation of tables.product_media) {
  invariant(productIds.has(relation.product_id), `${relation.id} has a broken product FK`);
  invariant(assetIds.has(relation.asset_id), `${relation.id} has a broken asset FK`);
  invariant(
    relation.variant_id === null || variantIds.has(relation.variant_id),
    `${relation.id} has a broken variant FK`,
  );
}
for (const relation of tables.product_measurements) {
  invariant(productIds.has(relation.product_id), `${relation.id} has a broken product FK`);
  invariant(
    relation.variant_id === null || variantIds.has(relation.variant_id),
    `${relation.id} has a broken variant FK`,
  );
}
for (const relation of tables.product_condition_reports) {
  invariant(productIds.has(relation.product_id), `${relation.id} has a broken product FK`);
}
for (const relation of tables.product_options) {
  invariant(productIds.has(relation.product_id), `${relation.id} has a broken product FK`);
}
for (const relation of tables.product_option_values) {
  invariant(optionIds.has(relation.product_option_id), `${relation.id} has a broken option FK`);
}
for (const relation of tables.variant_option_values) {
  invariant(variantIds.has(relation.variant_id), `${relation.id} has a broken variant FK`);
  invariant(
    optionValueIds.has(relation.product_option_value_id),
    `${relation.id} has a broken option-value FK`,
  );
}
for (const relation of tables.product_tags) {
  invariant(productIds.has(relation.product_id), `${relation.id} has a broken product FK`);
  invariant(tagIds.has(relation.tag_id), `${relation.id} has a broken tag FK`);
}
for (const stock of tables.stock_levels) {
  invariant(productIds.has(stock.product_id), `${stock.id} has a broken product FK`);
  invariant(
    stock.variant_id === null || variantIds.has(stock.variant_id),
    `${stock.id} has a broken variant FK`,
  );
  invariant(
    stock.quantity_available === stock.quantity_on_hand - stock.quantity_reserved,
    `${stock.id} has inconsistent stock arithmetic`,
  );
}

const catalog = {
  schema_version: manifest.schema_version,
  generated_at: manifest.generated_at,
  dataset_name: manifest.dataset_name,
  currency: manifest.currency,
  money_unit: manifest.money_unit,
  asset_strategy: manifest.asset_strategy,
  source_contract: manifest.source_contract,
  counts: manifest.counts,
  ...tables,
};

await writeFile(outputFile, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
console.log(`Wrote ${tables.products.length} products and ${tableNames.length} relations to ${outputFile}`);
