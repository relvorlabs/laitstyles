import type {
  OfflineSaleInput,
  PaymentMethod,
  PaymentStatus,
  SalesChannel,
} from "@/lib/admin/types";

export const recordSaleSteps = ["item", "customer", "payment", "review"] as const;
export type RecordSaleStep = (typeof recordSaleSteps)[number];

export type RecordSaleValues = {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  channel: Exclude<SalesChannel, "online">;
  customerMode: "existing" | "new";
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCity: string;
  paymentMethod: PaymentMethod;
  paymentStatus: Extract<PaymentStatus, "pending" | "paid" | "deposit">;
  notes: string;
};

export type RecordSaleCompletion = {
  orderId: string;
  customerId: string;
  message: string;
};

export function toOfflineSaleInput(values: RecordSaleValues): OfflineSaleInput {
  return {
    lines: [
      {
        productId: values.productId,
        variantId: values.variantId || undefined,
        quantity: values.quantity,
        unitPrice: values.unitPrice,
      },
    ],
    channel: values.channel,
    customer:
      values.customerMode === "existing"
        ? { kind: "existing", customerId: values.customerId }
        : {
            kind: "new",
            name: values.customerName,
            email: values.customerEmail,
            phone: values.customerPhone,
            city: values.customerCity,
          },
    paymentMethod: values.paymentMethod,
    paymentStatus: values.paymentStatus,
    notes: values.notes,
  };
}
