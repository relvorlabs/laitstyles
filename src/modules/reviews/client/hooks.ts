"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { accountOrderKeys } from "@/modules/orders/client/keys";
import {
  createAccountReviewRequest,
  updateAccountReviewRequest,
  withdrawAccountReviewRequest,
} from "@/modules/reviews/client/api";
import { accountReviewKeys } from "@/modules/reviews/client/keys";

function useReviewMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<{ reviewId: string; productSlug: string }>,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (review) => {
      queryClient.setQueryData(accountReviewKeys.detail(review.reviewId), review);
      queryClient.invalidateQueries({ queryKey: accountOrderKeys.all });
    },
  });
}

export function useCreateAccountReview() {
  return useReviewMutation(createAccountReviewRequest);
}

export function useUpdateAccountReview() {
  return useReviewMutation(updateAccountReviewRequest);
}

export function useWithdrawAccountReview() {
  return useReviewMutation(withdrawAccountReviewRequest);
}
