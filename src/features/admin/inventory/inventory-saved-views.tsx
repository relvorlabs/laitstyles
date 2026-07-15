"use client";

import { Button } from "@/components/ui/button";
import { inventorySavedViews } from "@/lib/admin/inventory-selectors";
import type { InventorySavedView } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

type InventorySavedViewsProps = {
  value: InventorySavedView;
  counts: Record<InventorySavedView, number>;
  onChange: (view: InventorySavedView) => void;
};

export function InventorySavedViews({ value, counts, onChange }: InventorySavedViewsProps) {
  return (
    <div
      aria-label="Inventory saved views"
      className="overflow-x-auto overscroll-x-contain border-b border-border"
    >
      <div className="flex min-w-max items-center gap-1 px-4 sm:px-5">
        {inventorySavedViews.map((view) => {
          const active = value === view.value;

          return (
            <Button
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative min-h-12 touch-manipulation gap-2 rounded-none px-3 text-[12px] font-semibold",
                active ? "text-foreground" : "text-muted-foreground",
              )}
              key={view.value}
              onClick={() => onChange(view.value)}
              type="button"
              variant="ghost"
            >
              <span>{view.label}</span>
              <span
                className={cn(
                  "rounded-full bg-secondary px-2 py-0.5 text-[10px] tabular-nums",
                  active && "bg-primary text-primary-foreground",
                )}
              >
                {counts[view.value]}
              </span>
              {active ? <span className="absolute inset-x-2 bottom-0 h-0.5 bg-primary" /> : null}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
