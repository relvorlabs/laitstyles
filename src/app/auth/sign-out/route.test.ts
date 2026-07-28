import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  endSession: vi.fn(),
}));

vi.mock("@/modules/auth/server/authenticate", () => ({
  endSession: mocks.endSession,
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import { headers } from "next/headers";
import { POST } from "@/app/auth/sign-out/route";

function mockProxiedHeaders() {
  vi.mocked(headers).mockResolvedValue({
    get: (key: string) =>
      ({ "x-forwarded-host": "laitstyle.localhost", "x-forwarded-proto": "https" })[key] ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>);
}

function request(formValues: Record<string, string> = {}) {
  const body = new URLSearchParams(formValues);
  return new NextRequest("http://localhost:4490/auth/sign-out", {
    method: "POST",
    body,
  });
}

describe("POST /auth/sign-out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.mocked(headers).mockReset();
  });

  it("redirects to the proxied public origin, not the internal dev-server request URL", async () => {
    mockProxiedHeaders();
    mocks.endSession.mockResolvedValue({ ok: true, value: undefined });

    const response = await POST(request({ next: "/account" }));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://laitstyle.localhost/account");
  });

  it("carries a safe error surface through the proxied origin on sign-out failure", async () => {
    mockProxiedHeaders();
    mocks.endSession.mockResolvedValue({ ok: false, error: { code: "sign-out-failed" } });

    const response = await POST(request({}));

    expect(response.headers.get("location")).toBe(
      "https://laitstyle.localhost/auth/error?code=sign-out-failed&next=%2Fauth%2Fsign-in",
    );
  });
});
