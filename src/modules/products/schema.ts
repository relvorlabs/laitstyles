import { z } from "zod";
import { productEditorDraftSchema } from "@/modules/products/editor-schema";

export const productIdSchema = z.string().uuid();

export const productEditorIntentSchema = z.enum(["draft", "publish", "schedule"]);

export const productMutationSchema = z.object({
  values: productEditorDraftSchema,
  intent: productEditorIntentSchema,
});

export const adminProductListSearchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(500),
});

const productTaxonomyNameAndPositionSchema = z.object({
  name: z.string().trim().min(1),
  position: z.number().int().min(0),
});

export const productTaxonomyInputSchema = z.discriminatedUnion("kind", [
  productTaxonomyNameAndPositionSchema.extend({
    kind: z.literal("category"),
    imageUrl: z.url().nullable(),
  }),
  productTaxonomyNameAndPositionSchema.extend({
    kind: z.literal("collection"),
    productIds: z.array(productIdSchema).refine((ids) => new Set(ids).size === ids.length, {
      message: "Choose each product only once.",
    }),
  }),
]);

export const productTaxonomyIdSchema = z
  .string()
  .regex(
    /^(category|collection):[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

export const productTaxonomyRenameSchema = z.object({
  name: z.string().trim().min(1),
});

export const productTaxonomyUpdateSchema = z.discriminatedUnion("kind", [
  productTaxonomyNameAndPositionSchema.extend({
    kind: z.literal("category"),
    imageUrl: z.url().nullable(),
  }),
  productTaxonomyNameAndPositionSchema.extend({
    kind: z.literal("collection"),
    productIds: z.array(productIdSchema).refine((ids) => new Set(ids).size === ids.length, {
      message: "Choose each product only once.",
    }),
  }),
]);

export const productTaxonomyReorderSchema = z
  .object({
    kind: z.enum(["category", "collection"]),
    orderedIds: z.array(productTaxonomyIdSchema),
  })
  .superRefine(({ kind, orderedIds }, context) => {
    if (new Set(orderedIds).size !== orderedIds.length) {
      context.addIssue({
        code: "custom",
        path: ["orderedIds"],
        message: "Choose each catalogue group only once.",
      });
    }
    if (orderedIds.some((id) => !id.startsWith(`${kind}:`))) {
      context.addIssue({
        code: "custom",
        path: ["orderedIds"],
        message: "Every catalogue group must match the selected kind.",
      });
    }
  });
