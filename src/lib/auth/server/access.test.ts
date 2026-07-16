import { describe, expect, it } from "vitest";
import { resolveAdminAccess } from "@/lib/auth/server/access";

describe("Admin access resolver", () => {
  it("allows the admin to use owner-only capabilities", () => {
    expect(resolveAdminAccess({ profileId: "profile_1", role: "admin" }, "settings:update")).toEqual({ ok: true, role: "admin" });
  });

  it("allows managers into operational Admin surfaces", () => {
    expect(resolveAdminAccess({ profileId: "profile_2", role: "manager" }, "inventory:update")).toEqual({ ok: true, role: "manager" });
  });

  it("keeps consumers and signed-out visitors out", () => {
    expect(resolveAdminAccess({ profileId: "profile_3", role: "consumer" })).toEqual({ ok: false, reason: "missing-capability" });
    expect(resolveAdminAccess({ profileId: null, role: null })).toEqual({ ok: false, reason: "signed-out" });
  });
});
