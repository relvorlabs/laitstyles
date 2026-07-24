import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: mocks })),
}));
vi.mock("@/lib/auth/server/request-origin", () => ({
  getRequestOrigin: vi.fn(async () => "https://laitstyle.example"),
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
  });

  it("maps provider codes without returning raw provider text", async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      error: { code: "invalid_credentials", message: "provider detail" },
    });

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
    expect(JSON.stringify(result)).not.toContain("provider detail");
  });

  it("validates and normalizes sign-up input before the provider call", async () => {
    const result = await submitPasswordSignUp(
      formData({
        email: "  shopper@example.com ",
        password: "password123",
        first: " Ada ",
        last: " Lovelace ",
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

  it("returns fixed sign-out copy", async () => {
    mocks.signOut.mockResolvedValueOnce({
      error: { code: "provider_error", message: "internal auth service detail" },
    });

    await expect(signOutStorefrontSession()).resolves.toEqual({
      ok: false,
      error: {
        code: "sign-out-failed",
        message: "We could not sign you out. Please try again.",
      },
    });
  });
});
