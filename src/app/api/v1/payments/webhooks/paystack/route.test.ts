import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyWebhookSignature: vi.fn(),
  parsePaystackEventEnvelope: vi.fn(),
  isSupportedPaystackChargeEvent: vi.fn(),
  parsePaystackChargeEvent: vi.fn(),
  settlePaystackEvent: vi.fn(),
  upsertWebhook: vi.fn(),
  claimWebhook: vi.fn(),
  updateWebhook: vi.fn(),
}));

vi.mock("@/modules/payments/server/paystack", () => ({
  verifyWebhookSignature: mocks.verifyWebhookSignature,
  parsePaystackEventEnvelope: mocks.parsePaystackEventEnvelope,
  isSupportedPaystackChargeEvent: mocks.isSupportedPaystackChargeEvent,
  parsePaystackChargeEvent: mocks.parsePaystackChargeEvent,
}));
vi.mock("@/modules/checkout/server/settle-payment", () => ({
  settlePaystackEvent: mocks.settlePaystackEvent,
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

import { POST } from "./route";

const rawPayload = JSON.stringify({
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

function webhookRequest(body = rawPayload, signature = "a".repeat(128)) {
  return new Request("https://www.laitstyles.com/api/v1/payments/webhooks/paystack", {
    method: "POST",
    headers: { "x-paystack-signature": signature },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.parsePaystackEventEnvelope.mockReturnValue({ event: "charge.success", data: {} });
  mocks.isSupportedPaystackChargeEvent.mockReturnValue(true);
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
});

describe("POST /api/v1/payments/webhooks/paystack", () => {
  it("verifies the signature over the untouched raw body", async () => {
    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(mocks.verifyWebhookSignature).toHaveBeenCalledWith(rawPayload, "a".repeat(128));
    expect(mocks.settlePaystackEvent).toHaveBeenCalledWith(settlement);
  });

  it("rejects an invalid signature before persistence", async () => {
    mocks.verifyWebhookSignature.mockImplementationOnce(() => {
      throw new Error("invalid signature");
    });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(401);
    expect(mocks.upsertWebhook).not.toHaveBeenCalled();
  });

  it("acknowledges an already processed duplicate without settling again", async () => {
    mocks.upsertWebhook.mockResolvedValueOnce({ id: "webhook-1", status: "processed" });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: { accepted: true, duplicate: true } });
    expect(mocks.claimWebhook).not.toHaveBeenCalled();
    expect(mocks.settlePaystackEvent).not.toHaveBeenCalled();
  });

  it("lets only one concurrent delivery claim processing", async () => {
    mocks.upsertWebhook.mockResolvedValueOnce({ id: "webhook-1", status: "processing" });
    mocks.claimWebhook.mockResolvedValueOnce({ count: 0 });

    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: { accepted: true, duplicate: true, processing: true },
    });
    expect(mocks.settlePaystackEvent).not.toHaveBeenCalled();
  });

  it("durably defers signed non-checkout events for their owning plan", async () => {
    mocks.parsePaystackEventEnvelope.mockReturnValueOnce({ event: "refund.processed", data: {} });
    mocks.isSupportedPaystackChargeEvent.mockReturnValueOnce(false);

    const response = await POST(
      webhookRequest(JSON.stringify({ event: "refund.processed", data: {} })),
    );

    expect(response.status).toBe(200);
    expect(mocks.upsertWebhook).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ event_type: "refund.processed", status: "received" }),
      }),
    );
    expect(mocks.claimWebhook).not.toHaveBeenCalled();
    expect(mocks.settlePaystackEvent).not.toHaveBeenCalled();
  });
});
