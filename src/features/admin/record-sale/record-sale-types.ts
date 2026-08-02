import type { CheckoutStatus } from "@/modules/checkout/types";
import type { InPersonSalesChannel, OfflineSaleInput } from "@/modules/orders/types";

export const recordSaleSteps = ["item", "customer", "payment", "review"] as const;
export type RecordSaleStep = (typeof recordSaleSteps)[number];

export type RecordSaleValues = {
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  channel: InPersonSalesChannel;
  customerMode: "existing" | "new";
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCity: string;
  notes: string;
};

export type RecordSaleCompletion = {
  orderId: string;
  customerId: string;
  message: string;
  reference: string;
  status: CheckoutStatus;
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
    notes: values.notes,
  };
}
