import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSession: vi.fn(),
  submitReview: vi.fn(),
  withdrawReview: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/server/authorization/storefront-session", () => ({
  requireStorefrontSession: mocks.requireSession,
}));
vi.mock("@/server/commerce/reviews/review-repository", () => ({
  submitReview: mocks.submitReview,
  withdrawReview: mocks.withdrawReview,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { submitReviewAction, withdrawReviewAction } from "./review-actions";

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
    mocks.requireSession.mockResolvedValue({
      authUserId: "user-a",
      email: "shopper@example.com",
      role: "consumer",
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

  it("returns a safe authentication error when a consumer session is unavailable", async () => {
    mocks.requireSession.mockRejectedValueOnce(new Error("A consumer account is required."));

    await expect(submitReviewAction({ status: "idle" }, validFormData())).resolves.toEqual({
      status: "error",
      message: "Sign in with your customer account to review this item.",
    });
    expect(mocks.submitReview).not.toHaveBeenCalled();
  });

  it("does not disguise unexpected session or database failures as an authentication error", async () => {
    mocks.requireSession.mockRejectedValueOnce(new Error("Database unavailable"));

    await expect(submitReviewAction({ status: "idle" }, validFormData())).rejects.toThrow(
      "Database unavailable",
    );
    expect(mocks.submitReview).not.toHaveBeenCalled();
  });

  it("requires a linked customer record", async () => {
    mocks.requireSession.mockResolvedValueOnce({
      authUserId: "user-a",
      email: "shopper@example.com",
      role: "consumer",
      customerId: null,
    });

    await expect(submitReviewAction({ status: "idle" }, validFormData())).resolves.toEqual({
      status: "error",
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
      message: "Check the highlighted review fields and try again.",
      fieldErrors: { rating: expect.any(Array), body: expect.any(Array) },
    });
    expect(mocks.submitReview).not.toHaveBeenCalled();
  });

  it("turns repository eligibility failures into plain customer copy", async () => {
    mocks.submitReview.mockResolvedValueOnce({ ok: false, reason: "fully_refunded" });

    await expect(submitReviewAction({ status: "idle" }, validFormData())).resolves.toEqual({
      status: "error",
      message: "This item has been fully refunded and can no longer be reviewed.",
    });
  });

  it("revalidates owned order and public product paths before redirecting on success", async () => {
    await submitReviewAction({ status: "idle" }, validFormData());

    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(1, "/account/orders/LS-1001");
    expect(mocks.revalidatePath).toHaveBeenNthCalledWith(2, "/products/archive-silk-dress");
    expect(mocks.redirect).toHaveBeenCalledWith("/account/orders/LS-1001?review=submitted");
  });

  it("withdraws by owned identifiers and redirects with a withdrawal notice", async () => {
    const formData = new FormData();
    formData.set("orderNumber", "LS-1001");
    formData.set("orderLineId", "line-a");

    await withdrawReviewAction(formData);

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
