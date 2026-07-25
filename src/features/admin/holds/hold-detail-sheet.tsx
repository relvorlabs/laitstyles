"use client";

import Image from "next/image";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HoldConversionDialog } from "@/features/admin/holds/hold-conversion-dialog";
import {
  formatHoldDate,
  holdSourceLabels,
  holdStageLabels,
  holdStatusLabels,
} from "@/features/admin/holds/hold-labels";
import { HoldRiskBadge } from "@/features/admin/holds/hold-risk-badge";
import { formatHoldCountdown, toHoldWorkspaceItem } from "@/features/admin/holds/hold-selectors";
import type { HoldActionFeedback } from "@/features/admin/holds/holds-workspace";
import type { ControlRoomHold, ConvertHoldInput } from "@/modules/holds/types";

export function HoldDetailSheet({
  hold,
  now,
  feedback,
  onOpenChange,
  onExtend,
  onRelease,
  onConvert,
}: {
  hold: ControlRoomHold | null;
  now: number | null;
  feedback: HoldActionFeedback | null;
  onOpenChange: (open: boolean) => void;
  onExtend: (holdId: string, minutes: number) => Promise<string | null>;
  onRelease: (holdId: string) => Promise<string | null>;
  onConvert: (input: ConvertHoldInput & { holdId: string }) => Promise<string | null>;
}) {
  const [releaseOpen, setReleaseOpen] = useState(false);
  const [conversionOpen, setConversionOpen] = useState(false);

  if (!hold) return <Sheet onOpenChange={onOpenChange} open={false} />;

  const item = toHoldWorkspaceItem(hold, now);
  const customer = hold.customer;
  const active = item.status === "active" && item.risk !== "expired";

  return (
    <>
      <Sheet onOpenChange={onOpenChange} open>
        <SheetContent
          className="data-[side=right]:gap-0 data-[side=right]:overflow-y-auto data-[side=right]:overscroll-contain max-sm:!inset-x-0 max-sm:!w-screen max-sm:!max-w-none max-sm:border-l-0 max-sm:pb-[env(safe-area-inset-bottom)] max-sm:duration-0 data-[side=right]:sm:w-[min(94vw,760px)] data-[side=right]:sm:max-w-[760px]"
          side="right"
        >
          <SheetHeader className="border-b border-border px-5 py-5 pr-14 max-sm:pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {holdSourceLabels[hold.source]} · {holdStageLabels[hold.stage]}
                </p>
                <SheetTitle className="mt-2 font-serif text-[31px] font-medium leading-none">
                  {item.productName}
                </SheetTitle>
                <SheetDescription className="mt-2">
                  {item.customerName} · {hold.id}
                </SheetDescription>
              </div>
              <HoldRiskBadge risk={item.risk} />
            </div>
          </SheetHeader>

          <div className="space-y-6 p-4 sm:p-6">
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

            <section
              className="grid gap-5 sm:grid-cols-[150px_minmax(0,1fr)]"
              aria-labelledby="hold-summary-title"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[16px] bg-secondary">
                <Image
                  alt={item.imageAlt}
                  className="object-cover"
                  fill
                  sizes="150px"
                  src={item.imageUrl}
                />
              </div>
              <div className="min-w-0">
                <h2 className="font-serif text-[26px] font-medium" id="hold-summary-title">
                  Reservation summary
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Metric
                    label="Release countdown"
                    value={formatHoldCountdown(item.secondsRemaining)}
                  />
                  <Metric label="Quantity" value={String(hold.quantity)} />
                  <Metric label="Reference" value={item.productReference} />
                  <Metric label="Status" value={holdStatusLabels[item.status]} />
                </div>
              </div>
            </section>

            <Separator />

            <section aria-labelledby="hold-actions-title">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                    Reservation action
                  </p>
                  <h2 className="mt-2 font-serif text-[24px] font-medium" id="hold-actions-title">
                    Resolve this hold
                  </h2>
                </div>
                <Badge variant="outline">{holdStatusLabels[item.status]}</Badge>
              </div>

              {active ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      Extend release time
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[15, 30, 60].map((minutes) => (
                        <Button
                          size="lg"
                          key={minutes}
                          onClick={() => onExtend(hold.id, minutes)}
                          type="button"
                          variant="outline"
                        >
                          +{minutes} min
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="lg" onClick={() => setConversionOpen(true)} type="button">
                      Convert to order
                    </Button>
                    <Button
                      size="lg"
                      onClick={() => setReleaseOpen(true)}
                      type="button"
                      variant="outline"
                    >
                      Release hold
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 rounded-[14px] bg-secondary/65 px-4 py-3 text-[11.5px] leading-5 text-muted-foreground">
                  This hold is no longer active. Its customer and stock history remain available for
                  audit.
                </p>
              )}
            </section>

            <section aria-labelledby="hold-context-title">
              <h2 className="font-serif text-[24px] font-medium" id="hold-context-title">
                Customer & timing
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[16px] border border-border bg-card p-4 text-[11.5px] leading-5">
                  <p className="font-semibold text-foreground">{item.customerName}</p>
                  <p className="mt-2 text-muted-foreground">
                    {customer.email || "No email captured"}
                    <br />
                    {customer.phone || "No phone captured"}
                    <br />
                    {customer.city || "No city captured"}
                  </p>
                </div>
                <div className="rounded-[16px] border border-border bg-card p-4 text-[11.5px] leading-5 text-muted-foreground">
                  Started {formatHoldDate(hold.startedAt)}
                  <br />
                  Releases {formatHoldDate(hold.expiresAt)}
                  <br />
                  Payment {hold.paymentProgress.replaceAll("-", " ")}
                </div>
              </div>
              {hold.note ? (
                <p className="mt-4 rounded-[14px] bg-secondary/65 px-4 py-3 text-[11.5px] leading-5 text-muted-foreground">
                  {hold.note}
                </p>
              ) : null}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog onOpenChange={setReleaseOpen} open={releaseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release this hold?</AlertDialogTitle>
            <AlertDialogDescription>
              {hold.quantity} reserved unit{hold.quantity === 1 ? "" : "s"} will return to available
              inventory. The persisted hold remains available for audit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep hold active</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onRelease(hold.id);
                setReleaseOpen(false);
              }}
              variant="destructive"
            >
              Release stock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <HoldConversionDialog
        customerLabel={item.customerName}
        holdId={hold.id}
        initialCity={customer.city || "Lagos"}
        key={`${hold.id}-${conversionOpen ? "open" : "closed"}`}
        onOpenChange={setConversionOpen}
        onSubmit={async (input) => {
          const actionError = await onConvert(input);
          if (!actionError) setConversionOpen(false);
          return actionError;
        }}
        open={conversionOpen}
        productName={item.productName}
      />
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[14px] bg-secondary/65 p-3.5">
      <p className="break-words font-serif text-[20px] font-medium leading-tight tabular-nums">
        {value}
      </p>
      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
