import "server-only";

import type { SupportTicketStatus } from "@/modules/support/types";
import { SupportActionError } from "@/modules/support/types";

const MIME_TYPE_BY_FORMAT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export const MAX_TICKET_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function mimeTypeForAssetFormat(format: string | null): string {
  const mimeType = format ? MIME_TYPE_BY_FORMAT[format.toLowerCase()] : undefined;
  if (!mimeType) {
    throw new SupportActionError(
      "SUPPORT_ATTACHMENT_UNSUPPORTED_TYPE",
      "This file type cannot be attached to a support ticket.",
    );
  }
  return mimeType;
}

export function assertAttachmentSize(sizeBytes: number): void {
  if (sizeBytes > MAX_TICKET_ATTACHMENT_BYTES) {
    throw new SupportActionError(
      "SUPPORT_ATTACHMENT_TOO_LARGE",
      "Attachments must be 10 MB or smaller.",
    );
  }
}

/** A customer reply always moves the ticket back into staff review — even a
 * resolved/closed ticket reopens rather than staying terminal once the
 * customer says the issue remains. */
export function nextStatusAfterCustomerReply(current: SupportTicketStatus): SupportTicketStatus {
  return current === "resolved" || current === "closed" ? "open" : "pending_staff";
}
