import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  getUser: vi.fn(),
  profileFindUnique: vi.fn(),
  customerFindFirst: vi.fn(),
  ensureConsumerProfile: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: mocks.getClaims, getUser: mocks.getUser },
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profiles: { findUnique: mocks.profileFindUnique },
    customers: { findFirst: mocks.customerFindFirst },
  },
}));
vi.mock("@/server/auth/profile", () => ({
  ensureConsumerProfile: mocks.ensureConsumerProfile,
}));

import { getCurrentSession, getStaffAccess } from "./session";

function signedInAs(sub: string, email: string | null) {
  mocks.getClaims.mockResolvedValue({ data: { claims: { sub, email } } });
}

describe("getCurrentSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signedInAs("user-a", "shopper@example.com");
    mocks.profileFindUnique.mockResolvedValue({ role: "consumer", status: "active" });
    mocks.customerFindFirst.mockResolvedValue({ id: "customer-a" });
  });

  it("resolves anonymous when no verified identity exists", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: null } });
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    await expect(getCurrentSession()).resolves.toEqual({ kind: "anonymous" });
    expect(mocks.profileFindUnique).not.toHaveBeenCalled();
  });

  it("resolves an active consumer with their customer record", async () => {
    await expect(getCurrentSession()).resolves.toEqual({
      kind: "consumer",
      authUserId: "user-a",
      email: "shopper@example.com",
      customerId: "customer-a",
    });
    // Steady-state reads never write.
    expect(mocks.ensureConsumerProfile).not.toHaveBeenCalled();
  });

  it("resolves a consumer with no customer record yet", async () => {
    mocks.customerFindFirst.mockResolvedValue(null);

    await expect(getCurrentSession()).resolves.toMatchObject({
      kind: "consumer",
      customerId: null,
    });
  });

  it("resolves staff without touching customer records", async () => {
    mocks.profileFindUnique.mockResolvedValue({ role: "manager", status: "active" });

    await expect(getCurrentSession()).resolves.toEqual({
      kind: "staff",
      authUserId: "user-a",
      email: "shopper@example.com",
      role: "manager",
    });
    expect(mocks.customerFindFirst).not.toHaveBeenCalled();
  });

  it("resolves suspended for any non-active profile, staff included", async () => {
    mocks.profileFindUnique.mockResolvedValue({ role: "admin", status: "suspended" });

    await expect(getCurrentSession()).resolves.toEqual({
      kind: "suspended",
      authUserId: "user-a",
      email: "shopper@example.com",
    });
  });

  it("provisions a missing profile once instead of failing", async () => {
    mocks.profileFindUnique.mockResolvedValue(null);
    mocks.ensureConsumerProfile.mockResolvedValue({
      id: "user-a",
      role: "consumer",
      status: "active",
    });
    mocks.customerFindFirst.mockResolvedValue(null);

    await expect(getCurrentSession()).resolves.toMatchObject({ kind: "consumer" });
    expect(mocks.ensureConsumerProfile).toHaveBeenCalledWith("user-a", "shopper@example.com");
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
    mocks.profileFindUnique.mockResolvedValue({ role: "admin", status: "active" });

    await expect(getStaffAccess("settings:update")).resolves.toEqual({ ok: true, role: "admin" });
  });

  it("denies staff roles missing the capability", async () => {
    mocks.profileFindUnique.mockResolvedValue({ role: "manager", status: "active" });

    await expect(getStaffAccess("settings:update")).resolves.toEqual({
      ok: false,
      reason: "missing-capability",
    });
  });

  it("denies consumers with missing-capability", async () => {
    mocks.profileFindUnique.mockResolvedValue({ role: "consumer", status: "active" });
    mocks.customerFindFirst.mockResolvedValue(null);

    await expect(getStaffAccess()).resolves.toEqual({ ok: false, reason: "missing-capability" });
  });

  it("denies suspended accounts with account-inactive", async () => {
    mocks.profileFindUnique.mockResolvedValue({ role: "admin", status: "suspended" });

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
