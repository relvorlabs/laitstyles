import { describe, expect, it } from "vitest";
import { isAccountRole, isStaffRole } from "@/lib/auth/roles";

describe("account roles", () => {
  it("supports only consumer, admin and manager", () => {
    expect(["consumer", "admin", "manager"].every(isAccountRole)).toBe(true);
    expect(isAccountRole("owner")).toBe(false);
  });

  it("keeps consumers out of staff-only surfaces", () => {
    expect(isStaffRole("admin")).toBe(true);
    expect(isStaffRole("manager")).toBe(true);
    expect(isStaffRole("consumer")).toBe(false);
  });
});
