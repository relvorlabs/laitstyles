import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DisputeRecord } from "@/modules/payments/client/disputes";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  listPaymentDisputes: vi.fn(),
  acceptPaymentDispute: vi.fn(),
  submitDisputeEvidence: vi.fn(),
  reconcileOrderDisputeState: vi.fn(),
  throwDisputeApiError: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/payments/server/disputes/index", () => ({
  listPaymentDisputes: mocks.listPaymentDisputes,
  acceptPaymentDispute: mocks.acceptPaymentDispute,
  submitDisputeEvidence: mocks.submitDisputeEvidence,
  reconcileOrderDisputeState: mocks.reconcileOrderDisputeState,
  throwDisputeApiError: mocks.throwDisputeApiError,
}));

import { POST as accept } from "./[disputeId]/accept/route";
import { POST as evidence } from "./[disputeId]/evidence/route";
import { GET } from "./route";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.com",
  displayName: "Owner",
  role: "admin" as const,
};
const dispute = {
  id: "22222222-2222-4222-8222-222222222222",
  paymentId: "33333333-3333-4333-8333-333333333333",
  orderId: "44444444-4444-4444-8444-444444444444",
  orderNumber: "LS-1001",
  customerId: "55555555-5555-4555-8555-555555555555",
  customerName: "Buyer",
  providerDisputeId: "42",
  providerStatus: "awaiting-merchant-feedback",
  status: "awaiting_evidence",
  category: "transaction_not_received",
  amountMinor: 25_000,
  currency: "NGN",
  reason: "Order not received",
  evidence: [],
  evidenceDueAt: "2026-08-02T12:00:00.000Z",
  resolvedAt: null,
  resolutionNote: null,
  lastProviderSyncAt: "2026-07-30T12:00:00.000Z",
  createdAt: "2026-07-30T10:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
} satisfies DisputeRecord;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue(actor);
  mocks.listPaymentDisputes.mockResolvedValue({
    ok: true,
    value: { items: [dispute], page: 1, perPage: 25, total: 1 },
  });
  mocks.acceptPaymentDispute.mockResolvedValue({ ok: true, value: dispute });
  mocks.submitDisputeEvidence.mockResolvedValue({ ok: true, value: dispute });
  mocks.reconcileOrderDisputeState.mockResolvedValue(dispute);
});

describe("admin dispute routes", () => {
  it("returns private dispute data to finance readers", async () => {
    const response = await GET(
      new Request("https://www.laitstyles.com/api/v1/admin/disputes?page=1&perPage=25"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("finance:read");
    await expect(response.json()).resolves.toEqual({
      data: [dispute],
      meta: { page: 1, perPage: 25, total: 1 },
    });
  });

  it("rejects owner decisions without a trusted origin", async () => {
    const response = await accept(
      new Request(`https://www.laitstyles.com/api/v1/admin/disputes/${dispute.id}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "dispute-key-123",
        },
        body: JSON.stringify({ message: "Accept", refundAmountMinor: 25_000 }),
      }),
      { params: Promise.resolve({ disputeId: dispute.id }) },
    );

    expect(response.status).toBe(403);
    expect(mocks.acceptPaymentDispute).not.toHaveBeenCalled();
  });

  it("submits explicit owner decisions and reconciles the aggregate order state", async () => {
    const response = await accept(
      new Request(`https://www.laitstyles.com/api/v1/admin/disputes/${dispute.id}/accept`, {
        method: "POST",
        headers: {
          Origin: "https://www.laitstyles.com",
          "Content-Type": "application/json",
          "Idempotency-Key": "dispute-key-123",
        },
        body: JSON.stringify({ message: "Owner accepts chargeback", refundAmountMinor: 25_000 }),
      }),
      { params: Promise.resolve({ disputeId: dispute.id }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("payments:refund");
    expect(mocks.acceptPaymentDispute).toHaveBeenCalledWith(actor, dispute.id, {
      message: "Owner accepts chargeback",
      refundAmountMinor: 25_000,
      idempotencyKey: "dispute-key-123",
    });
    expect(mocks.reconcileOrderDisputeState).toHaveBeenCalledWith(dispute);
    await expect(response.json()).resolves.toEqual({ data: dispute });
  });

  it("rejects evidence requests without a bounded content length", async () => {
    const response = await evidence(
      new Request(`https://www.laitstyles.com/api/v1/admin/disputes/${dispute.id}/evidence`, {
        method: "POST",
        headers: {
          Origin: "https://www.laitstyles.com",
          "Content-Type": "multipart/form-data; boundary=test",
          "Idempotency-Key": "evidence-key-123",
        },
        body: "--test--",
      }),
      { params: Promise.resolve({ disputeId: dispute.id }) },
    );

    expect(response.status).toBe(411);
    expect(mocks.submitDisputeEvidence).not.toHaveBeenCalled();
  });

  it("rejects oversized evidence before multipart buffering", async () => {
    const response = await evidence(
      new Request(`https://www.laitstyles.com/api/v1/admin/disputes/${dispute.id}/evidence`, {
        method: "POST",
        headers: {
          Origin: "https://www.laitstyles.com",
          "Content-Type": "multipart/form-data; boundary=test",
          "Content-Length": String(6 * 1024 * 1024),
          "Idempotency-Key": "evidence-key-123",
        },
        body: "--test--",
      }),
      { params: Promise.resolve({ disputeId: dispute.id }) },
    );

    expect(response.status).toBe(413);
    expect(mocks.submitDisputeEvidence).not.toHaveBeenCalled();
  });
});
