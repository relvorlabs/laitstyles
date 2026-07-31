import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";
import type { PayoutTransferRecord } from "@/modules/payments/finance-contract";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  getFinanceOverview: vi.fn(),
  initiatePayoutTransfer: vi.fn(),
  finalizePayoutTransferOtp: vi.fn(),
  throwFinanceApiError: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/payments/server/finance/index", () => ({
  getFinanceOverview: mocks.getFinanceOverview,
  throwFinanceApiError: mocks.throwFinanceApiError,
}));
vi.mock("@/modules/payments/server/transfers/index", () => ({
  initiatePayoutTransfer: mocks.initiatePayoutTransfer,
  finalizePayoutTransferOtp: mocks.finalizePayoutTransferOtp,
  throwFinanceApiError: mocks.throwFinanceApiError,
}));

import { GET as getBalance } from "./balance/route";
import { POST as createTransfer } from "./transfers/route";
import { POST as finalizeTransfer } from "./transfers/[transferId]/finalize/route";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.com",
  displayName: "Owner",
  role: "admin" as const,
};
const recipient = {
  id: "22222222-2222-4222-8222-222222222222",
  providerRecipientCode: "RCP_owner",
  type: "nuban",
  name: "Operations",
  accountName: "LAITSTYLES LIMITED",
  bankName: "Test Bank",
  bankCode: "001",
  maskedAccountNumber: "****1234",
  currency: "NGN",
  active: true,
  createdAt: "2026-07-30T12:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
};
const transfer = {
  id: "33333333-3333-4333-8333-333333333333",
  recipient,
  reference: "lt_12345678901234567890123456789012",
  providerTransferCode: "TRF_owner",
  providerStatus: "otp",
  idempotencyKey: "transfer-key-123",
  amountMinor: 25_000,
  currency: "NGN",
  reason: "Owner withdrawal",
  status: "otp_required",
  otpRequired: true,
  otpAttempts: 0,
  reconciliationRequired: false,
  failureReason: null,
  initiatedBy: "Owner",
  initiatedAt: "2026-07-30T12:00:00.000Z",
  lastOtpSentAt: null,
  lastProviderSyncAt: "2026-07-30T12:00:00.000Z",
  completedAt: null,
  events: [],
} satisfies PayoutTransferRecord;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue(actor);
  mocks.getFinanceOverview.mockResolvedValue({
    ok: true,
    value: {
      balances: [{ currency: "NGN", availableAmountMinor: 1_000_000 }],
      totals: {
        totalTransactions: 10,
        totalVolumeMinor: 2_000_000,
        totalVolumeByCurrency: [{ currency: "NGN", amountMinor: 2_000_000 }],
        pendingTransfersMinor: 25_000,
        pendingTransfersByCurrency: [{ currency: "NGN", amountMinor: 25_000 }],
      },
      unresolvedTransfers: 1,
      pendingSettlements: 0,
    },
  });
  mocks.initiatePayoutTransfer.mockResolvedValue({ ok: true, value: transfer });
  mocks.finalizePayoutTransferOtp.mockResolvedValue({
    ok: true,
    value: { ...transfer, status: "processing", otpRequired: false },
  });
});

describe("owner finance routes", () => {
  it("returns private finance reads through finance:read", async () => {
    const response = await getBalance(
      new Request("https://www.laitstyles.com/api/v1/admin/finance/balance"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("finance:read");
    await expect(response.json()).resolves.toMatchObject({
      data: { balances: [{ currency: "NGN", availableAmountMinor: 1_000_000 }] },
    });
  });

  it("rejects transfer creation without trusted origin", async () => {
    const response = await createTransfer(
      new Request("https://www.laitstyles.com/api/v1/admin/finance/transfers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": "transfer-key-123",
        },
        body: JSON.stringify({
          recipientId: recipient.id,
          amountMinor: 25_000,
          currency: "NGN",
          reason: "Owner withdrawal",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mocks.initiatePayoutTransfer).not.toHaveBeenCalled();
  });

  it("requires owner transfer capability and forwards one exact idempotency key", async () => {
    const response = await createTransfer(
      new Request("https://www.laitstyles.com/api/v1/admin/finance/transfers", {
        method: "POST",
        headers: {
          Origin: "https://www.laitstyles.com",
          "Content-Type": "application/json",
          "Idempotency-Key": "transfer-key-123",
        },
        body: JSON.stringify({
          recipientId: recipient.id,
          amountMinor: 25_000,
          currency: "NGN",
          reason: "Owner withdrawal",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("finance:transfer");
    expect(mocks.initiatePayoutTransfer).toHaveBeenCalledWith(actor, {
      recipientId: recipient.id,
      amountMinor: 25_000,
      currency: "NGN",
      reason: "Owner withdrawal",
      idempotencyKey: "transfer-key-123",
    });
  });

  it("surfaces a stable recent-auth challenge without calling success", async () => {
    mocks.initiatePayoutTransfer.mockRejectedValueOnce(
      new ApiError({
        code: "MFA_CHALLENGE_REQUIRED",
        message: "Confirm your identity again before moving money.",
        status: 403,
      }),
    );
    const response = await createTransfer(
      new Request("https://www.laitstyles.com/api/v1/admin/finance/transfers", {
        method: "POST",
        headers: {
          Origin: "https://www.laitstyles.com",
          "Content-Type": "application/json",
          "Idempotency-Key": "transfer-key-123",
        },
        body: JSON.stringify({
          recipientId: recipient.id,
          amountMinor: 25_000,
          currency: "NGN",
          reason: "Owner withdrawal",
        }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "MFA_CHALLENGE_REQUIRED",
        message: "Confirm your identity again before moving money.",
      },
    });
  });

  it("finalizes an existing transfer using OTP only", async () => {
    const response = await finalizeTransfer(
      new Request(
        `https://www.laitstyles.com/api/v1/admin/finance/transfers/${transfer.id}/finalize`,
        {
          method: "POST",
          headers: {
            Origin: "https://www.laitstyles.com",
            "Content-Type": "application/json",
            "Idempotency-Key": "otp-key-123",
          },
          body: JSON.stringify({
            otp: "123456",
            amountMinor: 99_999_999,
            recipientId: "44444444-4444-4444-8444-444444444444",
          }),
        },
      ),
      { params: Promise.resolve({ transferId: transfer.id }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.finalizePayoutTransferOtp).toHaveBeenCalledWith(actor, transfer.id, "123456");
  });
});
