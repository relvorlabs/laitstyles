"use client";

import { Button } from "@/components/ui/button";
import { orderSavedViews } from "@/features/admin/orders/order-selectors";
import type { OrderSavedView } from "@/features/admin/orders/order-types";
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
            <Button
              aria-pressed={active}
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
