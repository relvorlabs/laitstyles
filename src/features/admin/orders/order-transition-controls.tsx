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
import { orderStatusLabels } from "@/modules/orders/ui/admin/order-labels";
import { getPermittedOrderTransitions } from "@/modules/orders/rules";
import type { ControlRoomOrder, OrderStatus } from "@/modules/orders/types";

const destructiveStatuses = new Set<OrderStatus>(["cancelled", "refunded"]);

export function OrderTransitionControls({
  order,
  onTransition,
}: {
  order: ControlRoomOrder;
  onTransition: (status: OrderStatus) => void;
}) {
  const [pendingDestructive, setPendingDestructive] = useState<OrderStatus | null>(null);
  const transitions = getPermittedOrderTransitions(order.fulfilmentStatus).filter(
    (status) => !(order.source === "offline-sale" && status === "payment-confirmed"),
  );

  if (!transitions.length) {
    return (
      <p className="rounded-[12px] bg-secondary/65 px-4 py-3 text-[11.5px] leading-5 text-muted-foreground">
        {order.source === "offline-sale" && order.fulfilmentStatus === "pending-payment"
          ? "This in-person order is waiting for server-verified Paystack payment. It cannot be confirmed manually."
          : "This order has reached a terminal operational state. Its record remains available for audit."}
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
              size="lg"
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
                ? "Reserved or committed pre-handoff stock will be released back to availability and the persisted order will be closed."
                : "This changes the persisted order and stock state. Gateway refund execution remains a payment-settlement responsibility and is not performed by this control."}
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
