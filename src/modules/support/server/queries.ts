import "server-only";

import type { Prisma } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import type {
  CustomerIdentity,
  SupportMessage,
  SupportTicketDetail,
  SupportTicketListInput,
  SupportTicketSummary,
} from "@/modules/support/types";

const ticketSummarySelect = {
  id: true,
  subject: true,
  category: true,
  status: true,
  last_message_at: true,
  created_at: true,
} satisfies Prisma.support_ticketsSelect;

const ticketDetailInclude = {
  support_messages: {
    orderBy: { created_at: "asc" as const },
    include: { support_attachments: true },
  },
} satisfies Prisma.support_ticketsInclude;

function mapSummary(row: {
  id: string;
  subject: string;
  category: SupportTicketSummary["category"];
  status: SupportTicketSummary["status"];
  last_message_at: Date | null;
  created_at: Date;
}): SupportTicketSummary {
  return {
    id: row.id,
    subject: row.subject,
    category: row.category,
    status: row.status,
    lastMessageAt: row.last_message_at ? row.last_message_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

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

export async function listSupportTickets(
  identity: CustomerIdentity,
  input: SupportTicketListInput,
): Promise<{ data: SupportTicketSummary[]; total: number }> {
  const where = { customer_id: identity.customerId };
  const [rows, total] = await Promise.all([
    prisma.support_tickets.findMany({
      where,
      select: ticketSummarySelect,
      orderBy: { created_at: "desc" },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    }),
    prisma.support_tickets.count({ where }),
  ]);

  return { data: rows.map(mapSummary), total };
}

export async function getSupportTicketDetail(
  identity: CustomerIdentity,
  ticketId: string,
): Promise<SupportTicketDetail | null> {
  const row = await prisma.support_tickets.findFirst({
    where: { id: ticketId, customer_id: identity.customerId },
    include: ticketDetailInclude,
  });
  if (!row) return null;

  return {
    ...mapSummary(row),
    messages: row.support_messages.map(mapMessage),
  };
}
