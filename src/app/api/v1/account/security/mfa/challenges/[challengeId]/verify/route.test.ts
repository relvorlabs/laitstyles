import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAccountSecurityIdentity: vi.fn(),
  verifyMfaChallenge: vi.fn(),
}));

vi.mock("@/modules/auth/server/account-security-http", () => ({
  requireAccountSecurityIdentity: mocks.requireAccountSecurityIdentity,
  throwAccountSecurityError: (error: unknown) => {
    throw error;
  },
}));
vi.mock("@/modules/auth/server/mfa", () => ({ verifyMfaChallenge: mocks.verifyMfaChallenge }));

import { POST } from "./route";

const identity = { authUserId: "user-1", email: "ada@example.com", sessionId: "session-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccountSecurityIdentity.mockResolvedValue(identity);
});

describe("POST /api/v1/account/security/mfa/challenges/:challengeId/verify", () => {
  it("validates the six-digit code before verification", async () => {
    const response = await POST(jsonRequest({ factorId: "factor-1", code: "123" }), context());

    expect(response.status).toBe(422);
    expect(mocks.verifyMfaChallenge).not.toHaveBeenCalled();
  });

  it("verifies the named challenge for the authenticated identity", async () => {
    mocks.verifyMfaChallenge.mockResolvedValueOnce({ status: "verified", factorId: "factor-1" });
    const input = { factorId: "factor-1", code: "123456" };

    const response = await POST(jsonRequest(input), context());

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.verifyMfaChallenge).toHaveBeenCalledWith(identity, "challenge-1", input);
  });
});

function context(challengeId = "challenge-1") {
  return { params: Promise.resolve({ challengeId }) };
}

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/account/security/mfa/challenges/challenge-1/verify", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
