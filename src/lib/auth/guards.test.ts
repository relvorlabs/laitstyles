import { describe, expect, it } from "vitest";
import {
  type AuthPrincipal,
  canAccessOwnCustomerRecord,
  canUseStoreCapability,
  requireStoreCapability,
} from "@/lib/auth/guards";

const activeManager: AuthPrincipal = {
  profileId: "profile_1",
  storeMemberships: [
    {
      storeId: "store_laitstyle",
      role: "manager",
      status: "active",
    },
  ],
};

describe("auth guards", () => {
  it("allows active staff members to use role capabilities", () => {
    expect(canUseStoreCapability(activeManager, "store_laitstyle", "inventory:update")).toBe(true);
  });

  it("rejects signed-out principals before membership checks", () => {
    expect(
      requireStoreCapability(
        { ...activeManager, profileId: null },
        "store_laitstyle",
        "orders:read",
      ),
    ).toEqual({ ok: false, reason: "signed-out" });
  });

  it("rejects inactive store memberships", () => {
    expect(
      requireStoreCapability(
        {
          profileId: "profile_2",
          storeMemberships: [
            {
              storeId: "store_laitstyle",
              role: "operator",
              status: "suspended",
            },
          ],
        },
        "store_laitstyle",
        "sales:record",
      ),
    ).toEqual({ ok: false, reason: "inactive-membership" });
  });

  it("rejects capabilities outside the active role", () => {
    expect(requireStoreCapability(activeManager, "store_laitstyle", "team:manage")).toEqual({
      ok: false,
      reason: "missing-capability",
    });
  });

  it("keeps storefront consumer records owner-scoped", () => {
    const consumer: AuthPrincipal = {
      profileId: "profile_3",
      storeMemberships: [],
      consumerCustomerIds: ["customer_1"],
    };

    expect(canAccessOwnCustomerRecord(consumer, "customer_1")).toBe(true);
    expect(canAccessOwnCustomerRecord(consumer, "customer_2")).toBe(false);
  });
});
