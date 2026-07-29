import { afterEach, describe, expect, it, vi } from "vitest";

function successResponse(data: unknown, message = "Successful", meta?: unknown) {
  return new Response(JSON.stringify({ status: true, message, data, ...(meta ? { meta } : {}) }), {
    status: 200,
    headers: { "Content-Type": "application/json", "x-request-id": "req_finance" },
  });
}

const recipientData = {
  domain: "test",
  type: "nuban",
  currency: "NGN",
  name: "Tolu Robert",
  details: {
    authorization_code: null,
    account_number: "0100000010",
    account_name: "Tolu Robert",
    bank_code: "058",
    bank_name: "Guaranty Trust Bank",
  },
  metadata: null,
  recipient_code: "RCP_m7ljkv8leesep7p",
  active: true,
  id: 20_317_609,
  is_deleted: false,
  createdAt: "2021-11-05T11:27:53.131Z",
  updatedAt: "2021-11-05T11:27:53.131Z",
};

const transferData = {
  amount: 125_000,
  createdAt: "2025-08-04T09:59:19.000Z",
  currency: "NGN",
  domain: "test",
  failures: null,
  id: 860_670_817,
  integration: 463_433,
  reason: "Tailor settlement",
  reference: "owner-transfer-0001",
  source: "balance",
  source_details: null,
  status: "pending",
  transfer_code: "TRF_vsyqdmlzble3uii",
  transferred_at: null,
  updatedAt: "2025-08-04T09:59:20.000Z",
  recipient: {
    id: 20_317_609,
    recipient_code: "RCP_m7ljkv8leesep7p",
    name: "Tolu Robert",
    type: "nuban",
    active: true,
    currency: "NGN",
    details: {
      account_number: "0100000010",
      account_name: "Tolu Robert",
      bank_code: "058",
      bank_name: "Guaranty Trust Bank",
    },
  },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Paystack bank adapters", () => {
  it("lists Nigerian banks with provider filters", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse([
        {
          id: 9,
          name: "Guaranty Trust Bank",
          slug: "guaranty-trust-bank",
          code: "058",
          longcode: "058152036",
          gateway: "emandate",
          pay_with_bank: true,
          supports_transfer: true,
          active: true,
          country: "Nigeria",
          currency: "NGN",
          type: "nuban",
          is_deleted: false,
          createdAt: "2016-07-14T10:04:29.000Z",
          updatedAt: "2025-01-10T10:04:29.000Z",
        },
      ]),
    );

    const { listBanks } = await import("@/modules/payments/server/paystack/banks");
    await expect(
      listBanks(
        { country: "nigeria", currency: "NGN", type: "nuban", perPage: 25 },
        fetchMock,
      ),
    ).resolves.toEqual({
      banks: [
        {
          id: "9",
          name: "Guaranty Trust Bank",
          slug: "guaranty-trust-bank",
          code: "058",
          gateway: "emandate",
          active: true,
          country: "Nigeria",
          currency: "NGN",
          type: "nuban",
          supportsTransfer: true,
        },
      ],
      cursors: { next: null, previous: null },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.paystack.co/bank?country=nigeria&currency=NGN&type=nuban&perPage=25&use_cursor=true",
    );
  });

  it("resolves an account without returning provider-only fields", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse({
        account_number: "0022728151",
        account_name: "WES GIBBONS",
        bank_id: 9,
      }),
    );

    const { resolveAccount } = await import("@/modules/payments/server/paystack/banks");
    const resolved = await resolveAccount(
      { accountNumber: "0022728151", bankCode: "063" },
      fetchMock,
    );
    expect(resolved).toEqual({
      accountName: "WES GIBBONS",
      bankId: "9",
      maskedNumber: "******8151",
      fingerprint: expect.stringMatching(/^[a-f\d]{64}$/),
    });
    expect(JSON.stringify(resolved)).not.toContain("0022728151");
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.paystack.co/bank/resolve?account_number=0022728151&bank_code=063",
    );
  });
});

describe("Paystack transfer recipient adapters", () => {
  it("creates a recipient and returns only masked account identity", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(successResponse(recipientData, "Transfer recipient created successfully"));

    const { createRecipient } = await import(
      "@/modules/payments/server/paystack/recipients"
    );
    const recipient = await createRecipient(
      {
        name: "Tolu Robert",
        accountNumber: "0100000010",
        bankCode: "058",
        currency: "NGN",
      },
      fetchMock,
    );

    expect(recipient).toMatchObject({
      id: "20317609",
      recipientCode: "RCP_m7ljkv8leesep7p",
      name: "Tolu Robert",
      currency: "NGN",
      active: true,
      account: {
        name: "Tolu Robert",
        bankCode: "058",
        bankName: "Guaranty Trust Bank",
        maskedNumber: "******0010",
        fingerprint: expect.stringMatching(/^[a-f\d]{64}$/),
      },
    });
    expect(JSON.stringify(recipient)).not.toContain("0100000010");
    const [, request] = fetchMock.mock.calls[0] ?? [];
    expect(JSON.parse(String(request?.body))).toEqual({
      type: "nuban",
      name: "Tolu Robert",
      account_number: "0100000010",
      bank_code: "058",
      currency: "NGN",
    });
  });

  it("normalizes duplicate recipient accounts to the same safe identity", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse(
        [
          recipientData,
          {
            ...recipientData,
            id: 20_317_610,
            recipient_code: "RCP_duplicate",
          },
        ],
        "Recipients retrieved",
        { total: 2, skipped: 0, perPage: 20, page: 2, pageCount: 1 },
      ),
    );

    const { listRecipients } = await import(
      "@/modules/payments/server/paystack/recipients"
    );
    const result = await listRecipients({ page: 2, perPage: 20 }, fetchMock);

    expect(result.recipients).toHaveLength(2);
    expect(result.recipients[0]?.account.fingerprint).toBe(
      result.recipients[1]?.account.fingerprint,
    );
    expect(JSON.stringify(result)).not.toContain("0100000010");
    expect(result.pagination).toEqual({
      total: 2,
      skipped: 0,
      perPage: 20,
      page: 2,
      pageCount: 1,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://api.paystack.co/transferrecipient?page=2&perPage=20",
    );
  });

  it("updates a recipient with Paystack's PUT contract", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse({ ...recipientData, name: "Tolu R. Robert" }, "Recipient updated"),
    );

    const { updateRecipient } = await import(
      "@/modules/payments/server/paystack/recipients"
    );
    await expect(
      updateRecipient(
        "RCP_m7ljkv8leesep7p",
        { name: "Tolu R. Robert", email: "tolu@example.com" },
        fetchMock,
      ),
    ).resolves.toMatchObject({ name: "Tolu R. Robert", account: { maskedNumber: "******0010" } });
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.paystack.co/transferrecipient/RCP_m7ljkv8leesep7p");
    expect(request?.method).toBe("PUT");
    expect(JSON.parse(String(request?.body))).toEqual({
      name: "Tolu R. Robert",
      email: "tolu@example.com",
    });
  });

  it("deletes a recipient through its encoded provider code", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: true,
          message: "Transfer recipient set as inactive",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { deleteRecipient } = await import(
      "@/modules/payments/server/paystack/recipients"
    );
    await expect(deleteRecipient("RCP_m7ljkv8leesep7p", fetchMock)).resolves.toEqual({
      deleted: true,
      message: "Transfer recipient set as inactive",
    });
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.paystack.co/transferrecipient/RCP_m7ljkv8leesep7p");
    expect(request?.method).toBe("DELETE");
  });
});

describe("Paystack transfer adapters", () => {
  it("initiates one balance transfer with an explicit unique reference and minor units", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(successResponse(transferData, "Transfer has been queued"));

    const { initiateTransfer } = await import(
      "@/modules/payments/server/paystack/transfers"
    );
    await expect(
      initiateTransfer(
        {
          amountMinor: 125_000,
          recipientCode: "RCP_m7ljkv8leesep7p",
          reference: "owner-transfer-0001",
          reason: "Tailor settlement",
          currency: "NGN",
        },
        fetchMock,
      ),
    ).resolves.toMatchObject({
      kind: "pending",
      transfer: {
        id: "860670817",
        transferCode: "TRF_vsyqdmlzble3uii",
        reference: "owner-transfer-0001",
        amountMinor: 125_000,
        currency: "NGN",
        status: "pending",
        recipientCode: "RCP_m7ljkv8leesep7p",
      },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.paystack.co/transfer");
    expect(request?.method).toBe("POST");
    expect(JSON.parse(String(request?.body))).toEqual({
      source: "balance",
      amount: 125_000,
      recipient: "RCP_m7ljkv8leesep7p",
      reference: "owner-transfer-0001",
      reason: "Tailor settlement",
      currency: "NGN",
    });
  });

  it("rejects references that cannot be unique Paystack identifiers", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>();
    const { initiateTransfer } = await import(
      "@/modules/payments/server/paystack/transfers"
    );

    await expect(
      initiateTransfer(
        {
          amountMinor: 125_000,
          recipientCode: "RCP_m7ljkv8leesep7p",
          reference: "BAD REFERENCE",
          reason: "Tailor settlement",
        },
        fetchMock,
      ),
    ).rejects.toMatchObject({ name: "ZodError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an explicit OTP-required continuation", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse(
        { ...transferData, status: "otp" },
        "Transfer requires OTP to continue",
      ),
    );
    const { initiateTransfer } = await import(
      "@/modules/payments/server/paystack/transfers"
    );

    await expect(
      initiateTransfer(
        {
          amountMinor: 125_000,
          recipientCode: "RCP_m7ljkv8leesep7p",
          reference: "owner-transfer-0001",
          reason: "Tailor settlement",
        },
        fetchMock,
      ),
    ).resolves.toMatchObject({
      kind: "otp_required",
      transfer: { status: "otp", transferCode: "TRF_vsyqdmlzble3uii" },
    });
  });

  it("finalizes only the existing transfer code with the supplied OTP", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      successResponse({ ...transferData, status: "success" }, "Transfer has been queued"),
    );
    const { finalizeTransferOtp } = await import(
      "@/modules/payments/server/paystack/transfers"
    );

    await expect(
      finalizeTransferOtp(
        { transferCode: "TRF_vsyqdmlzble3uii", otp: "928783" },
        fetchMock,
      ),
    ).resolves.toMatchObject({ status: "success", reference: "owner-transfer-0001" });
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.paystack.co/transfer/finalize_transfer");
    expect(JSON.parse(String(request?.body))).toEqual({
      transfer_code: "TRF_vsyqdmlzble3uii",
      otp: "928783",
    });
  });

  it("resends OTP only for the existing transfer code", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: true, message: "OTP has been resent" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { resendTransferOtp } = await import(
      "@/modules/payments/server/paystack/transfers"
    );

    await expect(resendTransferOtp("TRF_vsyqdmlzble3uii", fetchMock)).resolves.toEqual({
      resent: true,
      message: "OTP has been resent",
    });
    const [url, request] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe("https://api.paystack.co/transfer/resend_otp");
    expect(JSON.parse(String(request?.body))).toEqual({
      transfer_code: "TRF_vsyqdmlzble3uii",
      reason: "resend_otp",
    });
  });

  it("lists, fetches and verifies transfers through distinct read endpoints", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        successResponse([transferData], "Transfers retrieved", {
          total: 1,
          skipped: 0,
          perPage: 20,
          page: 2,
          pageCount: 1,
        }),
      )
      .mockResolvedValueOnce(successResponse(transferData, "Transfer retrieved"))
      .mockResolvedValueOnce(successResponse(transferData, "Transfer retrieved"));
    const { fetchTransfer, listTransfers, verifyTransfer } = await import(
      "@/modules/payments/server/paystack/transfers"
    );

    await expect(listTransfers({ page: 2, perPage: 20 }, fetchMock)).resolves.toMatchObject({
      transfers: [{ reference: "owner-transfer-0001", amountMinor: 125_000 }],
      pagination: { page: 2, perPage: 20 },
    });
    await expect(fetchTransfer("TRF_vsyqdmlzble3uii", fetchMock)).resolves.toMatchObject({
      transferCode: "TRF_vsyqdmlzble3uii",
    });
    await expect(verifyTransfer("owner-transfer-0001", fetchMock)).resolves.toMatchObject({
      reference: "owner-transfer-0001",
    });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://api.paystack.co/transfer?page=2&perPage=20",
      "https://api.paystack.co/transfer/TRF_vsyqdmlzble3uii",
      "https://api.paystack.co/transfer/verify/owner-transfer-0001",
    ]);
  });

  it("recovers an ambiguous initiation by fetching the same reference once", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("socket closed"))
      .mockResolvedValueOnce(successResponse(transferData, "Transfer retrieved"));
    const { initiateTransfer } = await import(
      "@/modules/payments/server/paystack/transfers"
    );

    await expect(
      initiateTransfer(
        {
          amountMinor: 125_000,
          recipientCode: "RCP_m7ljkv8leesep7p",
          reference: "owner-transfer-0001",
          reason: "Tailor settlement",
        },
        fetchMock,
      ),
    ).resolves.toMatchObject({
      kind: "recovered",
      transfer: { reference: "owner-transfer-0001" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(([, request]) => request?.method ?? "GET")).toEqual([
      "POST",
      "GET",
    ]);
  });

  it("returns needs-reconciliation when provider truth remains uncertain", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("network unavailable"));
    const { initiateTransfer } = await import(
      "@/modules/payments/server/paystack/transfers"
    );

    await expect(
      initiateTransfer(
        {
          amountMinor: 125_000,
          recipientCode: "RCP_m7ljkv8leesep7p",
          reference: "owner-transfer-0001",
          reason: "Tailor settlement",
        },
        fetchMock,
      ),
    ).resolves.toEqual({
      kind: "needs_reconciliation",
      reference: "owner-transfer-0001",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("does not reconcile or retry a definitively rejected transfer request", async () => {
    vi.stubEnv("PAYSTACK_SECRET_KEY", "sk_test_private");
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ status: false, message: "Invalid recipient" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const { initiateTransfer } = await import(
      "@/modules/payments/server/paystack/transfers"
    );

    await expect(
      initiateTransfer(
        {
          amountMinor: 125_000,
          recipientCode: "RCP_m7ljkv8leesep7p",
          reference: "owner-transfer-0001",
          reason: "Tailor settlement",
        },
        fetchMock,
      ),
    ).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["transfer.success", "success"],
    ["transfer.failed", "failed"],
    ["transfer.reversed", "reversed"],
  ] as const)("normalizes %s as the terminal %s state", async (event, status) => {
    const { normalizeTransferEvent } = await import(
      "@/modules/payments/server/paystack/transfers"
    );

    expect(normalizeTransferEvent({ event, data: { ...transferData, status } })).toMatchObject({
      event,
      status,
      transfer: { status, reference: "owner-transfer-0001", amountMinor: 125_000 },
    });
  });
});
