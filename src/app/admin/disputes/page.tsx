import { redirect } from "next/navigation";
import { getCurrentSession } from "@/modules/auth/server/session";
import { DisputesWorkspace } from "@/modules/payments/ui/disputes/disputes-workspace";

export default async function DisputesPage() {
  const session = await getCurrentSession();
  if (session.kind !== "staff") redirect("/auth/sign-in?next=/admin/disputes");

  return <DisputesWorkspace canDecide={session.role === "admin"} />;
}
