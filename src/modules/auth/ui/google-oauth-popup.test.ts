// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithOAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth: mocks.signInWithOAuth } }),
}));

import { openGoogleOAuthPopup } from "@/modules/auth/ui/google-oauth-popup";

describe("Google OAuth popup", () => {
  const replace = vi.fn();
  const close = vi.fn();
  const popup = {
    closed: false,
    close,
    document: { title: "", body: { innerHTML: "" } },
    location: { replace },
  } as unknown as Window;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithOAuth.mockResolvedValue({
      data: { url: "https://accounts.google.test/authorize" },
      error: null,
    });
    vi.spyOn(window, "open").mockReturnValue(popup);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("opens synchronously, stores PKCE through the browser client and resolves from the popup message", async () => {
    const resultPromise = openGoogleOAuthPopup({
      next: "/account",
      returnTo: "/?auth=signin&next=%2Faccount",
    });

    expect(window.open).toHaveBeenCalledWith(
      "about:blank",
      "laitstyles-google-auth",
      expect.any(String),
    );
    await vi.waitFor(() =>
      expect(replace).toHaveBeenCalledWith("https://accounts.google.test/authorize"),
    );
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: "google",
      options: {
        redirectTo: expect.stringMatching(
          /\/auth\/callback\?next=%2Faccount&returnTo=%2F%3Fauth%3Dsignin%26next%3D%252Faccount&popup=1$/,
        ),
        skipBrowserRedirect: true,
      },
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        origin: window.location.origin,
        data: { type: "laitstyles:oauth-complete", target: "/account" },
      }),
    );

    await expect(resultPromise).resolves.toEqual({ ok: true, target: "/account" });
  });

  it("reports a blocked popup before starting Supabase OAuth", async () => {
    vi.mocked(window.open).mockReturnValueOnce(null);

    await expect(
      openGoogleOAuthPopup({ next: "/account", returnTo: "/?auth=signin" }),
    ).resolves.toEqual({
      ok: false,
      message:
        "Your browser blocked the Google sign-in window. Allow popups for Laitstyles and try again.",
    });
    expect(mocks.signInWithOAuth).not.toHaveBeenCalled();
  });
});
