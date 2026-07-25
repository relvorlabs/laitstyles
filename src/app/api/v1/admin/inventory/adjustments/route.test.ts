import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiStaff: vi.fn(),
  adjustInventoryStock: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiStaff: mocks.requireApiStaff }));
vi.mock("@/modules/inventory/server/adjust-stock", () => ({
  adjustInventoryStock: mocks.adjustInventoryStock,
}));

import { POST } from "./route";

const actor = {
  kind: "staff" as const,
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "admin@example.com",
  displayName: "Admin",
  role: "admin" as const,
};
const productId = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiStaff.mockResolvedValue(actor);
});

describe("POST /api/v1/admin/inventory/adjustments", () => {
  it("returns the standard authorization error envelope", async () => {
    mocks.requireApiStaff.mockRejectedValueOnce(
      new ApiError({ code: "AUTH_REQUIRED", message: "Authentication required.", status: 401 }),
    );

    const response = await POST(adjustmentRequest({ quantityDelta: 2 }));

    expect(response.status).toBe(401);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AUTH_REQUIRED", message: "Authentication required." },
    });
    expect(mocks.adjustInventoryStock).not.toHaveBeenCalled();
  });

  it("validates the body before calling the domain command", async () => {
    const response = await POST(adjustmentRequest({ quantityDelta: 0 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_BODY", fieldErrors: { quantityDelta: expect.any(String) } },
    });
    expect(mocks.adjustInventoryStock).not.toHaveBeenCalled();
  });

  it("translates adjustment conflicts into a stable API error", async () => {
    mocks.adjustInventoryStock.mockResolvedValueOnce({
      ok: false,
      error: {
        code: "invalid-adjustment",
        message: "This adjustment would create an invalid stock balance.",
      },
    });

    const response = await POST(adjustmentRequest({ quantityDelta: -20 }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "INVENTORY_ADJUSTMENT_CONFLICT",
        message: "This adjustment would create an invalid stock balance.",
      },
    });
  });

  it("returns the adjusted balance and movement with private no-store caching", async () => {
    const outcome = {
      balance: {
        totalReceived: 12,
        available: 8,
        reserved: 1,
        committed: 1,
        sold: 2,
        returned: 0,
        damaged: 0,
      },
      movement: {
        id: "33333333-3333-4333-8333-333333333333",
        productId,
        variantId: null,
        kind: "adjusted" as const,
        quantity: 2,
        occurredAt: "2026-07-25T08:00:00.000Z",
        actor: "Admin",
        note: "Cycle count correction",
      },
    };
    mocks.adjustInventoryStock.mockResolvedValueOnce({ ok: true, value: outcome });

    const response = await POST(adjustmentRequest({ quantityDelta: 2 }));

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.requireApiStaff).toHaveBeenCalledWith("inventory:update");
    expect(mocks.adjustInventoryStock).toHaveBeenCalledWith(actor, {
      productId,
      variantId: null,
      quantityDelta: 2,
      note: "Cycle count correction",
    });
    await expect(response.json()).resolves.toEqual({ data: outcome });
  });
});

function adjustmentRequest(overrides: Partial<{ quantityDelta: number }> = {}) {
  return new Request("http://localhost/api/v1/admin/inventory/adjustments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId,
      variantId: null,
      quantityDelta: overrides.quantityDelta ?? 2,
      note: "Cycle count correction",
    }),
  });
}
