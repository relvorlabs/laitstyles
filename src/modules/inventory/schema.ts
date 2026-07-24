import { z } from "zod";

export const inventorySavedViewSchema = z.enum([
  "all",
  "live",
  "drafts",
  "intake",
  "low-stock",
  "out-of-stock",
  "held",
  "sold",
  "unpublished",
  "needs-attention",
]);

export const inventoryModeFilterSchema = z.enum(["all", "unique", "stocked", "variant"]);
export const inventoryStockFilterSchema = z.enum([
  "all",
  "healthy",
  "low-stock",
  "out-of-stock",
  "held",
  "sold",
]);
export const inventoryChannelFilterSchema = z.enum([
  "all",
  "storefront",
  "physical-store",
  "whatsapp",
  "instagram",
]);
export const inventorySortSchema = z.enum([
  "updated-desc",
  "stock-asc",
  "stock-desc",
  "sold-desc",
  "price-asc",
  "price-desc",
  "name-asc",
]);

export const inventoryProductListSearchSchema = z.object({
  view: inventorySavedViewSchema.default("all"),
  q: z.string().trim().max(200).default(""),
  mode: inventoryModeFilterSchema.default("all"),
  stock: inventoryStockFilterSchema.default("all"),
  category: z.string().trim().max(120).default("all"),
  collection: z.string().trim().max(120).default("all"),
  channel: inventoryChannelFilterSchema.default("all"),
  sort: inventorySortSchema.default("updated-desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(15),
});

export const inventoryStockMovementSearchSchema = z.object({
  productId: z.string().uuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(500),
});
