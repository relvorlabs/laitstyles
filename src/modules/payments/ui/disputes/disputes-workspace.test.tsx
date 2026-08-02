// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DisputeRecord } from "@/modules/payments/client/disputes";

const mocks = vi.hoisted(() => ({
  disputes: [] as DisputeRecord[],
  submitEvidence: vi.fn(),
  accept: vi.fn(),
  decline: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: mocks.disputes,
    isPending: false,
    isError: false,
    isFetching: false,
  }),
}));
vi.mock("@/modules/payments/client/disputes", () => ({
  disputesQueryOptions: () => ({ kind: "disputes" }),
  useSubmitDisputeEvidence: () => ({ isPending: false, mutateAsync: mocks.submitEvidence }),
  useAcceptDispute: () => ({ isPending: false, mutateAsync: mocks.accept }),
  useDeclineDispute: () => ({ isPending: false, mutateAsync: mocks.decline }),
}));
vi.mock("@/modules/payments/ui/payment-timeline", () => ({
  PaymentTimeline: ({ paymentId }: { paymentId: string | null }) => (
    <div data-testid="payment-timeline">{paymentId ?? "none"}</div>
  ),
}));

import { DisputesWorkspace } from "./disputes-workspace";

const dispute = {
  id: "11111111-1111-4111-8111-111111111111",
  paymentId: "22222222-2222-4222-8222-222222222222",
  orderId: "33333333-3333-4333-8333-333333333333",
  orderNumber: "LS-1001",
  customerId: "44444444-4444-4444-8444-444444444444",
  customerName: "Buyer",
  providerDisputeId: "42",
  providerStatus: "awaiting-merchant-feedback",
  status: "awaiting_evidence",
  category: "transaction_not_received",
  amountMinor: 25_000,
  currency: "NGN",
  reason: "Customer says the order did not arrive",
  evidence: [],
  evidenceDueAt: "2026-08-02T12:00:00.000Z",
  resolvedAt: null,
  resolutionNote: null,
  lastProviderSyncAt: "2026-07-30T12:00:00.000Z",
  createdAt: "2026-07-30T10:00:00.000Z",
  updatedAt: "2026-07-30T12:00:00.000Z",
} satisfies DisputeRecord;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn(() => "55555555-5555-4555-8555-555555555555"),
  });
  vi.spyOn(window, "confirm").mockReturnValue(true);
  mocks.disputes = [dispute];
  mocks.submitEvidence.mockResolvedValue(dispute);
  mocks.accept.mockResolvedValue({ ...dispute, status: "resolved" });
  mocks.decline.mockResolvedValue({ ...dispute, status: "declined" });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("DisputesWorkspace", () => {
  it("renders authoritative status, amount, evidence deadline and payment audit", () => {
    render(<DisputesWorkspace canDecide />);

    expect(screen.getAllByText("LS-1001").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/awaiting evidence/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Paystack dispute 42/i)).toBeInTheDocument();
    expect(screen.getByText(formatDate(dispute.evidenceDueAt))).toBeInTheDocument();
    expect(screen.getByTestId("payment-timeline")).toHaveTextContent(dispute.paymentId);
  });

  it("validates evidence file type before calling the API", async () => {
    const user = userEvent.setup();
    render(<DisputesWorkspace canDecide />);

    await user.type(screen.getByLabelText("Customer name"), "Buyer");
    await user.type(screen.getByLabelText("Customer email"), "buyer@example.com");
    await user.type(screen.getByLabelText("Customer phone"), "+2348000000000");
    await user.type(
      screen.getByLabelText("Service and fulfilment details"),
      "Delivered with receipt",
    );
    await user.upload(
      screen.getByLabelText("Evidence file"),
      new File(["bad"], "proof.txt", { type: "text/plain" }),
    );
    await user.click(screen.getByRole("button", { name: "Submit evidence" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/PDF, PNG or JPEG/i);
    expect(mocks.submitEvidence).not.toHaveBeenCalled();
  });

  it("uploads bounded evidence with an idempotency key", async () => {
    const user = userEvent.setup();
    render(<DisputesWorkspace canDecide />);

    await user.type(screen.getByLabelText("Customer name"), "Buyer");
    await user.type(screen.getByLabelText("Customer email"), "buyer@example.com");
    await user.type(screen.getByLabelText("Customer phone"), "+2348000000000");
    await user.type(
      screen.getByLabelText("Service and fulfilment details"),
      "Delivered with receipt",
    );
    const file = new File(["proof"], "proof.pdf", { type: "application/pdf" });
    await user.upload(screen.getByLabelText("Evidence file"), file);
    await user.click(screen.getByRole("button", { name: "Submit evidence" }));

    await waitFor(() =>
      expect(mocks.submitEvidence).toHaveBeenCalledWith(
        expect.objectContaining({
          disputeId: dispute.id,
          idempotencyKey: "55555555-5555-4555-8555-555555555555",
          customerEmail: "buyer@example.com",
          file,
        }),
      ),
    );
  });

  it("requires explicit confirmation before an owner decision", async () => {
    const user = userEvent.setup();
    render(<DisputesWorkspace canDecide />);

    await user.clear(screen.getByLabelText("Refund amount (NGN)"));
    await user.type(screen.getByLabelText("Refund amount (NGN)"), "250");
    await user.type(screen.getByLabelText("Decision note"), "Owner accepts the chargeback");
    await user.click(screen.getByRole("button", { name: "Accept dispute" }));

    expect(window.confirm).toHaveBeenCalled();
    expect(mocks.accept).toHaveBeenCalledWith({
      disputeId: dispute.id,
      idempotencyKey: "55555555-5555-4555-8555-555555555555",
      message: "Owner accepts the chargeback",
      refundAmountMinor: 25_000,
    });
  });

  it("keeps manager evidence and decision controls disabled", () => {
    render(<DisputesWorkspace canDecide={false} />);

    expect(screen.getByText(/Read-only finance access/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit evidence" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Accept dispute" })).toBeDisabled();
  });
});

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
