import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireAccountSecurityIdentity: vi.fn(),
  createMfaChallenge: vi.fn(),
}));

vi.mock("@/modules/auth/server/account-security-http", () => ({
  requireAccountSecurityIdentity: mocks.requireAccountSecurityIdentity,
  throwAccountSecurityError: (error: unknown) => {
    if (error instanceof Error && "code" in error) {
      throw new ApiError({ code: String(error.code), message: error.message, status: 404 });
    }
    throw error;
  },
}));
vi.mock("@/modules/auth/server/mfa", () => ({
  createMfaChallenge: mocks.createMfaChallenge,
}));

import { POST } from "./route";

const identity = { authUserId: "user-1", email: "ada@example.com", sessionId: "session-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccountSecurityIdentity.mockResolvedValue(identity);
});

describe("POST /api/v1/account/security/mfa/challenges", () => {
  it("creates a challenge for the caller's factor", async () => {
    mocks.createMfaChallenge.mockResolvedValueOnce({
      challengeId: "challenge-1",
      expiresAt: "2026-07-29T12:00:00.000Z",
    });

    const response = await POST(jsonRequest({ factorId: "factor-1" }));

    expect(response.status).toBe(201);
    expect(mocks.createMfaChallenge).toHaveBeenCalledWith(identity, { factorId: "factor-1" });
  });

  it("keeps factor ownership failures explicit", async () => {
    mocks.createMfaChallenge.mockRejectedValueOnce(
      Object.assign(new Error("This authenticator could not be found on your account."), {
        code: "MFA_FACTOR_NOT_FOUND",
      }),
    );

    const response = await POST(jsonRequest({ factorId: "factor-other" }));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "MFA_FACTOR_NOT_FOUND" },
    });
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/account/security/mfa/challenges", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
