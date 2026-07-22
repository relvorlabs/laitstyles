import "server-only";

import type { PrismaClient } from "@/lib/prisma";
import { Prisma, prisma } from "@/lib/prisma";

import { canTransitionReview, getReviewEligibility } from "./review-policy";
import type {
  ReviewEligibility,
  ReviewEligibilityReason,
  ReviewFit,
  ReviewInput,
  ReviewStatus,
} from "./review-types";

const ownedLineSelect = {
  id: true,
  product_id: true,
  product_name: true,
  variant_label: true,
  quantity: true,
  fulfilment_status: true,
  delivered_quantity: true,
  delivered_at: true,
  refund_status: true,
  products: { select: { slug: true } },
  product_review: {
    select: {
      id: true,
      rating: true,
      title: true,
      body: true,
      fit: true,
      size_ordered: true,
      status: true,
      submitted_at: true,
      rejection_reason: true,
    },
  },
  return_lines: {
    where: { return: { status: "completed" as const } },
    select: { quantity: true },
  },
} satisfies Prisma.order_linesSelect;

type OwnedLineRecord = Prisma.order_linesGetPayload<{ select: typeof ownedLineSelect }>;
type ReviewReadClient = Pick<PrismaClient, "order_lines">;

export interface OwnedReviewLine {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  sizeOrdered: string | null;
  purchasedQuantity: number;
  deliveredQuantity: number;
  deliveredAt: Date | null;
}

export interface OwnedReviewRecord {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  fit: ReviewFit | null;
  sizeOrdered: string | null;
  status: ReviewStatus;
  submittedAt: Date;
  rejectionReason: string | null;
}

export type OwnedReviewContext =
  | { found: false; reason: "order_line_not_found" }
  | {
      found: true;
      line: OwnedReviewLine;
      review: OwnedReviewRecord | null;
      eligibility: ReviewEligibility;
    };

export type SubmitReviewResult =
  | { ok: true; reviewId: string; productSlug: string }
  | { ok: false; reason: ReviewEligibilityReason };

export type WithdrawReviewResult =
  | { ok: true; reviewId: string; productSlug: string }
  | {
      ok: false;
      reason: "order_line_not_found" | "review_not_found" | "already_withdrawn";
    };

interface OwnedLineKey {
  customerId: string;
  orderNumber: string;
  orderLineId: string;
}

async function findOwnedLine(client: ReviewReadClient, key: OwnedLineKey) {
  return client.order_lines.findFirst({
    where: {
      id: key.orderLineId,
      orders: {
        order_number: key.orderNumber,
        customer_id: key.customerId,
      },
    },
    select: ownedLineSelect,
  });
}

function completedReturnedQuantity(line: OwnedLineRecord): number {
  return line.return_lines.reduce((total, returnLine) => total + returnLine.quantity, 0);
}

function eligibilityFor(
  line: OwnedLineRecord,
  now: Date,
  hasReview = line.product_review !== null,
): ReviewEligibility {
  return getReviewEligibility(
    {
      owned: true,
      fulfilmentStatus: line.fulfilment_status,
      deliveredQuantity: line.delivered_quantity,
      deliveredAt: line.delivered_at,
      refundStatus: line.refund_status,
      completedReturnedQuantity: completedReturnedQuantity(line),
      purchasedQuantity: line.quantity,
      hasReview,
    },
    now,
  );
}

function toContext(line: OwnedLineRecord, now: Date): OwnedReviewContext {
  return {
    found: true,
    line: {
      id: line.id,
      productId: line.product_id,
      productSlug: line.products.slug,
      productName: line.product_name,
      sizeOrdered: line.variant_label,
      purchasedQuantity: line.quantity,
      deliveredQuantity: line.delivered_quantity,
      deliveredAt: line.delivered_at,
    },
    review: line.product_review
      ? {
          id: line.product_review.id,
          rating: line.product_review.rating,
          title: line.product_review.title,
          body: line.product_review.body,
          fit: line.product_review.fit,
          sizeOrdered: line.product_review.size_ordered,
          status: line.product_review.status,
          submittedAt: line.product_review.submitted_at,
          rejectionReason: line.product_review.rejection_reason,
        }
      : null,
    eligibility: eligibilityFor(line, now),
  };
}

export async function getOwnedReviewContext(
  args: OwnedLineKey & { now?: Date },
): Promise<OwnedReviewContext> {
  const line = await findOwnedLine(prisma, args);
  if (!line) return { found: false, reason: "order_line_not_found" };

  return toContext(line, args.now ?? new Date());
}

export async function submitReview(args: {
  customerId: string;
  orderNumber: string;
  orderLineId: string;
  input: ReviewInput;
  now?: Date;
}): Promise<SubmitReviewResult> {
  const now = args.now ?? new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      // Server Actions are directly reachable. Repeat both ownership and current
      // fulfilment/refund truth in the same transaction as the mutation.
      const line = await findOwnedLine(tx, args);
      if (!line) return { ok: false, reason: "order_line_not_found" };

      const eligibility = eligibilityFor(line, now, false);
      if (!eligibility.eligible) return { ok: false, reason: eligibility.reason };

      const existing = line.product_review;
      if (existing && !canTransitionReview(existing.status, "pending")) {
        return { ok: false, reason: "already_reviewed" };
      }

      const reviewData = {
        rating: args.input.rating,
        title: args.input.title ?? null,
        body: args.input.body,
        fit: args.input.fit,
        size_ordered: line.variant_label,
        status: "pending" as const,
        submitted_at: now,
      };

      const review = existing
        ? await tx.product_reviews.update({
            where: { id: existing.id },
            data: {
              ...reviewData,
              published_at: null,
              reviewed_at: null,
              reviewed_by_profile_id: null,
              rejection_reason: null,
            },
            select: { id: true },
          })
        : await tx.product_reviews.create({
            data: { order_line_id: line.id, ...reviewData },
            select: { id: true },
          });

      return { ok: true, reviewId: review.id, productSlug: line.products.slug };
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, reason: "already_reviewed" };
    }
    throw error;
  }
}

export async function withdrawReview(args: OwnedLineKey): Promise<WithdrawReviewResult> {
  return prisma.$transaction(async (tx) => {
    const line = await findOwnedLine(tx, args);
    if (!line) return { ok: false, reason: "order_line_not_found" };
    if (!line.product_review) return { ok: false, reason: "review_not_found" };
    if (line.product_review.status === "withdrawn") {
      return { ok: false, reason: "already_withdrawn" };
    }

    const review = await tx.product_reviews.update({
      where: { id: line.product_review.id },
      data: { status: "withdrawn" },
      select: { id: true },
    });

    return { ok: true, reviewId: review.id, productSlug: line.products.slug };
  });
}
