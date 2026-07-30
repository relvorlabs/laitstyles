import { redirect } from "next/navigation";
import { hasCapability } from "@/modules/auth/permissions";
import { getCurrentSession } from "@/modules/auth/server/session";
import { FinanceWorkspace } from "@/modules/payments/ui/finance/finance-workspace";

export default async function FinancePage() {
  const session = await getCurrentSession();
  if (session.kind !== "staff") redirect("/auth/sign-in?next=/admin/finance");
  if (!hasCapability(session.role, "finance:read")) redirect("/admin");

  return <FinanceWorkspace canTransfer={hasCapability(session.role, "finance:transfer")} />;
}
