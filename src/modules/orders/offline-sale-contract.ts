import type { CheckoutStatus } from "@/modules/checkout/types";
import type { ControlRoomOrder } from "@/modules/orders/types";

export type OfflineSalePaymentState = {
  order: ControlRoomOrder;
  paymentId: string;
  reference: string;
  status: CheckoutStatus;
  replayed: boolean;
  message: string;
};
