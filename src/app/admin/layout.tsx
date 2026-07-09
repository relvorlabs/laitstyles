import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ControlRoomShell } from "@/features/control-room/shell/control-room-shell";
import { activeControlRoomSeed } from "@/lib/control-room/seed";

export const metadata: Metadata = {
  title: "Control Room",
  description: "Operate Laitstyle inventory, sales and customer fulfilment.",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <ControlRoomShell initialState={activeControlRoomSeed}>
      {children}
    </ControlRoomShell>
  );
}
