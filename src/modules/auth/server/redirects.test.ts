import { describe, expect, it } from "vitest";
import {
  getConfiguredAuthOrigin,
  getSafeNextPath,
  withAuthErrorPath,
} from "@/modules/auth/server/redirects";

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
});
