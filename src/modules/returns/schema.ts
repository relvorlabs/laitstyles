import { z } from "zod";

export const returnStatuses = [
  "requested",
  "approved",
  "received",
  "inspecting",
  "refunded",
  "restocked",
  "damaged",
  "rejected",
  "closed",
] as const;

export const returnSavedViews = [
  "all",
  "open",
  "awaiting-item",
  "inspection",
  "refund",
  "resolved",
] as const;

export const returnSortKeys = ["updated-desc", "requested-desc", "value-desc"] as const;

export const returnIdentifierSchema = z.string().uuid();

export const adminReturnListSearchSchema = z.object({
  view: z.enum(returnSavedViews).default("all"),
  search: z.string().trim().max(160).default(""),
  status: z.union([z.literal("all"), z.enum(returnStatuses)]).default("all"),
  sort: z.enum(returnSortKeys).default("updated-desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
});

export const createReturnSchema = z.object({
  orderId: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(500),
  note: z.string().trim().max(2_000).default(""),
  lines: z
    .array(z.object({ orderLineId: z.string().uuid(), quantity: z.number().int().min(1) }))
    .min(1)
    .max(100),
});

export const createAccountReturnSchema = z
  .object({
    orderNumber: z.string().trim().min(1).max(120),
    reason: z.string().trim().min(1).max(500),
    note: z.string().trim().max(2_000).optional(),
    lines: z
      .array(
        z.object({ orderLineId: z.string().uuid(), quantity: z.number().int().min(1) }).strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

export const returnTransitionSchema = z.object({ nextStatus: z.enum(returnStatuses) });
