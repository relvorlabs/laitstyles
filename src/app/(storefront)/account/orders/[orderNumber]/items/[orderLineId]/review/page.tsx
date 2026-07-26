import { notFound, redirect } from "next/navigation";
import { getOwnedReviewContext } from "@/modules/reviews/server/repository";
import { ReviewPage } from "@/modules/reviews/ui/storefront/review-page";
import { getCurrentSession } from "@/server/auth/session";
import { submitReviewAction, withdrawReviewAction } from "./actions";

export default async function AccountOrderItemReviewPage({
  params,
}: {
  params: Promise<{ orderNumber: string; orderLineId: string }>;
}) {
  const { orderNumber, orderLineId } = await params;
  const reviewPath = `/account/orders/${encodeURIComponent(orderNumber)}/items/${encodeURIComponent(orderLineId)}/review`;
  const session = await getCurrentSession();
  if (session.kind !== "consumer") redirect(`/auth/sign-in?next=${encodeURIComponent(reviewPath)}`);
  if (!session.customerId) {
    throw new Error("A customer record is required to review this order item.");
  }

  const context = await getOwnedReviewContext({
    customerId: session.customerId,
    orderNumber,
    orderLineId,
  });
  if (!context.found) notFound();
  return (
    <ReviewPage
      context={context}
      orderNumber={orderNumber}
      submitAction={submitReviewAction}
      withdrawAction={withdrawReviewAction}
    />
  );
}
