import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeOAuthCallback: vi.fn(),
}));

vi.mock("@/modules/auth/server/authenticate", () => ({
  completeOAuthCallback: mocks.completeOAuthCallback,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import { headers } from "next/headers";
import { GET } from "@/app/auth/callback/route";

function mockProxiedHeaders() {
  vi.mocked(headers).mockResolvedValue({
    get: (key: string) =>
      ({ "x-forwarded-host": "laitstyle.localhost", "x-forwarded-proto": "https" })[key] ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>);
}

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.completeOAuthCallback.mockResolvedValue("/account");
  });

  afterEach(() => {
    vi.mocked(headers).mockReset();
  });

  it("redirects to the proxied public origin, not the internal dev-server request URL", async () => {
    mockProxiedHeaders();

    const request = new NextRequest("http://localhost:4490/auth/callback?code=abc");
    const response = await GET(request);

    expect(response.headers.get("location")).toBe("https://laitstyle.localhost/account");
  });

  it("sends the popup completion redirect through the proxied origin", async () => {
    mockProxiedHeaders();
    mocks.completeOAuthCallback.mockResolvedValue("/account");

    const request = new NextRequest("http://localhost:4490/auth/callback?code=abc&popup=1");
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://laitstyle.localhost/auth/oauth-complete?target=%2Faccount",
    );
  });
});
