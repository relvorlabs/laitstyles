import "server-only";

import { prisma } from "@/lib/prisma";
import { assertAttachmentSize, mimeTypeForAssetFormat } from "@/modules/support/server/policy";
import type {
  AttachTicketAssetInput,
  CustomerIdentity,
  ValidatedTicketAttachment,
} from "@/modules/support/types";
import { SupportActionError } from "@/modules/support/types";

/** Validates a signed-upload descriptor against the caller's own upload
 * session: the asset must already be a completed upload owned by the
 * caller — never a different customer's asset, even if the caller supplies
 * its identifier. Used for both a brand-new ticket's first message (no
 * ticket exists yet to own) and an existing ticket's reply. */
export async function validateTicketAttachment(
  identity: CustomerIdentity,
  input: AttachTicketAssetInput,
): Promise<ValidatedTicketAttachment> {
  const asset = await prisma.cloudinary_assets.findUnique({
    where: { id: input.assetId },
    select: { id: true, created_by_profile_id: true, kind: true, format: true, bytes: true },
  });
  if (
    !asset ||
    asset.created_by_profile_id !== identity.authUserId ||
    asset.kind !== "support_attachment"
  ) {
    throw new SupportActionError(
      "SUPPORT_ATTACHMENT_NOT_OWNED",
      "This attachment does not belong to your upload session.",
    );
  }

  const mimeType = mimeTypeForAssetFormat(asset.format);
  const sizeBytes = asset.bytes ?? 0;
  assertAttachmentSize(sizeBytes);

  return {
    assetId: asset.id,
    fileName: input.fileName,
    mimeType,
    sizeBytes,
  };
}

/** Same validation as {@link validateTicketAttachment}, plus confirming the
 * ticket itself belongs to the caller — for attaching to an existing ticket
 * (a reply), where ticket ownership is not yet established. */
export async function attachTicketAsset(
  identity: CustomerIdentity,
  ticketId: string,
  input: AttachTicketAssetInput,
): Promise<ValidatedTicketAttachment> {
  const ticket = await prisma.support_tickets.findFirst({
    where: { id: ticketId, customer_id: identity.customerId },
    select: { id: true },
  });
  if (!ticket) {
    throw new SupportActionError(
      "SUPPORT_TICKET_NOT_FOUND",
      "The selected support ticket could not be found.",
    );
  }

  return validateTicketAttachment(identity, input);
}
