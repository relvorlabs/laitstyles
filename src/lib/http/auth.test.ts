import { afterEach, describe, expect, it, vi } from "vitest";
import { requireApiConsumer, requireApiSession, requireApiStaff } from "@/lib/http/auth";

const getCurrentSession = vi.hoisted(() => vi.fn());

vi.mock("@/server/auth/session", () => ({
  getCurrentSession,
}));

afterEach(() => {
  getCurrentSession.mockReset();
});

describe("API authentication helpers", () => {
  it("maps anonymous, suspended and unavailable sessions to stable API errors", async () => {
    getCurrentSession.mockResolvedValueOnce({ kind: "anonymous" });
    await expect(requireApiSession()).rejects.toMatchObject({
      code: "AUTHENTICATION_REQUIRED",
      status: 401,
    });

    getCurrentSession.mockResolvedValueOnce({
      kind: "suspended",
      authUserId: "user-1",
      email: "user@example.com",
    });
    await expect(requireApiSession()).rejects.toMatchObject({
      code: "ACCOUNT_INACTIVE",
      status: 403,
    });

    getCurrentSession.mockResolvedValueOnce({
      kind: "unavailable",
      error: "database unavailable",
    });
    await expect(requireApiSession()).rejects.toMatchObject({
      code: "AUTHORIZATION_UNAVAILABLE",
      status: 503,
    });
  });

  it("returns the authenticated consumer session and rejects staff-only access", async () => {
    const consumer = {
      kind: "consumer",
      authUserId: "consumer-1",
      email: "consumer@example.com",
      displayName: "Consumer",
      phone: null,
      customerId: "customer-1",
    } as const;

    getCurrentSession.mockResolvedValueOnce(consumer);
    await expect(requireApiConsumer()).resolves.toEqual(consumer);

    getCurrentSession.mockResolvedValueOnce(consumer);
    await expect(requireApiStaff()).rejects.toMatchObject({
      code: "MISSING_CAPABILITY",
      status: 403,
    });
  });

  it("enforces staff capabilities", async () => {
    const manager = {
      kind: "staff",
      authUserId: "staff-1",
      email: "manager@example.com",
      displayName: "Manager",
      role: "manager",
    } as const;

    getCurrentSession.mockResolvedValueOnce(manager);
    await expect(requireApiStaff("inventory:update")).resolves.toEqual(manager);

    getCurrentSession.mockResolvedValueOnce(manager);
    await expect(requireApiStaff("settings:update")).rejects.toMatchObject({
      code: "MISSING_CAPABILITY",
      status: 403,
    });
  });
});
