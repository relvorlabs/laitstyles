import { describe, expect, expectTypeOf, it } from "vitest";
import {
  canTransitionReview,
  getReviewEligibility,
  REVIEW_WINDOW_DAYS,
} from "@/modules/reviews/server/policy";
import type {
  ReviewAccessFailure,
  ReviewAccessFailureReason,
  ReviewEligibility,
  ReviewEligibilityInput,
  ReviewEligibilityReason,
  ReviewStatus,
} from "@/modules/reviews/types";

const delivered: ReviewEligibilityInput = {
  owned: true,
  fulfilmentStatus: "delivered",
  deliveredQuantity: 1,
  deliveredAt: new Date("2026-07-01T12:00:00.000Z"),
  refundStatus: "not_refunded",
  completedReturnedQuantity: 0,
  purchasedQuantity: 1,
  hasReview: false,
};

const evaluationTime = new Date("2026-07-20T12:00:00.000Z");

describe("getReviewEligibility", () => {
  it.each([
    [{ ...delivered, owned: false }, "order_line_not_found"],
    [
      {
        ...delivered,
        fulfilmentStatus: "dispatched" as const,
        deliveredQuantity: 0,
        deliveredAt: null,
      },
      "awaiting_delivery",
    ],
    [{ ...delivered, fulfilmentStatus: "cancelled" as const }, "cancelled"],
    [
      {
        ...delivered,
        fulfilmentStatus: "returned" as const,
        completedReturnedQuantity: 1,
      },
      "fully_returned",
    ],
    [{ ...delivered, refundStatus: "refunded" as const }, "fully_refunded"],
    [{ ...delivered, hasReview: true }, "already_reviewed"],
  ] satisfies ReadonlyArray<
    readonly [ReviewEligibilityInput, ReviewEligibilityReason]
  >)("returns $1 for an ineligible order line", (input, reason) => {
    expect(getReviewEligibility(input, evaluationTime)).toEqual({ eligible: false, reason });
  });

  it.each([
    "unfulfilled",
    "processing",
    "ready_for_dispatch",
    "dispatched",
    "partially_cancelled",
  ] as const)("does not unlock the %s fulfilment state", (fulfilmentStatus) => {
    expect(getReviewEligibility({ ...delivered, fulfilmentStatus }, evaluationTime)).toEqual({
      eligible: false,
      reason: "awaiting_delivery",
    });
  });

  it.each([
    "partially_delivered",
    "delivered",
    "partially_returned",
  ] as const)("accepts delivery evidence for the %s fulfilment state", (fulfilmentStatus) => {
    expect(getReviewEligibility({ ...delivered, fulfilmentStatus }, evaluationTime)).toEqual({
      eligible: true,
      expiresAt: new Date("2026-09-29T12:00:00.000Z"),
    });
  });

  it.each([
    { deliveredQuantity: 0, deliveredAt: delivered.deliveredAt },
    { deliveredQuantity: 1, deliveredAt: null },
  ])("requires both a delivered quantity and timestamp", (deliveryEvidence) => {
    expect(getReviewEligibility({ ...delivered, ...deliveryEvidence }, evaluationTime)).toEqual({
      eligible: false,
      reason: "awaiting_delivery",
    });
  });

  it("keeps a partially delivered line eligible", () => {
    expect(
      getReviewEligibility(
        {
          ...delivered,
          fulfilmentStatus: "partially_delivered",
          purchasedQuantity: 3,
          deliveredQuantity: 1,
        },
        evaluationTime,
      ).eligible,
    ).toBe(true);
  });

  it("keeps a partially returned line eligible while a delivered unit remains", () => {
    expect(
      getReviewEligibility(
        {
          ...delivered,
          fulfilmentStatus: "partially_returned",
          purchasedQuantity: 3,
          deliveredQuantity: 2,
          completedReturnedQuantity: 1,
        },
        evaluationTime,
      ).eligible,
    ).toBe(true);
  });

  it.each([
    {
      fulfilmentStatus: "partially_returned" as const,
      deliveredQuantity: 2,
      completedReturnedQuantity: 2,
    },
    {
      fulfilmentStatus: "delivered" as const,
      deliveredQuantity: 1,
      completedReturnedQuantity: 1,
    },
    {
      fulfilmentStatus: "returned" as const,
      deliveredQuantity: 1,
      completedReturnedQuantity: 0,
    },
  ])("fails safely when fulfilment or return data indicates a full return", (returned) => {
    expect(getReviewEligibility({ ...delivered, ...returned }, evaluationTime)).toEqual({
      eligible: false,
      reason: "fully_returned",
    });
  });

  it("keeps a partially refunded delivered line eligible", () => {
    expect(
      getReviewEligibility({ ...delivered, refundStatus: "partially_refunded" }, evaluationTime)
        .eligible,
    ).toBe(true);
  });

  it("includes the exact end of day 90 and expires immediately afterward", () => {
    const expiresAt = new Date("2026-09-29T12:00:00.000Z");
    expect(REVIEW_WINDOW_DAYS).toBe(90);
    expect(getReviewEligibility(delivered, expiresAt)).toEqual({ eligible: true, expiresAt });
    expect(getReviewEligibility(delivered, new Date(expiresAt.getTime() + 1))).toEqual({
      eligible: false,
      reason: "review_window_expired",
    });
  });

  it("evaluates repeat purchase lines independently", () => {
    const reviewedPurchase = getReviewEligibility(
      { ...delivered, hasReview: true },
      evaluationTime,
    );
    const laterPurchase = getReviewEligibility({ ...delivered, hasReview: false }, evaluationTime);
    expect(reviewedPurchase).toEqual({ eligible: false, reason: "already_reviewed" });
    expect(laterPurchase.eligible).toBe(true);
  });

  it("uses line-state precedence so stale pages cannot expose a weaker reason", () => {
    expect(
      getReviewEligibility(
        {
          ...delivered,
          fulfilmentStatus: "returned",
          completedReturnedQuantity: 1,
          refundStatus: "refunded",
          hasReview: true,
        },
        new Date("2027-01-01T00:00:00.000Z"),
      ),
    ).toEqual({ eligible: false, reason: "fully_returned" });
  });
});

describe("canTransitionReview", () => {
  const statuses: readonly ReviewStatus[] = ["pending", "published", "rejected", "withdrawn"];
  const allowed = new Set([
    "pending:withdrawn",
    "published:pending",
    "published:withdrawn",
    "rejected:pending",
    "rejected:withdrawn",
    "withdrawn:pending",
  ]);

  it.each(
    statuses.flatMap((from) => statuses.map((to) => [from, to] as const)),
  )("reports whether %s can transition to %s", (from, to) => {
    expect(canTransitionReview(from, to)).toBe(allowed.has(`${from}:${to}`));
  });
});

describe("review access types", () => {
  it("discriminates session failures from line eligibility while sharing canonical reasons", () => {
    const authenticationFailure: ReviewAccessFailure = {
      eligible: false,
      reason: "authentication_required",
    };
    const lineFailure: ReviewAccessFailure = { eligible: false, reason: "fully_refunded" };
    const eligible: ReviewEligibility = {
      eligible: true,
      expiresAt: new Date("2026-09-29T12:00:00.000Z"),
    };

    expect(authenticationFailure.reason).toBe("authentication_required");
    expect(lineFailure.reason).toBe("fully_refunded");
    expect(eligible.eligible).toBe(true);
    expectTypeOf<ReviewEligibilityReason>().toMatchTypeOf<ReviewAccessFailureReason>();
    expectTypeOf<"authentication_required">().toMatchTypeOf<ReviewAccessFailureReason>();
  });
});
