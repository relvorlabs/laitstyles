import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ warn: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { warn: mocks.warn } }));

import {
  getAuthFlowErrorMessage,
  isAuthFlowErrorCode,
  logAuthProviderFailure,
  mapAuthProviderError,
} from "@/modules/auth/server/diagnostics";

describe("auth provider error mapping", () => {
  it("maps known provider codes to fixed customer copy", () => {
    expect(mapAuthProviderError({ code: "invalid_credentials" })).toEqual({
      code: "invalid-credentials",
      message: "The email or password is incorrect.",
    });
    expect(mapAuthProviderError({ code: "user_already_exists" })).toEqual({
      code: "account-exists",
      message: "An account already exists for this email. Sign in instead.",
    });
    expect(mapAuthProviderError({ code: "email_not_confirmed" })).toEqual({
      code: "email-not-confirmed",
      message: "Confirm your email before signing in. You can request a new confirmation link.",
    });
    expect(mapAuthProviderError({ code: "weak_password" })).toEqual({
      code: "weak-password",
      message: "Choose a stronger password that meets the security requirements.",
    });
  });

  it("never exposes an unknown provider message", () => {
    const providerError = {
      code: "database_connection_failed",
      message: "postgres://secret@internal-host",
    };

    const result = mapAuthProviderError(providerError);

    expect(result).toEqual({
      code: "provider-unavailable",
      message: "We could not complete that request. Please try again.",
    });
    expect(result.message).not.toContain(providerError.message);
  });

  it("uses the operation-specific fallback for unknown provider codes", () => {
    expect(mapAuthProviderError({ code: "unknown" }, "recovery-failed")).toEqual({
      code: "recovery-failed",
      message: "We could not send a password-reset email. Please try again.",
    });
  });

  it("accepts only allow-listed redirect codes", () => {
    expect(isAuthFlowErrorCode("rate-limited")).toBe(true);
    expect(isAuthFlowErrorCode("recovery-invalid")).toBe(true);
    expect(isAuthFlowErrorCode("postgres://secret")).toBe(false);
    expect(getAuthFlowErrorMessage("oauth-callback-invalid")).toContain("sign-in link");
  });
});

describe("auth provider diagnostics", () => {
  beforeEach(() => vi.clearAllMocks());

  it("logs structured provider metadata without raw messages", () => {
    const providerError = {
      code: "invalid_credentials",
      status: 400,
      name: "AuthApiError",
      message: "postgres://secret@internal-host",
    };

    logAuthProviderFailure("password-sign-in", providerError);

    expect(mocks.warn).toHaveBeenCalledWith(
      {
        operation: "password-sign-in",
        providerCode: "invalid_credentials",
        providerStatus: 400,
        providerErrorName: "AuthApiError",
      },
      "Auth provider request failed",
    );
    expect(JSON.stringify(mocks.warn.mock.calls)).not.toContain("postgres://secret");
  });
});
