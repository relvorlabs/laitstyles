"use client";

import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createSupportTicketRequest,
  getSupportTicketRequest,
  listSupportTicketsRequest,
  replyToTicketRequest,
} from "@/modules/support/client/api";
import { supportTicketKeys } from "@/modules/support/client/keys";
import type { SupportTicketListInput } from "@/modules/support/types";

export function supportTicketsQueryOptions(input: SupportTicketListInput) {
  return queryOptions({
    queryKey: supportTicketKeys.list(input),
    queryFn: ({ signal }) => listSupportTicketsRequest(input, signal),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function supportTicketQueryOptions(ticketId: string) {
  return queryOptions({
    queryKey: supportTicketKeys.detail(ticketId),
    queryFn: ({ signal }) => getSupportTicketRequest(ticketId, signal),
    enabled: Boolean(ticketId.trim()),
    staleTime: 15_000,
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSupportTicketRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.lists() });
    },
  });
}

export function useReplyToTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: replyToTicketRequest,
    onSuccess: (_message, variables) => {
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.detail(variables.ticketId) });
      queryClient.invalidateQueries({ queryKey: supportTicketKeys.lists() });
    },
  });
}
