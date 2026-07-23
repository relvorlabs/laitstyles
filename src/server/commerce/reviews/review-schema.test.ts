import { describe, expect, expectTypeOf, it } from "vitest";

import { reviewInputSchema } from "@/lib/commerce/reviews/review-schema";
import type { ReviewActionState, ReviewInput } from "@/lib/commerce/reviews/review-types";

const validInput = {
  rating: 5,
  title: "Beautifully finished",
  body: "The construction and fit are both excellent.",
  fit: "true_to_size" as const,
};

describe("reviewInputSchema", () => {
  it.each([1, 2, 3, 4, 5])("accepts the integer rating %i", (rating) => {
    expect(reviewInputSchema.safeParse({ ...validInput, rating }).success).toBe(true);
  });

  it("requires callers to normalize form ratings to a number", () => {
    expect(reviewInputSchema.safeParse({ ...validInput, rating: "4" }).success).toBe(false);
  });

  it.each([0, 6, 1.5, "not-a-rating"])("rejects the invalid rating %s", (rating) => {
    expect(reviewInputSchema.safeParse({ ...validInput, rating }).success).toBe(false);
  });

  it("trims the optional title and normalizes an empty one", () => {
    expect(reviewInputSchema.parse({ ...validInput, title: "  Considered details  " }).title).toBe(
      "Considered details",
    );
    expect(reviewInputSchema.parse({ ...validInput, title: "   " }).title).toBeUndefined();
    expect(reviewInputSchema.parse({ ...validInput, title: undefined }).title).toBeUndefined();
  });

  it("accepts a 120-character title and rejects a 121-character title", () => {
    expect(reviewInputSchema.safeParse({ ...validInput, title: "t".repeat(120) }).success).toBe(
      true,
    );
    expect(reviewInputSchema.safeParse({ ...validInput, title: "t".repeat(121) }).success).toBe(
      false,
    );
  });

  it("trims the body and enforces the inclusive 20-2000 character limits", () => {
    expect(reviewInputSchema.parse({ ...validInput, body: `  ${"b".repeat(20)}  ` }).body).toBe(
      "b".repeat(20),
    );
    expect(reviewInputSchema.safeParse({ ...validInput, body: "b".repeat(19) }).success).toBe(
      false,
    );
    expect(reviewInputSchema.safeParse({ ...validInput, body: "b".repeat(2000) }).success).toBe(
      true,
    );
    expect(reviewInputSchema.safeParse({ ...validInput, body: "b".repeat(2001) }).success).toBe(
      false,
    );
  });

  it.each([
    "runs_small",
    "true_to_size",
    "runs_large",
    "not_applicable",
  ] as const)("accepts the %s fit value", (fit) => {
    expect(reviewInputSchema.safeParse({ ...validInput, fit }).success).toBe(true);
  });

  it("rejects fit values outside the review enum", () => {
    expect(reviewInputSchema.safeParse({ ...validInput, fit: "oversized" }).success).toBe(false);
  });

  it("exposes inferred input fields to typed action errors", () => {
    const state: ReviewActionState = {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: { body: ["Write at least 20 characters."] },
    };

    expect(state.status).toBe("error");
    expectTypeOf<ReviewInput>().toHaveProperty("rating").toBeNumber();
  });
});
