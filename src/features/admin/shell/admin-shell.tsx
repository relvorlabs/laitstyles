"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { ControlRoomQueryProvider } from "@/app/admin/query-provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ProductEditorControllerProvider } from "@/features/control-room/product-editor/product-editor-controller";
import { RecordSaleControllerProvider } from "@/features/control-room/record-sale/record-sale-controller";
import { AdminCommandMenu } from "@/features/admin/shell/admin-command-menu";
import { AdminSidebar } from "@/features/admin/shell/admin-sidebar";
import { AdminTopbar } from "@/features/admin/shell/admin-topbar";
import { ControlRoomProvider } from "@/features/control-room/state/control-room-provider";
import type { ControlRoomState } from "@/lib/control-room/types";

export function AdminShell({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState: ControlRoomState;
}) {
  const pathname = usePathname();
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <ControlRoomQueryProvider>
      <ControlRoomProvider initialState={initialState}>
        <ProductEditorControllerProvider>
          <RecordSaleControllerProvider>
            <div className="min-h-dvh bg-background text-foreground">
              <a
                className="fixed left-4 top-3 z-[100] -translate-y-20 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0 motion-reduce:transition-none"
                href="#admin-main"
              >
                Skip to Admin content
              </a>

              <div className="grid min-h-dvh lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="sticky top-0 hidden h-dvh min-h-0 overflow-hidden lg:block">
                  <AdminSidebar pathname={pathname} />
                </aside>

                <div className="min-w-0 bg-background">
                  <AdminTopbar
                    onOpenNavigation={() => setNavigationOpen(true)}
                    onOpenSearch={() => setSearchOpen(true)}
                    pathname={pathname}
                  />
                  <main id="admin-main" tabIndex={-1}>
                    {children}
                  </main>
                </div>
              </div>

              <Sheet onOpenChange={setNavigationOpen} open={navigationOpen}>
                <SheetContent
                  className="h-dvh w-[min(88vw,360px)] gap-0 overflow-hidden overscroll-contain border-r-0 bg-sidebar p-0 text-sidebar-foreground"
                  side="left"
                >
                  <SheetHeader className="sr-only">
                    <SheetTitle>Admin navigation</SheetTitle>
                    <SheetDescription>Move around the Laitstyle owner workspace.</SheetDescription>
                  </SheetHeader>
                  <AdminSidebar
                    compact
                    onNavigate={() => setNavigationOpen(false)}
                    pathname={pathname}
                  />
                </SheetContent>
              </Sheet>

              <AdminCommandMenu onOpenChange={setSearchOpen} open={searchOpen} />
            </div>
          </RecordSaleControllerProvider>
        </ProductEditorControllerProvider>
      </ControlRoomProvider>
    </ControlRoomQueryProvider>
  );
}
