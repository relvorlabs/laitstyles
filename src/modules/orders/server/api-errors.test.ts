import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/errors/api-error";
import { throwOrderActionError } from "@/modules/orders/server/api-errors";

describe("throwOrderActionError", () => {
  it("maps concurrency conflicts to 409 without losing their identity", () => {
    expect(() =>
      throwOrderActionError({
        code: "stock-write-conflict",
        message: "Stock changed while the order was being updated.",
      }),
    ).toThrowError(
      expect.objectContaining<ApiError>({
        code: "STOCK_WRITE_CONFLICT",
        status: 409,
      }),
    );
  });

  it("preserves quantities and active hold identifiers", () => {
    let thrown: unknown;
    try {
      throwOrderActionError({
        code: "insufficient-available-stock",
        message: "Only one unit is available.",
        available: 1,
        requested: 2,
        conflictingHoldIds: ["hold-one", "hold-two"],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown).toMatchObject({
      status: 409,
      fieldErrors: {
        available: "1",
        requested: "2",
        conflictingHoldIds: "hold-one,hold-two",
      },
    });
  });
});
