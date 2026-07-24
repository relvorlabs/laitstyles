import { describe, expect, it } from "vitest";
import {
  buildCheckoutSnapshot,
  type CheckoutItem,
  formatSeconds,
  initialForm,
  validate,
} from "./checkout-helpers";

const items: CheckoutItem[] = [
  {
    lineKey: "p1:default",
    productId: "p1",
    slug: "linen-shirt",
    name: "Linen shirt",
    meta: "Size M · Cream · Grade A+",
    seller: "Laitstyles",
    quantity: 2,
    unitPriceNaira: 12000,
    priceNum: 24000,
    img: "/shirt.jpg",
  },
];

describe("checkout helpers", () => {
  it("uses bag line totals instead of a fabricated catalogue selection", () => {
    const snapshot = buildCheckoutSnapshot("NGN", "lagos", "paystack", null, items);

    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.items[0]).toMatchObject({ productId: "p1", quantity: 2, priceNum: 24000 });
    expect(snapshot.subtotalNum).toBe(24000);
    expect(snapshot.shippingNum).toBe(3500);
    expect(snapshot.vatNum).toBe(1800);
    expect(snapshot.totalNum).toBe(29300);
  });

  it("does not invent a hold when no canonical expiry exists", () => {
    const snapshot = buildCheckoutSnapshot("NGN", "lagos", "paystack", null, items);

    expect(snapshot.hasHold).toBe(false);
    expect(snapshot.timer).toBeNull();
    expect(snapshot.expired).toBe(false);
    expect(snapshot.expiring).toBe(false);
    expect(snapshot.holdMsg).toBe("Availability is confirmed when payment starts");
    expect(snapshot.reviewHold).toBe("Availability is checked before payment.");
  });

  it("reports a real active or expired hold from supplied seconds", () => {
    const active = buildCheckoutSnapshot("NGN", "lagos", "paystack", 120, items);
    expect(active.hasHold).toBe(true);
    expect(active.expiring).toBe(true);
    expect(active.expired).toBe(false);
    expect(active.timer).toBe("02:00");
    expect(active.holdMsg).toBe("Your held pieces release in 02:00");

    const expired = buildCheckoutSnapshot("NGN", "lagos", "paystack", 0, items);
    expect(expired.hasHold).toBe(true);
    expect(expired.expired).toBe(true);
    expect(expired.timer).toBe("00:00");
  });

  it("formats negative time defensively", () => {
    expect(formatSeconds(-5)).toBe("00:00");
  });

  it("validates contact and Nigerian delivery fields", () => {
    expect(validate(0, initialForm)).toEqual({ email: "Enter a valid email address" });
    expect(
      validate(1, {
        ...initialForm,
        email: "ada@example.com",
        first: "Ada",
        last: "Okafor",
        address: "1 Marina Road",
        city: "Lagos",
        phone: "+234 801 234 5678",
      }),
    ).toEqual({});
  });
});
