import { apiRequest } from "@/lib/http/client";
import type {
  CreateSupportTicketInput,
  ReplyToTicketInput,
  SupportMessage,
  SupportTicketDetail,
  SupportTicketListInput,
  SupportTicketSummary,
} from "@/modules/support/types";

const SUPPORT_TICKETS_URL = "/api/v1/account/support-tickets";

export async function listSupportTicketsRequest(
  input: SupportTicketListInput,
  signal?: AbortSignal,
): Promise<{
  data: SupportTicketSummary[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
}> {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
  });
  const response = await apiRequest<SupportTicketSummary[]>(
    `${SUPPORT_TICKETS_URL}?${params.toString()}`,
    { cache: "no-store", signal },
  );
  return {
    data: response.data,
    meta: response.meta as { page: number; pageSize: number; total: number; pageCount: number },
  };
}

export async function getSupportTicketRequest(
  ticketId: string,
  signal?: AbortSignal,
): Promise<SupportTicketDetail | null> {
  const response = await apiRequest<SupportTicketDetail>(
    `${SUPPORT_TICKETS_URL}/${encodeURIComponent(ticketId)}`,
    { cache: "no-store", signal },
  );
  return response.data;
}

export async function createSupportTicketRequest(
  input: CreateSupportTicketInput,
): Promise<SupportTicketDetail> {
  const response = await apiRequest<SupportTicketDetail>(SUPPORT_TICKETS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function replyToTicketRequest({
  ticketId,
  ...input
}: ReplyToTicketInput & { ticketId: string }): Promise<SupportMessage> {
  const response = await apiRequest<SupportMessage>(
    `${SUPPORT_TICKETS_URL}/${encodeURIComponent(ticketId)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return response.data;
}
