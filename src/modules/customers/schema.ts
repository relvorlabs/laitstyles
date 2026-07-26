import { z } from "zod";

export const customerTypes = ["individual", "stylist", "reseller", "walk-in"] as const;
export const customerSavedViews = [
  "all",
  "needs-attention",
  "returning",
  "high-value",
  "new",
] as const;
export const customerSortKeys = ["spend-desc", "recent-desc", "orders-desc", "name-asc"] as const;

export const customerIdentifierSchema = z.string().uuid();
export const adminCustomerListSearchSchema = z.object({
  search: z.string().trim().max(160).default(""),
  view: z.enum(customerSavedViews).default("all"),
  type: z.union([z.literal("all"), z.enum(customerTypes)]).default("all"),
  sort: z.enum(customerSortKeys).default("spend-desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});
export const addCustomerNoteSchema = z.object({ body: z.string().trim().min(1).max(2_000) });
