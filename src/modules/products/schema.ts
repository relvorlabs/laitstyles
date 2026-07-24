import { z } from "zod";
import { productEditorDraftSchema } from "@/lib/admin/product-editor/product-editor-schema";

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

export const productTaxonomyInputSchema = z.object({
  kind: z.enum(["category", "collection"]),
  name: z.string().trim().min(1),
});

export const productTaxonomyIdSchema = z
  .string()
  .regex(
    /^(category|collection):[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );

export const productTaxonomyRenameSchema = z.object({
  name: z.string().trim().min(1),
});
