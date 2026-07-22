"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { reviewInputSchema } from "@/lib/commerce/reviews/review-schema";
import type { ReviewActionState } from "@/lib/commerce/reviews/review-types";
import { requireStorefrontSession } from "@/server/authorization/storefront-session";
import {
  type SubmitReviewResult,
  submitReview,
  withdrawReview,
} from "@/server/commerce/reviews/review-repository";

type ReviewErrorState = Extract<ReviewActionState, { status: "error" }>;

const submitFailureCopy: Record<Extract<SubmitReviewResult, { ok: false }>["reason"], string> = {
  order_line_not_found: "We could not find this item in your orders.",
  awaiting_delivery: "You can review this item after it is delivered.",
  cancelled: "This item was cancelled and cannot be reviewed.",
  fully_returned: "This item was fully returned and can no longer be reviewed.",
  fully_refunded: "This item has been fully refunded and can no longer be reviewed.",
  review_window_expired: "The 90-day review window for this item has ended.",
  already_reviewed: "A review already exists for this ordered item.",
};

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readIdentifiers(formData: FormData) {
  const orderNumber = textField(formData, "orderNumber");
  const orderLineId = textField(formData, "orderLineId");
  if (!orderNumber || orderNumber.length > 64 || !orderLineId || orderLineId.length > 128) {
    return null;
  }
  return { orderNumber, orderLineId };
}

async function getCustomerId(): Promise<
  { ok: true; customerId: string } | { ok: false; state: ReviewErrorState }
> {
  try {
    const session = await requireStorefrontSession();
    if (!session.customerId) {
      return {
        ok: false,
        state: {
          status: "error",
          message: "Your customer profile is not ready for reviews yet. Contact support for help.",
        },
      };
    }
    return { ok: true, customerId: session.customerId };
  } catch (error) {
    if (error instanceof Error && error.message === "A consumer account is required.") {
      return {
        ok: false,
        state: {
          status: "error",
          message: "Sign in with your customer account to review this item.",
        },
      };
    }
    throw error;
  }
}

export async function submitReviewAction(
  _previous: ReviewActionState,
  formData: FormData,
): Promise<ReviewActionState> {
  const identity = await getCustomerId();
  if (!identity.ok) return identity.state;

  const identifiers = readIdentifiers(formData);
  if (!identifiers) {
    return {
      status: "error",
      message: "This review link is incomplete. Return to your order and try again.",
    };
  }

  const parsed = reviewInputSchema.safeParse({
    rating: Number(textField(formData, "rating")),
    title: textField(formData, "title"),
    body: textField(formData, "body"),
    fit: textField(formData, "fit"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted review fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await submitReview({
    customerId: identity.customerId,
    ...identifiers,
    input: parsed.data,
  });
  if (!result.ok) {
    return { status: "error", message: submitFailureCopy[result.reason] };
  }

  const orderPath = `/account/orders/${encodeURIComponent(identifiers.orderNumber)}`;
  revalidatePath(orderPath);
  revalidatePath(`/products/${encodeURIComponent(result.productSlug)}`);
  redirect(`${orderPath}?review=submitted`);
}

export async function withdrawReviewAction(formData: FormData): Promise<void> {
  const identity = await getCustomerId();
  if (!identity.ok) {
    throw new Error(identity.state.message);
  }

  const identifiers = readIdentifiers(formData);
  if (!identifiers) {
    throw new Error("This review link is incomplete.");
  }

  const result = await withdrawReview({ customerId: identity.customerId, ...identifiers });
  const orderPath = `/account/orders/${encodeURIComponent(identifiers.orderNumber)}`;
  if (!result.ok) {
    redirect(`${orderPath}?review=withdrawal_failed`);
  }

  revalidatePath(orderPath);
  revalidatePath(`/products/${encodeURIComponent(result.productSlug)}`);
  redirect(`${orderPath}?review=withdrawn`);
}
