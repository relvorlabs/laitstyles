import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  processPaystackWebhook: vi.fn(),
}));

vi.mock("@/modules/payments/server/webhooks", () => ({
  processPaystackWebhook: mocks.processPaystackWebhook,
}));

import { POST } from "./route";

const rawPayload = JSON.stringify({
  event: "charge.success",
  data: { id: 123, reference: "LS-CHECKOUT-reference" },
});

function webhookRequest(body = rawPayload, signature = "a".repeat(128)): Request {
  return new Request("https://www.laitstyles.com/api/v1/payments/webhooks/paystack", {
    method: "POST",
    headers: { "x-paystack-signature": signature },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.processPaystackWebhook.mockResolvedValue({
    accepted: true,
    status: "success",
    resource: "payment",
  });
});

describe("POST /api/v1/payments/webhooks/paystack", () => {
  it("passes the untouched raw body and signature to the webhook service", async () => {
    const response = await POST(webhookRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.processPaystackWebhook).toHaveBeenCalledWith({
      rawBody: rawPayload,
      signature: "a".repeat(128),
    });
    await expect(response.json()).resolves.toEqual({
      data: { accepted: true, status: "success", resource: "payment" },
    });
  });

  it("delegates a missing signature as null for service-level authentication", async () => {
    mocks.processPaystackWebhook.mockRejectedValueOnce(
      new ApiError({
        code: "PAYSTACK_SIGNATURE_REQUIRED",
        message: "The Paystack signature is required.",
        status: 401,
      }),
    );
    const response = await POST(
      new Request("https://www.laitstyles.com/api/v1/payments/webhooks/paystack", {
        method: "POST",
        body: rawPayload,
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.processPaystackWebhook).toHaveBeenCalledWith({
      rawBody: rawPayload,
      signature: null,
    });
  });
});
