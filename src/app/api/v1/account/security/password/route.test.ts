import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireAccountSecurityIdentity: vi.fn(),
  changeAccountPassword: vi.fn(),
}));

vi.mock("@/modules/auth/server/account-security-http", () => ({
  requireAccountSecurityIdentity: mocks.requireAccountSecurityIdentity,
  throwAccountSecurityError: (error: unknown) => {
    if (error instanceof Error && "code" in error) {
      throw new ApiError({
        code: String(error.code),
        message: error.message,
        status: error.code === "MFA_CHALLENGE_REQUIRED" ? 401 : 422,
      });
    }
    throw error;
  },
}));
vi.mock("@/modules/auth/server/account-security", () => ({
  changeAccountPassword: mocks.changeAccountPassword,
}));

import { PATCH } from "./route";

const identity = { authUserId: "user-1", email: "ada@example.com", sessionId: "session-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAccountSecurityIdentity.mockResolvedValue(identity);
});

describe("PATCH /api/v1/account/security/password", () => {
  it("returns field errors for malformed password input", async () => {
    const response = await PATCH(jsonRequest({ currentPassword: "", password: "short" }));

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "VALIDATION_ERROR",
        fieldErrors: {
          currentPassword: "Enter your current password.",
          password: "Password must be at least 8 characters.",
        },
      },
    });
    expect(mocks.changeAccountPassword).not.toHaveBeenCalled();
  });

  it("maps fresh-proof failures without leaking provider details", async () => {
    mocks.changeAccountPassword.mockRejectedValueOnce(
      Object.assign(new Error("Your current password is incorrect."), {
        code: "INVALID_CURRENT_PASSWORD",
      }),
    );

    const response = await PATCH(
      jsonRequest({
        currentPassword: "WrongPassword1!",
        password: "NewPassword1!",
        confirmPassword: "NewPassword1!",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_CURRENT_PASSWORD",
        message: "Your current password is incorrect.",
      },
    });
  });

  it("changes the password through the authenticated identity", async () => {
    const input = {
      currentPassword: "OldPassword1!",
      password: "NewPassword1!",
      confirmPassword: "NewPassword1!",
    };
    mocks.changeAccountPassword.mockResolvedValueOnce({ status: "updated" });

    const response = await PATCH(jsonRequest(input));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.changeAccountPassword).toHaveBeenCalledWith(identity, input);
  });
});

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/v1/account/security/password", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
