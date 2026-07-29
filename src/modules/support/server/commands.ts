import "server-only";

import { prisma } from "@/lib/prisma";
import { enqueueOutbox } from "@/modules/operations/server/outbox";
import { attachTicketAsset, validateTicketAttachment } from "@/modules/support/server/attachments";
import { nextStatusAfterCustomerReply } from "@/modules/support/server/policy";
import type {
  CreateSupportTicketInput,
  CustomerIdentity,
  ReplyToTicketInput,
  SupportMessage,
  SupportTicketDetail,
  ValidatedTicketAttachment,
} from "@/modules/support/types";
import { SupportActionError } from "@/modules/support/types";

function mapMessage(row: {
  id: string;
  author_kind: SupportMessage["authorKind"];
  body: string;
  created_at: Date;
  support_attachments: Array<{
    id: string;
    file_name: string;
    mime_type: string;
    size_bytes: number;
  }>;
}): SupportMessage {
  return {
    id: row.id,
    authorKind: row.author_kind,
    body: row.body,
    createdAt: row.created_at.toISOString(),
    attachments: row.support_attachments.map((attachment) => ({
      id: attachment.id,
      fileName: attachment.file_name,
      mimeType: attachment.mime_type,
      sizeBytes: attachment.size_bytes,
    })),
  };
}

function attachmentCreateInput(attachments: ValidatedTicketAttachment[]) {
  return attachments.map((attachment) => ({
    asset_id: attachment.assetId,
    file_name: attachment.fileName,
    mime_type: attachment.mimeType,
    size_bytes: attachment.sizeBytes,
  }));
}

export async function createSupportTicket(
  identity: CustomerIdentity,
  input: CreateSupportTicketInput,
): Promise<SupportTicketDetail> {
  const now = new Date();
  // No ticket exists yet to own, so a new ticket's attachments are validated
  // against the caller's own upload session only (no ticket-ownership check).
  const validatedAttachments: ValidatedTicketAttachment[] = [];
  for (const attachment of input.attachments ?? []) {
    validatedAttachments.push(await validateTicketAttachment(identity, attachment));
  }

  const ticket = await prisma.$transaction(async (tx) => {
    const created = await tx.support_tickets.create({
      data: {
        customer_id: identity.customerId,
        subject: input.subject,
        category: input.category,
        status: "open",
        last_message_at: now,
        support_messages: {
          create: {
            author_kind: "customer",
            author_profile_id: identity.authUserId,
            body: input.body,
            ...(validatedAttachments.length
              ? { support_attachments: { create: attachmentCreateInput(validatedAttachments) } }
              : {}),
          },
        },
      },
      include: {
        support_messages: {
          orderBy: { created_at: "asc" },
          include: { support_attachments: true },
        },
      },
    });

    const payload = {
      customerId: identity.customerId,
      ticketId: created.id,
      subject: created.subject,
    };
    await enqueueOutbox(tx, { topic: "support.ticket.created.staff", payload });
    await enqueueOutbox(tx, { topic: "support.ticket.created.customer", payload });

    return created;
  });

  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    status: ticket.status,
    lastMessageAt: ticket.last_message_at ? ticket.last_message_at.toISOString() : null,
    createdAt: ticket.created_at.toISOString(),
    messages: ticket.support_messages.map(mapMessage),
  };
}

export async function replyToTicket(
  identity: CustomerIdentity,
  ticketId: string,
  input: ReplyToTicketInput,
): Promise<SupportMessage> {
  const validatedAttachments: ValidatedTicketAttachment[] = [];
  for (const attachment of input.attachments ?? []) {
    validatedAttachments.push(await attachTicketAsset(identity, ticketId, attachment));
  }

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.support_tickets.findFirst({
      where: { id: ticketId, customer_id: identity.customerId },
      select: { id: true, status: true },
    });
    if (!ticket) {
      throw new SupportActionError(
        "SUPPORT_TICKET_NOT_FOUND",
        "The selected support ticket could not be found.",
      );
    }

    const now = new Date();
    await tx.support_tickets.update({
      where: { id: ticketId },
      data: { status: nextStatusAfterCustomerReply(ticket.status), last_message_at: now },
    });

    const message = await tx.support_messages.create({
      data: {
        ticket_id: ticketId,
        author_kind: "customer",
        author_profile_id: identity.authUserId,
        body: input.body,
        ...(validatedAttachments.length
          ? { support_attachments: { create: attachmentCreateInput(validatedAttachments) } }
          : {}),
      },
      include: { support_attachments: true },
    });

    const payload = {
      customerId: identity.customerId,
      ticketId,
      messageId: message.id,
    };
    await enqueueOutbox(tx, { topic: "support.ticket.replied.staff", payload });
    await enqueueOutbox(tx, { topic: "support.ticket.replied.customer", payload });

    return mapMessage(message);
  });
}
