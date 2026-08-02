import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as paystackExports from "@/modules/payments/server/paystack";

type Transaction = {
  id: string;
  status: string;
  reference: string;
  amountMinor: number;
  currency: string;
  customer: { email: string; customerCode: string } | null;
  authorization: { authorizationCode: string; reusable: boolean } | null;
};

type ProviderContract = {
  initializeTransaction(input: {
    email: string;
    amountMinor: number;
    reference: string;
    callbackUrl: string;
    currency?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ authorizationUrl: string; accessCode: string; reference: string }>;
  verifyTransaction(reference: string): Promise<Transaction>;
  listTransactions(input?: {
    page?: number;
    perPage?: number;
    status?: "abandoned" | "failed" | "success";
  }): Promise<{ transactions: Transaction[]; pagination: { page: number; pageCount: number } }>;
  fetchTransaction(id: string): Promise<Transaction>;
  chargeAuthorization(input: {
    authorizationCode: string;
    email: string;
    amountMinor: number;
    reference: string;
    currency?: string;
  }): Promise<{ kind: "transaction"; transaction: Transaction }>;
  deactivateAuthorization(authorizationCode: string): Promise<{
    deactivated: true;
    message: string;
  }>;
  verifyWebhookSignature(rawBody: string | Uint8Array, signature: string): void;
};

const provider = paystackExports as unknown as ProviderContract;

const transactionData = {
  id: 4_099_260_516,
  domain: "test",
  status: "success",
  reference: "pay_1",
  receipt_number: null,
  amount: 125_000,
  message: null,
  gateway_response: "Successful",
  paid_at: "2026-07-29T10:15:02.000Z",
  created_at: "2026-07-29T10:14:24.000Z",
  channel: "card",
  currency: "NGN",
  ip_address: "197.210.54.33",
  metadata: "",
  log: null,
  fees: 2_000,
  fees_split: null,
  authorization: {
    authorization_code: "AUTH_reusable",
    bin: "408408",
    last4: "4081",
    exp_month: "12",
    exp_year: "2030",
    channel: "card",
    card_type: "visa",
    bank: "TEST BANK",
    country_code: "NG",
    brand: "visa",
    reusable: true,
    signature: "SIG_card",
    account_name: null,
  },
  customer: {
    id: 181_873_746,
    first_name: null,
    last_name: null,
    email: "buyer@example.com",
    customer_code: "CUS_buyer",
    phone: null,
    metadata: null,
    risk_action: "default",
    international_format_phone: null,
  },
  plan: null,
  split: {},
  order_id: null,
  paidAt: "2026-07-29T10:15:02.000Z",
  createdAt: "2026-07-29T10:14:24.000Z",
  requested_amount: 125_000,
  pos_transaction_data: null,
  source: null,
  fees_breakdown: null,
  connect: null,
  transaction_date: "2026-07-29T10:14:24.000Z",
};

function successResponse(data: unknown, message = "Successful") {
  return new Response(JSON.stringify({ status: true, message, data }), {
    status: 200,
    headers: { "Content-Type": "application/json", "x-request-id": "req_123" },
  });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Paystack provider adapter", () => {
  it("sends amounts to Paystack in minor units with server authentication and a timeout", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse(
        {
          authorization_url: "https://checkout.paystack.com/access123",
          access_code: "access123",
          reference: "pay_1",
        },
        "Authorization URL created",
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      provider.initializeTransaction({
        email: "buyer@example.com",
        amountMinor: 125_000,
        reference: "pay_1",
        callbackUrl: "https://laitstyles.com/checkout/callback",
        metadata: { orderId: "order_1" },
      }),
    ).resolves.toMatchObject({ accessCode: "access123", reference: "pay_1" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/transaction/initialize"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"amount":125000'),
        cache: "no-store",
        signal: expect.any(AbortSignal),
      }),
    );
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer sk_test_private");
    expect(JSON.parse(String(request?.body))).toEqual({
      email: "buyer@example.com",
      amount: 125_000,
      currency: "NGN",
      reference: "pay_1",
      callback_url: "https://laitstyles.com/checkout/callback",
      metadata: JSON.stringify({ orderId: "order_1" }),
    });
  });

  it("rejects malformed successful responses without retaining provider payloads or secrets", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_must_not_escape");
    vi.stubGlobal(
      "fetch",
      vi
        .fn<typeof fetch>()
        .mockResolvedValue(successResponse({ secret_debug: "provider-payload-must-not-escape" })),
    );

    const failure = await provider
      .initializeTransaction({
        email: "buyer@example.com",
        amountMinor: 125_000,
        reference: "pay_1",
        callbackUrl: "https://laitstyles.com/checkout/callback",
      })
      .catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: "PaystackProviderError", operation: "initialize" });
    expect(JSON.stringify(failure)).not.toContain("provider-payload-must-not-escape");
    expect(JSON.stringify(failure)).not.toContain("sk_test_must_not_escape");
  });

  it("verifies a transaction by its encoded reference and normalizes settlement fields", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(successResponse(transactionData, "Verification successful"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(provider.verifyTransaction("pay=1")).resolves.toMatchObject({
      id: "4099260516",
      status: "success",
      reference: "pay_1",
      amountMinor: 125_000,
      currency: "NGN",
      customer: { email: "buyer@example.com", customerCode: "CUS_buyer" },
      authorization: { authorizationCode: "AUTH_reusable", reusable: true },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.paystack.co/transaction/verify/pay%3D1");
  });

  it("lists transactions with bounded pagination filters", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(successResponse([transactionData], "Transactions retrieved"));
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: true,
          message: "Transactions retrieved",
          data: [transactionData],
          meta: { total: 1, skipped: 0, perPage: 20, page: 2, pageCount: 1 },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      provider.listTransactions({ page: 2, perPage: 20, status: "success" }),
    ).resolves.toMatchObject({
      transactions: [{ reference: "pay_1", amountMinor: 125_000 }],
      pagination: { page: 2, pageCount: 1 },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.paystack.co/transaction?page=2&perPage=20&status=success",
    );
  });

  it("fetches a transaction by provider id", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(successResponse(transactionData, "Transaction retrieved"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(provider.fetchTransaction("4099260516")).resolves.toMatchObject({
      id: "4099260516",
      reference: "pay_1",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.paystack.co/transaction/4099260516");
  });

  it("charges only a reusable authorization using minor units", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(successResponse(transactionData, "Charge attempted"));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      provider.chargeAuthorization({
        authorizationCode: "AUTH_reusable",
        email: "buyer@example.com",
        amountMinor: 125_000,
        reference: "pay_2",
      }),
    ).resolves.toMatchObject({
      kind: "transaction",
      transaction: { status: "success", amountMinor: 125_000 },
    });
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toEqual({
      authorization_code: "AUTH_reusable",
      email: "buyer@example.com",
      amount: 125_000,
      reference: "pay_2",
      currency: "NGN",
    });
  });

  it("deactivates an authorization through the current customer endpoint", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ status: true, message: "Authorization has been deactivated" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(provider.deactivateAuthorization("AUTH_reusable")).resolves.toEqual({
      deactivated: true,
      message: "Authorization has been deactivated",
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.paystack.co/customer/authorization/deactivate",
    );
  });

  it("verifies the exact raw webhook body and rejects an invalid signature", () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_webhook");
    const rawBody = '{"event":"charge.success","data":{"reference":"pay_1"}}';
    const signature = createHmac("sha512", "sk_test_webhook").update(rawBody).digest("hex");

    expect(() => provider.verifyWebhookSignature(rawBody, signature)).not.toThrow();
    expect(() => provider.verifyWebhookSignature(rawBody, "not-the-hmac")).toThrowError(
      /signature/i,
    );
  });
});
