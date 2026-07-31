import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConsumerSession } from "@/modules/auth/server/session";

const mocks = vi.hoisted(() => ({
  findActiveOrder: vi.fn(),
  transaction: vi.fn(),
  getOwnedProfile: vi.fn(),
  listOwnedAddresses: vi.fn(),
  listDeliveryQuotes: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    orders: { findFirst: mocks.findActiveOrder },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/modules/customers/server/account-profile", () => ({
  getOwnedProfile: mocks.getOwnedProfile,
}));
vi.mock("@/modules/customers/server/addresses", () => ({
  listOwnedAddresses: mocks.listOwnedAddresses,
}));
vi.mock("@/modules/checkout/server/delivery-policy", () => ({
  listCheckoutDeliveryQuotes: mocks.listDeliveryQuotes,
}));

import { getCheckoutContext } from "@/modules/checkout/server/get-checkout-context";

const identity = {
  kind: "consumer",
  authUserId: "11111111-1111-4111-8111-111111111111",
  customerId: "22222222-2222-4222-8222-222222222222",
  email: "buyer@example.com",
  displayName: "Buyer",
  phone: "+2348000000000",
} satisfies ConsumerSession;

const address = {
  id: "33333333-3333-4333-8333-333333333333",
  label: "Home",
  line1: "1 Example Street",
  line2: "",
  city: "Abuja",
  state: "FCT",
  country: "Nigeria",
  isDefault: true,
  deliveryNotes: "",
  createdAt: "2026-07-31T12:00:00.000Z",
  updatedAt: "2026-07-31T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getOwnedProfile.mockResolvedValue({
    authUserId: identity.authUserId,
    email: identity.email,
    firstName: "Ada",
    lastName: "Buyer",
    preferredName: "Ada",
    phone: identity.phone,
  });
  mocks.listOwnedAddresses.mockResolvedValue([address]);
  mocks.findActiveOrder.mockResolvedValue(null);
  mocks.listDeliveryQuotes.mockResolvedValue([
    {
      addressId: address.id,
      deliveryZoneId: "44444444-4444-4444-8444-444444444444",
      label: "Nationwide delivery",
      coverageLabel: "Delivery across Nigeria",
      feeMinor: 650_000,
      estimatedDays: "2-5",
      source: "nationwide-fallback",
    },
  ]);
  mocks.transaction.mockRejectedValue(new Error("interactive transactions unavailable"));
});

describe("getCheckoutContext", () => {
  it("loads read-only delivery quotes without opening an interactive transaction", async () => {
    const context = await getCheckoutContext(identity);

    expect(context.selectedDeliveryQuote).toMatchObject({
      addressId: address.id,
      source: "nationwide-fallback",
    });
    expect(mocks.listDeliveryQuotes).toHaveBeenCalledWith(
      expect.objectContaining({ orders: expect.any(Object) }),
      [
        {
          id: address.id,
          city: "Abuja",
          state: "FCT",
          country: "Nigeria",
        },
      ],
    );
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
