import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import { headers } from "next/headers";
import { GET } from "@/app/auth/google/route";

function mockProxiedHeaders() {
  vi.mocked(headers).mockResolvedValue({
    get: (key: string) =>
      ({ "x-forwarded-host": "laitstyle.localhost", "x-forwarded-proto": "https" })[key] ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>);
}

describe("GET /auth/google (retired initiator)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.mocked(headers).mockReset();
  });

  it("redirects a stale caller through the proxied public origin, not the internal dev-server request URL", async () => {
    mockProxiedHeaders();

    const request = new NextRequest("http://localhost:4490/auth/google?next=%2Faccount");
    const response = await GET(request);

    expect(response.status).toBe(303);
    expect(response.headers.get("location")?.startsWith("https://laitstyle.localhost/")).toBe(true);
  });
});
