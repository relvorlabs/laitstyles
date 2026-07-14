"use client";

import { Button } from "@/components/ui/button";

export function ReturnsHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Sales operations
        </p>
        <h1 className="mt-2 font-serif text-[38px] font-medium leading-none sm:text-[46px]">
          Returns
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Track customer requests from approval through inspection, refund state and stock
          disposition.
        </p>
      </div>
      <Button className="h-11 rounded-full px-5" onClick={onCreate} type="button">
        Start return
      </Button>
    </header>
  );
}
