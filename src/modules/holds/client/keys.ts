import type { HoldListInput } from "@/modules/holds/types";

export const holdKeys = {
  all: ["holds"] as const,
  lists: () => ["holds", "list"] as const,
  list: (input: HoldListInput) => ["holds", "list", input] as const,
  details: () => ["holds", "detail"] as const,
  detail: (holdId: string) => ["holds", "detail", holdId] as const,
};
