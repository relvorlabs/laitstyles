import { notFound, redirect } from "next/navigation";
import { getAccountOrder } from "@/modules/orders/server/account-orders";
import {
  OrderDetailSection,
  type OrderReviewNotice,
} from "@/modules/orders/ui/storefront/order-detail-section";
import { getCurrentSession } from "@/server/auth/session";

export default async function AccountOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ review?: string | string[] }>;
}) {
  const { orderNumber } = await params;
  const reviewParam = (await searchParams).review;
  const reviewNotice: OrderReviewNotice | undefined =
    typeof reviewParam === "string" &&
    ["submitted", "withdrawn", "withdrawal_failed"].includes(reviewParam)
      ? (reviewParam as OrderReviewNotice)
      : undefined;
  const session = await getCurrentSession();

  if (session.kind !== "consumer") {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/account/orders/${encodeURIComponent(orderNumber)}`)}`,
    );
  }
  if (!session.customerId) {
    throw new Error("A customer record is required to view this order.");
  }

  const order = await getAccountOrder(session.customerId, orderNumber);
  if (!order) notFound();

  return <OrderDetailSection order={order} reviewNotice={reviewNotice} />;
}
