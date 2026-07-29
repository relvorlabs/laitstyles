import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors/api-error";

const mocks = vi.hoisted(() => ({
  requireApiConsumer: vi.fn(),
  createCustomerReview: vi.fn(),
}));

vi.mock("@/lib/http/auth", () => ({ requireApiConsumer: mocks.requireApiConsumer }));
vi.mock("@/modules/reviews/server/account-reviews", () => ({
  createCustomerReview: mocks.createCustomerReview,
}));

import { POST } from "./route";

const identity = {
  kind: "consumer" as const,
  authUserId: "user-a",
  email: "ada@example.com",
  displayName: "Ada",
  phone: null,
  customerId: "customer-a",
};
const input = {
  orderNumber: "LS-1",
  orderLineId: "line-1",
  rating: 5,
  title: "Exactly as pictured",
  body: "The piece arrived beautifully packed and fits exactly as expected.",
  fit: "true_to_size",
};

function request(body: unknown) {
  return new Request("http://localhost/api/v1/account/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireApiConsumer.mockResolvedValue(identity);
  mocks.createCustomerReview.mockResolvedValue({ reviewId: "review-1", productSlug: "dress" });
});

describe("POST /api/v1/account/reviews", () => {
  it("requires an authenticated consumer", async () => {
    mocks.requireApiConsumer.mockRejectedValueOnce(
      new ApiError({ code: "AUTHENTICATION_REQUIRED", message: "Sign in.", status: 401 }),
    );

    const response = await POST(request(input));

    expect(response.status).toBe(401);
  });

  it("returns the same eligibility code as the review domain", async () => {
    mocks.createCustomerReview.mockRejectedValueOnce(
      new ApiError({
        code: "AWAITING_DELIVERY",
        message: "You can review this item after it is delivered.",
        status: 409,
      }),
    );

    const response = await POST(request(input));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "AWAITING_DELIVERY" },
    });
  });

  it("creates an owned review", async () => {
    const response = await POST(request(input));

    expect(response.status).toBe(201);
    expect(mocks.createCustomerReview).toHaveBeenCalledWith(identity, input);
  });
});
