import type { ReturnListInput } from "@/modules/returns/types";

export const returnKeys = {
  all: ["admin", "returns"] as const,
  lists: () => [...returnKeys.all, "list"] as const,
  list: (input: ReturnListInput) => [...returnKeys.lists(), input] as const,
  detail: (returnId: string) => [...returnKeys.all, "detail", returnId] as const,
  eligibleOrders: () => [...returnKeys.all, "eligible-orders"] as const,
};

export const accountReturnKeys = {
  all: ["account", "returns"] as const,
  list: () => [...accountReturnKeys.all, "list"] as const,
  details: () => [...accountReturnKeys.all, "detail"] as const,
  detail: (returnId: string) => [...accountReturnKeys.details(), returnId.trim()] as const,
};
