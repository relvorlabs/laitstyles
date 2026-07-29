import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  updateCustomerReview: vi.fn(),
  withdrawCustomerReview: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/reviews/server/account-reviews", () => ({
  updateCustomerReview: mocks.updateCustomerReview,
  withdrawCustomerReview: mocks.withdrawCustomerReview,
}));

import { DELETE, PATCH } from "./route";

const identity = {
  kind: "consumer" as const,
  authUserId: "user-a",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "customer-a",
};
const reviewId = "33333333-3333-4333-8333-333333333333";
const input = {
  rating: 4,
  title: "Updated",
  body: "The updated review still contains enough useful detail for another shopper.",
  fit: "true_to_size",
};
const context = { params: Promise.resolve({ reviewId }) };

function request(body?: unknown, method = "PATCH") {
  return new Request(`http://localhost/api/v1/account/reviews/${reviewId}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.updateCustomerReview.mockResolvedValue({ reviewId, productSlug: "dress" });
  mocks.withdrawCustomerReview.mockResolvedValue({ reviewId, productSlug: "dress" });
});

describe("/api/v1/account/reviews/[reviewId]", () => {
  it("conceals an unowned review", async () => {
    mocks.updateCustomerReview.mockRejectedValueOnce(
      new ApiError({ code: "REVIEW_NOT_FOUND", message: "Not found.", status: 404 }),
    );

    const response = await PATCH(request(input), context);

    expect(response.status).toBe(404);
  });

  it("updates the owned review", async () => {
    const response = await PATCH(request(input), context);

    expect(response.status).toBe(200);
    expect(mocks.updateCustomerReview).toHaveBeenCalledWith(identity, reviewId, input);
  });

  it("withdraws the owned review", async () => {
    const response = await DELETE(request(undefined, "DELETE"), context);

    expect(response.status).toBe(200);
    expect(mocks.withdrawCustomerReview).toHaveBeenCalledWith(identity, reviewId);
  });
});
