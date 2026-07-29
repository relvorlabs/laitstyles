import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireApiConsumer: vi.fn(), replyToTicket: vi.fn() }));
vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/support/server/commands", () => ({ replyToTicket: mocks.replyToTicket }));

import { POST } from "./route";

const consumer = { kind: "consumer" as const, customerId: "customer-1", authUserId: "user-1" };
const ticketId = "33333333-3333-4333-8333-333333333333";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
  mocks.replyToTicket.mockResolvedValue({ id: "message-1" });
});

it("appends a reply through the customer-owned command", async () => {
  const response = await POST(
    new Request(`http://localhost/api/v1/account/support-tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "The issue remains." }),
    }),
    { params: Promise.resolve({ ticketId }) },
  );
  expect(response.status).toBe(201);
  expect(mocks.replyToTicket).toHaveBeenCalledWith(consumer, ticketId, {
    body: "The issue remains.",
    attachments: [],
  });
});
