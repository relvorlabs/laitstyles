import { notFound, redirect } from "next/navigation";
import { OrderDetailSection } from "@/features/storefront/account/sections/order-detail-section";
import { getStorefrontSession } from "@/server/authorization/storefront-session";
import { getAccountOrder } from "@/server/commerce/orders/account-orders";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const session = await getStorefrontSession();

  if (session?.role !== "consumer") {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/account/orders/${encodeURIComponent(orderNumber)}`)}`,
    );
  }
  if (!session.customerId) {
    throw new Error("A customer record is required to view this order.");
  }

  const order = await getAccountOrder(session.customerId, orderNumber);
  if (!order) notFound();

  return <OrderDetailSection order={order} />;
}
