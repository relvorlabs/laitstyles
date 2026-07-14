"use client";

import { Button } from "@/components/ui/button";
import { customerSavedViews } from "@/features/control-room/customers/customer-selectors";
import type { CustomerSavedView } from "@/features/control-room/customers/customer-types";
import { cn } from "@/lib/utils";

export function CustomerSavedViews({
  value,
  counts,
  onChange,
}: {
  value: CustomerSavedView;
  counts: Record<CustomerSavedView, number>;
  onChange: (value: CustomerSavedView) => void;
}) {
  return (
    <div className="overflow-x-auto overscroll-x-contain border-b border-border">
      <div className="flex min-w-max gap-1 px-3 py-3 sm:px-4">
        {customerSavedViews.map((view) => {
          const active = view.value === value;
          return (
            <Button
              aria-pressed={active}
              className="min-h-10 touch-manipulation rounded-full px-3.5 text-[11.5px] font-semibold"
              key={view.value}
              onClick={() => onChange(view.value)}
              title={view.description}
              type="button"
              variant={active ? "default" : "ghost"}
            >
              {view.label}
              <span
                className={cn(
                  "ml-2 tabular-nums",
                  active ? "text-current/70" : "text-muted-foreground",
                )}
              >
                {counts[view.value]}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
