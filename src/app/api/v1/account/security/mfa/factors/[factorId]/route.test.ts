import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireAccountSecurityIdentity: vi.fn(),
  unenrollFactor: vi.fn(),
}));

vi.mock("@/modules/auth/server/account-security-http", () => ({
  requireAccountSecurityIdentity: mocks.requireAccountSecurityIdentity,
  throwAccountSecurityError: (error: unknown) => {
    if (error instanceof Error && "code" in error) {
      throw new ApiError({ code: String(error.code), message: error.message, status: 401 });
    }
    throw error;
  },
}));
vi.mock("@/modules/auth/server/mfa", () => ({ unenrollFactor: mocks.unenrollFactor }));

import { DELETE } from "./route";

const identity = { authUserId: "user-1", email: "ada@example.com", sessionId: "session-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccountSecurityIdentity.mockResolvedValue(identity);
});

describe("DELETE /api/v1/account/security/mfa/factors/:factorId", () => {
  it("requires a fresh AAL challenge when the domain rejects last-factor removal", async () => {
    mocks.unenrollFactor.mockRejectedValueOnce(
      Object.assign(new Error("Verify a second factor before continuing."), {
        code: "MFA_CHALLENGE_REQUIRED",
      }),
    );

    const response = await DELETE(request(), context());

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MFA_CHALLENGE_REQUIRED" },
    });
  });

  it("removes only the route-owned factor", async () => {
    mocks.unenrollFactor.mockResolvedValueOnce({ status: "removed", factorId: "factor-1" });

    const response = await DELETE(request(), context());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.unenrollFactor).toHaveBeenCalledWith(identity, "factor-1");
  });
});

function context() {
  return { params: Promise.resolve({ factorId: "factor-1" }) };
}

function request() {
  return new Request("http://localhost/api/v1/account/security/mfa/factors/factor-1", {
    method: "DELETE",
  });
}
