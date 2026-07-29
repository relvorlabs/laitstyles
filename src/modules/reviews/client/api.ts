import { apiRequest } from "@/lib/http/client";
import type {
  AccountReviewMutationResult,
  CreateAccountReviewInput,
  ReviewInput,
} from "@/modules/reviews/types";

const ACCOUNT_REVIEWS_URL = "/api/v1/account/reviews";

export async function createAccountReviewRequest(
  input: CreateAccountReviewInput,
): Promise<AccountReviewMutationResult> {
  const response = await apiRequest<AccountReviewMutationResult>(ACCOUNT_REVIEWS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateAccountReviewRequest({
  reviewId,
  input,
}: {
  reviewId: string;
  input: ReviewInput;
}): Promise<AccountReviewMutationResult> {
  const response = await apiRequest<AccountReviewMutationResult>(
    `${ACCOUNT_REVIEWS_URL}/${encodeURIComponent(reviewId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  return response.data;
}

export async function withdrawAccountReviewRequest(
  reviewId: string,
): Promise<AccountReviewMutationResult> {
  const response = await apiRequest<AccountReviewMutationResult>(
    `${ACCOUNT_REVIEWS_URL}/${encodeURIComponent(reviewId)}`,
    { method: "DELETE" },
  );
  return response.data;
}
