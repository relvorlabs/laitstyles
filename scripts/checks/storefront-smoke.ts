/**
 * Runtime acceptance smoke test for the canonical product domain.
 * Exercises the real server data layer against the development database:
 *   - storefront reads published products through the product module
 *   - the public read model and availability derive correctly
 *   - the canonical product command persists a product the storefront can read
 *
 * Run after the seed, under the react-server condition so `server-only` and
 * React cache primitives resolve:
 *   NODE_OPTIONS=--conditions=react-server pnpm exec tsx scripts/checks/storefront-smoke.ts
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const OWNER_ID = "11111111-1111-4111-8111-111111111111";
const SMOKE_SLUG = "smoke-admin-write";

async function main() {
  const { createEmptyProductEditorValues } = await import(
    "@/lib/admin/product-editor/product-editor-defaults"
  );
  const { saveProduct } = await import("@/modules/products/server/product-commands");
  const { countPublishedProducts, getPublishedProductBySlug, listPublishedProducts } = await import(
    "@/modules/products/server/storefront/queries"
  );

  const before = await countPublishedProducts();
  console.warn(`published products (read via product module): ${before}`);

  const list = await listPublishedProducts({ limit: 20 });
  for (const product of list) {
    console.warn(
      `  • ${product.slug} [${product.mode}] ${product.availability.state} avail=${product.availability.available} ₦${product.price / 100}${product.referencePrice ? ` (was ₦${product.referencePrice / 100})` : ""}`,
    );
  }

  const unique = await getPublishedProductBySlug("botanical-print-jacket");
  console.warn(
    `PDP unique: ${unique?.name} mode=${unique?.mode} oneOfOne=${unique?.availability.isOneOfOne} state=${unique?.availability.state} media=${unique?.media.length}`,
  );

  const variant = await getPublishedProductBySlug("daisy-field-dress");
  const variantCount = variant && variant.mode === "variant" ? variant.variants.length : 0;
  console.warn(`PDP variant: ${variant?.name} mode=${variant?.mode} variants=${variantCount}`);

  const existing = await getPublishedProductBySlug(SMOKE_SLUG);
  if (!existing) {
    const values = createEmptyProductEditorValues("stocked");
    if (values.inventoryMode !== "stocked") {
      throw new Error("The stocked product editor factory returned an incompatible mode.");
    }
    values.name = "Smoke Admin Write";
    values.category = "Smoke checks";
    values.brand = "Laitstyles";
    values.description = "Created through the canonical product command during runtime verification.";
    values.internalReference = "SMOKE-ADMIN-WRITE";
    values.media = [
      {
        id: "smoke-cover",
        publicId: "sample",
        url: "https://res.cloudinary.com/demo/image/upload/v1/sample.jpg",
        width: null,
        height: null,
        format: null,
        bytes: null,
        alt: "Smoke admin write",
        kind: "cover",
        position: 0,
        source: "upload",
      },
    ];
    values.sellingPrice = 15_000;
    values.channels = ["storefront"];
    values.stocked = { sizeLabel: "One size", colour: "Neutral", quantity: 3 };

    const result = await saveProduct(
      {
        kind: "staff",
        authUserId: OWNER_ID,
        email: null,
        displayName: "Storefront smoke runner",
        role: "admin",
      },
      values,
      "publish",
    );
    if (!result.ok) {
      throw new Error(`Canonical product write failed: ${result.error.message}`);
    }
    console.warn(`canonical product write: OK created ${result.value.product.slug}`);
  } else {
    console.warn(`canonical product write: existing ${existing.slug} reused`);
  }

  const written = await getPublishedProductBySlug(SMOKE_SLUG);
  if (!written) throw new Error("The storefront could not reload the product created by saveProduct.");
  console.warn("storefront reads canonical product write: YES");

  const after = await countPublishedProducts();
  console.warn(`published products after write: ${after}`);
  console.warn("SMOKE OK");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
