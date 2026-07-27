import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  getAuthRedirectUrl: vi.fn(),
  inviteUserByEmail: vi.fn(),
  deleteUser: vi.fn(),
  listUsers: vi.fn(),
  profileFindFirst: vi.fn(),
  profileFindMany: vi.fn(),
  profileUpsert: vi.fn(),
  profileDetailsUpsert: vi.fn(),
  customersDeleteMany: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/modules/auth/server/session", () => ({
  getCurrentSession: mocks.getCurrentSession,
}));
vi.mock("@/modules/auth/server/redirects", () => ({
  getAuthRedirectUrl: mocks.getAuthRedirectUrl,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => ({
    auth: {
      admin: {
        inviteUserByEmail: mocks.inviteUserByEmail,
        deleteUser: mocks.deleteUser,
        listUsers: mocks.listUsers,
      },
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    profiles: {
      findFirst: mocks.profileFindFirst,
      findMany: mocks.profileFindMany,
    },
    $transaction: mocks.transaction,
  },
}));

import { inviteStoreManager } from "@/modules/auth/server/staff-invitations";

const transactionClient = {
  profiles: { upsert: mocks.profileUpsert },
  profile_details: { upsert: mocks.profileDetailsUpsert },
  customers: { deleteMany: mocks.customersDeleteMany },
  audit_events: { create: mocks.auditCreate },
};

type TransactionCallback = (client: typeof transactionClient) => unknown | Promise<unknown>;

describe("store manager invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({
      kind: "staff",
      authUserId: "owner-a",
      email: "owner@example.com",
      displayName: "Owner",
      role: "admin",
    });
    mocks.getAuthRedirectUrl.mockResolvedValue("https://shop.example.com/auth/invite/setup");
    mocks.profileFindFirst.mockResolvedValue(null);
    mocks.inviteUserByEmail.mockResolvedValue({
      data: {
        user: {
          id: "manager-a",
          email: "manager@example.com",
          invited_at: "2026-07-27T10:00:00.000Z",
        },
      },
      error: null,
    });
    mocks.profileUpsert.mockResolvedValue({
      id: "manager-a",
      email: "manager@example.com",
      display_name: "Ada Manager",
      created_at: new Date("2026-07-27T10:00:00.000Z"),
    });
    mocks.profileDetailsUpsert.mockResolvedValue({});
    mocks.customersDeleteMany.mockResolvedValue({ count: 1 });
    mocks.auditCreate.mockResolvedValue({});
    mocks.deleteUser.mockResolvedValue({ data: {}, error: null });
    mocks.transaction.mockImplementation(async (callback: TransactionCallback) =>
      callback(transactionClient),
    );
  });

  it("invites through Supabase and fixes the application role as manager", async () => {
    await expect(
      inviteStoreManager({
        email: " Manager@Example.com ",
        firstName: " Ada ",
        lastName: " Manager ",
      }),
    ).resolves.toEqual({
      ok: true,
      message:
        "Invitation sent. The manager can set a password and finish their profile from the email link.",
      member: {
        id: "manager-a",
        email: "manager@example.com",
        displayName: "Ada Manager",
        state: "invited",
        invitedAt: "2026-07-27T10:00:00.000Z",
        lastSeenAt: null,
      },
    });

    expect(mocks.inviteUserByEmail).toHaveBeenCalledWith("manager@example.com", {
      redirectTo: "https://shop.example.com/auth/invite/setup",
      data: {
        first_name: "Ada",
        last_name: "Manager",
        full_name: "Ada Manager",
        invited_role: "manager",
      },
    });
    expect(mocks.profileUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "manager-a" },
        create: expect.objectContaining({ role: "manager", status: "active" }),
        update: expect.objectContaining({ role: "manager", status: "active" }),
      }),
    );
    expect(mocks.customersDeleteMany).toHaveBeenCalledWith({
      where: { profile_id: "manager-a" },
    });
    expect(mocks.auditCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actor_profile_id: "owner-a",
        action: "staff.manager.invited",
        target_id: "manager-a",
      }),
    });
  });

  it("rejects manager invitations from a manager account", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({
      kind: "staff",
      authUserId: "manager-existing",
      email: "manager-existing@example.com",
      displayName: "Manager",
      role: "manager",
    });

    await expect(
      inviteStoreManager({
        email: "other@example.com",
        firstName: "Other",
        lastName: "Manager",
      }),
    ).rejects.toThrow("Only the store owner can manage staff invitations.");
    expect(mocks.inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("deletes the invited Auth user when Prisma cannot establish manager access", async () => {
    mocks.transaction.mockRejectedValueOnce(new Error("database unavailable"));

    await expect(
      inviteStoreManager({
        email: "manager@example.com",
        firstName: "Ada",
        lastName: "Manager",
      }),
    ).resolves.toEqual({
      ok: false,
      message:
        "The invitation email could not be prepared safely. No manager access was granted; please try again.",
    });
    expect(mocks.deleteUser).toHaveBeenCalledWith("manager-a");
  });
});
