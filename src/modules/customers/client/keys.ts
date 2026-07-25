import type { CustomerListInput } from "@/modules/customers/types";

export const customerKeys = {
  all: ["admin", "customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (input: CustomerListInput) => [...customerKeys.lists(), input] as const,
  detail: (customerId: string) => [...customerKeys.all, "detail", customerId] as const,
};
