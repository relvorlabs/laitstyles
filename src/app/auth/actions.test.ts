import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  logAuthProviderFailure: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: mocks })),
}));
vi.mock("@/lib/auth/server/request-origin", () => ({
  getRequestOrigin: vi.fn(async () => "https://laitstyle.example"),
}));
vi.mock("@/lib/auth/server/auth-provider-diagnostics", () => ({
  logAuthProviderFailure: mocks.logAuthProviderFailure,
}));

import {
  signOutStorefrontSession,
  submitPasswordSignIn,
  submitPasswordSignUp,
} from "@/app/auth/actions";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("password auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it("rejects malformed sign-in data before calling Supabase", async () => {
    const result = await submitPasswordSignIn(
      formData({ email: "not-an-email", password: "" }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid-input",
        message: "Check the highlighted fields and try again.",
        fieldErrors: {
          email: "Enter a valid email address.",
          password: "Enter your password.",
        },
      },
    });
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.logAuthProviderFailure).not.toHaveBeenCalled();
  });

  it("maps provider codes, records diagnostics, and hides raw provider text", async () => {
    const providerError = {
      code: "invalid_credentials",
      status: 400,
      name: "AuthApiError",
      message: "provider detail",
    };
    mocks.signInWithPassword.mockResolvedValueOnce({ error: providerError });

    const result = await submitPasswordSignIn(
      formData({ email: "shopper@example.com", password: "password123" }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid-credentials",
        message: "The email or password is incorrect.",
      },
    });
    expect(mocks.logAuthProviderFailure).toHaveBeenCalledWith(
      "password-sign-in",
      providerError,
    );
    expect(JSON.stringify(result)).not.toContain("provider detail");
  });

  it("requires terms acceptance before calling the sign-up provider", async () => {
    const result = await submitPasswordSignUp(
      formData({
        email: "shopper@example.com",
        password: "password123",
        first: "Ada",
        last: "Lovelace",
        terms: "false",
      }),
    );

    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid-input",
        message: "Check the highlighted fields and try again.",
        fieldErrors: { terms: "Please accept the Terms to continue." },
      },
    });
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("validates and normalizes sign-up input before the provider call", async () => {
    const result = await submitPasswordSignUp(
      formData({
        email: "  shopper@example.com ",
        password: "password123",
        first: " Ada ",
        last: " Lovelace ",
        terms: "true",
        next: "https://attacker.example",
      }),
    );

    expect(mocks.signUp).toHaveBeenCalledWith({
      email: "shopper@example.com",
      password: "password123",
      options: {
        data: {
          first_name: "Ada",
          last_name: "Lovelace",
          full_name: "Ada Lovelace",
        },
        emailRedirectTo: "https://laitstyle.example/auth/callback?next=%2Faccount",
      },
    });
    expect(result).toEqual({
      ok: true,
      value: { status: "check-email", email: "shopper@example.com" },
    });
  });

  it("returns fixed sign-out copy and records diagnostics", async () => {
    const providerError = {
      code: "provider_error",
      status: 503,
      name: "AuthRetryableFetchError",
      message: "internal auth service detail",
    };
    mocks.signOut.mockResolvedValueOnce({ error: providerError });

    await expect(signOutStorefrontSession()).resolves.toEqual({
      ok: false,
      error: {
        code: "sign-out-failed",
        message: "We could not sign you out. Please try again.",
      },
    });
    expect(mocks.logAuthProviderFailure).toHaveBeenCalledWith("sign-out", providerError);
  });
});
