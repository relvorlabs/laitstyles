import { describe, expect, it } from "vitest";
import { getSafeNextPath, withAuthErrorPath } from "@/modules/auth/server/redirects";

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

  it("carries only an allow-listed error code and safe return path", () => {
    const path = withAuthErrorPath("invalid-credentials", "https://example.com/admin");
    expect(path).toBe("/auth/error?code=invalid-credentials&next=%2F");
    expect(path).not.toContain("message=");
  });
});
