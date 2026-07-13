"use client";

import { inventorySavedViews } from "@/lib/control-room/inventory-selectors";
import type { InventorySavedView } from "@/lib/control-room/types";
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
            <button
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 touch-manipulation items-center gap-2 px-3 text-[12px] font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                active && "text-foreground",
              )}
              key={view.value}
              onClick={() => onChange(view.value)}
              type="button"
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
            </button>
          );
        })}
      </div>
    </div>
  );
}
