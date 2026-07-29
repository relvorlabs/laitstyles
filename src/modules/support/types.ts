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

export class SupportActionError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "SupportActionError";
    this.code = code;
  }
}

export type SupportTicketListInput = { page: number; pageSize: number };
