"use client";

import { useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ReturnStatusBadge } from "@/features/control-room/returns/return-status-badge";
import { returnStatusLabels } from "@/features/control-room/returns/return-labels";
import { toReturnWorkspaceItem } from "@/features/control-room/returns/return-selectors";
import type { ReturnActionFeedback } from "@/features/control-room/returns/return-types";
import type {
  ControlRoomReturn,
  ControlRoomState,
  ReturnStatus,
} from "@/lib/control-room/types";
import { formatNaira, formatRelativeTime } from "@/lib/control-room/formatters";
import { getPermittedReturnTransitions } from "@/lib/control-room/sales-selectors";

const confirmationStatuses = new Set<ReturnStatus>([
  "refunded",
  "damaged",
  "rejected",
]);

export function ReturnDetailSheet({
  state,
  returnRecord,
  feedback,
  onOpenChange,
  onTransition,
}: {
  state: ControlRoomState;
  returnRecord: ControlRoomReturn | null;
  feedback: ReturnActionFeedback | null;
  onOpenChange: (open: boolean) => void;
  onTransition: (returnId: string, status: ReturnStatus) => string | null;
}) {
  const [pendingStatus, setPendingStatus] = useState<ReturnStatus | null>(null);

  if (!returnRecord) {
    return <Sheet onOpenChange={onOpenChange} open={false} />;
  }

  const item = toReturnWorkspaceItem(state, returnRecord);
  const order = state.orders.find((entry) => entry.id === returnRecord.orderId);
  const permitted = getPermittedReturnTransitions(returnRecord.status);

  function requestTransition(status: ReturnStatus) {
    if (confirmationStatuses.has(status)) {
      setPendingStatus(status);
      return;
    }
    onTransition(returnRecord.id, status);
  }

  return (
    <>
      <Sheet onOpenChange={onOpenChange} open>
        <SheetContent
          className="data-[side=right]:gap-0 data-[side=right]:overflow-y-auto data-[side=right]:overscroll-contain max-sm:!inset-x-0 max-sm:!w-screen max-sm:!max-w-none max-sm:border-l-0 max-sm:pb-[env(safe-area-inset-bottom)] max-sm:duration-0 data-[side=right]:sm:w-[min(94vw,780px)] data-[side=right]:sm:max-w-[780px]"
          side="right"
        >
          <SheetHeader className="border-b border-border px-5 py-5 pr-14 max-sm:pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {returnRecord.id} · {returnRecord.orderId}
                </p>
                <SheetTitle className="mt-2 font-serif text-[31px] font-medium leading-none">
                  Customer return
                </SheetTitle>
                <SheetDescription className="mt-2">
                  {item.customerName} · {item.quantity} unit{item.quantity === 1 ? "" : "s"}
                </SheetDescription>
              </div>
              <ReturnStatusBadge status={returnRecord.status} />
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-6 p-4 sm:p-6">
            {feedback ? (
              <Alert
                aria-live="polite"
                className="sticky top-0 z-10 bg-card shadow-sm"
                variant={feedback.tone === "error" ? "destructive" : "default"}
              >
                <AlertTitle>{feedback.title}</AlertTitle>
                <AlertDescription>{feedback.message}</AlertDescription>
              </Alert>
            ) : null}

            <section aria-labelledby="return-summary-title">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Return value
                  </p>
                  <h2 className="mt-2 font-serif text-[34px] font-medium tabular-nums" id="return-summary-title">
                    {formatNaira(returnRecord.refundAmount)}
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated {formatRelativeTime(state.asOf, returnRecord.updatedAt)}
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Metric label="Order" value={returnRecord.orderId} />
                <Metric label="Quantity" value={String(item.quantity)} />
                <Metric label="Customer" value={item.customerName} />
              </div>
            </section>

            <Separator />

            <section aria-labelledby="return-products-title">
              <h2 className="font-serif text-[24px] font-medium" id="return-products-title">
                Products & disposition
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {returnRecord.lines.map((line, index) => (
                  <div
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-card p-4"
                    key={line.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.productNames[index] ?? "Product"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {line.quantity} unit{line.quantity === 1 ? "" : "s"} · {line.orderLineId}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {line.disposition}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="return-context-title">
              <h2 className="font-serif text-[24px] font-medium" id="return-context-title">
                Request context
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[16px] border border-border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Reason
                  </p>
                  <p className="mt-2 text-sm leading-6">{returnRecord.reason}</p>
                </div>
                <div className="rounded-[16px] border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
                  Requested {formatRelativeTime(state.asOf, returnRecord.requestedAt)}<br />
                  Order total {formatNaira(order?.total ?? 0)}<br />
                  Payment {order?.paymentStatus.replaceAll("-", " ") ?? "Unavailable"}
                </div>
              </div>
              {returnRecord.note ? (
                <p className="mt-4 rounded-[14px] bg-secondary/65 px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {returnRecord.note}
                </p>
              ) : null}
            </section>

            <Separator />

            <section aria-labelledby="return-actions-title">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                Next valid action
              </p>
              <h2 className="mt-2 font-serif text-[24px] font-medium" id="return-actions-title">
                Move the return forward
              </h2>
              {permitted.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {permitted.map((status, index) => (
                    <Button
                      className="h-11 rounded-full px-5"
                      key={status}
                      onClick={() => requestTransition(status)}
                      type="button"
                      variant={index === 0 && !confirmationStatuses.has(status) ? "default" : "outline"}
                    >
                      {returnStatusLabels[status]}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-[14px] bg-secondary/65 px-4 py-3 text-sm text-muted-foreground">
                  This return has no further permitted transitions.
                </p>
              )}
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                “Refund recorded” changes only the prototype record; it does not send money. Restock and damage actions move the exact returned quantity into the selected inventory bucket.
              </p>
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        onOpenChange={(open) => {
          if (!open) setPendingStatus(null);
        }}
        open={Boolean(pendingStatus)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirm {pendingStatus ? returnStatusLabels[pendingStatus].toLowerCase() : "return action"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getConfirmationDescription(pendingStatus, returnRecord)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current status</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingStatus) onTransition(returnRecord.id, pendingStatus);
                setPendingStatus(null);
              }}
              variant={pendingStatus === "damaged" || pendingStatus === "rejected" ? "destructive" : "default"}
            >
              Confirm action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-secondary/65 p-3.5">
      <p className="break-words font-serif text-[19px] font-medium leading-tight tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function getConfirmationDescription(
  status: ReturnStatus | null,
  record: ControlRoomReturn,
) {
  if (status === "refunded") {
    return `${formatNaira(record.refundAmount)} will be marked as refunded in the prototype. No payment provider or bank transfer is triggered.`;
  }
  if (status === "damaged") {
    return `${record.lines.reduce((total, line) => total + line.quantity, 0)} returned unit${record.lines.reduce((total, line) => total + line.quantity, 0) === 1 ? "" : "s"} will move from returned stock into damaged stock.`;
  }
  if (status === "rejected") {
    return "The request will be marked rejected and removed from active return work. Stock will not change.";
  }
  return "This return status will be updated in the current prototype session.";
}
