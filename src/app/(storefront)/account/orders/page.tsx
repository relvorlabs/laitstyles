import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/server/session";
import { getCommerceAccountOrders } from "@/modules/orders/server/account-commerce-orders";
import { OrdersSection } from "@/modules/orders/ui/storefront/orders-section";

export default async function AccountOrdersPage() {
  const session = await getCurrentSession();
  if (session.kind !== "consumer") {
    redirect("/auth/sign-in?next=/account/orders");
  }
  if (!session.customerId) {
    throw new Error("A customer record is required to view order history.");
  }

  const orders = await getCommerceAccountOrders(session.customerId);
  return <OrdersSection orders={orders} />;
}
