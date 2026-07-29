import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createAccountReviewRequest,
  updateAccountReviewRequest,
  withdrawAccountReviewRequest,
} from "@/modules/reviews/client/api";

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

afterEach(() => vi.restoreAllMocks());

describe("account review API client", () => {
  const input = {
    rating: 5,
    body: "The piece arrived beautifully packed and fits exactly as expected.",
    fit: "true_to_size" as const,
  };

  it("creates a review with its owned order identifiers", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({}, 201));

    await createAccountReviewRequest({ orderNumber: "LS-1", orderLineId: "line-1", ...input });

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/v1/account/reviews");
    expect(init.method).toBe("POST");
  });

  it("updates a review by encoded id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({}));

    await updateAccountReviewRequest({ reviewId: "review/1", input });

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/v1/account/reviews/review%2F1");
    expect(init.method).toBe("PATCH");
  });

  it("withdraws a review by id", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(response({}));

    await withdrawAccountReviewRequest("review-1");

    const [url, init] = fetchSpy.mock.calls[0] as [RequestInfo, RequestInit];
    expect(url).toBe("/api/v1/account/reviews/review-1");
    expect(init.method).toBe("DELETE");
  });
});
