import { z } from "zod";
import type {
  RecordSaleStep,
  RecordSaleValues,
} from "@/features/admin/record-sale/record-sale-types";

export const recordSaleSchema = z
  .object({
    productId: z.string().min(1, "Choose a product."),
    variantId: z.string(),
    quantity: z.coerce
      .number()
      .int("Quantity must be a whole number.")
      .min(1, "Quantity must be at least one."),
    unitPrice: z.coerce.number().min(0, "Final selling price cannot be negative."),
    channel: z.enum(["physical-store", "pop-up", "staff-assisted"]),
    customerMode: z.enum(["existing", "new"]),
    customerId: z.string(),
    customerName: z.string(),
    customerEmail: z.string(),
    customerPhone: z.string(),
    customerCity: z.string(),
    notes: z.string().max(500, "Keep notes under 500 characters."),
  })
  .superRefine((values, context) => {
    if ((Number(values.quantity) || 0) * (Number(values.unitPrice) || 0) < 100) {
      context.addIssue({
        code: "custom",
        path: ["unitPrice"],
        message: "The total must be at least ₦100 to keep Paystack bank transfer available.",
      });
    }

    if (values.customerMode === "existing" && !values.customerId) {
      context.addIssue({
        code: "custom",
        path: ["customerId"],
        message: "Choose an existing customer with an email address.",
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
      if (!z.string().email().safeParse(values.customerEmail.trim()).success) {
        context.addIssue({
          code: "custom",
          path: ["customerEmail"],
          message: "Enter a valid email for the Paystack checkout.",
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
  payment: ["notes"],
  review: [],
};

export function getRecordSaleStepFields(step: RecordSaleStep) {
  return stepFields[step];
}
