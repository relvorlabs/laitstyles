import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminAccessDenied } from "@/features/admin/shell/admin-access-denied";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { getAdminAccess } from "@/lib/auth/server/admin";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

export const metadata: Metadata = {
  title: "Admin",
  description: "Operate Laitstyle inventory, sales and customer fulfilment.",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await getAdminAccess();

  if (!access.ok) {
    if (access.reason === "signed-out") {
      redirect("/auth/sign-in?next=/admin");
    }

    return <AdminAccessDenied reason={access.reason} />;
  }

  return <AdminShell initialState={activeControlRoomSeed}>{children}</AdminShell>;
}
