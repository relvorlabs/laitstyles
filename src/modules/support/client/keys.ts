import type { SupportTicketListInput } from "@/modules/support/types";

export const supportTicketKeys = {
  all: ["account", "support-tickets"] as const,
  lists: () => [...supportTicketKeys.all, "list"] as const,
  list: (input: SupportTicketListInput) => [...supportTicketKeys.lists(), input] as const,
  details: () => [...supportTicketKeys.all, "detail"] as const,
  detail: (ticketId: string) => [...supportTicketKeys.all, "detail", ticketId] as const,
};
