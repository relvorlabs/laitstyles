// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  verify: vi.fn(),
  refetch: vi.fn(),
  resume: vi.fn(),
  preload: vi.fn(),
  replace: vi.fn(),
  clear: vi.fn(),
  releaseProduct: vi.fn(),
  queryData: undefined as unknown,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mocks.queryData, refetch: mocks.refetch }),
}));
vi.mock("@/modules/checkout/client/hooks", () => ({
  checkoutQueryOptions: vi.fn(() => ({})),
  useCreateCheckout: () => ({ isPending: false, mutateAsync: mocks.create }),
  useVerifyCheckoutPayment: () => ({ isPending: false, mutateAsync: mocks.verify }),
}));
vi.mock("@/modules/payments/client/paystack-popup", () => ({
  preloadPaystackPopup: mocks.preload,
  resumePaystackTransaction: mocks.resume,
}));
vi.mock("@/modules/storefront-shell/client/storefront-runtime", () => ({
  useStorefrontCart: () => ({
    views: [
      {
        lineKey: "product-1:variant-1",
        lineQty: 2,
        variantId: "77777777-7777-4777-8777-777777777777",
        variantLabel: "Medium",
        colour: "Black",
        size: "M",
        unitPriceNaira: 1250,
        product: {
          id: "66666666-6666-4666-8666-666666666666",
          slug: "silk-dress",
          name: "Silk dress",
          size: "M",
          colour: "Black",
          condition: "A",
          images: [],
        },
      },
    ],
    clear: mocks.clear,
  }),
  useStorefrontHolds: () => ({
    secondsByProduct: {},
    releaseProduct: mocks.releaseProduct,
  }),
}));

import { CheckoutFlow } from "./checkout-flow";

const draft = {
  checkoutId: "88888888-8888-4888-8888-888888888888",
  paymentId: "99999999-9999-4999-8999-999999999999",
  orderNumber: "LS-ORDER1",
  reference: "LS-CHECKOUT-reference",
  accessCode: "access-code",
  status: "initialized" as const,
  currency: "NGN",
  subtotalMinor: 250_000,
  deliveryFeeMinor: 1_500,
  discountMinor: 0,
  totalMinor: 251_500,
};

const addresses = [
  {
    id: "44444444-4444-4444-8444-444444444444",
    label: "Home",
    line1: "1 Lagos Street",
    line2: "",
    city: "Lagos",
    state: "Lagos",
    country: "Nigeria",
    isDefault: true,
    deliveryNotes: "",
    createdAt: "2026-07-30T00:00:00.000Z",
    updatedAt: "2026-07-30T00:00:00.000Z",
  },
];
const zones = [
  {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Lagos delivery",
    city: "Lagos",
    feeMinor: 1_500,
    estimatedDays: "1–2 business days",
  },
];

describe("CheckoutFlow", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn(() => "33333333-3333-4333-8333-333333333333"),
    });
    mocks.create.mockResolvedValue(draft);
    mocks.verify.mockResolvedValue({ ...draft, replayed: false });
    mocks.refetch.mockResolvedValue({ data: draft });
    mocks.resume.mockResolvedValue({ kind: "success", reference: draft.reference });
  });

  it("creates a server draft with owned IDs and verifies after Popup success", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open");
    render(
      <CheckoutFlow
        customerEmail="buyer@example.com"
        initialAddresses={addresses}
        initialZones={zones}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith({
        idempotencyKey: "33333333-3333-4333-8333-333333333333",
        addressId: addresses[0].id,
        deliveryZoneId: zones[0].id,
        lines: [
          {
            productId: "66666666-6666-4666-8666-666666666666",
            variantId: "77777777-7777-4777-8777-777777777777",
            quantity: 2,
          },
        ],
      }),
    );

    await user.click(screen.getByRole("button", { name: /Pay ₦2,515.00/i }));
    await waitFor(() => expect(mocks.resume).toHaveBeenCalledWith("access-code"));
    await waitFor(() => expect(mocks.verify).toHaveBeenCalledWith(draft.paymentId));
    expect(openSpy).not.toHaveBeenCalled();
  });

  it("keeps the cart and skips verification when Popup is cancelled", async () => {
    mocks.resume.mockResolvedValueOnce({ kind: "cancelled" });
    const user = userEvent.setup();
    render(
      <CheckoutFlow
        customerEmail="buyer@example.com"
        initialAddresses={addresses}
        initialZones={zones}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: /Pay ₦2,515.00/i }));

    expect(await screen.findByText(/Payment was cancelled/i)).toBeInTheDocument();
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.clear).not.toHaveBeenCalled();
  });
});
