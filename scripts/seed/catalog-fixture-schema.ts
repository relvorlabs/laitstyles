/**
 * Shape contract for scripts/seed/catalog-fixture.json.
 *
 * The fixture is content-only: no database ids, SKUs, timestamps or archive
 * numbers. The API import script generates those at runtime. Validation
 * mirrors the admin product editor draft requirements for intent=publish.
 */
import { z } from "zod";

const nonEmpty = z.string().trim().min(1);
const imageUrl = z.url();

export const fixtureImageSchema = z.object({
  url: imageUrl,
  alt: z.string().trim().min(1),
  kind: z.enum(["cover", "detail", "defect"]),
});

export const fixtureMeasurementSchema = z.object({
  label: nonEmpty,
  value: nonEmpty,
});

export const fixtureVariantSchema = z.object({
  label: nonEmpty,
  size: nonEmpty,
  colour: nonEmpty,
  quantity: z.number().int().positive(),
});

export const fixtureProductSchema = z
  .object({
    name: z.string().trim().min(2),
    description: z.string().trim().min(20),
    category: nonEmpty,
    collection: z.string().trim(),
    brand: nonEmpty,
    inventory_mode: z.enum(["unique", "stocked", "variant"]),
    selling_price: z.number().positive(),
    reference_price: z.number().positive().nullable(),
    condition: nonEmpty,
    size_label: z.string().trim(),
    colour: nonEmpty,
    material: z.string().trim(),
    fit: z.string().trim(),
    style: z.string().trim(),
    care_instructions: z.string().trim(),
    flaw_notes: z.string().trim(),
    measurements: z.array(fixtureMeasurementSchema),
    quantity: z.number().int().nonnegative(),
    variants: z.array(fixtureVariantSchema),
    images: z.array(fixtureImageSchema).min(1).max(12),
    channels: z
      .array(z.enum(["storefront", "physical-store", "whatsapp", "instagram"]))
      .min(1),
  })
  .superRefine((product, context) => {
    if (product.reference_price !== null && product.reference_price <= product.selling_price) {
      context.addIssue({
        code: "custom",
        path: ["reference_price"],
        message: "Compare-at price must be higher than the selling price.",
      });
    }

    const coverCount = product.images.filter((image) => image.kind === "cover").length;
    if (coverCount !== 1) {
      context.addIssue({
        code: "custom",
        path: ["images"],
        message: "Exactly one cover image is required.",
      });
    }
    const publicKeys = new Set<string>();
    for (const [index, image] of product.images.entries()) {
      const key = image.url.trim().toLocaleLowerCase("en-NG");
      if (publicKeys.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["images", index, "url"],
          message: "Each product image URL must be unique within the product.",
        });
      }
      publicKeys.add(key);
    }

    if (product.inventory_mode === "unique") {
      if (product.measurements.length < 1) {
        context.addIssue({
          code: "custom",
          path: ["measurements"],
          message: "Unique products need at least one measurement.",
        });
      }
      if (product.variants.length > 0) {
        context.addIssue({
          code: "custom",
          path: ["variants"],
          message: "Unique products must not declare variants.",
        });
      }
      if (!product.size_label.trim()) {
        context.addIssue({
          code: "custom",
          path: ["size_label"],
          message: "Unique products need a size label.",
        });
      }
    }

    if (product.inventory_mode === "stocked") {
      if (product.quantity < 1) {
        context.addIssue({
          code: "custom",
          path: ["quantity"],
          message: "Stocked products need a received quantity of at least one.",
        });
      }
      if (!product.size_label.trim()) {
        context.addIssue({
          code: "custom",
          path: ["size_label"],
          message: "Stocked products need a size label.",
        });
      }
      if (product.variants.length > 0) {
        context.addIssue({
          code: "custom",
          path: ["variants"],
          message: "Stocked products must not declare variants.",
        });
      }
    }

    if (product.inventory_mode === "variant") {
      if (product.variants.length < 1) {
        context.addIssue({
          code: "custom",
          path: ["variants"],
          message: "Variant products need at least one variant.",
        });
      }
      const labels = new Set<string>();
      for (const [index, variant] of product.variants.entries()) {
        const key = variant.label.trim().toLocaleLowerCase("en-NG");
        if (labels.has(key)) {
          context.addIssue({
            code: "custom",
            path: ["variants", index, "label"],
            message: "Each variant label must be unique.",
          });
        }
        labels.add(key);
      }
      if (!product.variants.some((variant) => variant.quantity > 0)) {
        context.addIssue({
          code: "custom",
          path: ["variants"],
          message: "At least one variant must have received stock.",
        });
      }
    }
  });

export const catalogFixtureSchema = z
  .object({
    schema_version: z.literal(1),
    dataset_name: z.string().min(1),
    currency: z.literal("NGN"),
    categories: z
      .array(
        z.object({
          name: nonEmpty,
          image_url: imageUrl.nullable(),
        }),
      )
      .min(1),
    collections: z.array(z.object({ name: z.string().trim().min(1) })).min(1),
    products: z.array(fixtureProductSchema).min(500),
  })
  .superRefine((fixture, context) => {
    const categoryNames = new Set<string>();
    for (const [index, category] of fixture.categories.entries()) {
      const key = category.name.trim().toLocaleLowerCase("en-NG");
      if (categoryNames.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["categories", index, "name"],
          message: "Category names must be unique.",
        });
      }
      categoryNames.add(key);
    }

    const collectionNames = new Set<string>();
    for (const [index, collection] of fixture.collections.entries()) {
      const key = collection.name.trim().toLocaleLowerCase("en-NG");
      if (collectionNames.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["collections", index, "name"],
          message: "Collection names must be unique.",
        });
      }
      collectionNames.add(key);
    }

    const productNames = new Set<string>();
    for (const [index, product] of fixture.products.entries()) {
      const key = product.name.trim().toLocaleLowerCase("en-NG");
      if (productNames.has(key)) {
        context.addIssue({
          code: "custom",
          path: ["products", index, "name"],
          message: "Product names must be unique so slugs stay unique.",
        });
      }
      productNames.add(key);

      if (!categoryNames.has(product.category.trim().toLocaleLowerCase("en-NG"))) {
        context.addIssue({
          code: "custom",
          path: ["products", index, "category"],
          message: `Unknown category "${product.category}".`,
        });
      }
      if (
        product.collection.trim() &&
        !collectionNames.has(product.collection.trim().toLocaleLowerCase("en-NG"))
      ) {
        context.addIssue({
          code: "custom",
          path: ["products", index, "collection"],
          message: `Unknown collection "${product.collection}".`,
        });
      }
    }
  });

export type CatalogFixture = z.infer<typeof catalogFixtureSchema>;
export type FixtureProduct = z.infer<typeof fixtureProductSchema>;

export function prepareCatalogFixture(input: unknown): CatalogFixture {
  const parsed = catalogFixtureSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new Error(
      `Invalid catalog fixture at ${issue.path.join(".") || "<root>"}: ${issue.message}`,
    );
  }
  return parsed.data;
}

/** Mirrors the server slugify used by slugifyProductName. */
export function fixtureSlugify(value: string): string {
  return (
    value
      .trim()
      .toLocaleLowerCase("en-NG")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled-product"
  );
}
