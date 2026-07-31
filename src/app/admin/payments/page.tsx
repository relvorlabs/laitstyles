import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/server/session";
import { RefundsWorkspace } from "@/modules/payments/ui/refunds/refunds-workspace";

export default async function PaymentsPage() {
  const session = await getCurrentSession();
  if (session.kind !== "staff") redirect("/auth/sign-in?next=/admin/payments");

  return <RefundsWorkspace canRefund={session.role === "admin"} />;
}
