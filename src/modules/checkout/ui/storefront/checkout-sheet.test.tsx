// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContext } from "@/modules/checkout/types";

const mocks = vi.hoisted(() => ({
  context: null as CheckoutContext | null,
  createCheckout: vi.fn(),
  verifyCheckout: vi.fn(),
  createAddress: vi.fn(),
  updateProfile: vi.fn(),
  setQueryData: vi.fn(),
  preloadPaystack: vi.fn(),
  resumePaystack: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: mocks.setQueryData }),
  useQuery: (options: { kind: "context" | "status" }) =>
    options.kind === "context"
      ? { data: mocks.context, isPending: false, isError: false }
      : { data: undefined, isPending: false, isError: false },
}));
vi.mock("@/modules/checkout/client/hooks", () => ({
  checkoutContextQueryOptions: () => ({ kind: "context" }),
  checkoutQueryOptions: () => ({ kind: "status" }),
  useCreateCheckout: () => ({ isPending: false, mutateAsync: mocks.createCheckout }),
  useVerifyCheckoutPayment: () => ({ isPending: false, mutateAsync: mocks.verifyCheckout }),
}));
vi.mock("@/modules/customers/client/account-hooks", () => ({
  useCreateOwnedAddress: () => ({ isPending: false, mutateAsync: mocks.createAddress }),
  useUpdateOwnedProfile: () => ({ isPending: false, mutateAsync: mocks.updateProfile }),
}));
vi.mock("@/modules/payments/client/paystack-popup", () => ({
  preloadPaystackPopup: mocks.preloadPaystack,
  resumePaystackTransaction: mocks.resumePaystack,
}));
vi.mock("@/modules/auth/ui/storefront-auth-provider", () => ({
  useStorefrontAuth: () => ({ state: { signedIn: true } }),
}));
vi.mock("@/modules/storefront-shell/client/storefront-runtime", () => ({
  openStorefrontOverlay: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

import { StorefrontCheckoutSheet } from "./checkout-sheet";

const defaultContext = {
  profile: {
    authUserId: "11111111-1111-4111-8111-111111111111",
    email: "buyer@example.com",
    firstName: "Ada",
    lastName: "Buyer",
    preferredName: "Ada",
    phone: "+2348000000000",
  },
  profileComplete: true,
  addresses: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      label: "Home",
      line1: "1 Lagos Street",
      line2: "",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      isDefault: true,
      deliveryNotes: "",
      createdAt: "2026-07-30T12:00:00.000Z",
      updatedAt: "2026-07-30T12:00:00.000Z",
    },
  ],
  defaultAddressId: "22222222-2222-4222-8222-222222222222",
  deliveryZones: [
    {
      id: "33333333-3333-4333-8333-333333333333",
      name: "Lagos Mainland",
      city: "Lagos",
      feeMinor: 1_500,
      estimatedDays: "1–2 business days",
    },
  ],
  selectedDeliveryZoneId: "33333333-3333-4333-8333-333333333333",
  deliveryAmountStatus: "estimated",
} satisfies CheckoutContext;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn(() => "44444444-4444-4444-8444-444444444444"),
  });
  mocks.context = defaultContext;
  mocks.preloadPaystack.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StorefrontCheckoutSheet", () => {
  it("selects the default address and includes the estimated delivery amount", async () => {
    render(
      <StorefrontCheckoutSheet
        active
        lines={[
          {
            productId: "55555555-5555-4555-8555-555555555555",
            variantId: null,
            quantity: 1,
          },
        ]}
        onBack={vi.fn()}
        onPaid={vi.fn()}
        subtotalMinor={250_000}
      />,
    );

    const address = await screen.findByRole("radio", { name: /Home/i });
    await waitFor(() => expect(address).toBeChecked());
    expect(screen.getByText(/Lagos Mainland/i)).toBeInTheDocument();
    expect(screen.getByText("1–2 business days")).toBeInTheDocument();
    expect(screen.getAllByText("₦15").length).toBeGreaterThan(0);
    expect(screen.getByText("₦2,515")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay securely with Paystack" })).toBeEnabled();
  });

  it("opens the inline address form when the account has no saved address", async () => {
    mocks.context = {
      ...defaultContext,
      addresses: [],
      defaultAddressId: null,
      selectedDeliveryZoneId: null,
    };

    render(
      <StorefrontCheckoutSheet
        active
        lines={[
          {
            productId: "55555555-5555-4555-8555-555555555555",
            variantId: null,
            quantity: 1,
          },
        ]}
        onBack={vi.fn()}
        onPaid={vi.fn()}
        subtotalMinor={250_000}
      />,
    );

    expect(await screen.findByLabelText("Street address")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save delivery address" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Pay securely with Paystack" })).toBeDisabled();
  });
});
