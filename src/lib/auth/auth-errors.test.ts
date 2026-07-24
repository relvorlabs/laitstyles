import { describe, expect, it } from "vitest";
import {
  getAuthFlowErrorMessage,
  isAuthFlowErrorCode,
  mapAuthProviderError,
} from "@/lib/auth/auth-errors";

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

  it("accepts only allow-listed redirect codes", () => {
    expect(isAuthFlowErrorCode("rate-limited")).toBe(true);
    expect(isAuthFlowErrorCode("postgres://secret")).toBe(false);
    expect(getAuthFlowErrorMessage("oauth-callback-invalid")).toContain("sign-in link");
  });
});
