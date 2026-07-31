import type { CheckoutStatus } from "@/modules/checkout/types";

export const resumableOrderPaymentStatuses = ["pending", "processing"] as const;
export const resumablePaymentAttemptStatuses = ["initialized", "pending"] as const;

export type CheckoutOrderPaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "partially_refunded"
  | "refunded"
  | "review_required"
  | "cancelled";

export type CheckoutOrderFulfilmentStatus =
  | "unfulfilled"
  | "processing"
  | "ready_for_dispatch"
  | "dispatched"
  | "delivered"
  | "partially_returned"
  | "returned"
  | "cancelled";

export type CheckoutPaymentAttemptStatus = Exclude<CheckoutStatus, "cancelled">;

export type CheckoutLifecycleState = {
  orderPaymentStatus: CheckoutOrderPaymentStatus;
  orderFulfilmentStatus: CheckoutOrderFulfilmentStatus;
  paymentAttemptStatus: CheckoutPaymentAttemptStatus;
  accessCode: string | null;
};

export function deriveCheckoutStatus(
  state: Omit<CheckoutLifecycleState, "accessCode">,
): CheckoutStatus {
  if (
    state.orderPaymentStatus === "cancelled" ||
    state.orderFulfilmentStatus === "cancelled"
  ) {
    return "cancelled";
  }
  if (state.orderPaymentStatus === "paid") return "success";
  if (state.orderPaymentStatus === "review_required") return "review_required";
  return state.paymentAttemptStatus;
}

export function isCheckoutResumable(state: CheckoutLifecycleState): boolean {
  return (
    resumableOrderPaymentStatuses.includes(
      state.orderPaymentStatus as (typeof resumableOrderPaymentStatuses)[number],
    ) &&
    state.orderFulfilmentStatus === "unfulfilled" &&
    resumablePaymentAttemptStatuses.includes(
      state.paymentAttemptStatus as (typeof resumablePaymentAttemptStatuses)[number],
    ) &&
    Boolean(state.accessCode?.trim())
  );
}

export function isClosedCheckoutSession(state: CheckoutLifecycleState): boolean {
  return !isCheckoutResumable(state);
}
