import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  ticketsCreate: vi.fn(),
  ticketsFindFirst: vi.fn(),
  assetsFindUnique: vi.fn(),
  outboxCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    support_tickets: {
      create: mocks.ticketsCreate,
      findFirst: mocks.ticketsFindFirst,
    },
    cloudinary_assets: {
      findUnique: mocks.assetsFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));

import { attachTicketAsset } from "@/modules/support/server/attachments";
import { createSupportTicket, replyToTicket } from "@/modules/support/server/commands";

const identity = {
  customerId: "11111111-1111-4111-8111-111111111111",
  authUserId: "22222222-2222-4222-8222-222222222222",
};
const ticketId = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.outboxCreate.mockResolvedValue({ id: "outbox-1" });
  mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
    callback(createTx()),
  );
});

function createTx() {
  return {
    support_tickets: {
      create: mocks.ticketsCreate,
      findFirst: mocks.ticketsFindFirst,
      update: vi.fn().mockResolvedValue({}),
    },
    support_messages: {
      create: vi.fn().mockResolvedValue({
        id: "44444444-4444-4444-8444-444444444444",
        author_kind: "customer",
        body: "The issue remains.",
        created_at: new Date("2026-07-29T00:00:00.000Z"),
        support_attachments: [],
      }),
    },
    outbox_messages: {
      create: mocks.outboxCreate,
    },
  };
}

describe("createSupportTicket", () => {
  it("creates a ticket with its opening customer message", async () => {
    mocks.ticketsCreate.mockResolvedValue({
      id: ticketId,
      subject: "Order issue",
      category: "order",
      status: "open",
      last_message_at: new Date("2026-07-29T00:00:00.000Z"),
      created_at: new Date("2026-07-29T00:00:00.000Z"),
      support_messages: [
        {
          id: "msg-1",
          author_kind: "customer",
          body: "My order has not arrived.",
          created_at: new Date("2026-07-29T00:00:00.000Z"),
          support_attachments: [],
        },
      ],
    });

    const result = await createSupportTicket(identity, {
      subject: "Order issue",
      category: "order",
      body: "My order has not arrived.",
    });

    expect(mocks.ticketsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customer_id: identity.customerId,
          subject: "Order issue",
          category: "order",
          status: "open",
          support_messages: {
            create: expect.objectContaining({
              author_kind: "customer",
              author_profile_id: identity.authUserId,
              body: "My order has not arrived.",
            }),
          },
        }),
      }),
    );
    expect(result.status).toBe("open");
    expect(result.messages).toHaveLength(1);
    expect(mocks.outboxCreate).toHaveBeenCalledTimes(2);
    expect(mocks.outboxCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        topic: "support.ticket.created.staff",
        status: "pending",
      }),
    });
    expect(mocks.outboxCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        topic: "support.ticket.created.customer",
        status: "pending",
      }),
    });
  });
});

describe("replyToTicket", () => {
  it("reopens a resolved ticket when the customer replies (tx.support_tickets.update)", async () => {
    mocks.ticketsFindFirst.mockResolvedValue({ id: ticketId, status: "resolved" });
    let capturedTx: ReturnType<typeof createTx> | undefined;
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      capturedTx = createTx();
      capturedTx.support_tickets.findFirst = mocks.ticketsFindFirst;
      return callback(capturedTx);
    });

    await replyToTicket(identity, ticketId, { body: "The issue remains." });

    expect(capturedTx?.support_tickets.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "open" }),
      }),
    );
  });

  it("moves an open ticket to pending_staff instead of leaving it open", async () => {
    let capturedTx: ReturnType<typeof createTx> | undefined;
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      capturedTx = createTx();
      capturedTx.support_tickets.findFirst = vi
        .fn()
        .mockResolvedValue({ id: ticketId, status: "open" });
      return callback(capturedTx);
    });

    await replyToTicket(identity, ticketId, { body: "Following up." });

    expect(capturedTx?.support_tickets.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "pending_staff" }),
      }),
    );
    expect(mocks.outboxCreate).toHaveBeenCalledTimes(2);
    expect(mocks.outboxCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ topic: "support.ticket.replied.staff", status: "pending" }),
    });
    expect(mocks.outboxCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        topic: "support.ticket.replied.customer",
        status: "pending",
      }),
    });
  });

  it("rejects a reply to a ticket that does not belong to the customer", async () => {
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => unknown) => {
      const tx = createTx();
      tx.support_tickets.findFirst = vi.fn().mockResolvedValue(null);
      return callback(tx);
    });

    await expect(replyToTicket(identity, ticketId, { body: "Hello?" })).rejects.toMatchObject({
      code: "SUPPORT_TICKET_NOT_FOUND",
    });
  });
});

describe("attachTicketAsset", () => {
  it("rejects an attachment not owned by the ticket customer", async () => {
    mocks.ticketsFindFirst.mockResolvedValue({ id: ticketId });
    mocks.assetsFindUnique.mockResolvedValue({
      id: "asset-1",
      created_by_profile_id: "someone-else",
      kind: "support_attachment",
      format: "jpg",
      bytes: 1_000,
    });

    await expect(
      attachTicketAsset(identity, ticketId, { assetId: "asset-1", fileName: "receipt.jpg" }),
    ).rejects.toMatchObject({ code: "SUPPORT_ATTACHMENT_NOT_OWNED" });
  });

  it("accepts an attachment owned by the caller's own upload session", async () => {
    mocks.ticketsFindFirst.mockResolvedValue({ id: ticketId });
    mocks.assetsFindUnique.mockResolvedValue({
      id: "asset-1",
      created_by_profile_id: identity.authUserId,
      kind: "support_attachment",
      format: "png",
      bytes: 2_048,
    });

    const result = await attachTicketAsset(identity, ticketId, {
      assetId: "asset-1",
      fileName: "receipt.png",
    });

    expect(result).toEqual({
      assetId: "asset-1",
      fileName: "receipt.png",
      mimeType: "image/png",
      sizeBytes: 2_048,
    });
  });

  it("rejects an oversized attachment", async () => {
    mocks.ticketsFindFirst.mockResolvedValue({ id: ticketId });
    mocks.assetsFindUnique.mockResolvedValue({
      id: "asset-1",
      created_by_profile_id: identity.authUserId,
      kind: "support_attachment",
      format: "png",
      bytes: 50 * 1024 * 1024,
    });

    await expect(
      attachTicketAsset(identity, ticketId, { assetId: "asset-1", fileName: "large.png" }),
    ).rejects.toMatchObject({ code: "SUPPORT_ATTACHMENT_TOO_LARGE" });
  });

  it("associates a validated attachment with the created support message", async () => {
    mocks.assetsFindUnique.mockResolvedValue({
      id: "asset-1",
      created_by_profile_id: identity.authUserId,
      kind: "support_attachment",
      format: "png",
      bytes: 2_048,
    });
    mocks.ticketsCreate.mockResolvedValue({
      id: ticketId,
      subject: "Receipt",
      category: "payment",
      status: "open",
      last_message_at: new Date("2026-07-29T00:00:00.000Z"),
      created_at: new Date("2026-07-29T00:00:00.000Z"),
      support_messages: [],
    });

    await createSupportTicket(identity, {
      subject: "Receipt",
      category: "payment",
      body: "Attached.",
      attachments: [{ assetId: "asset-1", fileName: "receipt.png" }],
    });

    expect(mocks.ticketsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          support_messages: {
            create: expect.objectContaining({
              support_attachments: {
                create: [
                  {
                    asset_id: "asset-1",
                    file_name: "receipt.png",
                    mime_type: "image/png",
                    size_bytes: 2_048,
                  },
                ],
              },
            }),
          },
        }),
      }),
    );
  });
});
