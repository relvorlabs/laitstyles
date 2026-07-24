import { z } from "zod";

const mediaAssetSchema = z
  .object({
    publicId: z.string().min(1),
    secureUrl: z.string().url(),
    alt: z.string().min(1),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .strict();

const gallerySchema = mediaAssetSchema.extend({ kind: z.enum(["detail", "defect"]) }).strict();

const measurementSchema = z.object({ label: z.string().min(1), value: z.string().min(1) }).strict();

const variantSchema = z
  .object({
    label: z.string().min(1),
    size: z.string().min(1).optional(),
    colour: z.string().min(1).optional(),
    sku: z.string().min(1).optional(),
    price: z.number().positive().optional(),
    stock: z.number().int().min(0),
  })
  .strict();

const baseFixtureSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "slug must be lowercase-kebab, e.g. vintage-levis-jacket"),
  name: z.string().min(1),
  description: z.string().min(1),
  brand: z.string().min(1).optional(),
  price: z.number().positive(),
  referencePrice: z.number().positive().optional(),
  condition: z.string().min(1).optional(),
  sizeLabel: z.string().min(1).optional(),
  colour: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  categoryName: z.string().min(1).optional(),
  collectionSlug: z.string().min(1).optional(),
  collectionName: z.string().min(1).optional(),
  cover: mediaAssetSchema,
  gallery: z.array(gallerySchema).optional(),
  measurements: z.array(measurementSchema).optional(),
  material: z.string().min(1).optional(),
  fit: z.string().min(1).optional(),
  style: z.string().min(1).optional(),
  careInstructions: z.string().min(1).optional(),
  flawNotes: z.string().min(1).optional(),
  weightGrams: z.number().int().positive().optional(),
  pickupAvailable: z.boolean().optional(),
  deliveryRestrictions: z.string().optional(),
  packagingNotes: z.string().optional(),
});

export const productFixtureSchema = z
  .discriminatedUnion("mode", [
    baseFixtureSchema
      .extend({ mode: z.literal("unique"), archiveNumber: z.string().min(1) })
      .strict(),
    baseFixtureSchema
      .extend({
        mode: z.literal("stocked"),
        sku: z.string().min(1),
        stock: z.number().int().min(0),
      })
      .strict(),
    baseFixtureSchema
      .extend({ mode: z.literal("variant"), variants: z.array(variantSchema).min(1) })
      .strict(),
  ])
  .superRefine((fixture, ctx) => {
    if (fixture.categorySlug && !fixture.categoryName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "categoryName is required alongside categorySlug (used if the category is new).",
        path: ["categoryName"],
      });
    }
    if (fixture.collectionSlug && !fixture.collectionName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "collectionName is required alongside collectionSlug (used if the collection is new).",
        path: ["collectionName"],
      });
    }
  });

export type ProductFixture = z.infer<typeof productFixtureSchema>;

export const productFixtureFileSchema = z.array(productFixtureSchema);
