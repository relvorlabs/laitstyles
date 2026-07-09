"use client";

import { orderSavedViews } from "@/features/control-room/orders/order-selectors";
import type { OrderSavedView } from "@/features/control-room/orders/order-types";
import { cn } from "@/lib/utils";

export function OrderSavedViews({
  value,
  counts,
  onChange,
}: {
  value: OrderSavedView;
  counts: Record<OrderSavedView, number>;
  onChange: (value: OrderSavedView) => void;
}) {
  return (
    <div className="overflow-x-auto overscroll-x-contain border-b border-border">
      <div className="flex min-w-max gap-1 px-3 py-3 sm:px-4">
        {orderSavedViews.map((view) => {
          const active = view.value === value;
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
