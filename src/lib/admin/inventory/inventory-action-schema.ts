import { z } from "zod";
import { productEditorDraftSchema } from "@/lib/admin/product-editor/product-editor-schema";

export const inventoryProductIdSchema = z.string().uuid();

export const productEditorIntentSchema = z.enum(["draft", "publish", "schedule"]);

export const inventoryProductActionSchema = z.object({
  values: productEditorDraftSchema,
  intent: productEditorIntentSchema,
});

export const catalogueTaxonomyInputSchema = z.object({
  kind: z.enum(["category", "collection"]),
  name: z.string().trim().min(1).max(160),
});

export const catalogueTaxonomyIdSchema = z
  .string()
  .regex(/^(category|collection):[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);

export const catalogueTaxonomyRenameSchema = z.object({
  taxonomyId: catalogueTaxonomyIdSchema,
  name: z.string().trim().min(1).max(160),
});
