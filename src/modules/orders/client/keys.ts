import type { OrderListInput } from "@/modules/orders/types";

export const orderKeys = {
  all: ["admin", "orders"] as const,
  lists: () => [...orderKeys.all, "list"] as const,
  list: (input: OrderListInput) => [...orderKeys.lists(), input] as const,
  details: () => [...orderKeys.all, "detail"] as const,
  detail: (orderId: string) => [...orderKeys.details(), orderId.trim()] as const,
  saleCustomers: () => [...orderKeys.all, "sale-customers"] as const,
};

export const accountOrderKeys = {
  all: ["account", "orders"] as const,
  list: () => [...accountOrderKeys.all, "list"] as const,
  details: () => [...accountOrderKeys.all, "detail"] as const,
  detail: (orderNumber: string) => [...accountOrderKeys.details(), orderNumber.trim()] as const,
};
