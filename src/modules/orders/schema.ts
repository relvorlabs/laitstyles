import { z } from "zod";
import { paginationQuerySchema } from "@/lib/http/pagination";

export const orderStatusSchema = z.enum([
  "pending-payment",
  "payment-confirmed",
  "preparing",
  "packed",
  "ready-for-pickup",
  "dispatched",
  "out-for-delivery",
  "delivered",
  "cancelled",
  "refunded",
  "returned",
]);

export const adminOrderListSearchSchema = paginationQuerySchema.extend({
  view: z
    .enum(["all", "needs-attention", "pending-payment", "fulfilment", "delivered", "closed"])
    .default("all"),
  search: z.string().trim().max(160).default(""),
  channel: z.enum(["all", "online", "offline"]).default("all"),
  payment: z.enum(["all", "pending", "paid", "deposit", "failed", "refunded"]).default("all"),
  sort: z.enum(["placed-desc", "placed-asc", "total-desc", "total-asc"]).default("placed-desc"),
});

export const orderIdentifierSchema = z.string().trim().min(1).max(128);

export const orderTransitionSchema = z.object({
  nextStatus: orderStatusSchema,
});

const paymentMethodSchema = z.enum([
  "cash",
  "bank-transfer",
  "card",
  "pos",
  "pay-on-delivery",
  "other",
]);

const offlineChannelSchema = z.enum([
  "physical-store",
  "whatsapp",
  "instagram",
  "phone",
  "pop-up",
  "staff-assisted",
  "other",
]);

const existingCustomerSchema = z.object({
  kind: z.literal("existing"),
  customerId: z.string().uuid(),
});

const newCustomerSchema = z.object({
  kind: z.literal("new"),
  name: z.string().trim().min(1, "Enter the customer name.").max(160),
  email: z.union([z.literal(""), z.string().trim().email()]).default(""),
  phone: z.string().trim().max(40).default(""),
  city: z.string().trim().max(120).default(""),
});

export const offlineSaleSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        variantId: z.string().uuid().optional(),
        quantity: z.number().int().min(1),
        unitPrice: z.number().finite().min(0),
      }),
    )
    .min(1, "Add at least one product before recording the sale."),
  channel: offlineChannelSchema,
  customer: z.discriminatedUnion("kind", [existingCustomerSchema, newCustomerSchema]),
  paymentMethod: paymentMethodSchema,
  paymentStatus: z.enum(["pending", "paid", "deposit"]),
  notes: z.string().trim().max(2_000).default(""),
});
