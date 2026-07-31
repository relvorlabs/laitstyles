import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

import { headers } from "next/headers";
import {
  getConfiguredAuthOrigin,
  getRequestOrigin,
  getSafeNextPath,
  withAuthErrorPath,
  withAuthErrorState,
} from "@/modules/auth/server/redirects";

const AUTH_ORIGIN_ENV_KEYS = [
  "AUTH_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
] as const;

function mockRequestHeaders(entries: Record<string, string>) {
  const map = new Map(Object.entries(entries));
  vi.mocked(headers).mockResolvedValue({
    get: (key: string) => map.get(key) ?? null,
  } as unknown as Awaited<ReturnType<typeof headers>>);
}

describe("auth redirect safety", () => {
  it("allows internal relative paths", () => {
    expect(getSafeNextPath("/admin/orders?view=open#queue", "/account")).toBe(
      "/admin/orders?view=open#queue",
    );
  });

  it("rejects external and protocol-relative redirects", () => {
    expect(getSafeNextPath("https://example.com/admin", "/account")).toBe("/account");
    expect(getSafeNextPath("//example.com/admin", "/account")).toBe("/account");
  });

  it("falls back for missing values", () => {
    expect(getSafeNextPath(null, "/account")).toBe("/account");
  });

  it("prefers the configured public auth origin and strips paths", () => {
    const previous = process.env.AUTH_SITE_URL;
    process.env.AUTH_SITE_URL = "https://shop.example.com/deploy-preview";

    try {
      expect(getConfiguredAuthOrigin()).toBe("https://shop.example.com");
    } finally {
      if (previous === undefined) delete process.env.AUTH_SITE_URL;
      else process.env.AUTH_SITE_URL = previous;
    }
  });

  it("carries only an allow-listed error code and safe return path", () => {
    const path = withAuthErrorPath("invalid-credentials", "https://example.com/admin");
    expect(path).toBe("/auth/error?code=invalid-credentials&next=%2F");
    expect(path).not.toContain("message=");
  });

  it("adds a safe error state to the originating auth surface", () => {
    expect(
      withAuthErrorState("/products?auth=signin&next=%2Faccount", "oauth-callback-invalid"),
    ).toBe("/products?auth=signin&next=%2Faccount&error=oauth-callback-invalid");
  });

  it("rejects an external origin surface before adding error state", () => {
    expect(
      withAuthErrorState(
        "https://attacker.example/sign-in",
        "oauth-start-failed",
        "/auth/sign-in?next=%2Fadmin",
      ),
    ).toBe("/auth/sign-in?next=%2Fadmin&error=oauth-start-failed");
  });
});

describe("getRequestOrigin", () => {
  const previous: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of AUTH_ORIGIN_ENV_KEYS) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of AUTH_ORIGIN_ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    vi.mocked(headers).mockReset();
  });

  it("prefers the live request host over a stale configured origin", async () => {
    process.env.AUTH_SITE_URL = "https://stale-preview.laitstyles.com";
    mockRequestHeaders({
      "x-forwarded-host": "laitstyle.localhost",
      "x-forwarded-proto": "https",
    });

    await expect(getRequestOrigin()).resolves.toBe("https://laitstyle.localhost");
  });

  it("falls back to the configured origin when no request headers are present", async () => {
    process.env.AUTH_SITE_URL = "https://shop.example.com";
    mockRequestHeaders({});

    await expect(getRequestOrigin()).resolves.toBe("https://shop.example.com");
  });

  it("falls back to the local auth origin when neither headers nor env are present", async () => {
    mockRequestHeaders({});

    await expect(getRequestOrigin()).resolves.toBe("https://laitstyle.localhost");
  });
});
