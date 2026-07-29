import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/server/session";
import {
  listAccountReturns,
  listEligibleAccountReturnOrders,
} from "@/modules/returns/server/account-returns";
import { ReturnsSection } from "@/modules/returns/ui/storefront/returns-section";

export default async function AccountReturnsPage() {
  const session = await getCurrentSession();
  if (session.kind !== "consumer") redirect("/auth/sign-in?next=/account/returns");
  const [returns, eligibleOrders] = await Promise.all([
    listAccountReturns(session.customerId),
    listEligibleAccountReturnOrders(session.customerId),
  ]);
  return <ReturnsSection eligibleOrders={eligibleOrders} initialReturns={returns} />;
}
