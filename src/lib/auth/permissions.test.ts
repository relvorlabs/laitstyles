import { describe, expect, it } from "vitest";
import { canAccessAdmin, canUpdateSettings, getCapabilitiesForRole, hasCapability, STAFF_CAPABILITIES } from "@/lib/auth/permissions";

describe("role capabilities", () => {
  it("gives the single admin/store owner every staff capability", () => {
    expect(getCapabilitiesForRole("admin")).toEqual(STAFF_CAPABILITIES);
  });

  it("keeps consumers on shopper-owned capabilities", () => {
    expect(canAccessAdmin("consumer")).toBe(false);
    expect(hasCapability("consumer", "storefront:purchase")).toBe(true);
  });

  it("lets managers operate the store without owner-only settings powers", () => {
    expect(hasCapability("manager", "inventory:create")).toBe(true);
    expect(hasCapability("manager", "orders:update")).toBe(true);
    expect(canUpdateSettings("manager")).toBe(false);
    expect(canUpdateSettings("admin")).toBe(true);
  });
});
