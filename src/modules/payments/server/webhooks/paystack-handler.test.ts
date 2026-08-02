import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyWebhookSignature: vi.fn(),
  parsePaystackEventEnvelope: vi.fn(),
  isSupportedPaystackFinancialEvent: vi.fn(),
  isSupportedPaystackChargeEvent: vi.fn(),
  isSupportedPaystackRefundEvent: vi.fn(),
  isSupportedPaystackDisputeEvent: vi.fn(),
  isSupportedPaystackTransferEvent: vi.fn(),
  parsePaystackChargeEvent: vi.fn(),
  parsePaystackRefundEvent: vi.fn(),
  parsePaystackDisputeEvent: vi.fn(),
  parsePaystackTransferEvent: vi.fn(),
  settlePaystackEvent: vi.fn(),
  applyRefundWebhookState: vi.fn(),
  applyDisputeProviderState: vi.fn(),
  applyTransferProviderState: vi.fn(),
  reconcileOrderDisputeState: vi.fn(),
  upsertWebhook: vi.fn(),
  claimWebhook: vi.fn(),
  updateWebhook: vi.fn(),
}));

vi.mock("@/modules/payments/server/paystack", () => ({
  verifyWebhookSignature: mocks.verifyWebhookSignature,
  parsePaystackEventEnvelope: mocks.parsePaystackEventEnvelope,
  isSupportedPaystackFinancialEvent: mocks.isSupportedPaystackFinancialEvent,
  isSupportedPaystackChargeEvent: mocks.isSupportedPaystackChargeEvent,
  isSupportedPaystackRefundEvent: mocks.isSupportedPaystackRefundEvent,
  isSupportedPaystackDisputeEvent: mocks.isSupportedPaystackDisputeEvent,
  isSupportedPaystackTransferEvent: mocks.isSupportedPaystackTransferEvent,
  parsePaystackChargeEvent: mocks.parsePaystackChargeEvent,
  parsePaystackRefundEvent: mocks.parsePaystackRefundEvent,
  parsePaystackDisputeEvent: mocks.parsePaystackDisputeEvent,
  parsePaystackTransferEvent: mocks.parsePaystackTransferEvent,
}));
vi.mock("@/modules/checkout/server/settle-payment", () => ({
  settlePaystackEvent: mocks.settlePaystackEvent,
}));
vi.mock("@/modules/payments/server/refund-webhooks", () => ({
  applyRefundWebhookState: mocks.applyRefundWebhookState,
}));
vi.mock("@/modules/payments/server/disputes", () => ({
  applyDisputeProviderState: mocks.applyDisputeProviderState,
}));
vi.mock("@/modules/payments/server/transfers", () => ({
  applyTransferProviderState: mocks.applyTransferProviderState,
}));
vi.mock("@/modules/payments/server/dispute-order-state", () => ({
  reconcileOrderDisputeState: mocks.reconcileOrderDisputeState,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    provider_webhook_events: {
      upsert: mocks.upsertWebhook,
      updateMany: mocks.claimWebhook,
      update: mocks.updateWebhook,
    },
  },
}));

import { processPaystackWebhook } from "./paystack-handler";

const signature = "a".repeat(128);
const chargePayload = JSON.stringify({
  event: "charge.success",
  data: { id: 123, reference: "LS-CHECKOUT-reference" },
});
const settlement = {
  source: "webhook" as const,
  providerTransactionId: "123",
  reference: "LS-CHECKOUT-reference",
  status: "success" as const,
  amountMinor: 102_000,
  currency: "NGN",
  customerEmail: "buyer@example.com",
  paidAt: "2026-07-29T20:00:00.000Z",
  channel: "card",
  gatewayResponse: "Successful",
  failureReason: null,
};
const refundProjection = { id: "refund-1", status: "processed" as const };
const disputeProjection = { id: "dispute-1", status: "resolved" as const };
const providerTransfer = {
  id: "901",
  transferCode: "TRF_owner",
  reference: "lt_12345678901234567890123456789012",
  amountMinor: 25_000,
  currency: "NGN",
  status: "success" as const,
  source: "balance",
  reason: "Owner transfer",
  recipientCode: "RCP_owner",
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:01:00.000Z",
  transferredAt: "2026-07-30T12:01:00.000Z",
};
const transferProjection = { id: "transfer-1", status: "success" as const };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.verifyWebhookSignature.mockReturnValue(undefined);
  mocks.parsePaystackEventEnvelope.mockReturnValue({ event: "charge.success", data: {} });
  mocks.isSupportedPaystackFinancialEvent.mockReturnValue(true);
  mocks.isSupportedPaystackChargeEvent.mockReturnValue(true);
  mocks.isSupportedPaystackRefundEvent.mockReturnValue(false);
  mocks.isSupportedPaystackDisputeEvent.mockReturnValue(false);
  mocks.isSupportedPaystackTransferEvent.mockReturnValue(false);
  mocks.parsePaystackChargeEvent.mockReturnValue({ event: "charge.success", settlement });
  mocks.upsertWebhook.mockResolvedValue({ id: "webhook-1", status: "received" });
  mocks.claimWebhook.mockResolvedValue({ count: 1 });
  mocks.updateWebhook.mockResolvedValue({ id: "webhook-1" });
  mocks.settlePaystackEvent.mockResolvedValue({
    ok: true,
    value: {
      checkoutId: "checkout-1",
      paymentId: "payment-1",
      orderNumber: "LS-ORDER1",
      status: "success",
      replayed: false,
    },
  });
  mocks.applyRefundWebhookState.mockResolvedValue({ ok: true, value: refundProjection });
  mocks.applyDisputeProviderState.mockResolvedValue({ ok: true, value: disputeProjection });
  mocks.reconcileOrderDisputeState.mockResolvedValue(disputeProjection);
  mocks.applyTransferProviderState.mockResolvedValue({ ok: true, value: transferProjection });
});

describe("processPaystackWebhook", () => {
  it("verifies the raw body and settles a charge once", async () => {
    await expect(processPaystackWebhook({ rawBody: chargePayload, signature })).resolves.toEqual({
      accepted: true,
      duplicate: false,
      status: "success",
      resource: "payment",
    });

    expect(mocks.verifyWebhookSignature).toHaveBeenCalledWith(chargePayload, signature);
    expect(mocks.settlePaystackEvent).toHaveBeenCalledWith(settlement);
    expect(mocks.updateWebhook).toHaveBeenLastCalledWith({
      where: { id: "webhook-1" },
      data: expect.objectContaining({ status: "processed", last_error: null }),
    });
  });

  it("acknowledges an already processed duplicate without re-running the domain", async () => {
    mocks.upsertWebhook.mockResolvedValueOnce({ id: "webhook-1", status: "processed" });

    await expect(processPaystackWebhook({ rawBody: chargePayload, signature })).resolves.toEqual({
      accepted: true,
      duplicate: true,
    });
    expect(mocks.claimWebhook).not.toHaveBeenCalled();
    expect(mocks.settlePaystackEvent).not.toHaveBeenCalled();
  });

  it("applies a refund provider event through the refund domain", async () => {
    const payload = JSON.stringify({ event: "refund.processed", data: { id: 3_018_284 } });
    const providerRefund = { id: "3018284", status: "processed" };
    mocks.parsePaystackEventEnvelope.mockReturnValueOnce({ event: "refund.processed", data: {} });
    mocks.isSupportedPaystackChargeEvent.mockReturnValueOnce(false);
    mocks.isSupportedPaystackRefundEvent.mockReturnValueOnce(true);
    mocks.parsePaystackRefundEvent.mockReturnValueOnce({
      event: "refund.processed",
      refund: providerRefund,
    });

    await expect(processPaystackWebhook({ rawBody: payload, signature })).resolves.toEqual({
      accepted: true,
      duplicate: false,
      status: "processed",
      resource: "refund",
    });
    expect(mocks.applyRefundWebhookState).toHaveBeenCalledWith(providerRefund);
  });

  it("applies and reconciles a dispute provider event", async () => {
    const payload = JSON.stringify({ event: "charge.dispute.resolve", data: { id: 42 } });
    const providerDispute = { id: "42", status: "resolved" };
    mocks.parsePaystackEventEnvelope.mockReturnValueOnce({
      event: "charge.dispute.resolve",
      data: {},
    });
    mocks.isSupportedPaystackChargeEvent.mockReturnValueOnce(false);
    mocks.isSupportedPaystackRefundEvent.mockReturnValueOnce(false);
    mocks.isSupportedPaystackDisputeEvent.mockReturnValueOnce(true);
    mocks.parsePaystackDisputeEvent.mockReturnValueOnce({
      event: "charge.dispute.resolve",
      dispute: providerDispute,
    });

    await expect(processPaystackWebhook({ rawBody: payload, signature })).resolves.toEqual({
      accepted: true,
      duplicate: false,
      status: "resolved",
      resource: "dispute",
    });
    expect(mocks.applyDisputeProviderState).toHaveBeenCalledWith({ provider: providerDispute });
    expect(mocks.reconcileOrderDisputeState).toHaveBeenCalledWith(disputeProjection);
  });

  it("converges a signed transfer event through the local transfer state machine", async () => {
    const payload = JSON.stringify({ event: "transfer.success", data: { id: 901 } });
    mocks.parsePaystackEventEnvelope.mockReturnValueOnce({ event: "transfer.success", data: {} });
    mocks.isSupportedPaystackChargeEvent.mockReturnValueOnce(false);
    mocks.isSupportedPaystackRefundEvent.mockReturnValueOnce(false);
    mocks.isSupportedPaystackDisputeEvent.mockReturnValueOnce(false);
    mocks.isSupportedPaystackTransferEvent.mockReturnValueOnce(true);
    mocks.parsePaystackTransferEvent.mockReturnValueOnce({
      event: "transfer.success",
      status: "success",
      transfer: providerTransfer,
    });

    await expect(processPaystackWebhook({ rawBody: payload, signature })).resolves.toEqual({
      accepted: true,
      duplicate: false,
      status: "success",
      resource: "transfer",
    });
    expect(mocks.applyTransferProviderState).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: providerTransfer.reference,
        provider: providerTransfer,
        eventNote: "Signed Paystack event transfer.success.",
      }),
    );
  });

  it("persists but defers signed non-financial events", async () => {
    const payload = JSON.stringify({ event: "customeridentification.success", data: { id: 9 } });
    mocks.parsePaystackEventEnvelope.mockReturnValueOnce({
      event: "customeridentification.success",
      data: {},
    });
    mocks.isSupportedPaystackFinancialEvent.mockReturnValueOnce(false);

    await expect(processPaystackWebhook({ rawBody: payload, signature })).resolves.toEqual({
      accepted: true,
      deferred: true,
    });
    expect(mocks.upsertWebhook).toHaveBeenCalled();
    expect(mocks.claimWebhook).not.toHaveBeenCalled();
  });

  it("rejects an invalid signature before persistence", async () => {
    mocks.verifyWebhookSignature.mockImplementationOnce(() => {
      throw new Error("invalid signature");
    });

    await expect(
      processPaystackWebhook({ rawBody: chargePayload, signature }),
    ).rejects.toMatchObject({
      code: "PAYSTACK_SIGNATURE_INVALID",
      status: 401,
    });
    expect(mocks.upsertWebhook).not.toHaveBeenCalled();
  });
});
