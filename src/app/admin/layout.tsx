import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ControlRoomAccessDenied } from "@/features/control-room/shell/control-room-access-denied";
import { ControlRoomShell } from "@/features/control-room/shell/control-room-shell";
import { getControlRoomAccess } from "@/lib/auth/server/control-room";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

export const metadata: Metadata = {
  title: "Admin",
  description: "Operate Laitstyle inventory, sales and customer fulfilment.",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await getControlRoomAccess();

  if (!access.ok) {
    if (access.reason === "signed-out") {
      redirect("/auth/sign-in?next=/admin");
    }

    return <ControlRoomAccessDenied reason={access.reason} />;
  }

  return <ControlRoomShell initialState={activeControlRoomSeed}>{children}</ControlRoomShell>;
}
