import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acceptDispute,
  addDisputeEvidence,
  fetchDispute,
  getDisputeUploadUrl,
  listDisputes,
  uploadDisputeEvidenceFile,
} from "@/modules/payments/server/paystack/disputes";

const dispute = {
  id: 42,
  refund_amount: 25_000,
  currency: "NGN",
  status: "awaiting-merchant-feedback",
  resolution: null,
  transaction: {
    id: 9001,
    reference: "pay_dispute_1",
    amount: 25_000,
    currency: "NGN",
    customer: { international_format_phone: null },
  },
  category: "transaction_not_received",
  reason: "Customer says the order did not arrive",
  dueAt: "2026-08-02T12:00:00.000Z",
  evidence: null,
  attachments: [],
  createdAt: "2026-07-30T10:00:00.000Z",
  updatedAt: "2026-07-30T10:00:00.000Z",
};

function success(data: unknown, message = "Successful", meta?: unknown) {
  return new Response(JSON.stringify({ status: true, message, data, ...(meta ? { meta } : {}) }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Paystack dispute adapter", () => {
  it("lists disputes with filters and preserves provider pagination", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      success([dispute], "Disputes retrieved", {
        total: 3,
        skipped: 1,
        perPage: 1,
        page: 2,
        pageCount: 3,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      listDisputes({
        page: 2,
        perPage: 1,
        transaction: "pay_dispute_1",
        status: "awaiting-merchant-feedback",
      }),
    ).resolves.toMatchObject({
      disputes: [
        {
          id: "42",
          transactionId: "9001",
          transactionReference: "pay_dispute_1",
          amountMinor: 25_000,
          status: "awaiting-merchant-feedback",
          dueAt: "2026-08-02T12:00:00.000Z",
        },
      ],
      pagination: { total: 3, page: 2, perPage: 1, pageCount: 3 },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.paystack.co/dispute?page=2&perPage=1&transaction=pay_dispute_1&status=awaiting-merchant-feedback",
    );
  });

  it("fetches and preserves unknown provider states", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(success({ ...dispute, status: "processor-review" })),
    );

    await expect(fetchDispute("42")).resolves.toMatchObject({
      id: "42",
      status: "unknown",
      providerStatus: "processor-review",
      transactionReference: "pay_dispute_1",
    });
  });

  it("accepts the provider's partial nested transaction customer shape", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(success(dispute)));

    await expect(fetchDispute("42")).resolves.toMatchObject({
      id: "42",
      transactionId: "9001",
      transactionReference: "pay_dispute_1",
    });
  });

  it("submits normalized evidence metadata", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      success({
        id: 7,
        dispute: 42,
        customer_email: "buyer@example.com",
        customer_name: "Buyer",
        customer_phone: "+2348000000000",
        service_details: "Delivered with signed receipt",
        delivery_address: "Lagos",
        delivery_date: "2026-07-25",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      addDisputeEvidence("42", {
        customerEmail: "buyer@example.com",
        customerName: "Buyer",
        customerPhone: "+2348000000000",
        serviceDetails: "Delivered with signed receipt",
        deliveryAddress: "Lagos",
        deliveryDate: "2026-07-25",
      }),
    ).resolves.toMatchObject({ id: "7", disputeId: "42", customerEmail: "buyer@example.com" });
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      customer_email: "buyer@example.com",
      service_details: "Delivered with signed receipt",
    });
  });

  it("accepts a dispute with explicit resolution and then refetches canonical state", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(success({}, "Dispute resolved"))
      .mockResolvedValueOnce(
        success({ ...dispute, status: "resolved", resolution: "merchant-accepted" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      acceptDispute("42", {
        message: "Owner accepts the chargeback",
        refundAmountMinor: 25_000,
      }),
    ).resolves.toMatchObject({ status: "resolved", resolution: "merchant-accepted" });
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toEqual({
      resolution: "merchant-accepted",
      message: "Owner accepts the chargeback",
      refund_amount: 25_000,
    });
  });

  it("rejects untrusted upload URLs and oversized evidence before uploading", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        success({ signedUrl: "https://evil.example/upload", fileName: "proof.pdf" }),
      ),
    );

    await expect(getDisputeUploadUrl("42", "proof.pdf")).rejects.toMatchObject({
      code: "PAYSTACK_INVALID_UPLOAD_URL",
    });
    await expect(
      uploadDisputeEvidenceFile({
        signedUrl: "https://files.paystack.co/proof",
        file: new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]),
        contentType: "application/pdf",
      }),
    ).rejects.toThrow(/5 MB/i);
  });
});
