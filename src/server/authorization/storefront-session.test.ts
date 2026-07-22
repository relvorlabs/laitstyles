import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  identity: vi.fn(),
  createClient: vi.fn(),
  findProfile: vi.fn(),
  findCustomer: vi.fn(),
}));

vi.mock("@/lib/auth/server/session", () => ({ getVerifiedIdentity: mocks.identity }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profiles: { findUnique: mocks.findProfile },
    customers: { findFirst: mocks.findCustomer },
  },
}));

import { getStorefrontSession } from "./storefront-session";

describe("storefront account session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createClient.mockResolvedValue({});
    mocks.identity.mockResolvedValue({ authUserId: "profile-a", email: "ada@example.com" });
    mocks.findCustomer.mockResolvedValue({ id: "customer-a" });
  });

  it.each([
    "suspended",
    "disabled",
  ] as const)("denies a %s profile even when its auth session is still valid", async (status) => {
    mocks.findProfile.mockResolvedValue({ role: "consumer", status });

    await expect(getStorefrontSession()).resolves.toBeNull();
    expect(mocks.findCustomer).not.toHaveBeenCalled();
  });

  it("resolves the customer only for an active consumer profile", async () => {
    mocks.findProfile.mockResolvedValue({ role: "consumer", status: "active" });

    await expect(getStorefrontSession()).resolves.toEqual({
      authUserId: "profile-a",
      email: "ada@example.com",
      role: "consumer",
      customerId: "customer-a",
    });
    expect(mocks.findCustomer).toHaveBeenCalledWith({
      where: { profile_id: "profile-a" },
      select: { id: true },
    });
  });
});
