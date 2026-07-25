import { afterEach, describe, expect, it, vi } from "vitest";
import { recordOfflineSaleRequest } from "@/modules/orders/client/api";

const input = {
  lines: [
    {
      productId: "22222222-2222-4222-8222-222222222222",
      quantity: 2,
      unitPrice: 25_000,
    },
  ],
  channel: "physical-store" as const,
  customer: {
    kind: "new" as const,
    name: "Walk-in customer",
    email: "customer@example.com",
    phone: "+2348000000000",
    city: "Lagos",
  },
  notes: "Customer is present.",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Orders API error contracts", () => {
  it("preserves stock quantities and conflicting hold IDs across HTTP", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "INSUFFICIENT_AVAILABLE_STOCK",
            message: "Only one unit remains available.",
            fieldErrors: {
              available: "1",
              requested: "2",
              conflictingHoldIds:
                "11111111-1111-4111-8111-111111111111,33333333-3333-4333-8333-333333333333",
            },
          },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await recordOfflineSaleRequest(input);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "insufficient-available-stock",
        message: "Only one unit remains available.",
        available: 1,
        requested: 2,
        conflictingHoldIds: [
          "11111111-1111-4111-8111-111111111111",
          "33333333-3333-4333-8333-333333333333",
        ],
      },
    });
  });

  it("keeps a concurrent stock write conflict distinct", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: {
            code: "STOCK_WRITE_CONFLICT",
            message: "Stock changed while the sale was being recorded.",
          },
        }),
        { status: 409, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await recordOfflineSaleRequest(input);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "stock-write-conflict",
        message: "Stock changed while the sale was being recorded.",
      },
    });
  });
});
