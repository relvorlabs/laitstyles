import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminAccessDenied } from "@/features/admin/shell/admin-access-denied";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { activeAdminSeed } from "@/lib/admin/shared/admin-seed";
import { getStaffAccess } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Admin",
  description: "Operate Laitstyle inventory, sales and customer fulfilment.",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await getStaffAccess();

  if (!access.ok) {
    if (access.reason === "signed-out") {
      redirect("/auth/sign-in?next=/admin");
    }

    return <AdminAccessDenied reason={access.reason} />;
  }

  return (
    <AdminShell initialState={activeAdminSeed} role={access.role}>
      {children}
    </AdminShell>
  );
}
