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

export const addressIdentifierSchema = z.string().trim().min(1).max(64);

export const updateOwnedProfileSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your first name.").max(100),
    lastName: z.string().trim().min(1, "Enter your last name.").max(100),
    preferredName: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((value) => value || undefined),
    phone: z
      .string()
      .trim()
      .max(40)
      .optional()
      .transform((value) => value || undefined),
  })
  .strict();

export const createOwnedAddressSchema = z
  .object({
    label: z
      .string()
      .trim()
      .max(60)
      .optional()
      .transform((value) => value || undefined),
    line1: z.string().trim().min(1, "Enter the street address.").max(200),
    line2: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((value) => value || undefined),
    city: z.string().trim().min(1, "Enter a city.").max(120),
    state: z
      .string()
      .trim()
      .max(120)
      .optional()
      .transform((value) => value || undefined),
    deliveryNotes: z
      .string()
      .trim()
      .max(500)
      .optional()
      .transform((value) => value || undefined),
    isDefault: z.boolean().optional(),
  })
  .strict();

export const updateOwnedAddressSchema = createOwnedAddressSchema.partial().strict();

export const productIdentifierSchema = z.string().trim().min(1).max(64);

export const saveOwnedProductSchema = z
  .object({ productId: productIdentifierSchema })
  .strict();
