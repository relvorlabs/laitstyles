import { afterEach, describe, expect, it, vi } from "vitest";
import * as paystackExports from "@/modules/payments/server/paystack";

type RefundStatus =
  | "failed"
  | "needs-attention"
  | "pending"
  | "processed"
  | "processing"
  | "unknown";

type Refund = {
  id: string;
  transactionId: string;
  transactionReference: string | null;
  amountMinor: number;
  deductedAmountMinor: number | null;
  currency: "NGN";
  status: RefundStatus;
  providerStatus: string;
  refundedAt: string | null;
  expectedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

type RefundProviderContract = {
  createRefund(input: {
    transaction: string;
    amountMinor?: number;
    currency?: "NGN";
    customerNote?: string;
    merchantNote?: string;
  }): Promise<Refund>;
  fetchRefund(id: string): Promise<Refund>;
  listRefunds(input?: {
    page?: number;
    perPage?: number;
    transaction?: string;
    currency?: "NGN";
    from?: string;
    to?: string;
  }): Promise<{
    refunds: Refund[];
    pagination: {
      total: number | null;
      skipped: number | null;
      perPage: number;
      page: number;
      pageCount: number | null;
    };
  }>;
};

const provider = paystackExports as unknown as RefundProviderContract;

const refundData = {
  id: 3_018_284,
  transaction: {
    id: 1_004_723_697,
    reference: "pay_1",
  },
  integration: 412_829,
  dispute: null,
  settlement: null,
  amount: 10_000,
  deducted_amount: 0,
  currency: "NGN",
  channel: null,
  fully_deducted: false,
  refunded_by: "owner@example.com",
  refunded_at: null,
  expected_at: "2026-08-07T09:21:17.016Z",
  customer_note: "Customer requested a partial refund",
  merchant_note: "Approved return ret_1",
  status: "pending",
  domain: "test",
  createdAt: "2026-07-29T09:21:17.122Z",
  updatedAt: "2026-07-29T09:21:17.122Z",
};

function successResponse(data: unknown, message = "Refund retrieved", meta?: unknown) {
  return new Response(JSON.stringify({ status: true, message, data, ...(meta ? { meta } : {}) }), {
    status: 200,
    headers: { "Content-Type": "application/json", "x-request-id": "req_refund_1" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Paystack refund adapter", () => {
  it("creates a partial NGN refund in minor units and normalizes its queued state", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(successResponse(refundData, "Refund has been queued for processing"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      provider.createRefund({
        transaction: "pay_1",
        amountMinor: 10_000,
        customerNote: "Customer requested a partial refund",
        merchantNote: "Approved return ret_1",
      }),
    ).resolves.toMatchObject({
      id: "3018284",
      transactionId: "1004723697",
      transactionReference: "pay_1",
      amountMinor: 10_000,
      deductedAmountMinor: 0,
      currency: "NGN",
      status: "pending",
      providerStatus: "pending",
    });

    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.paystack.co/refund");
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(request?.method).toBe("POST");
    expect(JSON.parse(String(request?.body))).toEqual({
      transaction: "pay_1",
      amount: 10_000,
      currency: "NGN",
      customer_note: "Customer requested a partial refund",
      merchant_note: "Approved return ret_1",
    });
  });

  it("omits the amount for a provider-calculated full refund", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(successResponse(refundData));
    vi.stubGlobal("fetch", fetchMock);

    await provider.createRefund({ transaction: "pay_1" });

    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toEqual({
      transaction: "pay_1",
      currency: "NGN",
    });
  });

  it("fetches a refund by provider id and normalizes processed facts", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse({
        ...refundData,
        transaction: 1_004_723_697,
        deducted_amount: 10_000,
        fully_deducted: true,
        status: "processed",
        refunded_at: "2026-07-30T10:00:00.000Z",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(provider.fetchRefund("3018284")).resolves.toMatchObject({
      id: "3018284",
      transactionId: "1004723697",
      transactionReference: null,
      status: "processed",
      providerStatus: "processed",
      amountMinor: 10_000,
      deductedAmountMinor: 10_000,
      refundedAt: "2026-07-30T10:00:00.000Z",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.paystack.co/refund/3018284");
  });

  it("lists refunds with filters, provider statuses and offset pagination", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const statuses = ["pending", "processing", "needs-attention", "failed", "processed"];
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse(
        statuses.map((status, index) => ({
          ...refundData,
          id: index + 1,
          transaction: 1_004_723_697,
          status,
        })),
        "Refunds retrieved",
        { total: 25, skipped: 10, perPage: 10, page: 2, pageCount: 3 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      provider.listRefunds({
        page: 2,
        perPage: 10,
        transaction: "1004723697",
        currency: "NGN",
        from: "2026-07-01",
        to: "2026-07-31",
      }),
    ).resolves.toMatchObject({
      refunds: statuses.map((status) => ({ status, providerStatus: status })),
      pagination: { total: 25, skipped: 10, perPage: 10, page: 2, pageCount: 3 },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.paystack.co/refund?page=2&perPage=10&transaction=1004723697&currency=NGN&from=2026-07-01&to=2026-07-31",
    );
  });

  it("preserves requested pagination when Paystack omits list metadata", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(successResponse([refundData], "Refunds retrieved")),
    );

    await expect(provider.listRefunds({ page: 3, perPage: 20 })).resolves.toMatchObject({
      refunds: [{ id: "3018284" }],
      pagination: { total: null, skipped: null, perPage: 20, page: 3, pageCount: null },
    });
  });

  it("preserves an unknown provider status without treating it as processed", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        successResponse({ ...refundData, status: "processor-review" }),
      ),
    );

    await expect(provider.fetchRefund("3018284")).resolves.toMatchObject({
      status: "unknown",
      providerStatus: "processor-review",
      refundedAt: null,
    });
  });

  it("returns a normalized provider failure without retaining secrets or payload fields", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_must_not_escape");
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            status: false,
            message: "Balance unavailable for sk_test_must_not_escape",
            code: "refund_failed",
            authorization: "AUTH_payload_must_not_escape",
          }),
          { status: 422, headers: { "x-request-id": "req_refund_failure" } },
        ),
      ),
    );

    const failure = await provider
      .createRefund({ transaction: "pay_1", amountMinor: 10_000 })
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({
      name: "PaystackProviderError",
      operation: "create-refund",
      status: 422,
      code: "refund_failed",
      requestId: "req_refund_failure",
    });
    expect(String(failure)).not.toContain("sk_test_must_not_escape");
    expect(String(failure)).not.toContain("AUTH_payload_must_not_escape");
    expect(JSON.stringify(failure)).not.toContain("sk_test_must_not_escape");
    expect(JSON.stringify(failure)).not.toContain("AUTH_payload_must_not_escape");
  });
});
