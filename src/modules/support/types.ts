export type SupportTicketCategory = "order" | "payment" | "product" | "account" | "other";
export type SupportTicketStatus =
  | "open"
  | "pending_customer"
  | "pending_staff"
  | "resolved"
  | "closed";
export type SupportMessageAuthorKind = "customer" | "staff";

export type SupportTicketSummary = {
  id: string;
  subject: string;
  category: SupportTicketCategory;
  status: SupportTicketStatus;
  lastMessageAt: string | null;
  createdAt: string;
};

export type SupportMessageAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type SupportMessage = {
  id: string;
  authorKind: SupportMessageAuthorKind;
  body: string;
  createdAt: string;
  attachments: SupportMessageAttachment[];
};

export type SupportTicketDetail = SupportTicketSummary & {
  messages: SupportMessage[];
};

export type AttachTicketAssetInput = {
  assetId: string;
  fileName: string;
};

export type SupportAttachmentUploadGrant = {
  publicId: string;
  ownershipToken: string;
  uploadUrl: string;
  apiKey: string;
  params: {
    timestamp: number;
    folder: string;
    publicId: string;
    context: string;
    signature: string;
  };
};

export type CompleteSupportAttachmentInput = {
  publicId: string;
  fileName: string;
  ownershipToken: string;
  resourceType: "image" | "raw";
};

/** A signed upload descriptor that has already been validated (customer
 * ownership, MIME type, size) and is ready to persist alongside a message. */
export type ValidatedTicketAttachment = {
  assetId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type CreateSupportTicketInput = {
  subject: string;
  category: SupportTicketCategory;
  body: string;
  attachments?: AttachTicketAssetInput[];
};

export type ReplyToTicketInput = {
  body: string;
  attachments?: AttachTicketAssetInput[];
};

export type CustomerIdentity = { customerId: string; authUserId: string };

export class SupportActionError extends ApiError {
  constructor(code: string, message: string) {
    super({
      code,
      message,
      status:
        code === "SUPPORT_TICKET_NOT_FOUND"
          ? 404
          : code.endsWith("NOT_OWNED")
            ? 403
            : code.endsWith("UNAVAILABLE")
              ? 503
              : 422,
    });
    this.name = "SupportActionError";
  }
}

export type SupportTicketListInput = { page: number; pageSize: number };

import { ApiError } from "@/lib/errors/api-error";
