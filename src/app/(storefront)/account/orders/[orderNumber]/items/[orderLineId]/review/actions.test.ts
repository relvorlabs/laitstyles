import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentSession: vi.fn(),
  submitReview: vi.fn(),
  withdrawReview: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/modules/auth/server/session", () => ({
  getCurrentSession: mocks.getCurrentSession,
}));
vi.mock("@/modules/reviews/server/repository", () => ({
  submitReview: mocks.submitReview,
  withdrawReview: mocks.withdrawReview,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { submitReviewAction, withdrawReviewAction } from "./actions";

function validFormData() {
  const formData = new FormData();
  formData.set("orderNumber", "LS-1001");
  formData.set("orderLineId", "line-a");
  formData.set("rating", "5");
  formData.set("title", "Exactly as pictured");
  formData.set("body", "The piece arrived beautifully packed and fits exactly as expected.");
  formData.set("fit", "true_to_size");
  return formData;
}

describe("review Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentSession.mockResolvedValue({
      kind: "consumer",
      authUserId: "user-a",
      email: "shopper@example.com",
      customerId: "customer-a",
    });
    mocks.submitReview.mockResolvedValue({
      ok: true,
      reviewId: "review-a",
      productSlug: "archive-silk-dress",
    });
    mocks.withdrawReview.mockResolvedValue({
      ok: true,
      reviewId: "review-a",
      productSlug: "archive-silk-dress",
    });
  });

  it("returns a safe authentication error when the visitor is not a consumer", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({ kind: "anonymous" });

    await expect(submitReviewAction({ status: "idle" }, validFormData())).resolves.toEqual({
      status: "error",
      code: "authentication-required",
      message: "Sign in with your customer account to review this item.",
    });
    expect(mocks.submitReview).not.toHaveBeenCalled();
  });

  it("does not disguise unexpected session or database failures as an authentication error", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({
      kind: "unavailable",
      error: "Database unavailable",
    });

    await expect(submitReviewAction({ status: "idle" }, validFormData())).rejects.toThrow(
      "Database unavailable",
    );
    expect(mocks.submitReview).not.toHaveBeenCalled();
  });

  it("requires a linked customer record", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({
      kind: "consumer",
      authUserId: "user-a",
      email: "shopper@example.com",
      customerId: null,
    });

    await expect(submitReviewAction({ status: "idle" }, validFormData())).resolves.toEqual({
      status: "error",
      code: "customer-profile-required",
      message: "Your customer profile is not ready for reviews yet. Contact support for help.",
    });
    expect(mocks.submitReview).not.toHaveBeenCalled();
  });

  it("allow-lists identifiers and validated review fields from FormData", async () => {
    const formData = validFormData();
    formData.set("productId", "attacker-product");
    formData.set("status", "published");
    formData.set("customerId", "attacker-customer");

    await submitReviewAction({ status: "idle" }, formData);

    expect(mocks.submitReview).toHaveBeenCalledWith({
      customerId: "customer-a",
      orderNumber: "LS-1001",
      orderLineId: "line-a",
      input: {
        rating: 5,
        title: "Exactly as pictured",
        body: "The piece arrived beautifully packed and fits exactly as expected.",
        fit: "true_to_size",
      },
    });
  });

  it("returns field-level validation errors without calling the repository", async () => {
    const formData = validFormData();
    formData.set("rating", "6");
    formData.set("body", "Too short");

    const result = await submitReviewAction({ status: "idle" }, formData);

    expect(result).toMatchObject({
      status: "error",
      code: "invalid-review-fields",
      message: "Check the highlighted review fields and try again.",
      fieldErrors: { rating: expect.any(Array), body: expect.any(Array) },
    });
    expect(mocks.submitReview).not.toHaveBeenCalled();
  });

  it("turns repository eligibility failures into typed customer copy", async () => {
    mocks.submitReview.mockResolvedValueOnce({ ok: false, reason: "fully_refunded" });

    await expect(submitReviewAction({ status: "idle" }, validFormData())).resolves.toEqual({
      status: "error",
      code: "fully_refunded",
      message: "This item has been fully refunded and can no longer be reviewed.",
    });
  });

  it("revalidates owned order and public product paths before redirecting on success", async () => {
    await submitReviewAction({ status: "idle" }, validFormData());

    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/account/orders/LS-1001");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/products/archive-silk-dress");
    expect(mocks.redirect).toHaveBeenCalledWith("/account/orders/LS-1001?review=submitted");
  });

  it("returns expected withdrawal auth failures instead of throwing", async () => {
    mocks.getCurrentSession.mockResolvedValueOnce({ kind: "anonymous" });

    await expect(withdrawReviewAction({ status: "idle" }, validFormData())).resolves.toEqual({
      status: "error",
      code: "authentication-required",
      message: "Sign in with your customer account to review this item.",
    });
    expect(mocks.withdrawReview).not.toHaveBeenCalled();
  });

  it("rejects malformed withdrawal identifiers before the repository", async () => {
    const formData = new FormData();
    formData.set("orderNumber", "");
    formData.set("orderLineId", "line-a");

    await expect(withdrawReviewAction({ status: "idle" }, formData)).resolves.toEqual({
      status: "error",
      code: "invalid-review-link",
      message: "This review link is incomplete. Return to your order and try again.",
    });
    expect(mocks.withdrawReview).not.toHaveBeenCalled();
  });

  it("returns fixed copy when the review cannot be withdrawn", async () => {
    mocks.withdrawReview.mockResolvedValueOnce({ ok: false, reason: "review_not_found" });

    await expect(withdrawReviewAction({ status: "idle" }, validFormData())).resolves.toEqual({
      status: "error",
      code: "withdrawal-failed",
      message: "We could not withdraw this review. Return to your order and try again.",
    });
  });

  it("withdraws by owned identifiers and redirects with a withdrawal notice", async () => {
    const formData = new FormData();
    formData.set("orderNumber", "LS-1001");
    formData.set("orderLineId", "line-a");

    await withdrawReviewAction({ status: "idle" }, formData);

    expect(mocks.withdrawReview).toHaveBeenCalledWith({
      customerId: "customer-a",
      orderNumber: "LS-1001",
      orderLineId: "line-a",
    });
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/account/orders/LS-1001");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/products/archive-silk-dress");
    expect(mocks.redirect).toHaveBeenCalledWith("/account/orders/LS-1001?review=withdrawn");
  });
});
