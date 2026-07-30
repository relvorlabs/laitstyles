// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queryData: undefined as unknown,
  refetch: vi.fn(),
  verify: vi.fn(),
  resume: vi.fn(),
  preload: vi.fn(),
  replace: vi.fn(),
  clear: vi.fn(),
  releaseProduct: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: mocks.queryData,
    refetch: mocks.refetch,
    isFetching: false,
  }),
}));
vi.mock("@/modules/checkout/client/hooks", () => ({
  checkoutQueryOptions: vi.fn(() => ({})),
  useVerifyCheckoutPayment: () => ({
    isPending: false,
    mutateAsync: mocks.verify,
  }),
}));
vi.mock("@/modules/payments/client/paystack-popup", () => ({
  preloadPaystackPopup: mocks.preload,
  resumePaystackTransaction: mocks.resume,
}));
vi.mock("@/modules/storefront-shell/client/storefront-runtime", () => ({
  useStorefrontCart: () => ({ clear: mocks.clear }),
  useStorefrontHolds: () => ({ releaseProduct: mocks.releaseProduct }),
}));

import { CheckoutRecovery } from "./checkout-recovery";

const checkout = {
  checkoutId: "11111111-1111-4111-8111-111111111111",
  paymentId: "22222222-2222-4222-8222-222222222222",
  orderNumber: "LS-ORDER1",
  reference: "LS-CHECKOUT-reference",
  accessCode: "access-code",
  status: "pending" as const,
  currency: "NGN",
  subtotalMinor: 250_000,
  deliveryFeeMinor: 1_500,
  discountMinor: 0,
  totalMinor: 251_500,
  paidAt: null,
  lines: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      productId: "44444444-4444-4444-8444-444444444444",
      variantId: null,
      productName: "Silk dress",
      variantLabel: null,
      quantity: 2,
      unitPriceMinor: 125_000,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queryData = undefined;
  mocks.refetch.mockResolvedValue({ data: checkout });
  mocks.resume.mockResolvedValue({ kind: "success", reference: checkout.reference });
  mocks.verify.mockResolvedValue({
    checkoutId: checkout.checkoutId,
    paymentId: checkout.paymentId,
    orderNumber: checkout.orderNumber,
    status: "pending",
    replayed: false,
  });
});

afterEach(() => cleanup());

describe("CheckoutRecovery", () => {
  it("renders the persisted pending checkout after refresh", () => {
    render(<CheckoutRecovery initialCheckout={checkout} />);

    expect(screen.getByText("Payment is still pending")).toBeInTheDocument();
    expect(screen.getByText(/Reference LS-CHECKOUT-reference/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume Paystack" })).toBeEnabled();
  });

  it("retries a failed checkout and clears local state only after server success", async () => {
    const user = userEvent.setup();
    mocks.verify.mockResolvedValueOnce({
      checkoutId: checkout.checkoutId,
      paymentId: checkout.paymentId,
      orderNumber: checkout.orderNumber,
      status: "success",
      replayed: false,
    });
    render(<CheckoutRecovery initialCheckout={{ ...checkout, status: "failed" }} />);

    await user.click(screen.getByRole("button", { name: "Retry Paystack" }));

    await waitFor(() => expect(mocks.resume).toHaveBeenCalledWith("access-code"));
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith(checkout.paymentId));
    expect(mocks.releaseProduct).toHaveBeenCalledWith(checkout.lines[0].productId);
    expect(mocks.clear).toHaveBeenCalledTimes(1);
    expect(mocks.replace).toHaveBeenCalledWith(
      `/order-confirmation?order=${encodeURIComponent(checkout.orderNumber)}`,
    );
  });

  it("keeps the persisted checkout retryable when Popup is cancelled", async () => {
    const user = userEvent.setup();
    mocks.resume.mockResolvedValueOnce({ kind: "cancelled" });
    render(<CheckoutRecovery initialCheckout={checkout} />);

    await user.click(screen.getByRole("button", { name: "Resume Paystack" }));

    expect(await screen.findByText(/recorded checkout remains available to retry/i)).toBeInTheDocument();
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("shows Popup errors without verifying or clearing the cart", async () => {
    const user = userEvent.setup();
    mocks.resume.mockResolvedValueOnce({
      kind: "error",
      message: "Paystack could not open the payment window.",
    });
    render(<CheckoutRecovery initialCheckout={checkout} />);

    await user.click(screen.getByRole("button", { name: "Resume Paystack" }));

    expect(await screen.findByText(/could not open the payment window/i)).toBeInTheDocument();
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
  });

  it("keeps pending verification honest and does not clear local state", async () => {
    const user = userEvent.setup();
    mocks.refetch.mockResolvedValueOnce({ data: { ...checkout, status: "pending" } });
    render(<CheckoutRecovery initialCheckout={checkout} />);

    await user.click(screen.getByRole("button", { name: "Resume Paystack" }));

    expect(await screen.findByText(/confirmation is still pending/i)).toBeInTheDocument();
    expect(mocks.clear).not.toHaveBeenCalled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });
});
