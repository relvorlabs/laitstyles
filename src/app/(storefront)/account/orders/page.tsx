import { redirect } from "next/navigation";
import { OrdersSection } from "@/features/storefront/account/sections/orders-section";
import { getCurrentSession } from "@/server/auth/session";
import { getAccountOrders } from "@/server/commerce/orders/account-orders";

export default async function AccountOrdersPage() {
  const session = await getCurrentSession();
  if (session.kind !== "consumer") {
    redirect("/auth/sign-in?next=/account/orders");
  }
  if (!session.customerId) {
    throw new Error("A customer record is required to view order history.");
  }

  const orders = await getAccountOrders(session.customerId);
  return <OrdersSection orders={orders} />;
}
