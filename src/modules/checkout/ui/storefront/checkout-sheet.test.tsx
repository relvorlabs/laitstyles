// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CheckoutContext } from "@/modules/checkout/types";

const mocks = vi.hoisted(() => ({
  context: null as CheckoutContext | null,
  createCheckout: vi.fn(),
  verifyCheckout: vi.fn(),
  updateProfile: vi.fn(),
  setQueryData: vi.fn(),
  preloadPaystack: vi.fn(),
  resumePaystack: vi.fn(),
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: mocks.setQueryData }),
  useQuery: (options: { kind: "context" | "status" | "coupon" }) => {
    if (options.kind === "context") {
      return { data: mocks.context, isPending: false, isError: false, refetch: vi.fn() };
    }
    return {
      data: undefined,
      isPending: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn(),
    };
  },
}));
vi.mock("@/modules/checkout/client/hooks", () => ({
  checkoutContextQueryOptions: () => ({ kind: "context" }),
  checkoutCouponQueryOptions: () => ({ kind: "coupon" }),
  checkoutQueryOptions: () => ({ kind: "status" }),
  useCreateCheckout: () => ({ isPending: false, mutateAsync: mocks.createCheckout }),
  useVerifyCheckoutPayment: () => ({ isPending: false, mutateAsync: mocks.verifyCheckout }),
}));
vi.mock("@/modules/customers/client/account-hooks", () => ({
  useUpdateOwnedProfile: () => ({ isPending: false, mutateAsync: mocks.updateProfile }),
}));
vi.mock("@/modules/payments/client/paystack-popup", () => ({
  preloadPaystackPopup: mocks.preloadPaystack,
  resumePaystackTransaction: mocks.resumePaystack,
}));
vi.mock("@/modules/auth/ui/storefront-auth-provider", () => ({
  useStorefrontAuth: () => ({
    state: { signedIn: true },
    actions: { openSignin: vi.fn() },
  }),
}));
vi.mock("@/modules/storefront-shell/client/storefront-runtime", () => ({
  openStorefrontOverlay: vi.fn(),
}));
vi.mock("sonner", () => ({
  toast: {
    error: mocks.toastError,
    success: mocks.toastSuccess,
    message: vi.fn(),
  },
}));

import { StorefrontCheckoutSheet } from "./checkout-sheet";

const defaultAddress = {
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
};

const defaultQuote = {
  addressId: defaultAddress.id,
  deliveryZoneId: "33333333-3333-4333-8333-333333333333",
  label: "Lagos Mainland",
  coverageLabel: "Lagos Mainland rate",
  feeMinor: 1_500,
  estimatedDays: "1-2",
  source: "regional-override" as const,
};

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
  phoneRequired: false,
  addresses: [defaultAddress],
  defaultAddressId: defaultAddress.id,
  deliveryQuotes: [defaultQuote],
  selectedDeliveryQuote: defaultQuote,
  deliveryAmountStatus: "estimated",
  activeCheckout: null,
} satisfies CheckoutContext;

const checkoutLines = [
  {
    productId: "55555555-5555-4555-8555-555555555555",
    variantId: null,
    quantity: 1,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("crypto", {
    randomUUID: vi.fn(() => "44444444-4444-4444-8444-444444444444"),
  });
  mocks.context = defaultContext;
  mocks.preloadPaystack.mockResolvedValue(undefined);
  mocks.updateProfile.mockResolvedValue(defaultContext.profile);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("StorefrontCheckoutSheet", () => {
  it("uses the default saved address and server delivery quote", async () => {
    render(
      <StorefrontCheckoutSheet
        active
        lines={checkoutLines}
        onBack={vi.fn()}
        onPaid={vi.fn()}
        subtotalMinor={250_000}
      />,
    );

    expect(await screen.findByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Default")).toBeInTheDocument();
    expect(screen.getByText(/1 Lagos Street, Lagos, Lagos/i)).toBeInTheDocument();
    expect(screen.getByText("Lagos Mainland")).toBeInTheDocument();
    expect(screen.getByText("Estimated arrival: 1-2 working days.")).toBeInTheDocument();
    expect(screen.getAllByText("₦15").length).toBeGreaterThan(0);
    expect(screen.getByText("₦2,515")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pay · ₦2,515" })).toBeEnabled();
  });

  it("keeps nationwide delivery available for an alternate saved address", async () => {
    const alternateAddress = {
      ...defaultAddress,
      id: "77777777-7777-4777-8777-777777777777",
      label: "Abuja studio",
      line1: "8 Maitama Avenue",
      city: "Abuja",
      state: "FCT",
      isDefault: false,
    };
    const alternateQuote = {
      addressId: alternateAddress.id,
      deliveryZoneId: "88888888-8888-4888-8888-888888888888",
      label: "Nationwide delivery",
      coverageLabel: "Delivery across Nigeria",
      feeMinor: 6_500,
      estimatedDays: "2-5",
      source: "nationwide-fallback" as const,
    };
    mocks.context = {
      ...defaultContext,
      addresses: [defaultAddress, alternateAddress],
      deliveryQuotes: [defaultQuote, alternateQuote],
    };

    render(
      <StorefrontCheckoutSheet
        active
        lines={checkoutLines}
        onBack={vi.fn()}
        onPaid={vi.fn()}
        subtotalMinor={250_000}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Abuja studio/i }));
    expect(screen.getByText("Nationwide delivery")).toBeInTheDocument();
    expect(screen.getByText(/This address is covered/i)).toBeInTheDocument();
    expect(screen.getAllByText("₦65").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Pay · ₦2,565" })).toBeEnabled();
  });

  it("explains that an address is required instead of silently disabling payment", async () => {
    mocks.context = {
      ...defaultContext,
      addresses: [],
      defaultAddressId: null,
      deliveryQuotes: [],
      selectedDeliveryQuote: null,
    };

    render(
      <StorefrontCheckoutSheet
        active
        lines={checkoutLines}
        onBack={vi.fn()}
        onPaid={vi.fn()}
        subtotalMinor={250_000}
      />,
    );

    expect(await screen.findByText("No delivery address is saved yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add delivery address" })).toHaveAttribute(
      "href",
      "/account/addresses?returnTo=checkout",
    );
    expect(screen.getByRole("button", { name: "Pay · ₦2,500" })).toBeDisabled();
    expect(screen.getByText("Add or select a delivery address to continue.")).toBeInTheDocument();
  });

  it("provides the missing phone form and validates confirmation before saving", async () => {
    mocks.context = {
      ...defaultContext,
      profile: { ...defaultContext.profile, phone: "" },
      profileComplete: false,
      phoneRequired: true,
    };
    mocks.updateProfile.mockResolvedValue({
      ...defaultContext.profile,
      phone: "+2348012345678",
    });

    render(
      <StorefrontCheckoutSheet
        active
        lines={checkoutLines}
        onBack={vi.fn()}
        onPaid={vi.fn()}
        subtotalMinor={250_000}
      />,
    );

    expect(await screen.findByText("Save a delivery phone number to continue.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Delivery phone number"), {
      target: { value: "+2348012345678" },
    });
    fireEvent.change(screen.getByLabelText("Confirm delivery phone number"), {
      target: { value: "+2348099999999" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save delivery number" }));

    expect(mocks.updateProfile).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith("The phone numbers do not match.");

    fireEvent.change(screen.getByLabelText("Confirm delivery phone number"), {
      target: { value: "+2348012345678" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save delivery number" }));

    await waitFor(() =>
      expect(mocks.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({ phone: "+2348012345678" }),
      ),
    );
  });
});
