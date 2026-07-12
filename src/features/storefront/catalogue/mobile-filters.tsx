"use client";

import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

// Client wrapper for the mobile filter sheet. The FacetPanel (a server
// component) is passed in as children — valid RSC composition.
export function MobileFilters({
  activeCount,
  children,
}: {
  activeCount: number;
  children: ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            className="inline-flex h-10 items-center gap-2 rounded-full border border-border-strong bg-control px-4 text-[13px] font-medium text-foreground md:hidden"
            type="button"
          />
        }
      >
        Filters
        {activeCount > 0 ? (
          <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold text-primary-foreground tabular-nums">
            {activeCount}
          </span>
        ) : null}
      </SheetTrigger>
      <SheetContent
        className="w-[88%] max-w-[380px] gap-0 overflow-y-auto bg-background p-0"
        side="left"
      >
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="font-serif text-[22px] font-normal">Filters</SheetTitle>
        </SheetHeader>
        <div className="px-5 py-1">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
