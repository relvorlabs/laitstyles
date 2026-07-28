import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  inviteStoreManager: vi.fn(),
}));

vi.mock("@/modules/auth/server/staff-invitations", () => ({
  inviteStoreManager: mocks.inviteStoreManager,
}));

import { POST } from "@/app/api/v1/auth/invitations/route";

describe("manager invitation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the normalized transport fields to the owner invitation operation", async () => {
    mocks.inviteStoreManager.mockResolvedValue({
      ok: true,
      message: "Invitation sent.",
      member: {
        id: "manager-a",
        email: "manager@example.com",
        displayName: "Ada Manager",
        state: "invited",
        invitedAt: "2026-07-27T00:00:00.000Z",
        lastSeenAt: null,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/v1/auth/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "manager@example.com",
          firstName: "Ada",
          lastName: "Manager",
        }),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ ok: true, message: "Invitation sent." }),
    );
    expect(mocks.inviteStoreManager).toHaveBeenCalledWith({
      email: "manager@example.com",
      firstName: "Ada",
      lastName: "Manager",
    });
  });

  it("returns owner-only denial without exposing server details", async () => {
    mocks.inviteStoreManager.mockRejectedValue(
      new Error("Only the store owner can manage staff invitations."),
    );

    const response = await POST(
      new Request("http://localhost/api/v1/auth/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "manager@example.com" }),
      }),
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      message: "Only the store owner can invite store managers.",
    });
  });
});
