import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireAccountSecurityIdentity: vi.fn(),
  requestAccountEmailChange: vi.fn(),
}));

vi.mock("@/modules/auth/server/account-security-http", () => ({
  requireAccountSecurityIdentity: mocks.requireAccountSecurityIdentity,
  throwAccountSecurityError: (error: unknown) => {
    throw error;
  },
}));
vi.mock("@/modules/auth/server/account-security", () => ({
  requestAccountEmailChange: mocks.requestAccountEmailChange,
}));

import { POST } from "./route";

const identity = {
  authUserId: "user-1",
  email: "old@example.com",
  sessionId: "session-1",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccountSecurityIdentity.mockResolvedValue(identity);
});

describe("POST /api/v1/account/security/email-change", () => {
  it("rejects unauthenticated access with the stable envelope and request id", async () => {
    mocks.requireAccountSecurityIdentity.mockRejectedValueOnce(
      new ApiError({
        code: "AUTHENTICATION_REQUIRED",
        message: "Sign in to continue.",
        status: 401,
      }),
    );

    const response = await POST(jsonRequest({ email: "new@example.com" }, "email-request"));

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBe("email-request");
    await expect(response.json()).resolves.toEqual({
      error: { code: "AUTHENTICATION_REQUIRED", message: "Sign in to continue." },
    });
    expect(mocks.requestAccountEmailChange).not.toHaveBeenCalled();
  });

  it("validates input before requesting the provider change", async () => {
    const response = await POST(jsonRequest({ email: "not-an-email" }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR", fieldErrors: { email: "Enter a valid email address." } },
    });
    expect(mocks.requestAccountEmailChange).not.toHaveBeenCalled();
  });

  it("returns a private pending confirmation result", async () => {
    mocks.requestAccountEmailChange.mockResolvedValueOnce({
      status: "confirmation-sent",
      email: "new@example.com",
    });

    const response = await POST(jsonRequest({ email: "new@example.com" }));

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requestAccountEmailChange).toHaveBeenCalledWith(identity, {
      email: "new@example.com",
    });
  });
});

function jsonRequest(body: unknown, requestId = "request-1") {
  return new Request("http://localhost/api/v1/account/security/email-change", {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": requestId },
    body: JSON.stringify(body),
  });
}
