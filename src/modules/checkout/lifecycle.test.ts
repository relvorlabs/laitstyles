import { describe, expect, it } from "vitest";
import {
  type CheckoutLifecycleState,
  deriveCheckoutStatus,
  isCheckoutResumable,
} from "@/modules/checkout/lifecycle";

const resumable = {
  orderPaymentStatus: "pending",
  orderFulfilmentStatus: "unfulfilled",
  paymentAttemptStatus: "initialized",
  accessCode: "access-code",
} satisfies CheckoutLifecycleState;

describe("checkout lifecycle", () => {
  it("allows only initialized or pending attempts inside an unpaid unfulfilled order", () => {
    expect(isCheckoutResumable(resumable)).toBe(true);
    expect(isCheckoutResumable({ ...resumable, paymentAttemptStatus: "pending" })).toBe(true);
    expect(isCheckoutResumable({ ...resumable, paymentAttemptStatus: "failed" })).toBe(false);
    expect(isCheckoutResumable({ ...resumable, paymentAttemptStatus: "abandoned" })).toBe(false);
    expect(isCheckoutResumable({ ...resumable, paymentAttemptStatus: "reversed" })).toBe(false);
    expect(isCheckoutResumable({ ...resumable, paymentAttemptStatus: "review_required" })).toBe(
      false,
    );
  });

  it("requires a usable provider access code", () => {
    expect(isCheckoutResumable({ ...resumable, accessCode: null })).toBe(false);
    expect(isCheckoutResumable({ ...resumable, accessCode: " " })).toBe(false);
  });

  it("never resumes cancelled, paid or fulfilled orders", () => {
    expect(isCheckoutResumable({ ...resumable, orderPaymentStatus: "cancelled" })).toBe(false);
    expect(isCheckoutResumable({ ...resumable, orderPaymentStatus: "paid" })).toBe(false);
    expect(isCheckoutResumable({ ...resumable, orderFulfilmentStatus: "processing" })).toBe(false);
  });

  it("derives public status from the aggregate order before the payment attempt", () => {
    expect(
      deriveCheckoutStatus({
        orderPaymentStatus: "cancelled",
        orderFulfilmentStatus: "cancelled",
        paymentAttemptStatus: "initialized",
      }),
    ).toBe("cancelled");
    expect(
      deriveCheckoutStatus({
        orderPaymentStatus: "paid",
        orderFulfilmentStatus: "unfulfilled",
        paymentAttemptStatus: "pending",
      }),
    ).toBe("success");
    expect(
      deriveCheckoutStatus({
        orderPaymentStatus: "review_required",
        orderFulfilmentStatus: "unfulfilled",
        paymentAttemptStatus: "failed",
      }),
    ).toBe("review_required");
  });
});
