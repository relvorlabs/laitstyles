import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccountSecurityIdentity: vi.fn(),
  signOutOtherSessions: vi.fn(),
}));

vi.mock("@/modules/auth/server/account-security-http", () => ({
  requireAccountSecurityIdentity: mocks.requireAccountSecurityIdentity,
  throwAccountSecurityError: (error: unknown) => {
    throw error;
  },
}));
vi.mock("@/modules/auth/server/account-sessions", () => ({
  signOutOtherSessions: mocks.signOutOtherSessions,
}));

import { DELETE } from "./route";

const identity = { authUserId: "user-1", email: "ada@example.com", sessionId: "session-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccountSecurityIdentity.mockResolvedValue(identity);
});

describe("DELETE /api/v1/account/security/sessions/others", () => {
  it("delegates the supported sign-out-others operation and keeps this session", async () => {
    mocks.signOutOtherSessions.mockResolvedValueOnce({ status: "signed-out" });

    const response = await DELETE(
      new Request("http://localhost/api/v1/account/security/sessions/others", {
        method: "DELETE",
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.signOutOtherSessions).toHaveBeenCalledWith(identity);
    await expect(response.json()).resolves.toEqual({ data: { status: "signed-out" } });
  });
});
