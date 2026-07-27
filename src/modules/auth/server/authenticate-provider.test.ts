import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  ensureConsumerAccount: vi.fn(),
  logAuthProviderFailure: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: {
      signInWithOAuth: mocks.signInWithOAuth,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      getUser: mocks.getUser,
    },
  })),
}));

vi.mock("@/modules/auth/server/account-provisioning", () => ({
  ensureConsumerAccount: mocks.ensureConsumerAccount,
}));

vi.mock("@/modules/auth/server/redirects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/server/redirects")>();
  return { ...actual, getRequestOrigin: vi.fn(async () => "https://laitstyle.example") };
});

vi.mock("@/modules/auth/server/diagnostics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/auth/server/diagnostics")>();
  return { ...actual, logAuthProviderFailure: mocks.logAuthProviderFailure };
});

import {
  completeOAuthCallback,
  startGoogleOAuth,
} from "@/modules/auth/server/authenticate";

describe("auth provider orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.test/authorize" },
      error: null,
    });
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "auth-user-a",
          email: "shopper@example.com",
          user_metadata: { full_name: "Ada Lovelace" },
        },
      },
      error: null,
    });
    mocks.ensureConsumerAccount.mockResolvedValue({
      profile: { id: "auth-user-a" },
      customerId: "customer-a",
    });
  });

  it("starts Google OAuth with the deterministic callback URL", async () => {
    await expect(startGoogleOAuth("/account/orders")).resolves.toBe(
      "https://accounts.google.test/authorize",
    );

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://laitstyle.example/auth/callback?next=%2Faccount%2Forders",
      },
    });
  });

  it("exchanges the callback code and provisions the consumer account", async () => {
    await expect(
      completeOAuthCallback({
        code: "provider-code",
        providerErrorCode: null,
        next: "/account",
      }),
    ).resolves.toBe("/account");

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("provider-code");
    expect(mocks.ensureConsumerAccount).toHaveBeenCalledWith({
      id: "auth-user-a",
      email: "shopper@example.com",
      userMetadata: { full_name: "Ada Lovelace" },
    });
  });

  it("maps provider cancellation to the safe auth error route", async () => {
    const target = await completeOAuthCallback({
      code: null,
      providerErrorCode: "access_denied",
      next: "/account",
    });

    expect(target).toBe("/auth/error?code=oauth-callback-invalid&next=%2Faccount");
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.logAuthProviderFailure).toHaveBeenCalledWith("oauth-callback", {
      name: "OAuthCallbackProviderError",
      code: "access_denied",
    });
  });
});
