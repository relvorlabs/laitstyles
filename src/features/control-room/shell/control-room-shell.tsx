"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ControlRoomCommandMenu } from "@/features/control-room/shell/control-room-command-menu";
import { ControlRoomSidebar } from "@/features/control-room/shell/control-room-sidebar";
import { ControlRoomTopbar } from "@/features/control-room/shell/control-room-topbar";

export function ControlRoomShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-[#ECEBE6] text-foreground">
      <a
        className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
        href="#control-room-main"
      >
        Skip to Control Room content
      </a>

      <div className="grid min-h-dvh lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh lg:block">
          <ControlRoomSidebar pathname={pathname} />
        </aside>

        <div className="min-w-0">
          <ControlRoomTopbar
            onOpenNavigation={() => setNavigationOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
            pathname={pathname}
          />
          <main id="control-room-main" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>

      <Sheet onOpenChange={setNavigationOpen} open={navigationOpen}>
        <SheetContent
          className="w-[min(88vw,360px)] gap-0 overscroll-contain border-r-0 bg-primary p-0"
          side="left"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Control Room navigation</SheetTitle>
            <SheetDescription>
              Move around the Laitstyle owner workspace.
            </SheetDescription>
          </SheetHeader>
          <ControlRoomSidebar
            compact
            onNavigate={() => setNavigationOpen(false)}
            pathname={pathname}
          />
        </SheetContent>
      </Sheet>

      <ControlRoomCommandMenu
        onOpenChange={setSearchOpen}
        open={searchOpen}
      />
    </div>
  );
}
