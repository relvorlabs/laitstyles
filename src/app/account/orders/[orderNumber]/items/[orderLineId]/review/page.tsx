import { notFound, redirect } from "next/navigation";
import { ReviewPage } from "@/features/storefront/account/reviews/review-page";
import { getStorefrontSession } from "@/server/authorization/storefront-session";
import { getOwnedReviewContext } from "@/server/commerce/reviews/review-repository";

export default async function AccountOrderItemReviewPage({
  params,
}: {
  params: Promise<{ orderNumber: string; orderLineId: string }>;
}) {
  const { orderNumber, orderLineId } = await params;
  const reviewPath = `/account/orders/${encodeURIComponent(orderNumber)}/items/${encodeURIComponent(orderLineId)}/review`;
  const session = await getStorefrontSession();
  if (session?.role !== "consumer")
    redirect(`/auth/sign-in?next=${encodeURIComponent(reviewPath)}`);
  if (!session.customerId)
    throw new Error("A customer record is required to review this order item.");

  const context = await getOwnedReviewContext({
    customerId: session.customerId,
    orderNumber,
    orderLineId,
  });
  if (!context.found) notFound();
  return <ReviewPage context={context} orderNumber={orderNumber} />;
}
