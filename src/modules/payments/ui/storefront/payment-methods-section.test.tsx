// @vitest-environment jsdom

import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  methods: [] as Array<Record<string, unknown>>,
  setupData: undefined as unknown,
  refetchMethods: vi.fn(),
  createSetup: vi.fn(),
  verifySetup: vi.fn(),
  setDefault: vi.fn(),
  deleteMethod: vi.fn(),
  resume: vi.fn(),
  preload: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: { kind?: string }) =>
    options.kind === "methods"
      ? {
          data: mocks.methods,
          isPending: false,
          isError: false,
          refetch: mocks.refetchMethods,
        }
      : { data: mocks.setupData },
}));
vi.mock("@/modules/payments/client/payment-methods", () => ({
  paymentMethodsQueryOptions: () => ({ kind: "methods" }),
  paymentMethodSetupQueryOptions: () => ({ kind: "setup" }),
  useCreatePaymentMethodSetup: () => ({
    isPending: false,
    mutateAsync: mocks.createSetup,
  }),
  useVerifyPaymentMethodSetup: () => ({
    isPending: false,
    mutateAsync: mocks.verifySetup,
  }),
  useSetDefaultPaymentMethod: () => ({
    isPending: false,
    mutateAsync: mocks.setDefault,
  }),
  useDeletePaymentMethod: () => ({
    isPending: false,
    mutateAsync: mocks.deleteMethod,
  }),
}));
vi.mock("@/modules/payments/client/paystack-popup", () => ({
  preloadPaystackPopup: mocks.preload,
  resumePaystackTransaction: mocks.resume,
}));
vi.mock("@/modules/storefront-shell/ui/account-context", () => ({
  useAccountUi: () => ({ toast: mocks.toast }),
}));

import { PaymentMethodsSection } from "./payment-methods-section";

const method = {
  id: "11111111-1111-4111-8111-111111111111",
  brand: "Visa",
  bank: "Test Bank",
  last4: "4081",
  expMonth: "12",
  expYear: "2030",
  countryCode: "NG",
  channel: "card",
  reusable: true,
  isDefault: false,
  status: "active",
  createdAt: "2026-07-30T00:00:00.000Z",
};
const initializedSetup = {
  attemptId: "22222222-2222-4222-8222-222222222222",
  paymentId: "33333333-3333-4333-8333-333333333333",
  reference: "LS-METHOD-reference",
  accessCode: "access-code",
  status: "initialized" as const,
  refundStatus: "not_requested" as const,
  method: null,
};
const verifiedSetup = {
  ...initializedSetup,
  status: "success" as const,
  refundStatus: "pending" as const,
  method: { ...method, isDefault: true },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn(() => "44444444-4444-4444-8444-444444444444"),
  });
  mocks.methods = [method];
  mocks.setupData = undefined;
  mocks.createSetup.mockResolvedValue(initializedSetup);
  mocks.verifySetup.mockResolvedValue(verifiedSetup);
  mocks.setDefault.mockResolvedValue({ ...method, isDefault: true });
  mocks.deleteMethod.mockResolvedValue({ id: method.id, inactive: true });
  mocks.resume.mockResolvedValue({ kind: "success", reference: initializedSetup.reference });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("PaymentMethodsSection", () => {
  it("creates and verifies a reusable method through Paystack", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodsSection />);

    await user.click(screen.getByRole("button", { name: "Add method" }));
    await user.click(screen.getByRole("button", { name: "Continue securely" }));

    await waitFor(() =>
      expect(mocks.createSetup).toHaveBeenCalledWith({
        idempotencyKey: "44444444-4444-4444-8444-444444444444",
      }),
    );
    expect(mocks.resume).toHaveBeenCalledWith("access-code");
    expect(mocks.verifySetup).toHaveBeenCalledWith(initializedSetup.attemptId);
    expect(mocks.toast).toHaveBeenCalledWith(
      "Payment method verified. The NGN 50 setup refund is being reconciled.",
    );
  });

  it("changes the default method through the API mutation", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodsSection />);

    await user.click(screen.getByRole("button", { name: "Make default" }));

    expect(mocks.setDefault).toHaveBeenCalledWith(method.id);
    expect(mocks.toast).toHaveBeenCalledWith("Default payment method updated");
  });

  it("confirms and deletes a saved method", async () => {
    const user = userEvent.setup();
    render(<PaymentMethodsSection />);

    const methodCard = screen.getByText("•••• 4081").closest("article");
    expect(methodCard).not.toBeNull();
    await user.click(within(methodCard as HTMLElement).getByRole("button", { name: "Remove" }));
    const dialog = await screen.findByRole("dialog", { name: "Remove this payment method?" });
    await user.click(within(dialog).getByRole("button", { name: "Remove" }));

    expect(mocks.deleteMethod).toHaveBeenCalledWith(method.id);
    expect(mocks.toast).toHaveBeenCalledWith("Payment method removed");
  });
});
