import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canUpdateSettings,
  getCapabilitiesForRole,
  hasCapability,
  STAFF_CAPABILITIES,
} from "@/modules/auth/permissions";

describe("role capabilities", () => {
  it("gives the single admin/store owner every staff capability", () => {
    expect(getCapabilitiesForRole("admin")).toEqual(STAFF_CAPABILITIES);
    expect(hasCapability("admin", "team:read")).toBe(true);
    expect(hasCapability("admin", "team:invite")).toBe(true);
  });

  it("keeps consumers on shopper-owned capabilities", () => {
    expect(canAccessAdmin("consumer")).toBe(false);
    expect(hasCapability("consumer", "storefront:purchase")).toBe(true);
  });

  it("lets managers operate the store without owner-only settings or team powers", () => {
    expect(hasCapability("manager", "inventory:create")).toBe(true);
    expect(hasCapability("manager", "orders:update")).toBe(true);
    expect(canUpdateSettings("manager")).toBe(false);
    expect(canUpdateSettings("admin")).toBe(true);
    expect(hasCapability("manager", "team:read")).toBe(false);
    expect(hasCapability("manager", "team:invite")).toBe(false);
  });

  it("gives the store owner finance and refund execution capabilities", () => {
    expect(hasCapability("admin", "finance:read")).toBe(true);
    expect(hasCapability("admin", "finance:transfer")).toBe(true);
    expect(hasCapability("admin", "payments:refund")).toBe(true);
  });

  it("lets managers read finance without moving money", () => {
    expect(hasCapability("manager", "finance:read")).toBe(true);
    expect(hasCapability("manager", "finance:transfer")).toBe(false);
    expect(hasCapability("manager", "payments:refund")).toBe(false);
  });
});
