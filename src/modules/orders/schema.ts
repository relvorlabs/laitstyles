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

export const orderTransitionSchema = z
  .object({
    nextStatus: orderStatusSchema,
  })
  .strict();

const inPersonChannelSchema = z.enum(["physical-store", "pop-up", "staff-assisted"]);

const existingCustomerSchema = z
  .object({
    kind: z.literal("existing"),
    customerId: z.string().uuid(),
  })
  .strict();

const newCustomerSchema = z
  .object({
    kind: z.literal("new"),
    name: z.string().trim().min(1, "Enter the customer name.").max(160),
    email: z.string().trim().email("Enter a valid email for the Paystack checkout."),
    phone: z.string().trim().max(40).default(""),
    city: z.string().trim().max(120).default(""),
  })
  .strict();

export const offlineSaleSchema = z
  .object({
    lines: z
      .array(
        z
          .object({
            productId: z.string().uuid(),
            variantId: z.string().uuid().optional(),
            quantity: z.number().int().min(1),
            unitPrice: z.number().finite().min(0),
          })
          .strict(),
      )
      .min(1, "Add at least one product before generating checkout."),
    channel: inPersonChannelSchema,
    customer: z.discriminatedUnion("kind", [existingCustomerSchema, newCustomerSchema]),
    notes: z.string().trim().max(2_000).default(""),
  })
  .strict()
  .superRefine((input, context) => {
    const total = input.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
    if (total < 100) {
      context.addIssue({
        code: "custom",
        path: ["lines"],
        message: "The checkout total must be at least ₦100 so Paystack bank transfer remains available.",
      });
    }
  });
