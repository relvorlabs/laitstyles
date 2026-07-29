import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  cancelAccountDeletion: vi.fn(),
  getActiveAccountDeletionRequest: vi.fn(),
  requestAccountDeletion: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/account-lifecycle/server/deletion", () => ({
  cancelAccountDeletion: mocks.cancelAccountDeletion,
  getActiveAccountDeletionRequest: mocks.getActiveAccountDeletionRequest,
  requestAccountDeletion: mocks.requestAccountDeletion,
}));

import { DELETE, GET, POST } from "./route";

const consumer = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "amara@example.com",
  displayName: "Amara",
  phone: null,
  customerId: "22222222-2222-4222-8222-222222222222",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(consumer);
  mocks.getActiveAccountDeletionRequest.mockResolvedValue(null);
  mocks.requestAccountDeletion.mockResolvedValue({ id: "request-1", status: "scheduled" });
});

it("reads only the authenticated customer's active deletion request", async () => {
  const response = await GET(new Request("http://localhost/api/v1/account/deletion-requests"));
  expect(response.status).toBe(200);
  expect(mocks.getActiveAccountDeletionRequest).toHaveBeenCalledWith(consumer);
});

it("schedules deletion from validated customer input", async () => {
  const response = await POST(
    new Request("http://localhost/api/v1/account/deletion-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "No longer needed" }),
    }),
  );
  expect(response.status).toBe(201);
  expect(mocks.requestAccountDeletion).toHaveBeenCalledWith(consumer, {
    reason: "No longer needed",
  });
});

describe("DELETE /api/v1/account/deletion-requests", () => {
  it("cancels only the authenticated customer's request and preserves correlation", async () => {
    mocks.cancelAccountDeletion.mockResolvedValue({
      id: "request-1",
      status: "cancelled",
      reason: null,
      requestedAt: "2026-07-29T00:00:00.000Z",
      scheduledFor: "2026-08-12T00:00:00.000Z",
      cancelledAt: "2026-07-30T00:00:00.000Z",
      completedAt: null,
    });

    const response = await DELETE(
      new Request("http://localhost/api/v1/account/deletion-requests", {
        method: "DELETE",
        headers: { "x-request-id": "request-deletion" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("request-deletion");
    expect(mocks.cancelAccountDeletion).toHaveBeenCalledWith(consumer);
  });
});
