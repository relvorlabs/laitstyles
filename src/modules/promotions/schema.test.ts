import { describe, expect, it } from "vitest";
import { promotionCouponInputSchema } from "@/modules/promotions/schema";

describe("promotion coupon input", () => {
  it("accepts a generated fixed-value offer expressed in minor units", () => {
    expect(
      promotionCouponInputSchema.safeParse({
        prefix: "LAIT",
        enabled: true,
        kind: "fixed",
        value: 50_000,
        minimumSubtotalMinor: 250_000,
        usageLimit: 20,
      }).success,
    ).toBe(true);
  });

  it("rejects percentage values above 100", () => {
    const result = promotionCouponInputSchema.safeParse({
      code: "LAIT-PRIVATE",
      enabled: true,
      kind: "percent",
      value: 120,
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["value"],
          message: "Percentage discounts cannot exceed 100%.",
        }),
      ]),
    );
  });

  it("rejects an end date that is not later than the start date", () => {
    const result = promotionCouponInputSchema.safeParse({
      code: "LAIT-WEEKEND",
      enabled: true,
      kind: "percent",
      value: 10,
      startsAt: "2026-08-10T10:00:00.000Z",
      expiresAt: "2026-08-10T09:00:00.000Z",
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ["expiresAt"],
          message: "The end date must be later than the start date.",
        }),
      ]),
    );
  });
});
