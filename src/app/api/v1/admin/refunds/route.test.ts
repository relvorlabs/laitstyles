import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  listRefunds: vi.fn(),
  requestRefund: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/payments/server/refunds", () => ({
  listRefunds: mocks.listRefunds,
  requestRefund: mocks.requestRefund,
}));

import { GET, POST } from "./route";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.com",
  displayName: "Owner",
  role: "admin" as const,
};
const refund = {
  id: "22222222-2222-4222-8222-222222222222",
  paymentId: "33333333-3333-4333-8333-333333333333",
  orderId: "44444444-4444-4444-8444-444444444444",
  orderNumber: "LS-1001",
  returnId: null,
  providerReference: "3018284",
  providerStatus: "pending",
  idempotencyKey: "refund-key-123",
  requestedAmountMinor: 10_000,
  processedAmountMinor: 0,
  currency: "NGN",
  status: "pending",
  reason: "Partial return",
  failureReason: null,
  retryCount: 0,
  requestedBy: "Owner",
  requestedAt: "2026-07-30T12:00:00.000Z",
  processedAt: null,
  failedAt: null,
  lastProviderSyncAt: "2026-07-30T12:00:00.000Z",
  lineAllocations: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue(actor);
  mocks.listRefunds.mockResolvedValue({
    ok: true,
    value: { items: [refund], page: 1, perPage: 25, total: 1 },
  });
  mocks.requestRefund.mockResolvedValue({ ok: true, value: refund });
});

describe("admin refund routes", () => {
  it("returns private paginated refund projections for finance readers", async () => {
    const response = await GET(
      new Request("https://www.laitstyles.com/api/v1/admin/refunds?page=1&perPage=25"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("finance:read");
    await expect(response.json()).resolves.toEqual({
      data: [refund],
      meta: { page: 1, perPage: 25, total: 1 },
    });
  });

  it("rejects mutation requests without a trusted origin", async () => {
    const response = await POST(
      new Request("https://www.laitstyles.com/api/v1/admin/refunds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "refund-key-123",
        },
        body: JSON.stringify({
          paymentId: refund.paymentId,
          amountMinor: 10_000,
          currency: "NGN",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.requestRefund).not.toHaveBeenCalled();
  });

  it("requires refund capability and forwards a server-owned idempotency identity", async () => {
    const response = await POST(
      new Request("https://www.laitstyles.com/api/v1/admin/refunds", {
        method: "POST",
        headers: {
          Origin: "https://www.laitstyles.com",
          "Content-Type": "application/json",
          "Idempotency-Key": "refund-key-123",
        },
        body: JSON.stringify({
          paymentId: refund.paymentId,
          amountMinor: 10_000,
          currency: "NGN",
          reason: "Partial return",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("payments:refund");
    expect(mocks.requestRefund).toHaveBeenCalledWith(actor, {
      paymentId: refund.paymentId,
      amountMinor: 10_000,
      currency: "NGN",
      reason: "Partial return",
      idempotencyKey: "refund-key-123",
    });
  });

  it("does not leak domain execution when authorization fails", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({ code: "MISSING_CAPABILITY", message: "Forbidden", status: 403 }),
    );
    const response = await POST(
      new Request("https://www.laitstyles.com/api/v1/admin/refunds", {
        method: "POST",
        headers: {
          Origin: "https://www.laitstyles.com",
          "Content-Type": "application/json",
          "Idempotency-Key": "refund-key-123",
        },
        body: JSON.stringify({
          paymentId: refund.paymentId,
          amountMinor: 10_000,
          currency: "NGN",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.requestRefund).not.toHaveBeenCalled();
  });
});
