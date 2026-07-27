import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  redirect: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
  logAuthProviderFailure: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: mocks })),
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
  requestPasswordReset,
  requestPasswordResetWithRedirect,
  resendSignupConfirmation,
  signInWithPassword,
  signOutStorefrontSession,
  signUpWithPassword,
  submitPasswordSignIn,
  submitPasswordSignUp,
  submitRecoveredPassword,
} from "@/app/auth/actions";

function formData(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const idleState = { status: "idle" } as const;

describe("password auth actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`);
    });
    mocks.signInWithPassword.mockResolvedValue({ error: null });
    mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
    mocks.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    mocks.resend.mockResolvedValue({ data: {}, error: null });
    mocks.updateUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-a" } }, error: null });
  });

  it("rejects malformed sign-in data before calling Supabase", async () => {
    const result = await submitPasswordSignIn(formData({ email: "not-an-email", password: "" }));

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
    expect(mocks.logAuthProviderFailure).toHaveBeenCalledWith("password-sign-in", providerError);
    expect(JSON.stringify(result)).not.toContain("provider detail");
  });

  it("maps an unconfirmed login to an actionable safe state", async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { code: "email_not_confirmed", message: "provider detail" },
    });

    await expect(
      submitPasswordSignIn(formData({ email: "shopper@example.com", password: "password123" })),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "email-not-confirmed",
        message: "Confirm your email before signing in. You can request a new confirmation link.",
      },
    });
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
        emailRedirectTo:
          "https://laitstyle.example/auth/callback?next=%2Faccount&returnTo=%2Fauth%2Fsign-up",
      },
    });
    expect(result).toEqual({
      ok: true,
      value: { status: "check-email", email: "shopper@example.com" },
    });
  });

  it("keeps the duplicate-signup response enumeration-safe", async () => {
    mocks.signUp.mockResolvedValueOnce({
      data: { session: null, user: { id: "obfuscated-user" } },
      error: null,
    });

    await expect(
      submitPasswordSignUp(
        formData({
          email: "shopper@example.com",
          password: "password123",
          first: "Ada",
          last: "Lovelace",
          terms: "true",
        }),
      ),
    ).resolves.toEqual({
      ok: true,
      value: { status: "check-email", email: "shopper@example.com" },
    });
  });

  it("requests a password reset with a callback to the reset page", async () => {
    await expect(
      requestPasswordReset(formData({ email: " shopper@example.com " })),
    ).resolves.toEqual({
      ok: true,
      value: { status: "accepted", email: "shopper@example.com" },
    });
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("shopper@example.com", {
      redirectTo:
        "https://laitstyle.example/auth/callback?next=%2Fauth%2Freset-password&returnTo=%2Fauth%2Fforgot-password",
    });
  });

  it("requests another signup confirmation without exposing account existence", async () => {
    await expect(
      resendSignupConfirmation(formData({ email: "shopper@example.com" })),
    ).resolves.toEqual({
      ok: true,
      value: { status: "accepted", email: "shopper@example.com" },
    });
    expect(mocks.resend).toHaveBeenCalledWith({
      type: "signup",
      email: "shopper@example.com",
      options: {
        emailRedirectTo:
          "https://laitstyle.example/auth/callback?next=%2Faccount&returnTo=%2Fauth%2Fresend-confirmation",
      },
    });
  });

  it("rejects mismatched recovered passwords before calling Supabase", async () => {
    const result = await submitRecoveredPassword(
      formData({ password: "password123", confirmPassword: "different123" }),
    );
    expect(result).toEqual({
      ok: false,
      error: {
        code: "invalid-input",
        message: "Check the highlighted fields and try again.",
        fieldErrors: { confirmPassword: "Passwords do not match." },
      },
    });
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("rejects an expired recovery session", async () => {
    mocks.getUser.mockResolvedValueOnce({
      data: { user: null },
      error: { code: "session_not_found", message: "expired" },
    });

    await expect(
      submitRecoveredPassword(
        formData({ password: "password123", confirmPassword: "password123" }),
      ),
    ).resolves.toEqual({
      ok: false,
      error: {
        code: "recovery-invalid",
        message: "This password-reset link is invalid or has expired. Request a new one.",
      },
    });
  });

  it("updates the recovered password and revokes other sessions", async () => {
    await expect(
      submitRecoveredPassword(
        formData({ password: "password123", confirmPassword: "password123" }),
      ),
    ).resolves.toEqual({
      ok: true,
      value: { status: "password-updated" },
    });
    expect(mocks.updateUser).toHaveBeenCalledWith({ password: "password123" });
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: "global" });
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

  it("returns page validation errors without redirecting or losing safe values", async () => {
    await expect(
      signInWithPassword(idleState, formData({ email: " bad-email ", password: "" })),
    ).resolves.toEqual({
      status: "error",
      code: "invalid-input",
      message: "Check the highlighted fields and try again.",
      fieldErrors: {
        email: "Enter a valid email address.",
        password: "Enter your password.",
      },
      values: {
        email: "bad-email",
        first: undefined,
        last: undefined,
        termsAccepted: false,
      },
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("returns email workflow success in place instead of navigating", async () => {
    await expect(
      requestPasswordResetWithRedirect(
        idleState,
        formData({ email: "shopper@example.com" }),
      ),
    ).resolves.toEqual({
      status: "success",
      email: "shopper@example.com",
      message:
        "If this address can receive a reset email, a secure link is on its way. Check your inbox and spam folder.",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("redirects only after a completed password sign-in", async () => {
    await expect(
      signInWithPassword(
        idleState,
        formData({ email: "shopper@example.com", password: "password123", next: "/admin" }),
      ),
    ).rejects.toThrow("REDIRECT:/admin");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it("keeps confirmation-required signup success on the same page", async () => {
    await expect(
      signUpWithPassword(
        idleState,
        formData({
          email: "shopper@example.com",
          password: "password123",
          first: "Ada",
          last: "Lovelace",
          terms: "true",
          next: "/account",
          returnTo: "/auth/sign-up",
        }),
      ),
    ).resolves.toEqual({
      status: "success",
      email: "shopper@example.com",
      message:
        "If this address can receive a confirmation email, a secure link is on its way. Check your inbox and spam folder.",
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });
});
