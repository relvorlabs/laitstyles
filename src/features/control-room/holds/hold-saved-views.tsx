"use client";

import { holdSavedViews } from "@/features/control-room/holds/hold-selectors";
import type { HoldSavedView } from "@/features/control-room/holds/hold-types";
import { cn } from "@/lib/utils";

export function HoldSavedViews({
  value,
  counts,
  onChange,
}: {
  value: HoldSavedView;
  counts: Record<HoldSavedView, number>;
  onChange: (value: HoldSavedView) => void;
}) {
  return (
    <div className="overflow-x-auto overscroll-x-contain border-b border-border">
      <div className="flex min-w-max gap-1 px-3 py-3 sm:px-4">
        {holdSavedViews.map((view) => {
          const active = value === view.value;
          return (
            <button
              aria-pressed={active}
              className={cn(
                "min-h-10 rounded-full px-3.5 text-[11.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
              key={view.value}
              onClick={() => onChange(view.value)}
              title={view.description}
              type="button"
            >
              {view.label}
              <span
                className={cn(
                  "ml-2 tabular-nums",
                  active ? "text-white/70" : "text-muted-foreground",
                )}
              >
                {counts[view.value]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
