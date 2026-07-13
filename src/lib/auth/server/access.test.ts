import { describe, expect, it } from "vitest";
import type { AuthPrincipal } from "@/lib/auth/guards";
import { resolveControlRoomAccess } from "@/lib/auth/server/access";

const principal: AuthPrincipal = {
  profileId: "profile_1",
  storeMemberships: [
    {
      role: "operator",
      status: "active",
      storeId: "store_floor",
    },
    {
      role: "owner",
      status: "active",
      storeId: "store_owner",
    },
  ],
};

describe("control-room access resolver", () => {
  it("selects an active membership that has the required capability", () => {
    expect(resolveControlRoomAccess(principal, "team:manage")).toEqual({
      membership: {
        role: "owner",
        status: "active",
        storeId: "store_owner",
      },
      ok: true,
      storeId: "store_owner",
    });
  });

  it("respects the configured store boundary", () => {
    expect(resolveControlRoomAccess(principal, "team:manage", "store_floor")).toEqual({
      ok: false,
      reason: "missing-capability",
    });
  });

  it("keeps signed-out visitors out before membership checks", () => {
    expect(
      resolveControlRoomAccess({ profileId: null, storeMemberships: [] }, "control-room:access"),
    ).toEqual({ ok: false, reason: "signed-out" });
  });
});
