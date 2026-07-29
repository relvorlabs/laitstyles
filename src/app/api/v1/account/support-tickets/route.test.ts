import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  listSupportTickets: vi.fn(),
  createSupportTicket: vi.fn(),
}));
vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/support/server/queries", () => ({ listSupportTickets: mocks.listSupportTickets }));
vi.mock("@/modules/support/server/commands", () => ({ createSupportTicket: mocks.createSupportTicket }));

import { POST } from "./route";

const consumer = { kind: "consumer" as const, customerId: "customer-1", authUserId: "user-1" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
  mocks.createSupportTicket.mockResolvedValue({ id: "ticket-1" });
});

it("creates a ticket for the authenticated customer", async () => {
  const response = await POST(
    new Request("http://localhost/api/v1/account/support-tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject: "Order issue", category: "order", body: "Please help." }),
    }),
  );
  expect(response.status).toBe(201);
  expect(mocks.createSupportTicket).toHaveBeenCalledWith(consumer, {
    subject: "Order issue",
    category: "order",
    body: "Please help.",
    attachments: [],
  });
});
