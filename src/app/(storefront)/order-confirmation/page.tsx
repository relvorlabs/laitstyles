import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/server/session";
import {
  MissingOrderConfirmation,
  OrderConfirmation,
} from "@/modules/checkout/ui/order-confirmation";
import { getAccountOrder } from "@/modules/orders/server/account-orders";

export default async function OrderConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string | string[] }>;
}) {
  const orderParam = (await searchParams).order;
  const orderNumber = typeof orderParam === "string" ? orderParam.trim() : "";
  if (!orderNumber) return <MissingOrderConfirmation />;

  const session = await getCurrentSession();
  if (session.kind !== "consumer") {
    redirect(
      `/auth/sign-in?next=${encodeURIComponent(`/order-confirmation?order=${orderNumber}`)}`,
    );
  }
  const order = await getAccountOrder(session.customerId, orderNumber);
  if (!order || order.paymentStatus.code !== "paid") return <MissingOrderConfirmation />;
  return <OrderConfirmation order={order} />;
}
