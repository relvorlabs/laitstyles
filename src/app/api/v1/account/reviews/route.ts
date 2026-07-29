import { requireApiConsumer } from "@/lib/http/auth";
import { parseJsonBody } from "@/lib/http/request";
import { handleApiRequest } from "@/lib/http/server";
import { createAccountReviewSchema } from "@/modules/reviews/schema";
import { createCustomerReview } from "@/modules/reviews/server/account-reviews";

const privateNoStore = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  return handleApiRequest(request, async () => {
    const identity = await requireApiConsumer();
    const input = await parseJsonBody(request, createAccountReviewSchema);
    const review = await createCustomerReview(identity, input);
    return { data: review, status: 201, headers: privateNoStore };
  });
}
