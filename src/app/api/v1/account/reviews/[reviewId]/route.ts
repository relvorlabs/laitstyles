import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { reviewIdentifierSchema, updateAccountReviewSchema } from "@/modules/reviews/schema";
import {
  updateCustomerReview,
  withdrawCustomerReview,
} from "@/modules/reviews/server/account-reviews";

const privateNoStore = { "Cache-Control": "private, no-store" };
type RouteContext = { params: Promise<{ reviewId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { reviewId } = await context.params;
    const identifier = reviewIdentifierSchema.parse(reviewId);
    const input = await parseJsonBody(request, updateAccountReviewSchema);
    const review = await updateCustomerReview(identity, identifier, input);
    return { data: review, headers: privateNoStore };
  });
}

export async function DELETE(request: Request, context: RouteContext) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const { reviewId } = await context.params;
    const identifier = reviewIdentifierSchema.parse(reviewId);
    const review = await withdrawCustomerReview(identity, identifier);
    return { data: review, headers: privateNoStore };
  });
}
