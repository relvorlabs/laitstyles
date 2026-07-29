import "server-only";

import { ApiError } from "@/lib/errors/api-error";
import { prisma } from "@/lib/prisma";
import type { ConsumerSession } from "@/modules/auth/server/session";
import {
  type SubmitReviewResult,
  submitReview,
  type WithdrawReviewResult,
  withdrawReview,
} from "@/modules/reviews/server/repository";
import type {
  AccountReviewMutationResult,
  CreateAccountReviewInput,
  ReviewInput,
} from "@/modules/reviews/types";

export async function createCustomerReview(
  identity: ConsumerSession,
  input: CreateAccountReviewInput,
): Promise<AccountReviewMutationResult> {
  const { orderNumber, orderLineId, ...reviewInput } = input;
  const result = await submitReview({
    customerId: identity.customerId,
    orderNumber,
    orderLineId,
    input: reviewInput,
  });
  if (!result.ok) throw submitApiError(result.reason);
  return result;
}

export async function updateCustomerReview(
  identity: ConsumerSession,
  reviewId: string,
  input: ReviewInput,
): Promise<AccountReviewMutationResult> {
  const line = await findOwnedReviewLine(identity.customerId, reviewId);
  if (!line) throw reviewNotFoundError();
  const result = await submitReview({
    customerId: identity.customerId,
    orderNumber: line.orders.order_number,
    orderLineId: line.id,
    input,
  });
  if (!result.ok) throw submitApiError(result.reason);
  return result;
}

export async function withdrawCustomerReview(
  identity: ConsumerSession,
  reviewId: string,
): Promise<AccountReviewMutationResult> {
  const line = await findOwnedReviewLine(identity.customerId, reviewId);
  if (!line) throw reviewNotFoundError();
  const result = await withdrawReview({
    customerId: identity.customerId,
    orderNumber: line.orders.order_number,
    orderLineId: line.id,
  });
  if (!result.ok) throw withdrawApiError(result.reason);
  return result;
}

async function findOwnedReviewLine(customerId: string, reviewId: string) {
  return prisma.order_lines.findFirst({
    where: { product_review: { id: reviewId }, orders: { customer_id: customerId } },
    select: { id: true, orders: { select: { order_number: true } } },
  });
}

function submitApiError(reason: Extract<SubmitReviewResult, { ok: false }>["reason"]): ApiError {
  if (reason === "order_line_not_found") {
    return new ApiError({
      code: "ORDER_LINE_NOT_FOUND",
      message: "The selected order item could not be found.",
      status: 404,
    });
  }
  return new ApiError({
    code: reason.toUpperCase(),
    message: submitFailureMessage(reason),
    status: 409,
  });
}

function withdrawApiError(
  reason: Extract<WithdrawReviewResult, { ok: false }>["reason"],
): ApiError {
  if (reason === "already_withdrawn") {
    return new ApiError({
      code: "REVIEW_ALREADY_WITHDRAWN",
      message: "This review is already withdrawn.",
      status: 409,
    });
  }
  return reviewNotFoundError();
}

function reviewNotFoundError(): ApiError {
  return new ApiError({
    code: "REVIEW_NOT_FOUND",
    message: "The selected review could not be found.",
    status: 404,
  });
}

function submitFailureMessage(
  reason: Extract<SubmitReviewResult, { ok: false }>["reason"],
): string {
  const messages = {
    awaiting_delivery: "You can review this item after it is delivered.",
    cancelled: "This item was cancelled and cannot be reviewed.",
    fully_returned: "This item was fully returned and can no longer be reviewed.",
    fully_refunded: "This item was fully refunded and can no longer be reviewed.",
    review_window_expired: "The review window for this item has ended.",
    already_reviewed: "This review cannot be changed in its current state.",
    order_line_not_found: "The selected order item could not be found.",
  } satisfies Record<Extract<SubmitReviewResult, { ok: false }>["reason"], string>;
  return messages[reason];
}
