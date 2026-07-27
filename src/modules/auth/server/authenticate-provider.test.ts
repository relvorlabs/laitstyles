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
  return {
    ...actual,
    getAuthRedirectUrl: vi.fn(async (path: string) =>
      new URL(path, "https://laitstyle.example").toString(),
    ),
  };
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

  it("starts Google OAuth with the deterministic callback and return surface", async () => {
    await expect(
      startGoogleOAuth("/account/orders", "/products?auth=signin&next=%2Faccount%2Forders"),
    ).resolves.toBe("https://accounts.google.test/authorize");

    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo:
          "https://laitstyle.example/auth/callback?next=%2Faccount%2Forders&returnTo=%2Fproducts%3Fauth%3Dsignin%26next%3D%252Faccount%252Forders",
      },
    });
  });

  it("exchanges the callback code and provisions the consumer account", async () => {
    await expect(
      completeOAuthCallback({
        code: "provider-code",
        providerErrorCode: null,
        next: "/account",
        returnTo: "/?auth=signin&next=%2Faccount",
      }),
    ).resolves.toBe("/account");

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("provider-code");
    expect(mocks.ensureConsumerAccount).toHaveBeenCalledWith({
      id: "auth-user-a",
      email: "shopper@example.com",
      userMetadata: { full_name: "Ada Lovelace" },
    });
  });

  it("maps provider cancellation back to the originating storefront dialog", async () => {
    const target = await completeOAuthCallback({
      code: null,
      providerErrorCode: "access_denied",
      next: "/account",
      returnTo: "/products?auth=signin&next=%2Faccount",
    });

    expect(target).toBe(
      "/products?auth=signin&next=%2Faccount&error=oauth-callback-invalid",
    );
    expect(mocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(mocks.logAuthProviderFailure).toHaveBeenCalledWith("oauth-callback", {
      name: "OAuthCallbackProviderError",
      code: "access_denied",
    });
  });

  it("maps OAuth start failures back to staff sign-in instead of the generic error page", async () => {
    mocks.signInWithOAuth.mockResolvedValueOnce({
      data: { url: null },
      error: { code: "provider_error", name: "AuthApiError" },
    });

    await expect(
      startGoogleOAuth("/admin", "/auth/sign-in?next=%2Fadmin"),
    ).resolves.toBe("/auth/sign-in?next=%2Fadmin&error=oauth-start-failed");
  });
});
