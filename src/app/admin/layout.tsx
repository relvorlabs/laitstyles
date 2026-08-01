import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Script from "next/script";
import type { ReactNode } from "react";
import { AdminAccessDenied } from "@/features/admin/shell/admin-access-denied";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { getStaffAccess } from "@/modules/auth/server/session";

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
    <>
      {/* Preloaded here, ahead of any upload button mounting, so the widget
          modal doesn't wait on a fresh script fetch when a staff member
          first opens the image uploader. */}
      <Script src="https://upload-widget.cloudinary.com/global/all.js" strategy="afterInteractive" />
      <AdminShell role={access.role}>{children}</AdminShell>
    </>
  );
}
