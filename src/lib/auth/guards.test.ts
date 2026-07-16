import { describe, expect, it } from "vitest";
import { canAccessOwnCustomerRecord, canUseCapability, requireCapability, type AuthPrincipal } from "@/lib/auth/guards";

const manager: AuthPrincipal = { profileId: "profile_1", role: "manager" };

describe("auth guards", () => {
  it("allows managers to use their operational capabilities", () => {
    expect(canUseCapability(manager, "inventory:update")).toBe(true);
  });

  it("rejects signed-out principals", () => {
    expect(requireCapability({ profileId: null, role: null }, "orders:read")).toEqual({ ok: false, reason: "signed-out" });
  });

  it("fails closed when the role could not be loaded", () => {
    expect(requireCapability({ profileId: "profile_2", role: null, authorizationLoaded: false }, "sales:record")).toEqual({ ok: false, reason: "authorization-unavailable" });
  });

  it("rejects owner-only capabilities for managers", () => {
    expect(requireCapability(manager, "settings:update")).toEqual({ ok: false, reason: "missing-capability" });
  });

  it("keeps consumer records owner-scoped", () => {
    const consumer: AuthPrincipal = { profileId: "profile_3", role: "consumer", consumerCustomerIds: ["customer_1"] };
    expect(canAccessOwnCustomerRecord(consumer, "customer_1")).toBe(true);
    expect(canAccessOwnCustomerRecord(consumer, "customer_2")).toBe(false);
  });
});
