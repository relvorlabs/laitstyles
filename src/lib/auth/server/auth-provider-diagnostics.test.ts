import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ warn: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({ logger: { warn: mocks.warn } }));

import { logAuthProviderFailure } from "@/lib/auth/server/auth-provider-diagnostics";

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
