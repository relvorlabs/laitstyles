// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type {
  FinanceOverviewRecord,
  PayoutRecipientRecord,
  PayoutTransferRecord,
} from "@/modules/payments/finance-contract";

const fixtures = vi.hoisted(() => {
  const recipient = {
    id: "11111111-1111-4111-8111-111111111111",
    providerRecipientCode: "RCP_owner",
    type: "nuban",
    name: "Operations account",
    accountName: "LAITSTYLES LIMITED",
    bankName: "Test Bank",
    bankCode: "001",
    maskedAccountNumber: "****1234",
    currency: "NGN",
    active: true,
    createdAt: "2026-07-30T12:00:00.000Z",
    updatedAt: "2026-07-30T12:00:00.000Z",
  } satisfies PayoutRecipientRecord;
  const otpTransfer = {
    id: "22222222-2222-4222-8222-222222222222",
    recipient,
    reference: "lt_12345678901234567890123456789012",
    providerTransferCode: "TRF_owner",
    providerStatus: "otp",
    idempotencyKey: "33333333-3333-4333-8333-333333333333",
    amountMinor: 25_000,
    currency: "NGN",
    reason: "Owner withdrawal",
    status: "otp_required",
    otpRequired: true,
    otpAttempts: 0,
    reconciliationRequired: false,
    failureReason: null,
    initiatedBy: "Store owner",
    initiatedAt: "2026-07-30T12:00:00.000Z",
    lastOtpSentAt: null,
    lastProviderSyncAt: "2026-07-30T12:00:00.000Z",
    completedAt: null,
    events: [
      {
        id: "44444444-4444-4444-8444-444444444444",
        kind: "otp_requested",
        status: "otp_required",
        note: "Paystack requested OTP.",
        occurredAt: "2026-07-30T12:00:00.000Z",
      },
    ],
  } satisfies PayoutTransferRecord;
  const overview = {
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
  } satisfies FinanceOverviewRecord;
  return { overview, otpTransfer, recipient };
});

const mocks = vi.hoisted(() => ({
  initiate: vi.fn(),
  finalize: vi.fn(),
  resend: vi.fn(),
  reconcile: vi.fn(),
  resolve: vi.fn(),
  createRecipient: vi.fn(),
  deleteRecipient: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { queryKey: readonly unknown[] }) => {
    const resource = options.queryKey[2];
    if (resource === "overview") return { data: fixtures.overview, isPending: false, isError: false };
    if (resource === "ledger") return { data: { items: [], meta: {} }, isPending: false, isError: false };
    if (resource === "settlements") return { data: { items: [], meta: {} }, isPending: false, isError: false };
    if (resource === "recipients") return { data: { items: [fixtures.recipient], meta: {} }, isPending: false, isError: false };
    if (resource === "transfers") return { data: { items: [fixtures.otpTransfer], meta: {} }, isPending: false, isError: false };
    if (resource === "banks") return { data: [{ code: "001", name: "Test Bank" }], isPending: false, isError: false };
    return { data: undefined, isPending: false, isError: false };
  },
}));

vi.mock("@/modules/payments/client/finance", () => ({
  financeOverviewQueryOptions: () => ({ queryKey: ["admin", "finance", "overview"] }),
  financeLedgerQueryOptions: () => ({ queryKey: ["admin", "finance", "ledger"] }),
  financeTransactionQueryOptions: (identifier: string | null) => ({
    queryKey: ["admin", "finance", "transaction", identifier],
  }),
  financeSettlementsQueryOptions: () => ({ queryKey: ["admin", "finance", "settlements"] }),
  financeSettlementTransactionsQueryOptions: (settlementId: string | null) => ({
    queryKey: ["admin", "finance", "settlement-transactions", settlementId],
  }),
  payoutRecipientsQueryOptions: () => ({ queryKey: ["admin", "finance", "recipients"] }),
  payoutTransfersQueryOptions: () => ({ queryKey: ["admin", "finance", "transfers"] }),
  payoutBanksQueryOptions: () => ({ queryKey: ["admin", "finance", "banks"] }),
  useInitiatePayoutTransfer: () => ({ isPending: false, mutateAsync: mocks.initiate }),
  useFinalizePayoutTransfer: () => ({ isPending: false, mutateAsync: mocks.finalize }),
  useResendPayoutTransferOtp: () => ({ isPending: false, mutate: mocks.resend }),
  useReconcileFinance: () => ({ isPending: false, mutateAsync: mocks.reconcile }),
  useResolvePayoutAccount: () => ({ isPending: false, mutateAsync: mocks.resolve }),
  useCreatePayoutRecipient: () => ({ isPending: false, mutateAsync: mocks.createRecipient }),
  useDeletePayoutRecipient: () => ({ isPending: false, mutate: mocks.deleteRecipient }),
}));

import { FinanceWorkspace } from "./finance-workspace";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.initiate.mockResolvedValue(fixtures.otpTransfer);
  mocks.finalize.mockResolvedValue({
    ...fixtures.otpTransfer,
    status: "processing",
    otpRequired: false,
  });
  mocks.reconcile.mockResolvedValue({ transactions: { items: [] } });
  mocks.resolve.mockResolvedValue({
    accountName: "LAITSTYLES LIMITED",
    bankCode: "001",
    maskedAccountNumber: "****1234",
  });
});

afterEach(cleanup);

describe("FinanceWorkspace", () => {
  it("shows provider balance and keeps manager money controls read-only", async () => {
    const user = userEvent.setup();
    render(<FinanceWorkspace canTransfer={false} />);

    expect(screen.getByText(/₦10,000.00/)).toBeInTheDocument();
    expect(screen.getByText("Read-only finance access")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reconcile provider truth" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Transfers" }));
    expect(screen.getByRole("button", { name: "Review transfer" })).toBeDisabled();
  });

  it("requires a review step before initiating an owner transfer", async () => {
    const user = userEvent.setup();
    render(<FinanceWorkspace canTransfer />);
    await user.click(screen.getByRole("button", { name: "Transfers" }));

    await user.selectOptions(screen.getByLabelText("Recipient"), fixtures.recipient.id);
    await user.type(screen.getByLabelText("Amount (NGN)"), "250");
    await user.type(screen.getByLabelText("Reason"), "New owner withdrawal");
    await user.click(screen.getByRole("button", { name: "Review transfer" }));

    expect(screen.getAllByText(/Operations account · \*\*\*\*1234/).length).toBeGreaterThan(0);
    expect(screen.getByText("Confirmed by Paystack")).toBeInTheDocument();
    expect(mocks.initiate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Confirm and send to Paystack" }));
    await waitFor(() =>
      expect(mocks.initiate).toHaveBeenCalledWith({
        recipientId: fixtures.recipient.id,
        amountMinor: 25_000,
        currency: "NGN",
        reason: "New owner withdrawal",
        idempotencyKey: expect.any(String),
      }),
    );
  });

  it("finalizes only the existing OTP-required transfer", async () => {
    const user = userEvent.setup();
    render(<FinanceWorkspace canTransfer />);
    await user.click(screen.getByRole("button", { name: "Transfers" }));

    await user.type(screen.getByPlaceholderText("6-digit OTP"), "123456");
    await user.click(screen.getByRole("button", { name: "Finalize OTP" }));

    expect(mocks.finalize).toHaveBeenCalledWith({
      transferId: fixtures.otpTransfer.id,
      otp: "123456",
      idempotencyKey: expect.any(String),
    });
  });
});
