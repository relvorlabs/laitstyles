"use client";

import { Button } from "@/components/ui/button";
import { holdSavedViews } from "@/features/admin/holds/hold-selectors";
import type { HoldSavedView } from "@/features/admin/holds/hold-types";
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
            <Button
              aria-pressed={active}
              className="min-h-10 rounded-full px-3.5 text-[11.5px] font-semibold"
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
