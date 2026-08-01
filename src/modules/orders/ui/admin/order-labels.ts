import type { OrderStatus, PaymentStatus, SalesChannel } from "@/modules/orders/types";

const orderDateFormatter = new Intl.DateTimeFormat("en-NG", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const orderStatusLabels: Record<OrderStatus, string> = {
  "pending-payment": "Pending payment",
  "payment-confirmed": "Payment confirmed",
  preparing: "Preparing",
  packed: "Packed",
  "ready-for-pickup": "Ready for pickup",
  dispatched: "Dispatched",
  "out-for-delivery": "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
  returned: "Returned",
};

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  deposit: "Deposit",
  failed: "Failed",
  refunded: "Refunded",
};

export const channelLabels: Record<SalesChannel, string> = {
  online: "Online",
  "physical-store": "Physical store",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  phone: "Phone",
  "pop-up": "Pop-up",
  "staff-assisted": "Staff assisted",
  other: "Other",
};

export function formatOrderDate(value: string) {
  return orderDateFormatter.format(new Date(value));
}

export function getOrderStatusTone(status: OrderStatus) {
  if (status === "cancelled" || status === "refunded" || status === "returned") {
    return "closed" as const;
  }
  if (status === "pending-payment") return "warning" as const;
  if (status === "delivered") return "success" as const;
  return "active" as const;
}

export function getPaymentTone(status: PaymentStatus) {
  if (status === "failed" || status === "refunded") return "danger" as const;
  if (status === "pending") return "warning" as const;
  if (status === "paid") return "success" as const;
  return "active" as const;
}
