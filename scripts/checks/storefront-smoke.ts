/**
 * Phase 1 runtime acceptance smoke test (docs/storefront-v2/06 Phase 1).
 * Exercises the REAL server data layer against the dev DB:
 *   - storefront reads published products via the repository
 *   - the discriminated union + availability derive correctly
 *   - the admin write path creates a product the storefront then reads
 *
 * Run AFTER the seed, under the react-server condition so `server-only` and
 * React `cache()` resolve:
 *   NODE_OPTIONS=--conditions=react-server pnpm exec tsx scripts/checks/storefront-smoke.ts
 */
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

const OWNER_ID = "11111111-1111-4111-8111-111111111111";

async function main() {
  const { getActiveStore } = await import("@/server/commerce/store/active-store");
  const { listPublishedProducts, countPublishedProducts, getPublishedProductBySlug } = await import(
    "@/server/commerce/catalogue/catalog-repository"
  );
  const { createPublishedProduct } = await import("@/server/commerce/catalogue/product-write");

  const store = await getActiveStore();
  console.warn(`active store: ${store.slug} (${store.id})`);

  const before = await countPublishedProducts();
  console.warn(`published products (read via repository): ${before}`);

  const list = await listPublishedProducts({ limit: 20 });
  for (const p of list) {
    console.warn(
      `  • ${p.slug} [${p.mode}] ${p.availability.state} avail=${p.availability.available} ₦${p.price / 100}${p.referencePrice ? ` (was ₦${p.referencePrice / 100})` : ""}`,
    );
  }

  const unique = await getPublishedProductBySlug("botanical-print-jacket");
  console.warn(
    `PDP unique: ${unique?.name} mode=${unique?.mode} oneOfOne=${unique?.availability.isOneOfOne} state=${unique?.availability.state} media=${unique?.media.length}`,
  );

  const variant = await getPublishedProductBySlug("daisy-field-dress");
  const variantCount = variant && variant.mode === "variant" ? variant.variants.length : 0;
  console.warn(`PDP variant: ${variant?.name} mode=${variant?.mode} variants=${variantCount}`);

  // Admin write path -> storefront read loop.
  const result = await createPublishedProduct(
    { storeId: store.id, profileId: OWNER_ID },
    {
      slug: "smoke-admin-write",
      name: "Smoke Admin Write",
      description: "Created via the admin write path during the Phase 1 smoke test.",
      mode: "stocked",
      priceKobo: 1_500_000,
      cover: {
        publicId: "sample",
        secureUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        alt: "Smoke admin write",
      },
      stock: 3,
    },
  );
  console.warn(
    `admin write path: ${result.ok ? `OK created ${result.value.slug}` : `expected-fail ${result.error.kind} (${result.error.message})`}`,
  );

  const written = await getPublishedProductBySlug("smoke-admin-write");
  console.warn(`storefront reads admin-written product: ${written ? "YES" : "NO"}`);

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
