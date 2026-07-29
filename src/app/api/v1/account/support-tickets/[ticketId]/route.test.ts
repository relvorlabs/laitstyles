import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  getSupportTicketDetail: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/support/server/queries", () => ({
  getSupportTicketDetail: mocks.getSupportTicketDetail,
}));

import { GET } from "./route";

const consumer = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "amara@example.com",
  displayName: "Amara",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};
const ticketId = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
});

describe("GET /api/v1/account/support-tickets/[ticketId]", () => {
  it("returns the same not-found envelope for a missing or foreign ticket", async () => {
    mocks.getSupportTicketDetail.mockResolvedValue(null);

    const response = await GET(
      new Request(`http://localhost/api/v1/account/support-tickets/${ticketId}`, {
        headers: { "x-request-id": "request-support" },
      }),
      { params: Promise.resolve({ ticketId }) },
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("x-request-id")).toBe("request-support");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "SUPPORT_TICKET_NOT_FOUND" },
    });
    expect(mocks.getSupportTicketDetail).toHaveBeenCalledWith(consumer, ticketId);
  });
});
