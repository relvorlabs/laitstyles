import { apiRequest } from "@/lib/http/client";
import type {
  CompleteSupportAttachmentInput,
  CreateSupportTicketInput,
  ReplyToTicketInput,
  SupportAttachmentUploadGrant,
  SupportMessage,
  SupportTicketDetail,
  SupportTicketListInput,
  SupportTicketSummary,
  ValidatedTicketAttachment,
} from "@/modules/support/types";

const SUPPORT_TICKETS_URL = "/api/v1/account/support-tickets";
const SUPPORT_ATTACHMENTS_URL = `${SUPPORT_TICKETS_URL}/attachments`;

export async function issueSupportAttachmentUploadRequest(): Promise<SupportAttachmentUploadGrant> {
  const response = await apiRequest<SupportAttachmentUploadGrant>(
    `${SUPPORT_ATTACHMENTS_URL}/sign`,
    { method: "POST" },
  );
  return response.data;
}

export async function completeSupportAttachmentUploadRequest(
  input: CompleteSupportAttachmentInput,
): Promise<ValidatedTicketAttachment> {
  const response = await apiRequest<ValidatedTicketAttachment>(SUPPORT_ATTACHMENTS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function uploadSupportAttachmentRequest(
  file: File,
): Promise<ValidatedTicketAttachment> {
  const grant = await issueSupportAttachmentUploadRequest();
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", grant.apiKey);
  form.append("timestamp", String(grant.params.timestamp));
  form.append("folder", grant.params.folder);
  form.append("public_id", grant.params.publicId);
  form.append("context", grant.params.context);
  form.append("signature", grant.params.signature);
  const uploadResponse = await fetch(grant.uploadUrl, { method: "POST", body: form });
  if (!uploadResponse.ok) throw new Error("The attachment upload failed.");
  const uploaded = (await uploadResponse.json()) as {
    public_id?: string;
    resource_type?: "image" | "raw";
  };
  if (uploaded.public_id !== grant.publicId || !uploaded.resource_type) {
    throw new Error("The attachment provider returned an invalid upload.");
  }
  return completeSupportAttachmentUploadRequest({
    publicId: uploaded.public_id,
    fileName: file.name,
    ownershipToken: grant.ownershipToken,
    resourceType: uploaded.resource_type,
  });
}

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
