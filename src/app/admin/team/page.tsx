import { redirect } from "next/navigation";
import { TeamWorkspace } from "@/modules/auth/ui/admin/team-workspace";
import { getCurrentSession } from "@/modules/auth/server/session";
import { listStoreManagers } from "@/modules/auth/server/staff-invitations";

export default async function TeamPage() {
  const session = await getCurrentSession();
  if (session.kind !== "staff") redirect("/auth/sign-in?next=/admin/team");
  if (session.role !== "admin") redirect("/admin");

  const managers = await listStoreManagers();
  return <TeamWorkspace initialMembers={managers} />;
}
