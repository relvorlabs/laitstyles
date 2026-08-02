// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  payments: [] as Array<Record<string, unknown>>,
  refunds: [] as Array<Record<string, unknown>>,
  createRefund: vi.fn(),
  retryRefund: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { kind: string }) =>
    options.kind === "payments"
      ? { data: mocks.payments, isPending: false, isError: false, isFetching: false }
      : { data: mocks.refunds, isPending: false, isError: false, isFetching: false },
}));
vi.mock("@/modules/payments/client/admin-payments", () => ({
  adminPaymentsQueryOptions: () => ({ kind: "payments" }),
}));
vi.mock("@/modules/payments/client/refunds", () => ({
  refundsQueryOptions: () => ({ kind: "refunds" }),
  useCreateRefund: () => ({ isPending: false, mutateAsync: mocks.createRefund }),
  useRetryRefund: () => ({ isPending: false, mutateAsync: mocks.retryRefund }),
}));
vi.mock("@/modules/payments/ui/payment-timeline", () => ({
  PaymentTimeline: ({ paymentId }: { paymentId: string | null }) => (
    <div data-testid="payment-timeline">{paymentId ?? "none"}</div>
  ),
}));

import { RefundsWorkspace } from "./refunds-workspace";

const payment = {
  id: "11111111-1111-4111-8111-111111111111",
  orderId: "22222222-2222-4222-8222-222222222222",
  orderNumber: "LS-1001",
  customerId: "33333333-3333-4333-8333-333333333333",
  customerName: "Buyer",
  customerEmail: "buyer@example.com",
  provider: "paystack",
  reference: "pay_1",
  providerTransactionId: "9001",
  amountMinor: 100_000,
  refundableAmountMinor: 60_000,
  currency: "NGN",
  status: "success",
  orderPaymentStatus: "paid",
  channel: "card",
  gatewayResponse: "Successful",
  verifiedAt: "2026-07-30T10:00:00.000Z",
  failureCode: null,
  failureReason: null,
  paidAt: "2026-07-30T10:00:00.000Z",
  createdAt: "2026-07-30T09:00:00.000Z",
  updatedAt: "2026-07-30T10:00:00.000Z",
  refunds: [],
  disputes: [],
};
const submittedRefund = {
  id: "44444444-4444-4444-8444-444444444444",
  paymentId: payment.id,
  orderId: payment.orderId,
  orderNumber: payment.orderNumber,
  returnId: null,
  providerReference: "3018284",
  providerStatus: "pending",
  idempotencyKey: "refund-key",
  requestedAmountMinor: 60_000,
  processedAmountMinor: 0,
  currency: "NGN",
  status: "pending",
  reason: "Customer return",
  failureReason: null,
  retryCount: 0,
  requestedBy: "Owner",
  requestedAt: "2026-07-30T12:00:00.000Z",
  processedAt: null,
  failedAt: null,
  lastProviderSyncAt: "2026-07-30T12:00:00.000Z",
  lineAllocations: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "55555555-5555-4555-8555-555555555555") });
  mocks.payments = [payment];
  mocks.refunds = [];
  mocks.createRefund.mockResolvedValue(submittedRefund);
  mocks.retryRefund.mockResolvedValue({ ...submittedRefund, status: "processing" });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("RefundsWorkspace", () => {
  it("submits the remaining full amount without presenting it as processed", async () => {
    const user = userEvent.setup();
    render(<RefundsWorkspace canRefund />);

    await user.selectOptions(screen.getByLabelText("Captured payment"), payment.id);
    await user.click(screen.getByRole("button", { name: "Full amount" }));
    await user.type(screen.getByLabelText("Reason"), "Customer return");
    await user.click(screen.getByRole("button", { name: "Submit refund" }));

    await waitFor(() =>
      expect(mocks.createRefund).toHaveBeenCalledWith({
        paymentId: payment.id,
        amountMinor: 60_000,
        currency: "NGN",
        reason: "Customer return",
        idempotencyKey: "55555555-5555-4555-8555-555555555555",
      }),
    );
    expect(
      screen.getByText(
        /Refund submitted\. Financial totals will change only after Paystack confirms/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId("payment-timeline")).toHaveTextContent(payment.id);
  });

  it("shows an over-refund error before calling the API", async () => {
    const user = userEvent.setup();
    render(<RefundsWorkspace canRefund />);

    await user.selectOptions(screen.getByLabelText("Captured payment"), payment.id);
    await user.type(screen.getByLabelText("Amount (NGN)"), "700");

    expect(screen.getByRole("alert")).toHaveTextContent(/exceeds the remaining refundable amount/i);
    expect(screen.getByRole("button", { name: "Submit refund" })).toBeDisabled();
    expect(mocks.createRefund).not.toHaveBeenCalled();
  });

  it("exposes reconciliation retry only for failed or needs-attention refunds", async () => {
    const user = userEvent.setup();
    mocks.refunds = [
      {
        ...submittedRefund,
        status: "needs_attention",
        failureReason: "Customer bank details are required",
      },
    ];
    render(<RefundsWorkspace canRefund />);

    await user.click(screen.getByRole("button", { name: "Reconcile and retry" }));

    expect(mocks.retryRefund).toHaveBeenCalledWith({
      refundId: submittedRefund.id,
      idempotencyKey: "55555555-5555-4555-8555-555555555555",
    });
  });

  it("keeps manager finance access read-only", () => {
    render(<RefundsWorkspace canRefund={false} />);

    expect(screen.getByText(/Read-only finance access/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit refund" })).toBeDisabled();
  });
});
