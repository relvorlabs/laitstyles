import { describe, expect, it } from "vitest";
import { getSafeNextPath } from "@/lib/auth/server/redirects";

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
});
