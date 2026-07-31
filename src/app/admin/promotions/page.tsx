import { redirect } from "next/navigation";
import { PromotionsWorkspace } from "@/features/admin/promotions/promotions-workspace";
import { hasCapability } from "@/modules/auth/permissions";
import { getCurrentSession } from "@/modules/auth/server/session";
import { listPromotionCoupons } from "@/modules/promotions/server/coupons";

export default async function PromotionsPage() {
  const session = await getCurrentSession();
  if (session.kind !== "staff") redirect("/auth/sign-in?next=/admin/promotions");
  if (!hasCapability(session.role, "settings:read")) redirect("/admin");

  const initialData = await listPromotionCoupons();
  return (
    <PromotionsWorkspace
      canManage={hasCapability(session.role, "settings:update")}
      initialData={initialData}
    />
  );
}
