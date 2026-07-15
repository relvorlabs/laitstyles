"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { orderStatusLabels } from "@/features/admin/orders/order-labels";
import { getPermittedOrderTransitions } from "@/lib/admin/sales-selectors";
import type { ControlRoomOrder, OrderStatus } from "@/lib/admin/types";

const destructiveStatuses = new Set<OrderStatus>(["cancelled", "refunded"]);

export function OrderTransitionControls({
  order,
  onTransition,
}: {
  order: ControlRoomOrder;
  onTransition: (status: OrderStatus) => void;
}) {
  const [pendingDestructive, setPendingDestructive] = useState<OrderStatus | null>(null);
  const transitions = getPermittedOrderTransitions(order.fulfilmentStatus);

  if (!transitions.length) {
    return (
      <p className="rounded-[12px] bg-secondary/65 px-4 py-3 text-[11.5px] leading-5 text-muted-foreground">
        This order has reached a terminal operational state. Its record remains available for audit.
      </p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions.map((status) => {
          const destructive = destructiveStatuses.has(status);
          return (
            <Button
              className="h-10 rounded-full px-4"
              key={status}
              onClick={() => {
                if (destructive) setPendingDestructive(status);
                else onTransition(status);
              }}
              type="button"
              variant={destructive ? "outline" : "default"}
            >
              {orderStatusLabels[status]}
            </Button>
          );
        })}
      </div>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setPendingDestructive(null);
        }}
        open={Boolean(pendingDestructive)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDestructive === "cancelled"
                ? "Cancel this order?"
                : "Record this order as refunded?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDestructive === "cancelled"
                ? "Any stock owned by this pre-dispatch order will be restored to availability. This only changes the session prototype."
                : "This records a prototype refund state and may restore undelivered stock. No payment provider or bank will be contacted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current status</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingDestructive) onTransition(pendingDestructive);
                setPendingDestructive(null);
              }}
              variant="destructive"
            >
              {pendingDestructive === "cancelled" ? "Cancel order" : "Record refund"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
