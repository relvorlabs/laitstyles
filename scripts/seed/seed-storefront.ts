/**
 * Deterministic dev seed for the storefront (docs/storefront-v2/06 Phase 1).
 * Creates the single admin profile, singleton settings, and a small published catalogue covering all three product
 * modes (unique / stocked / variant), each with a Cloudinary cover, stock and
 * a storefront channel — so the storefront can read real data end to end.
 *
 * Dev/throwaway DB only. Idempotent: safe to re-run. Uses its own PrismaClient
 * (not the app's server-only factory).
 *
 *   pnpm db:seed:storefront
 */
import { randomUUID } from "node:crypto";
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../prisma/generated/prisma/client";

loadEnv({ path: ".env.local" });

const connectionString = process.env.DIRECT_URL;
if (!connectionString) {
  throw new Error("DIRECT_URL is not set (seed requires the direct connection).");
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Stable ids for singletons so re-runs upsert cleanly.
const OWNER_ID = "11111111-1111-4111-8111-111111111111";

// Cloudinary's public demo cloud satisfies the secure_url check constraint
// (https://res.cloudinary.com/...) and renders a real image in dev.
const demoImage = (id: string) => `https://res.cloudinary.com/demo/image/upload/${id}.jpg`;

async function ensureApplicationState(): Promise<void> {
  await prisma.profiles.upsert({
    where: { id: OWNER_ID },
    update: { email: "owner@laitstyle.dev", role: "admin" },
    create: { id: OWNER_ID, email: "owner@laitstyle.dev", role: "admin" },
  });
  await prisma.store_settings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}

async function ensureCategory(slug: string, name: string, imageUrl: string): Promise<string> {
  const category = await prisma.catalogue_categories.upsert({
    where: { slug },
    update: { name, image_url: imageUrl },
    create: { name, slug, image_url: imageUrl },
  });
  return category.id;
}

async function ensureCollection(slug: string, name: string): Promise<string> {
  const collection = await prisma.catalogue_collections.upsert({
    where: { slug },
    update: { name },
    create: { name, slug },
  });
  return collection.id;
}

interface SeedProductInput {
  slug: string;
  name: string;
  description: string;
  brand: string;
  mode: "unique" | "stocked" | "variant";
  price: string;
  referencePrice: string | null;
  condition: string;
  sizeLabel: string | null;
  colour: string | null;
  archiveNumber: string | null;
  categoryId: string;
  collectionId?: string;
  coverPublicId: string;
  stock: number;
  variants?: { label: string; size: string; price: string | null; stock: number }[];
}

async function seedProduct(input: SeedProductInput): Promise<void> {
  const product = await prisma.products.upsert({
    where: { slug: input.slug },
    update: {
      name: input.name,
      description: input.description,
      brand: input.brand,
      inventory_mode: input.mode,
      price: input.price,
      reference_price: input.referencePrice,
      lifecycle: "active",
      publication: "published",
      condition: input.condition,
      size_label: input.sizeLabel,
      colour: input.colour,
      archive_number: input.archiveNumber,
      category_id: input.categoryId,
      collection_id: input.collectionId ?? null,
    },
    create: {
      slug: input.slug,
      name: input.name,
      description: input.description,
      brand: input.brand,
      inventory_mode: input.mode,
      price: input.price,
      reference_price: input.referencePrice,
      lifecycle: "active",
      publication: "published",
      condition: input.condition,
      size_label: input.sizeLabel,
      colour: input.colour,
      archive_number: input.archiveNumber,
      category_id: input.categoryId,
      collection_id: input.collectionId ?? null,
    },
  });

  // Rebuild children deterministically.
  await prisma.product_media.deleteMany({ where: { product_id: product.id } });
  await prisma.product_channels.deleteMany({ where: { product_id: product.id } });
  await prisma.stock_levels.deleteMany({ where: { product_id: product.id } });
  await prisma.product_measurements.deleteMany({ where: { product_id: product.id } });
  await prisma.product_variants.deleteMany({ where: { product_id: product.id } });

  const asset = await prisma.cloudinary_assets.upsert({
    where: { public_id: input.coverPublicId },
    update: {},
    create: {
      kind: "product_cover",
      public_id: input.coverPublicId,
      secure_url: demoImage(input.coverPublicId),
      alt: input.name,
      width: 1000,
      height: 1200,
    },
  });

  await prisma.product_media.create({
    data: {
      product_id: product.id,
      asset_id: asset.id,
      kind: "product_cover",
      position: 0,
    },
  });
  await prisma.product_channels.create({
    data: { product_id: product.id, channel: "storefront" },
  });
  await prisma.product_measurements.createMany({
    data: [
      { product_id: product.id, label: "Pit to pit", value: "54 cm", position: 0 },
      { product_id: product.id, label: "Length", value: "70 cm", position: 1 },
    ],
  });

  if (input.mode === "variant" && input.variants?.length) {
    for (const [index, v] of input.variants.entries()) {
      const variant = await prisma.product_variants.create({
        data: {
          product_id: product.id,
          label: v.label,
          size: v.size,
          price: v.price,
          position: index,
        },
      });
      await prisma.stock_levels.create({
        data: {
          product_id: product.id,
          variant_id: variant.id,
          total_received: v.stock,
          available: v.stock,
        },
      });
    }
  } else {
    await prisma.stock_levels.create({
      data: {
        product_id: product.id,
        total_received: input.stock,
        available: input.stock,
      },
    });
  }
}

async function main() {
  await ensureApplicationState();

  // Dev only: clear the catalogue so re-seeds stay clean and brand-accurate.
  await prisma.products.deleteMany();

  const jeans = await ensureCategory("jeans-denim", "Jeans & Denim", "https://images.pexels.com/photos/28174872/pexels-photo-28174872.jpeg?auto=compress&cs=tinysrgb&w=1200");
  const shirts = await ensureCategory("shirts", "Shirts", "https://images.pexels.com/photos/31959038/pexels-photo-31959038.jpeg?auto=compress&cs=tinysrgb&w=1200");
  const jackets = await ensureCategory("jackets-coats", "Jackets & Coats", "https://images.pexels.com/photos/26936525/pexels-photo-26936525.jpeg?auto=compress&cs=tinysrgb&w=1200");
  const hoodies = await ensureCategory("hoodies-sweats", "Hoodies & Sweats", "https://images.pexels.com/photos/9947825/pexels-photo-9947825.jpeg?auto=compress&cs=tinysrgb&w=1200");
  const dresses = await ensureCategory("dresses", "Dresses", "https://images.pexels.com/photos/15470820/pexels-photo-15470820.jpeg?auto=compress&cs=tinysrgb&w=1200");
  const vintage = await ensureCollection("vintage-edit", "The Vintage Edit");

  // Laitstyle = curated premium pre-owned & vintage: mostly stocked, honestly
  // graded (Like new = A+, Excellent = A, Good = B+); one-of-one only for
  // genuinely limited pieces.
  await seedProduct({
    slug: "levis-501-original-jeans",
    name: "Levi's 501 Original Straight Jeans",
    description:
      "Premium Levi's 501 straight-leg denim in excellent pre-owned condition. Classic medium-blue wash, structured denim, five-pocket construction and minimal signs of wear. No stains, holes or damaged fastenings — individually inspected and ready to wear.",
    brand: "Levi's",
    mode: "stocked",
    price: "18500.00",
    referencePrice: "28000.00",
    condition: "Excellent",
    sizeLabel: "32",
    colour: "Mid Blue",
    archiveNumber: null,
    categoryId: jeans,
    coverPublicId: "sample",
    stock: 4,
  });

  await seedProduct({
    slug: "nike-sportswear-hoodie",
    name: "Nike Sportswear Club Hoodie",
    description:
      "Nike Sportswear pullover hoodie in like-new condition. Soft brushed-back fleece, ribbed cuffs and hem, embroidered swoosh. Barely worn — no pilling, fading or marks.",
    brand: "Nike",
    mode: "stocked",
    price: "16000.00",
    referencePrice: "24000.00",
    condition: "Like new",
    sizeLabel: "L",
    colour: "Black",
    archiveNumber: null,
    categoryId: hoodies,
    coverPublicId: "woman",
    stock: 6,
  });

  await seedProduct({
    slug: "zara-wool-blend-blazer",
    name: "Zara Wool-Blend Tailored Blazer",
    description:
      "Structured single-breasted blazer in a warm camel wool blend. Excellent pre-owned condition with clean lining and intact buttons. A versatile smart-casual layer.",
    brand: "Zara",
    mode: "stocked",
    price: "21000.00",
    referencePrice: "32000.00",
    condition: "Excellent",
    sizeLabel: "M",
    colour: "Camel",
    archiveNumber: null,
    categoryId: jackets,
    coverPublicId: "sample",
    stock: 3,
  });

  await seedProduct({
    slug: "ralph-lauren-oxford-shirt",
    name: "Ralph Lauren Cotton Oxford Shirt",
    description:
      "Classic Ralph Lauren button-down oxford in sky blue. Like-new condition, crisp collar and cuffs, signature embroidered pony. A wardrobe essential that pairs with everything.",
    brand: "Ralph Lauren",
    mode: "stocked",
    price: "14500.00",
    referencePrice: "22000.00",
    condition: "Like new",
    sizeLabel: "M",
    colour: "Sky Blue",
    archiveNumber: null,
    categoryId: shirts,
    coverPublicId: "woman",
    stock: 5,
  });

  await seedProduct({
    slug: "champion-reverse-weave-sweatshirt",
    name: "Champion Reverse Weave Sweatshirt",
    description:
      "Heavyweight Champion reverse-weave crewneck in heather grey. Good pre-owned condition with a soft, broken-in feel; very light fading disclosed. Structurally sound with the classic side gussets.",
    brand: "Champion",
    mode: "stocked",
    price: "12500.00",
    referencePrice: "19000.00",
    condition: "Good",
    sizeLabel: "L",
    colour: "Grey",
    archiveNumber: null,
    categoryId: hoodies,
    coverPublicId: "sample",
    stock: 4,
  });

  await seedProduct({
    slug: "vintage-levis-denim-jacket",
    name: "Vintage Levi's Trucker Denim Jacket",
    description:
      "A one-of-one vintage Levi's trucker jacket in a beautifully worn mid-blue wash. Excellent condition with genuine character — the fades are someone else's miles. When it sells, it's gone for good.",
    brand: "Levi's",
    mode: "unique",
    price: "34000.00",
    referencePrice: "48000.00",
    condition: "Excellent",
    sizeLabel: "M",
    colour: "Mid Blue",
    archiveNumber: "0042",
    categoryId: jackets,
    collectionId: vintage,
    coverPublicId: "woman",
    stock: 1,
  });

  await seedProduct({
    slug: "floral-midi-tea-dress",
    name: "Floral Midi Tea Dress",
    description:
      "A pre-loved floral midi tea dress in excellent condition — light, breathable and easy to style. Available in three sizes.",
    brand: "Mango",
    mode: "variant",
    price: "17000.00",
    referencePrice: "26000.00",
    condition: "Excellent",
    sizeLabel: null,
    colour: "Floral",
    archiveNumber: null,
    categoryId: dresses,
    collectionId: vintage,
    coverPublicId: "sample",
    stock: 0,
    variants: [
      { label: "Small", size: "S", price: null, stock: 2 },
      { label: "Medium", size: "M", price: null, stock: 3 },
      { label: "Large", size: "L", price: null, stock: 0 },
    ],
  });

  const count = await prisma.products.count();
  console.warn(`Seed complete — ${count} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
