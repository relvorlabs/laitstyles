import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canManageStaff,
  getCapabilitiesForRole,
  getStaffRolesByCapability,
  hasCapability,
  STAFF_CAPABILITIES,
} from "@/lib/auth/permissions";

describe("role capabilities", () => {
  it("gives the owner every staff capability", () => {
    expect(getCapabilitiesForRole("owner")).toEqual(STAFF_CAPABILITIES);
  });

  it("keeps consumers out of Admin", () => {
    expect(canAccessAdmin("consumer")).toBe(false);
    expect(hasCapability("consumer", "storefront:purchase")).toBe(true);
  });

  it("limits manager privileges to store operations, not ownership controls", () => {
    expect(hasCapability("manager", "inventory:archive")).toBe(true);
    expect(hasCapability("manager", "team:manage")).toBe(false);
    expect(hasCapability("manager", "reports:export")).toBe(false);
  });

  it("keeps operator privileges focused on sales floor workflows", () => {
    expect(hasCapability("operator", "sales:record")).toBe(true);
    expect(hasCapability("operator", "inventory:delete")).toBe(false);
    expect(hasCapability("operator", "settings:update")).toBe(false);
  });

  it("identifies staff roles for sensitive capabilities", () => {
    expect(canManageStaff("owner")).toBe(true);
    expect(canManageStaff("manager")).toBe(false);
    expect(getStaffRolesByCapability("team:manage")).toEqual(["owner"]);
  });
});
