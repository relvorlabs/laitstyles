import { z } from "zod";
import type {
  RecordSaleStep,
  RecordSaleValues,
} from "@/features/control-room/record-sale/record-sale-types";

export const recordSaleSchema = z
  .object({
    productId: z.string().min(1, "Choose a product."),
    variantId: z.string(),
    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number.")
      .min(1, "Quantity must be at least one."),
    unitPrice: z.coerce
      .number()
      .min(0, "Final selling price cannot be negative."),
    channel: z.enum([
      "physical-store",
      "whatsapp",
      "instagram",
      "phone",
      "pop-up",
      "staff-assisted",
      "other",
    ]),
    customerMode: z.enum(["existing", "new"]),
    customerId: z.string(),
    customerName: z.string(),
    customerEmail: z.string(),
    customerPhone: z.string(),
    customerCity: z.string(),
    paymentMethod: z.enum([
      "cash",
      "bank-transfer",
      "card",
      "pos",
      "pay-on-delivery",
      "other",
    ]),
    paymentStatus: z.enum(["pending", "paid", "deposit"]),
    notes: z.string().max(500, "Keep notes under 500 characters."),
  })
  .superRefine((values, context) => {
    if (values.customerMode === "existing" && !values.customerId) {
      context.addIssue({
        code: "custom",
        path: ["customerId"],
        message: "Choose an existing customer.",
      });
    }

    if (values.customerMode === "new") {
      if (!values.customerName.trim()) {
        context.addIssue({
          code: "custom",
          path: ["customerName"],
          message: "Enter the customer name.",
        });
      }
      if (!values.customerPhone.trim() && !values.customerEmail.trim()) {
        context.addIssue({
          code: "custom",
          path: ["customerPhone"],
          message: "Add a phone number or email address.",
        });
      }
      if (!values.customerCity.trim()) {
        context.addIssue({
          code: "custom",
          path: ["customerCity"],
          message: "Enter the customer city.",
        });
      }
    }
  });

const stepFields: Record<RecordSaleStep, Array<keyof RecordSaleValues>> = {
  item: ["productId", "variantId", "quantity", "unitPrice"],
  customer: [
    "channel",
    "customerMode",
    "customerId",
    "customerName",
    "customerEmail",
    "customerPhone",
    "customerCity",
  ],
  payment: ["paymentMethod", "paymentStatus", "notes"],
  review: [],
};

export function getRecordSaleStepFields(step: RecordSaleStep) {
  return stepFields[step];
}
