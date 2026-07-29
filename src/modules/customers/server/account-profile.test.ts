import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profilesFindUniqueOrThrow: vi.fn(),
  profileDetailsFindUnique: vi.fn(),
  customersFindUnique: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    profiles: {
      findUniqueOrThrow: mocks.profilesFindUniqueOrThrow,
    },
    profile_details: {
      findUnique: mocks.profileDetailsFindUnique,
    },
    customers: {
      findUnique: mocks.customersFindUnique,
    },
    $transaction: mocks.transaction,
  },
}));

import { getOwnedProfile, updateOwnedProfile } from "@/modules/customers/server/account-profile";

const identity = {
  kind: "consumer" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
  displayName: "Ada",
  phone: "+2348010000000",
  customerId: "22222222-2222-4222-8222-222222222222",
};

function createTx() {
  return {
    profiles: { update: vi.fn() },
    profile_details: { upsert: vi.fn() },
    customers: { update: vi.fn() },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOwnedProfile", () => {
  it("reads the profile, profile details and customer scoped to the authenticated identity", async () => {
    mocks.profilesFindUniqueOrThrow.mockResolvedValue({
      display_name: "Ada Okafor",
      phone: "+2348010000000",
    });
    mocks.profileDetailsFindUnique.mockResolvedValue({
      first_name: "Ada",
      last_name: "Okafor",
      preferred_name: "Ada",
    });
    mocks.customersFindUnique.mockResolvedValue({ name: "Ada Okafor", phone: "+2348010000000" });

    const profile = await getOwnedProfile(identity);

    expect(mocks.profilesFindUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: identity.authUserId },
      select: { display_name: true, phone: true },
    });
    expect(profile).toEqual({
      authUserId: identity.authUserId,
      email: identity.email,
      firstName: "Ada",
      lastName: "Okafor",
      preferredName: "Ada",
      phone: "+2348010000000",
    });
  });

  it("falls back to the customer or display name when profile details are missing", async () => {
    mocks.profilesFindUniqueOrThrow.mockResolvedValue({ display_name: null, phone: null });
    mocks.profileDetailsFindUnique.mockResolvedValue(null);
    mocks.customersFindUnique.mockResolvedValue({ name: "Chidi Okoro", phone: "+2348020000000" });

    const profile = await getOwnedProfile(identity);

    expect(profile.firstName).toBe("Chidi");
    expect(profile.lastName).toBe("Okoro");
    expect(profile.phone).toBe("+2348020000000");
  });
});

describe("updateOwnedProfile", () => {
  it("synchronizes the profile, profile details and customer record in one transaction", async () => {
    const tx = createTx();
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await updateOwnedProfile(identity, {
      firstName: "Ada",
      lastName: "Okafor",
      preferredName: "Addie",
      phone: "+2348011111111",
    });

    expect(tx.profiles.update).toHaveBeenCalledWith({
      where: { id: identity.authUserId },
      data: { display_name: "Addie", phone: "+2348011111111" },
    });
    expect(tx.profile_details.upsert).toHaveBeenCalledWith({
      where: { profile_id: identity.authUserId },
      update: { first_name: "Ada", last_name: "Okafor", preferred_name: "Addie" },
      create: {
        profile_id: identity.authUserId,
        first_name: "Ada",
        last_name: "Okafor",
        preferred_name: "Addie",
      },
    });
    expect(tx.customers.update).toHaveBeenCalledWith({
      where: { id: identity.customerId },
      data: { name: "Ada Okafor", email: identity.email, phone: "+2348011111111" },
    });
    expect(result).toMatchObject({ firstName: "Ada", lastName: "Okafor", preferredName: "Addie" });
  });

  it("uses the full name as the display name when no preferred name is given", async () => {
    const tx = createTx();
    mocks.transaction.mockImplementationOnce(async (callback: (client: typeof tx) => unknown) =>
      callback(tx),
    );

    await updateOwnedProfile(identity, { firstName: "Ada", lastName: "Okafor" });

    expect(tx.profiles.update).toHaveBeenCalledWith({
      where: { id: identity.authUserId },
      data: { display_name: "Ada Okafor", phone: null },
    });
  });
});
