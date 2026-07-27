import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getUser: vi.fn(),
  profileFindUnique: vi.fn(),
  ensureConsumerAccount: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: mocks.getClaims, getUser: mocks.getUser },
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profiles: { findUnique: mocks.profileFindUnique },
  },
}));
vi.mock("@/server/auth/profile", () => ({
  ensureConsumerAccount: mocks.ensureConsumerAccount,
}));

import { getCurrentSession, getStaffAccess } from "./session";

function signedInAs(sub: string, email: string | null) {
  mocks.getClaims.mockResolvedValue({
    data: {
      claims: {
        sub,
        email,
        user_metadata: { first_name: "Ada", last_name: "Lovelace" },
      },
    },
  });
}

function activeConsumer(customerId = "customer-a") {
  return {
    role: "consumer",
    status: "active",
    display_name: "Ada Lovelace",
    phone: "+2348012345678",
    customer: { id: customerId },
  };
}

function activeStaff(role: "manager" | "admin") {
  return {
    role,
    status: "active",
    display_name: "Store Owner",
    phone: null,
    customer: null,
  };
}

describe("getCurrentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signedInAs("user-a", "shopper@example.com");
    mocks.profileFindUnique.mockResolvedValue(activeConsumer());
    mocks.ensureConsumerAccount.mockResolvedValue({
      profile: {
        id: "user-a",
        role: "consumer",
        status: "active",
        display_name: "Ada Lovelace",
        phone: "+2348012345678",
      },
      customerId: "customer-a",
    });
  });

  it("resolves anonymous when no verified identity exists", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null } });
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getCurrentSession()).resolves.toEqual({ kind: "anonymous" });
    expect(mocks.profileFindUnique).not.toHaveBeenCalled();
  });

  it("resolves an active consumer with persisted profile and customer data", async () => {
    await expect(getCurrentSession()).resolves.toEqual({
      kind: "consumer",
      authUserId: "user-a",
      email: "shopper@example.com",
      displayName: "Ada Lovelace",
      phone: "+2348012345678",
      customerId: "customer-a",
    });
    expect(mocks.ensureConsumerAccount).not.toHaveBeenCalled();
  });

  it("repairs a missing customer record instead of returning a nullable customer id", async () => {
    mocks.profileFindUnique.mockResolvedValue({ ...activeConsumer(), customer: null });

    await expect(getCurrentSession()).resolves.toMatchObject({
      kind: "consumer",
      customerId: "customer-a",
    });
    expect(mocks.ensureConsumerAccount).toHaveBeenCalledWith({
      id: "user-a",
      email: "shopper@example.com",
      userMetadata: { first_name: "Ada", last_name: "Lovelace" },
    });
  });

  it("resolves staff without provisioning a customer", async () => {
    mocks.profileFindUnique.mockResolvedValue(activeStaff("manager"));

    await expect(getCurrentSession()).resolves.toEqual({
      kind: "staff",
      authUserId: "user-a",
      email: "shopper@example.com",
      displayName: "Store Owner",
      role: "manager",
    });
    expect(mocks.ensureConsumerAccount).not.toHaveBeenCalled();
  });

  it("resolves suspended for any non-active profile, staff included", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      ...activeStaff("admin"),
      status: "suspended",
    });

    await expect(getCurrentSession()).resolves.toEqual({
      kind: "suspended",
      authUserId: "user-a",
      email: "shopper@example.com",
    });
  });

  it("provisions a missing profile and customer atomically", async () => {
    mocks.profileFindUnique.mockResolvedValue(null);

    await expect(getCurrentSession()).resolves.toEqual({
      kind: "consumer",
      authUserId: "user-a",
      email: "shopper@example.com",
      displayName: "Ada Lovelace",
      phone: "+2348012345678",
      customerId: "customer-a",
    });
    expect(mocks.ensureConsumerAccount).toHaveBeenCalledWith({
      id: "user-a",
      email: "shopper@example.com",
      userMetadata: { first_name: "Ada", last_name: "Lovelace" },
    });
  });

  it("resolves unavailable when session resolution fails", async () => {
    mocks.profileFindUnique.mockRejectedValue(new Error("Database unavailable"));

    await expect(getCurrentSession()).resolves.toEqual({
      kind: "unavailable",
      error: "Database unavailable",
    });
  });
});

describe("getStaffAccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signedInAs("user-a", "owner@example.com");
  });

  it("grants staff with the requested capability", async () => {
    mocks.profileFindUnique.mockResolvedValue(activeStaff("admin"));

    await expect(getStaffAccess("settings:update")).resolves.toEqual({ ok: true, role: "admin" });
  });

  it("denies staff roles missing the capability", async () => {
    mocks.profileFindUnique.mockResolvedValue(activeStaff("manager"));

    await expect(getStaffAccess("settings:update")).resolves.toEqual({
      ok: false,
      reason: "missing-capability",
    });
  });

  it("denies consumers with missing-capability", async () => {
    mocks.profileFindUnique.mockResolvedValue(activeConsumer());

    await expect(getStaffAccess()).resolves.toEqual({ ok: false, reason: "missing-capability" });
  });

  it("denies suspended accounts with account-inactive", async () => {
    mocks.profileFindUnique.mockResolvedValue({
      ...activeStaff("admin"),
      status: "suspended",
    });

    await expect(getStaffAccess()).resolves.toEqual({ ok: false, reason: "account-inactive" });
  });

  it("denies signed-out visitors", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null } });
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getStaffAccess()).resolves.toEqual({ ok: false, reason: "signed-out" });
  });

  it("denies with authorization-unavailable when resolution fails", async () => {
    mocks.profileFindUnique.mockRejectedValue(new Error("Database unavailable"));

    await expect(getStaffAccess()).resolves.toEqual({
      ok: false,
      reason: "authorization-unavailable",
    });
  });
});
