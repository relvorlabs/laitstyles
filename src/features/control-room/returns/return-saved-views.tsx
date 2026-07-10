"use client";

import { Button } from "@/components/ui/button";
import { returnSavedViews } from "@/features/control-room/returns/return-selectors";
import type { ReturnSavedView } from "@/features/control-room/returns/return-types";

export function ReturnSavedViews({
  value,
  counts,
  onChange,
}: {
  value: ReturnSavedView;
  counts: Record<ReturnSavedView, number>;
  onChange: (value: ReturnSavedView) => void;
}) {
  return (
    <div className="overflow-x-auto border-b border-border px-3 py-3 sm:px-4">
      <div className="flex min-w-max gap-2" role="tablist" aria-label="Return views">
        {returnSavedViews.map((view) => (
          <Button
            aria-selected={value === view.value}
            className="h-9 rounded-full px-3 text-xs"
            key={view.value}
            onClick={() => onChange(view.value)}
            role="tab"
            type="button"
            variant={value === view.value ? "secondary" : "ghost"}
          >
            {view.label}
            <span className="tabular-nums text-muted-foreground">
              {counts[view.value]}
            </span>
          </Button>
        ))}
      </div>
    </div>
  );
}
